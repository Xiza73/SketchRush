import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BRUSH_SIZES,
  COLOR_PATTERN,
  ROOM_LIMITS,
  type FillPayload,
  type Point,
  type ShapeKind,
  type ShapePayload,
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

/**
 * The colour rule, in one place because three payloads carry one.
 *
 * `#rrggbb` lower case and nothing else. The drawer can pick any colour now
 * rather than an index into a fixed palette, which means this string reaches
 * the canvas of every other player in the room — so it is pinned to a shape
 * that cannot be anything but a colour, rather than trusted because the only
 * client we wrote happens to send six hex digits.
 */
const IsHexColor = () => Matches(COLOR_PATTERN, { message: 'color must be #rrggbb, lower case' });

export class StrokeDto implements StrokePayload {
  /** Chunks of the same line share this, which is what joins them server-side. */
  @IsInt()
  @Min(0)
  id!: number;

  @IsIn(['brush', 'eraser'])
  tool!: StrokeTool;

  @IsHexColor()
  color!: string;

  @IsIn(BRUSH_SIZES)
  size!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROOM_LIMITS.strokeChunkPoints)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];
}

export class ShapeDto implements ShapePayload {
  @IsInt()
  @Min(0)
  id!: number;

  @IsIn(['rect', 'ellipse'])
  shape!: ShapeKind;

  @IsHexColor()
  color!: string;

  @IsIn(BRUSH_SIZES)
  size!: number;

  @ValidateNested()
  @Type(() => PointDto)
  from!: PointDto;

  @ValidateNested()
  @Type(() => PointDto)
  to!: PointDto;
}

export class FillDto implements FillPayload {
  @IsHexColor()
  color!: string;

  @ValidateNested()
  @Type(() => PointDto)
  at!: PointDto;
}
