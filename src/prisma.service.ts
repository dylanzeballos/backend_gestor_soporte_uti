import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { prismaClientOptions } from './lib/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(prismaClientOptions);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
