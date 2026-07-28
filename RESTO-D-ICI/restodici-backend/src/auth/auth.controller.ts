import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { REFRESH_COOKIE, refreshCookieOptions } from '../config/app-config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Pose le refresh token dans un cookie HttpOnly (jamais exposé au JS)
   * et le retire du corps de la réponse. L'access token, lui, reste dans le body.
   */
  private issueTokens(res: Response, result: Record<string, any>) {
    if (result?.refreshToken) {
      res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    }
    const clone = { ...result };
    delete clone.refreshToken;
    return clone;
  }

  @Public()
  @Post('register')
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 10 : 1000,
      ttl: 60000,
    },
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    return this.issueTokens(res, result);
  }

  @Public()
  @Post('login')
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 1000,
      ttl: 60000,
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    return this.issueTokens(res, result);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: { user: Record<string, any> }) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  updateMe(
    @Req() req: { user: Record<string, any> },
    @Body()
    body: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
    },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions().path });
    return { message: 'Déconnexion réussie' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Refresh token lu depuis le cookie HttpOnly (fallback body pour compat).
    const token: string =
      req.cookies?.[REFRESH_COOKIE] || (req.body as any)?.refreshToken;
    const result = await this.authService.refreshAccessToken(token);
    return this.issueTokens(res, result);
  }

  // Password reset routes
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 3 : 1000,
      ttl: 60000,
    },
  })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 1000,
      ttl: 60000,
    },
  })
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  // Email verification routes
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 1000,
      ttl: 60000,
    },
  })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 3 : 1000,
      ttl: 60000,
    },
  })
  async resendVerificationEmail(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: { user: Record<string, any> },
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
    );
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  async setup2FA(@Req() req: { user: Record<string, any> }) {
    return this.authService.setup2FA(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async enable2FA(
    @Req() req: { user: Record<string, any> },
    @Body('code') code: string,
  ) {
    return this.authService.enable2FA(req.user.id, code);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async disable2FA(@Req() req: { user: Record<string, any> }) {
    return this.authService.disable2FA(req.user.id);
  }

  @Public()
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 1000,
      ttl: 60000,
    },
  })
  async verifyTwoFactorLogin(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(tempToken, code);
    return this.issueTokens(res, result);
  }
}
