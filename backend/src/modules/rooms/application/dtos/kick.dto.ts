import { IsString, Length } from 'class-validator';
import type { KickPayload } from '@shared/contract';

export class KickDto implements KickPayload {
  @IsString()
  @Length(1, 64)
  playerId!: string;
}
