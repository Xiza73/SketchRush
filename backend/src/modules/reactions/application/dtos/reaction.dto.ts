import { IsIn } from 'class-validator';
import { EMOTES, type Emote, type ReactionPayload } from '@shared/contract';

export class ReactionDto implements ReactionPayload {
  @IsIn(EMOTES)
  emote!: Emote;
}
