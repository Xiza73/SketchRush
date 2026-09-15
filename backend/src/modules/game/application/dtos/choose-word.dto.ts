import { IsInt, Max, Min } from 'class-validator';
import { ROOM_LIMITS, type ChooseWordPayload } from '@shared/contract';

export class ChooseWordDto implements ChooseWordPayload {
  @IsInt()
  @Min(0)
  @Max(ROOM_LIMITS.wordChoices - 1)
  index!: number;
}
