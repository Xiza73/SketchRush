import { Module } from '@nestjs/common';
import { RoomsModule } from '@modules/rooms/rooms.module';
import { SendReactionUseCase } from './application/use-cases/send-reaction.use-case';

@Module({
  imports: [RoomsModule],
  providers: [SendReactionUseCase],
  exports: [SendReactionUseCase],
})
export class ReactionsModule {}
