import { IsString, MaxLength, MinLength } from 'class-validator';
import { ROOM_LIMITS, type GuessPayload } from '@shared/contract';

export class GuessDto implements GuessPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(ROOM_LIMITS.guessMaxLength)
  text!: string;
}
