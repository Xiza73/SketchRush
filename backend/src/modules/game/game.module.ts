import { Module } from '@nestjs/common';
import { RoomsModule } from '@modules/rooms/rooms.module';
import { WordsModule } from '@modules/words/words.module';
import { TurnLifecycleService } from './application/services/turn-lifecycle.service';
import { TurnTickerService } from './application/services/turn-ticker.service';
import { BeginGameUseCase } from './application/use-cases/begin-game.use-case';
import { ChooseWordUseCase } from './application/use-cases/choose-word.use-case';
import { DrawUseCase } from './application/use-cases/draw.use-case';
import { GetGameStateUseCase } from './application/use-cases/get-game-state.use-case';
import { HandlePlayerLeftUseCase } from './application/use-cases/handle-player-left.use-case';
import { SubmitGuessUseCase } from './application/use-cases/submit-guess.use-case';
import { TickTurnsUseCase } from './application/use-cases/tick-turns.use-case';
import { GAME_REPOSITORY } from './domain/interfaces/game-repository.interface';
import { InMemoryGameRepository } from './infrastructure/repositories/in-memory-game.repository';

/**
 * The reason the game exists: turns, the canvas and the score.
 *
 * It depends on `rooms`, never the other way round — `rooms` is the family half
 * and has to stay lift-and-droppable into the next game in this family.
 */
@Module({
  imports: [RoomsModule, WordsModule],
  providers: [
    { provide: GAME_REPOSITORY, useClass: InMemoryGameRepository },
    TurnLifecycleService,
    TurnTickerService,
    TickTurnsUseCase,
    BeginGameUseCase,
    ChooseWordUseCase,
    DrawUseCase,
    SubmitGuessUseCase,
    GetGameStateUseCase,
    HandlePlayerLeftUseCase,
  ],
  exports: [
    BeginGameUseCase,
    ChooseWordUseCase,
    DrawUseCase,
    SubmitGuessUseCase,
    GetGameStateUseCase,
    HandlePlayerLeftUseCase,
  ],
})
export class GameModule {}
