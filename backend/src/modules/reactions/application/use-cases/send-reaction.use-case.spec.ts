import { ROOM_LIMITS } from '@shared/contract';
import { type Clock } from '@shared/domain/clock';
import { DomainException } from '@shared/domain/domain.exception';
import { type OutboundEvent, RoomEventsBus } from '@shared/events/room-events.bus';
import { Player } from '@modules/rooms/domain/entities/player.entity';
import { Room } from '@modules/rooms/domain/entities/room.entity';
import { InMemoryRoomRepository } from '@modules/rooms/infrastructure/repositories/in-memory-room.repository';
import { SendReactionUseCase } from './send-reaction.use-case';

const T0 = 1_000_000;
const BURST = ROOM_LIMITS.emoteBurstLimit;
const PAUSE_MS = ROOM_LIMITS.emotePauseSeconds * 1000;
const WINDOW_MS = ROOM_LIMITS.emoteBurstWindowSeconds * 1000;

class FakeClock implements Clock {
  current = T0;
  now(): number {
    return this.current;
  }
}

const settings = {
  language: 'es' as const,
  drawSeconds: 60,
  rounds: 3,
  capacity: 8,
  hintLetters: 1,
  guessMode: 'box' as const,
};

describe('SendReactionUseCase', () => {
  let rooms: InMemoryRoomRepository;
  let clock: FakeClock;
  let bus: RoomEventsBus;
  let events: OutboundEvent[];
  let useCase: SendReactionUseCase;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    clock = new FakeClock();
    bus = new RoomEventsBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    useCase = new SendReactionUseCase(rooms, clock, bus);

    const room = Room.create('ABCD', settings, T0);
    room.addPlayer(
      Player.create({ id: 'p1', token: 't1', name: 'Ana', isHost: true, joinedAt: T0 }),
    );
    room.addPlayer(
      Player.create({ id: 'p2', token: 't2', name: 'Bruno', isHost: false, joinedAt: T0 }),
    );
    rooms.save(room);
  });

  /** Sends one emote at `at` ms after T0; returns true when it was accepted. */
  const send = (playerId: string, at: number): boolean => {
    clock.current = T0 + at;
    try {
      useCase.execute('ABCD', playerId, 'love');
      return true;
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe('cooldown');
      return false;
    }
  };

  it('broadcasts the emote to the room', () => {
    expect(send('p1', 0)).toBe(true);
    expect(events).toEqual([
      { roomCode: 'ABCD', event: 'reaction:show', payload: { playerId: 'p1', emote: 'love' } },
    ]);
  });

  it('rejects a player that is not in the room', () => {
    clock.current = T0;
    expect(() => useCase.execute('ABCD', 'ghost', 'love')).toThrow(
      expect.objectContaining({ code: 'not_in_room' }) as Error,
    );
  });

  it('accepts the burst limit inside the window and rejects the next one', () => {
    for (let i = 0; i < BURST; i++) expect(send('p1', i * 100)).toBe(true);
    expect(send('p1', BURST * 100)).toBe(false);
    expect(events).toHaveLength(BURST);
  });

  it('keeps rejecting until the pause is over and then accepts again', () => {
    for (let i = 0; i < BURST; i++) expect(send('p1', 0)).toBe(true);
    const blockedAt = 0;
    expect(send('p1', blockedAt)).toBe(false);

    // Still paused 100 ms before the 5 s are up.
    expect(send('p1', blockedAt + PAUSE_MS - 100)).toBe(false);
    // Exactly at 5 s the pause is over and the window starts fresh.
    expect(send('p1', blockedAt + PAUSE_MS)).toBe(true);
  });

  it('never grows the pause, however much the player insists', () => {
    for (let i = 0; i < BURST; i++) send('p1', 0);
    send('p1', 0); // starts the pause at T0 + 5 s
    for (let at = 100; at < PAUSE_MS; at += 100) expect(send('p1', at)).toBe(false);
    expect(send('p1', PAUSE_MS)).toBe(true);
  });

  it('allows a full new burst once the pause ends', () => {
    for (let i = 0; i < BURST; i++) send('p1', 0);
    send('p1', 0);
    events.length = 0;
    for (let i = 0; i < BURST; i++) expect(send('p1', PAUSE_MS + i)).toBe(true);
    expect(events).toHaveLength(BURST);
    expect(send('p1', PAUSE_MS + BURST)).toBe(false);
  });

  it('slides the window instead of counting for ever', () => {
    for (let i = 0; i < BURST; i++) expect(send('p1', i * 100)).toBe(true);
    // The first send has left the window by now, so there is room for one more.
    expect(send('p1', WINDOW_MS + 1)).toBe(true);
  });

  it('keeps one window per player', () => {
    for (let i = 0; i < BURST; i++) expect(send('p1', 0)).toBe(true);
    expect(send('p1', 0)).toBe(false);
    // Bruno was not spamming; his own window is untouched.
    for (let i = 0; i < BURST; i++) expect(send('p2', 0)).toBe(true);
    expect(send('p2', 0)).toBe(false);
    expect(send('p1', PAUSE_MS)).toBe(true);
  });
});
