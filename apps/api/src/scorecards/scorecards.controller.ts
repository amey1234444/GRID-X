import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, computeScorecardSchema } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { zodBody } from '../common/zod-validation.pipe';
import { RequestUser } from '../common/request-user';
import { ScorecardsService } from './scorecards.service';

const periodQuerySchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100).optional(),
});

const leaderboardQuerySchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
});

@ApiTags('Scorecards')
@Controller('scorecards')
export class ScorecardsController {
  constructor(private readonly scorecards: ScorecardsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SCORECARD_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query(zodBody(periodQuerySchema)) query: z.infer<typeof periodQuerySchema>,
  ) {
    return this.scorecards.list(user, query);
  }

  @Get('leaderboard')
  @RequirePermissions(PERMISSIONS.SCORECARD_READ)
  leaderboard(
    @Query(zodBody(leaderboardQuerySchema)) query: z.infer<typeof leaderboardQuerySchema>,
  ) {
    return this.scorecards.leaderboard(query);
  }

  @Get('partners/:partnerId')
  @RequirePermissions(PERMISSIONS.SCORECARD_READ)
  forPartner(@CurrentUser() user: RequestUser, @Param('partnerId') partnerId: string) {
    return this.scorecards.forPartner(user, partnerId);
  }

  @Post('compute')
  @RequirePermissions(PERMISSIONS.SCORECARD_COMPUTE)
  compute(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(computeScorecardSchema)) body: z.infer<typeof computeScorecardSchema>,
  ) {
    return this.scorecards.compute(user, body);
  }
}
