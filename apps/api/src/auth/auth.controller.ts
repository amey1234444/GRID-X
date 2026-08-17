import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  changePasswordSchema,
  loginSchema,
  partnerPasswordLoginSchema,
  refreshSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, Public, RateLimit } from '../common/decorators';
import { AuthedRequest, RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit(10, 5 * 60_000)
  @Post('login')
  login(
    @Body(zodBody(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.login(body, this.device(request));
  }

  @Public()
  @RateLimit(5, 15 * 60_000)
  @Post('otp/request')
  requestOtp(@Body(zodBody(requestOtpSchema)) body: z.infer<typeof requestOtpSchema>) {
    return this.auth.requestOtp(body);
  }

  @Public()
  @RateLimit(10, 15 * 60_000)
  @Post('otp/verify')
  verifyOtp(
    @Body(zodBody(verifyOtpSchema)) body: z.infer<typeof verifyOtpSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.verifyOtp(body, this.device(request));
  }

  @Public()
  @RateLimit(10, 5 * 60_000)
  @Post('partner/login')
  partnerLogin(
    @Body(zodBody(partnerPasswordLoginSchema)) body: z.infer<typeof partnerPasswordLoginSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.partnerPasswordLogin(body.phone, body.password, this.device(request));
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body(zodBody(refreshSchema)) body: z.infer<typeof refreshSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.refresh(body.refreshToken, this.device(request));
  }

  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Body() body: { refreshToken?: string }) {
    await this.auth.logout(user.id, body?.refreshToken);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.loadAuthUser(user.id);
  }

  @RateLimit(5, 15 * 60_000)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(changePasswordSchema)) body: z.infer<typeof changePasswordSchema>,
  ) {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { success: true };
  }

  private device(request: AuthedRequest) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
