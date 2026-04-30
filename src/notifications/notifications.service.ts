import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all users with given role names
   */
  async findUsersByRoles(roleNames: string[]) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: {
          name: {
            in: roleNames,
          },
        },
      },
      select: {
        id: true,
        corporationId: true,
      },
    });
  }

  /**
   * Find a user by ID, returning id and corporationId
   */
  async findUserById(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        corporationId: true,
      },
    });
  }

  /**
   * Get WebSocket room names for a user
   */
  getUserRooms(userId: number, corporationId: number | null): string[] {
    const rooms = [`user:${userId}`];
    if (corporationId) {
      rooms.push(`corp:${corporationId}`);
    }
    return rooms;
  }
}
