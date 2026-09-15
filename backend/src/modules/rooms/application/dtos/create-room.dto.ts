import { Transform, Type } from 'class-transformer';
import { IsDefined, IsString, Length, ValidateNested } from 'class-validator';
import { ROOM_LIMITS, type CreateRoomPayload } from '@shared/contract';
import { RoomSettingsDto } from './room-settings.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoomDto implements CreateRoomPayload {
  @Transform(trim)
  @IsString()
  @Length(ROOM_LIMITS.nameMinLength, ROOM_LIMITS.nameMaxLength)
  name!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => RoomSettingsDto)
  settings!: RoomSettingsDto;
}
