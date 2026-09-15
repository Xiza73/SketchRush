import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BRUSH_SIZES,
  PALETTE,
  ROOM_LIMITS,
  type FillPayload,
  type Point,
  type StrokePayload,
  type StrokeTool,
} from '@shared/contract';

/**
 * A canvas coordinate. Normalised means normalised: the drawer clamps to 0..1
 * before sending, so anything outside it is a client that is not ours.
 */
export class PointDto implements Point {
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;
}

export class StrokeDto implements StrokePayload {
  /** Chunks of the same line share this, which is what joins them server-side. */
  @IsInt()
  @Min(0)
  id!: number;

  @IsIn(['brush', 'eraser'])
  tool!: StrokeTool;

  /** An index into `PALETTE`; the use case checks it again before it is stored. */
  @IsInt()
  @Min(0)
  @Max(PALETTE.length - 1)
  color!: number;

  @IsIn(BRUSH_SIZES)
  size!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROOM_LIMITS.strokeChunkPoints)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];
}

export class FillDto implements FillPayload {
  @IsInt()
  @Min(0)
  @Max(PALETTE.length - 1)
  color!: number;

  @ValidateNested()
  @Type(() => PointDto)
  at!: PointDto;
}
