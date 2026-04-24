import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { JwtPayload } from '../common/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './repositories/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailForAuth(email);
    if (!user?.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      sub: user.id,
      email: user.email,
    };
  }

  async login(userId: number, email: string) {
    return this.issueTokenPair(userId, email);
  }

  async refreshTokens(payload: JwtPayload, refreshToken: string) {
    if (!payload.jti || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const session = await this.authRepository.findRefreshSession(payload.jti);
    if (!session || session.expireDate.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh session expired');
    }

    const parsedData = this.parseSessionData(session.sessionData);
    const isTokenValid = await bcrypt.compare(refreshToken, parsedData.tokenHash);
    if (!isTokenValid) {
      await this.authRepository.deleteRefreshSession(payload.jti);
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.usersService.findByIdForAuth(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.authRepository.deleteRefreshSession(payload.jti);
    return this.issueTokenPair(user.id, user.email);
  }

  async logout(payload: JwtPayload) {
    if (payload.jti) {
      await this.authRepository.deleteRefreshSession(payload.jti);
    }
  }

  getProfile(userId: number) {
    return this.usersService.findOne(userId);
  }

  private async issueTokenPair(userId: number, email: string) {
    const accessTokenSecret = this.configService.get<string>('SECRET');
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? accessTokenSecret;
    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new UnauthorizedException('JWT secrets are not configured');
    }

    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '60m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '1d';
    const accessExpiresInSeconds = this.durationStringToSeconds(accessExpiresIn);
    const refreshExpiresInSeconds = this.durationStringToSeconds(refreshExpiresIn);
    const refreshJti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: 'access',
      },
      {
        secret: accessTokenSecret,
        expiresIn: accessExpiresInSeconds,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        type: 'refresh',
        jti: refreshJti,
      },
      {
        secret: refreshTokenSecret,
        expiresIn: refreshExpiresInSeconds,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshExpiryDate = new Date(
      Date.now() + this.durationStringToMs(refreshExpiresIn),
    );

    await this.authRepository.saveRefreshSession(
      refreshJti,
      {
        userId,
        tokenHash: refreshTokenHash,
        issuedAt: new Date().toISOString(),
      },
      refreshExpiryDate,
    );

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      expiresIn: accessExpiresInSeconds,
      refreshExpiresIn: refreshExpiresInSeconds,
    };
  }

  private parseSessionData(rawSessionData: string | null) {
    if (!rawSessionData) {
      throw new UnauthorizedException('Refresh session data missing');
    }

    try {
      const data = JSON.parse(rawSessionData) as {
        userId: number;
        tokenHash: string;
        issuedAt: string;
      };
      if (!data.tokenHash) {
        throw new UnauthorizedException('Refresh session is malformed');
      }

      return data;
    } catch {
      throw new UnauthorizedException('Refresh session data is invalid');
    }
  }

  private durationStringToMs(input: string) {
    const normalized = input.trim();
    const match = normalized.match(/^(\d+)([smhd])$/i);
    if (!match) {
      return 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private durationStringToSeconds(input: string) {
    return Math.floor(this.durationStringToMs(input) / 1000);
  }
}
