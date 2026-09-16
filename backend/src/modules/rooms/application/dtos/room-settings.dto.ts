import { IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';
import { ROOM_LIMITS, type GuessMode, type Language, type RoomSettings } from '@shared/contract';

export class RoomSettingsDto implements RoomSettings {
  @IsIn(['es', 'en'])
  language!: Language;

  @IsInt()
  @Min(ROOM_LIMITS.minDrawSeconds)
  @Max(ROOM_LIMITS.maxDrawSeconds)
  drawSeconds!: number;

  @IsInt()
  @Min(ROOM_LIMITS.minRounds)
  @Max(ROOM_LIMITS.maxRounds)
  rounds!: number;

  @IsInt()
  @Min(ROOM_LIMITS.minPlayers)
  @Max(ROOM_LIMITS.maxPlayers)
  capacity!: number;

  /** `box` keeps guesses private, `chat` shows them to the room. */
  @IsIn(['box', 'chat'])
  guessMode!: GuessMode;

  /** Whether letters come out as the turn runs; how many is the turn's business. */
  @IsBoolean()
  hints!: boolean;
}
