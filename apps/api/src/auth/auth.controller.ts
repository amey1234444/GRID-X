import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  partnerPasswordLoginSchema,
  refreshSchema,
  requestOtpSchema,
  resetPasswordSchema,
  twoFactorCodeSchema,
  updateLanguageSchema,
  verifyOtpSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { AllowEnrolmentSession, CurrentUser, Public, RateLimit } from '../common/decorators';
import { AuthedRequest, RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit('login')
  @Post('login')
  login(
    @Body(zodBody(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.login(body, this.device(request));
  }

  @Public()
  @RateLimit('signup')
  @Post('otp/request')
  requestOtp(@Body(zodBody(requestOtpSchema)) body: z.infer<typeof requestOtpSchema>) {
    return this.auth.requestOtp(body);
  }

  @Public()
  @RateLimit('login')
  @Post('otp/verify')
  verifyOtp(
    @Body(zodBody(verifyOtpSchema)) body: z.infer<typeof verifyOtpSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.verifyOtp(body, this.device(request));
  }

  @Public()
  @RateLimit('login')
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

  @AllowEnrolmentSession()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.loadAuthUser(user.id);
  }

  /** Section 19 — a partner switching their own interface language. */
  @Post('language')
  setLanguage(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(updateLanguageSchema)) body: z.infer<typeof updateLanguageSchema>,
  ) {
    return this.auth.setLanguage(user.id, body.language);
  }

  @RateLimit('login')
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(changePasswordSchema)) body: z.infer<typeof changePasswordSchema>,
  ) {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { success: true };
  }

  /**
   * Section 18 two-factor enrolment. Rate limited like the other credential routes: a code is a
   * six-digit secret and must not be brute-forceable.
   */
  @AllowEnrolmentSession()
  @RateLimit('signup')
  @Post('2fa/enrol')
  beginTwoFactor(@CurrentUser() user: RequestUser) {
    return this.auth.beginTwoFactorEnrolment(user.id);
  }

  @AllowEnrolmentSession()
  @RateLimit('login')
  @Post('2fa/confirm')
  confirmTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(twoFactorCodeSchema)) body: z.infer<typeof twoFactorCodeSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.confirmTwoFactorEnrolment(user.id, body.code, this.device(request));
  }

  @RateLimit('login')
  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(twoFactorCodeSchema)) body: z.infer<typeof twoFactorCodeSchema>,
  ) {
    return this.auth.disableTwoFactor(user.id, body.code);
  }

  /**
   * Section 18 — password recovery. Both routes are public and rate limited: the first is a way to
   * probe which addresses exist if it is not, and the second is a token guess if it is not.
   */
  @Public()
  @RateLimit('signup')
  @Post('password/forgot')
  forgotPassword(
    @Body(zodBody(forgotPasswordSchema)) body: z.infer<typeof forgotPasswordSchema>,
    @Req() request: AuthedRequest,
  ) {
    return this.auth.requestPasswordReset(body.email, this.device(request));
  }

  @Public()
  @RateLimit('login')
  @Post('password/reset')
  resetPassword(
    @Body(zodBody(resetPasswordSchema)) body: z.infer<typeof resetPasswordSchema>,
  ) {
    return this.auth.resetPassword(body.token, body.password);
  }

  private device(request: AuthedRequest) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
