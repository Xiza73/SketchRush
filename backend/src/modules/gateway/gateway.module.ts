import { Module } from '@nestjs/common';
import { GameModule } from '@modules/game/game.module';
import { ReactionsModule } from '@modules/reactions/reactions.module';
import { RoomsModule } from '@modules/rooms/rooms.module';
import { GameGateway } from './presentation/game.gateway';
import { SessionRegistry } from './presentation/session-registry';
import { SocketRateLimiter } from './presentation/socket-rate-limiter';

@Module({
  imports: [RoomsModule, GameModule, ReactionsModule],
  providers: [GameGateway, SessionRegistry, SocketRateLimiter],
})
export class GatewayModule {}
