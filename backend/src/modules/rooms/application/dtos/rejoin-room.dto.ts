import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import type { RejoinPayload } from '@shared/contract';

const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class RejoinRoomDto implements RejoinPayload {
  @Transform(upper)
  @IsString()
  @Matches(/^[A-Z0-9]{4}$/)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  playerId!: string;

  @IsString()
  @Length(1, 128)
  token!: string;
}
