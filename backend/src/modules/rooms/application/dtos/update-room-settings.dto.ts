import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import type { UpdateSettingsPayload } from '@shared/contract';
import { RoomSettingsDto } from './room-settings.dto';

/** Same settings rules as `room:create`; the host may only send them in the lobby. */
export class UpdateRoomSettingsDto implements UpdateSettingsPayload {
  @IsDefined()
  @ValidateNested()
  @Type(() => RoomSettingsDto)
  settings!: RoomSettingsDto;
}
