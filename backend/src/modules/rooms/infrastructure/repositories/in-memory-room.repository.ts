import { Injectable } from '@nestjs/common';
import { Room } from '../../domain/entities/room.entity';
import { IRoomRepository } from '../../domain/interfaces/room-repository.interface';

@Injectable()
export class InMemoryRoomRepository implements IRoomRepository {
  private readonly rooms = new Map<string, Room>();

  findByCode(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  exists(code: string): boolean {
    return this.rooms.has(code);
  }

  save(room: Room): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }

  count(): number {
    return this.rooms.size;
  }
}
