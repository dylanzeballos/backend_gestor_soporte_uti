import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { RefreshAuthGuard } from '../common/guards/refresh-auth.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  login(@CurrentUser() user: JwtPayload & { sub: number; email: string }) {
    return this.authService.login(user.sub, user.email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  refresh(@CurrentUser() payload: JwtPayload, @Req() request: Request) {
    const authHeader = request.headers.authorization ?? '';
    const refreshToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.refreshTokens(payload, refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current refresh token session' })
  async logout(@CurrentUser() payload: JwtPayload) {
    await this.authService.logout(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  me(@CurrentUser('sub') userId: number) {
    return this.authService.getProfile(userId);
  }
}
