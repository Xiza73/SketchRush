import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { ROOM_LIMITS, type JoinRoomPayload } from '@shared/contract';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class JoinRoomDto implements JoinRoomPayload {
  @Transform(upper)
  @IsString()
  @Matches(/^[A-Z0-9]{4}$/)
  roomCode!: string;

  @Transform(trim)
  @IsString()
  @Length(ROOM_LIMITS.nameMinLength, ROOM_LIMITS.nameMaxLength)
  name!: string;
}
