import { Module } from '@nestjs/common';
import { RoomsModule } from '@modules/rooms/rooms.module';
import { HealthController } from './presentation/health.controller';

@Module({
  imports: [RoomsModule],
  controllers: [HealthController],
})
export class HealthModule {}
