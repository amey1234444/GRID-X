import { Module } from '@nestjs/common';
import { ScorecardsController } from './scorecards.controller';
import { ScorecardsScheduler } from './scorecards.scheduler';
import { ScorecardsService } from './scorecards.service';

@Module({
  controllers: [ScorecardsController],
  providers: [ScorecardsService, ScorecardsScheduler],
  exports: [ScorecardsService],
})
export class ScorecardsModule {}
