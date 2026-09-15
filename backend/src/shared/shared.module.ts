import { Global, Module } from '@nestjs/common';
import { CLOCK, SystemClock } from './domain/clock';
import { RoomEventsBus } from './events/room-events.bus';

@Global()
@Module({
  providers: [RoomEventsBus, { provide: CLOCK, useClass: SystemClock }],
  exports: [RoomEventsBus, CLOCK],
})
export class SharedModule {}
