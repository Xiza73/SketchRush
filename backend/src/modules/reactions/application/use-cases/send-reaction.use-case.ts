import { Inject, Injectable } from '@nestjs/common';
import { ROOM_LIMITS, type Emote } from '@shared/contract';
import { CLOCK, type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { RoomEventsBus } from '@shared/events/room-events.bus';
import {
  IRoomRepository,
  ROOM_REPOSITORY,
} from '@modules/rooms/domain/interfaces/room-repository.interface';

export const EMOTE_BURST_LIMIT = ROOM_LIMITS.emoteBurstLimit;
export const EMOTE_BURST_WINDOW_MS = ROOM_LIMITS.emoteBurstWindowSeconds * 1000;
export const EMOTE_PAUSE_MS = ROOM_LIMITS.emotePauseSeconds * 1000;

/**
 * Broadcasts an emote to the room. There is no per-emote cooldown: a player
 * reacts as often as they like until they send more than
 * `emoteBurstLimit` inside `emoteBurstWindowSeconds`, which pauses them for
 * exactly `emotePauseSeconds` (never longer, however much they insist). When
 * the pause ends the sliding window starts empty again.
 * See `docs/context/02-game-rules.md` → Emotes.
 */
@Injectable()
export class SendReactionUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: RoomEventsBus,
  ) {}

  execute(roomCode: string, playerId: string, emote: Emote): void {
    const room = this.rooms.findByCode(roomCode);
    const player = room?.findPlayer(playerId);
    if (!room || !player) throw new DomainException('not_in_room');

    const now = this.clock.now();
    // A running pause is never extended, so spamming through it costs nothing extra.
    if (now < player.reactionPausedUntil) throw new DomainException('cooldown');

    const recent = player.reactionTimes.filter((at) => now - at < EMOTE_BURST_WINDOW_MS);
    if (recent.length >= EMOTE_BURST_LIMIT) {
      player.reactionPausedUntil = now + EMOTE_PAUSE_MS;
      player.reactionTimes = [];
      throw new DomainException('cooldown');
    }
    recent.push(now);
    player.reactionTimes = recent;
    player.reactionPausedUntil = 0;

    room.touch(now);
    this.bus.publish({
      roomCode: room.code,
      event: 'reaction:show',
      payload: { playerId: player.id, emote },
    });
  }
}
