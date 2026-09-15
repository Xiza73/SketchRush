import { Injectable } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity';
import { IGameRepository } from '../../domain/interfaces/game-repository.interface';

@Injectable()
export class InMemoryGameRepository implements IGameRepository {
  private readonly games = new Map<string, Game>();

  find(roomCode: string): Game | undefined {
    return this.games.get(roomCode);
  }

  save(game: Game): void {
    this.games.set(game.roomCode, game);
  }

  delete(roomCode: string): void {
    this.games.delete(roomCode);
  }

  all(): Game[] {
    return [...this.games.values()];
  }
}
