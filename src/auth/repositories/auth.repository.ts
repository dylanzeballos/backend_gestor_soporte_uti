import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma.service';

interface RefreshSessionData {
  userId: number;
  tokenHash: string;
  issuedAt: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveRefreshSession(
    sessionKey: string,
    data: RefreshSessionData,
    expireDate: Date,
  ) {
    return this.prisma.sessionStore.upsert({
      where: { sessionKey },
      create: {
        sessionKey,
        sessionData: JSON.stringify(data),
        expireDate,
      },
      update: {
        sessionData: JSON.stringify(data),
        expireDate,
      },
    });
  }

  async findRefreshSession(sessionKey: string) {
    return this.prisma.sessionStore.findUnique({
      where: { sessionKey },
    });
  }

  async deleteRefreshSession(sessionKey: string) {
    await this.prisma.sessionStore.deleteMany({
      where: { sessionKey },
    });
  }
}
