import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { FriendsModule } from '../friends/friends.module';
import { AiController } from './ai.controller';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentSessionService } from './agent-session.service';
import { AgentToolsService } from './agent-tools.service';
import { GeminiService } from './gemini.service';

// -------------------------------------------------------------------
// AI Module
// Gemini chat proxy for the in-app assistant.
// Step 4: GeminiService runs function-calling loop via AgentToolsService.
// -------------------------------------------------------------------

@Module({
  imports: [EventsModule, FriendsModule],
  controllers: [AiController],
  providers: [
    GeminiService,
    AgentSessionService,
    AgentOrchestratorService,
    AgentToolsService,
  ],
  exports: [GeminiService, AgentOrchestratorService, AgentToolsService],
})
export class AiModule {}
