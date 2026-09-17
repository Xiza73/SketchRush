import { Inject, Logger, UseFilters, UsePipes } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type Ack, type GuessAck, type SessionAck, type TimeSyncAck } from '@shared/contract';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { ChooseWordDto } from '@modules/game/application/dtos/choose-word.dto';
import { FillDto, StrokeDto } from '@modules/game/application/dtos/draw.dto';
import { GuessDto } from '@modules/game/application/dtos/guess.dto';
import { BeginGameUseCase } from '@modules/game/application/use-cases/begin-game.use-case';
import { ChooseWordUseCase } from '@modules/game/application/use-cases/choose-word.use-case';
import { DrawUseCase } from '@modules/game/application/use-cases/draw.use-case';
import { GetGameStateUseCase } from '@modules/game/application/use-cases/get-game-state.use-case';
import { HandlePlayerLeftUseCase } from '@modules/game/application/use-cases/handle-player-left.use-case';
import { SubmitGuessUseCase } from '@modules/game/application/use-cases/submit-guess.use-case';
import { ReactionDto } from '@modules/reactions/application/dtos/reaction.dto';
import { SendReactionUseCase } from '@modules/reactions/application/use-cases/send-reaction.use-case';
import { CreateRoomDto } from '@modules/rooms/application/dtos/create-room.dto';
import { JoinRoomDto } from '@modules/rooms/application/dtos/join-room.dto';
import { RejoinRoomDto } from '@modules/rooms/application/dtos/rejoin-room.dto';
import { SetReadyDto } from '@modules/rooms/application/dtos/set-ready.dto';
import { UpdateRoomSettingsDto } from '@modules/rooms/application/dtos/update-room-settings.dto';
import {
  CreateRoomUseCase,
  RoomSession,
} from '@modules/rooms/application/use-cases/create-room.use-case';
import { EnsureNotInRoomUseCase } from '@modules/rooms/application/use-cases/ensure-not-in-room.use-case';
import { JoinRoomUseCase } from '@modules/rooms/application/use-cases/join-room.use-case';
import { LeaveRoomUseCase } from '@modules/rooms/application/use-cases/leave-room.use-case';
import { MarkDisconnectedUseCase } from '@modules/rooms/application/use-cases/mark-disconnected.use-case';
import { RejoinRoomUseCase } from '@modules/rooms/application/use-cases/rejoin-room.use-case';
import { RestartRoomUseCase } from '@modules/rooms/application/use-cases/restart-room.use-case';
import { SetReadyUseCase } from '@modules/rooms/application/use-cases/set-ready.use-case';
import { StartGameUseCase } from '@modules/rooms/application/use-cases/start-game.use-case';
import { UpdateRoomSettingsUseCase } from '@modules/rooms/application/use-cases/update-room-settings.use-case';
import { toFullState } from '@modules/rooms/domain/services/state-presenter';
import { SessionRegistry } from './session-registry';
import { type RateLimit, SocketRateLimiter } from './socket-rate-limiter';
import { EmptyAck, GameServer, GameSocket, OK_EMPTY, roomChannel } from './socket.types';
import { WsExceptionFilter } from './ws-exception.filter';
import { createWsValidationPipe } from './ws-validation.pipe';

/** Five rooms in ten seconds is far past what a person does and far under a script. */
const CREATE_LIMIT: RateLimit = { max: 5, windowMs: 10_000 };
/** Nobody types ten guesses in five seconds; a script trying every word does. */
const GUESS_LIMIT: RateLimit = { max: 10, windowMs: 5_000 };
/** The drawer flushes about twenty times a second. This is three times that. */
const STROKE_LIMIT: RateLimit = { max: 60, windowMs: 1_000 };

/**
 * The single Socket.IO entry point. Thin by design: validate, resolve the
 * session, call one use case, return the ack. Every server -> client event is
 * published by the use cases on the RoomEventsBus and dispatched from here.
 */
