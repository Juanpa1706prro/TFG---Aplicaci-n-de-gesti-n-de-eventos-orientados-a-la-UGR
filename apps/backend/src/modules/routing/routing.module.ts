import { Module } from '@nestjs/common';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

// -------------------------------------------------------------------
// Routing Module
// Registers Google Routes API proxy (POST /routing/directions).
// Used by the map feature; API key stays on the server (.env).
// -------------------------------------------------------------------
@Module({
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