@WebSocketGateway()
@UsePipes(createWsValidationPipe())
@UseFilters(WsExceptionFilter)
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private unsubscribe: (() => void) | null = null;

  @WebSocketServer()
  private readonly server!: GameServer;

  constructor(
    private readonly bus: RoomEventsBus,
    private readonly sessions: SessionRegistry,
    private readonly limiter: SocketRateLimiter,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly ensureNotInRoom: EnsureNotInRoomUseCase,
    private readonly createRoom: CreateRoomUseCase,
    private readonly joinRoom: JoinRoomUseCase,
    private readonly rejoinRoom: RejoinRoomUseCase,
    private readonly setReady: SetReadyUseCase,
    private readonly updateRoomSettings: UpdateRoomSettingsUseCase,
    private readonly restartRoom: RestartRoomUseCase,
    private readonly leaveRoom: LeaveRoomUseCase,
    private readonly markDisconnected: MarkDisconnectedUseCase,
    private readonly startGame: StartGameUseCase,
    private readonly beginGame: BeginGameUseCase,
    private readonly chooseWord: ChooseWordUseCase,
    private readonly draw: DrawUseCase,
    private readonly submitGuess: SubmitGuessUseCase,
    private readonly gameState: GetGameStateUseCase,
    private readonly handlePlayerLeft: HandlePlayerLeftUseCase,
    private readonly sendReaction: SendReactionUseCase,
  ) {}

  afterInit(): void {
    this.unsubscribe = this.bus.subscribe((event) => this.dispatch(event));
  }

  handleConnection(client: GameSocket): void {
    this.logger.debug?.(`Socket connected ${client.id}`);
  }

  handleDisconnect(client: GameSocket): void {
    this.limiter.forget(client.id);
    if (!this.sessions.isCurrent(client)) {
      this.sessions.detach(client);
      return;
    }
    const session = this.sessions.detach(client);
    if (session) this.markDisconnected.execute(session.roomCode, session.playerId);
  }

  // ----------------------------------------------------------------- clock

  /**
   * The server's `now`, so a client can stop trusting its own.
   *
   * Deliberately the cheapest handler here: no session, no rate limit, no work
   * before reading the clock. Anything between the request arriving and this
   * line is measurement error the caller cannot see or subtract.
   */
  @SubscribeMessage('time:sync')
  onTimeSync(): Ack<TimeSyncAck> {
    return { ok: true, now: this.clock.now() };
  }

  // ---------------------------------------------------------------- rooms

  @SubscribeMessage('room:create')
  onCreate(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() dto: CreateRoomDto,
  ): Ack<SessionAck> {
    // Flood guard first, so a script never reaches the rest of the handler.
    if (!this.limiter.allow(client.id, 'room:create', CREATE_LIMIT, this.clock.now())) {
      throw new DomainException('cooldown');
    }
    // One game at a time: a socket still seated in a live room cannot open another.
    this.ensureNotInRoom.execute(client.data);
    // The use case runs first so a failure leaves the caller's current room untouched.
    const session = this.createRoom.execute(dto);
    this.leaveCurrentRoom(client);
    return this.bindSession(client, session);
  }

  @SubscribeMessage('room:join')
  onJoin(@ConnectedSocket() client: GameSocket, @MessageBody() dto: JoinRoomDto): Ack<SessionAck> {
    this.ensureNotInRoom.execute(client.data);
    const session = this.joinRoom.execute(dto);
    this.leaveCurrentRoom(client);
    return this.bindSession(client, session);
  }

  @SubscribeMessage('room:rejoin')
  onRejoin(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() dto: RejoinRoomDto,
  ): Ack<SessionAck> {
    const session = this.rejoinRoom.execute(dto);
    if (client.data.playerId && client.data.playerId !== session.player.id) {
      this.leaveCurrentRoom(client);
    }
    return this.bindSession(client, session);
  }

  @SubscribeMessage('room:leave')
  onLeave(@ConnectedSocket() client: GameSocket): EmptyAck {
    this.leaveCurrentRoom(client);
    return OK_EMPTY;
  }

  @SubscribeMessage('room:ready')
  onReady(@ConnectedSocket() client: GameSocket, @MessageBody() dto: SetReadyDto): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.setReady.execute(roomCode, playerId, dto.ready);
    return OK_EMPTY;
  }

  @SubscribeMessage('room:update-settings')
  onUpdateSettings(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() dto: UpdateRoomSettingsDto,
  ): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.updateRoomSettings.execute(roomCode, playerId, dto.settings);
    return OK_EMPTY;
  }

  @SubscribeMessage('room:start')
  onStart(@ConnectedSocket() client: GameSocket): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    // Two halves, in order: may this room start (family rule), then deal the
    // first turn (game rule). The first throws before the second runs.
    this.startGame.execute(roomCode, playerId);
    this.beginGame.execute(roomCode);
    return OK_EMPTY;
  }

  /** "Play again": the finished room goes back to being a lobby, same seats. */
  @SubscribeMessage('room:restart')
  onRestart(@ConnectedSocket() client: GameSocket): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.restartRoom.execute(roomCode, playerId);
    return OK_EMPTY;
  }

  // ----------------------------------------------------------------- game

  @SubscribeMessage('turn:choose')
  onChooseWord(@ConnectedSocket() client: GameSocket, @MessageBody() dto: ChooseWordDto): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.chooseWord.execute(roomCode, playerId, dto.index);
    return OK_EMPTY;
  }

  @SubscribeMessage('draw:stroke')
  onStroke(@ConnectedSocket() client: GameSocket, @MessageBody() dto: StrokeDto): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    if (!this.limiter.allow(client.id, 'draw:stroke', STROKE_LIMIT, this.clock.now())) {
      throw new DomainException('cooldown');
    }
    this.draw.stroke(roomCode, playerId, dto);
    return OK_EMPTY;
  }

  @SubscribeMessage('draw:fill')
  onFill(@ConnectedSocket() client: GameSocket, @MessageBody() dto: FillDto): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.draw.fill(roomCode, playerId, dto);
    return OK_EMPTY;
  }

  @SubscribeMessage('draw:undo')
  onUndo(@ConnectedSocket() client: GameSocket): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.draw.undo(roomCode, playerId);
    return OK_EMPTY;
  }

  @SubscribeMessage('draw:clear')
  onClear(@ConnectedSocket() client: GameSocket): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    this.draw.clear(roomCode, playerId);
    return OK_EMPTY;
  }

  @SubscribeMessage('game:guess')
  onGuess(@ConnectedSocket() client: GameSocket, @MessageBody() dto: GuessDto): Ack<GuessAck> {
    const { roomCode, playerId } = this.requireSession(client);
    if (!this.limiter.allow(client.id, 'game:guess', GUESS_LIMIT, this.clock.now())) {
      throw new DomainException('cooldown');
    }
    return { ok: true, ...this.submitGuess.execute(roomCode, playerId, dto.text) };
  }

  @SubscribeMessage('reaction:send')
  onReaction(@ConnectedSocket() client: GameSocket, @MessageBody() dto: ReactionDto): EmptyAck {
    const { roomCode, playerId } = this.requireSession(client);
    // No limiter here: the burst rule lives in the use case, which owns the
    // per-player window (a socket is not a player; rejoining must not reset it).
    this.sendReaction.execute(roomCode, playerId, dto.emote);
    return OK_EMPTY;
  }

  // -------------------------------------------------------------- helpers

  private bindSession(client: GameSocket, session: RoomSession): Ack<SessionAck> {
    const { room, player } = session;
    this.sessions.bind(client, room.code, player.id);
    // Addressed to this player: the turn carries the word only if they draw it.
    const { turn, lastTurnEnd } = this.gameState.execute(room.code, player.id);
    return {
      ok: true,
      roomCode: room.code,
      playerId: player.id,
      token: player.token,
      state: toFullState(room, turn, lastTurnEnd),
    };
  }

  private requireSession(client: GameSocket): { roomCode: string; playerId: string } {
    const { roomCode, playerId } = client.data;
    if (!roomCode || !playerId) throw new DomainException('not_in_room');
    return { roomCode, playerId };
  }

  private leaveCurrentRoom(client: GameSocket): void {
    const session = this.sessions.detach(client);
    if (!session) return;
    this.leaveRoom.execute(session.roomCode, session.playerId);
    // After the room has dropped them, never before: whether the turn survives
    // depends on who is still seated.
    this.handlePlayerLeft.execute(session.roomCode, session.playerId);
  }

  private dispatch(event: OutboundEvent): void {
    if (event.toPlayerId !== undefined) {
      const socket = this.sessions.socketOf(event.toPlayerId);
      if (!socket) return;
      // The union is correlated by construction; Socket.IO's overloads cannot see that.
      (socket.emit as (name: string, payload: unknown) => boolean)(event.event, event.payload);
      return;
    }
    const channel = this.server.to(roomChannel(event.roomCode));
    (channel.emit as (name: string, payload: unknown) => boolean)(event.event, event.payload);
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
