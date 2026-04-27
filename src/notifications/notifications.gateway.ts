import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { JwtPayload } from '../common/types/jwt-payload.type';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  corporationId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('SECRET');
      if (!secret) {
        client.emit('error', { message: 'Server misconfiguration' });
        client.disconnect();
        return;
      }

      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      if (payload.type !== 'access') {
        client.emit('error', { message: 'Invalid token type' });
        client.disconnect();
        return;
      }

      const user = await this.notificationsService.findUserById(payload.sub);
      if (!user) {
        client.emit('error', { message: 'User not found' });
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.corporationId = user.corporationId ?? undefined;

      // Join user's personal room
      await client.join(`user:${user.id}`);

      // Join corporation room if applicable
      if (user.corporationId) {
        await client.join(`corp:${user.corporationId}`);
      }

      client.emit('connected', { userId: user.id });
    } catch {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Cleanup if needed
  }

  /**
   * Emit an event to a specific user's room
   */
  emitToUser(userId: number, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit an event to all users with specified roles
   */
  async broadcastToRoles(
    event: string,
    data: unknown,
    roleNames: string[],
    options?: { excludeUserIds?: number[] },
  ) {
    const excluded = new Set(options?.excludeUserIds ?? []);
    const users = await this.notificationsService.findUsersByRoles(roleNames);

    for (const user of users) {
      if (excluded.has(user.id)) {
        continue;
      }
      this.server.to(`user:${user.id}`).emit(event, data);
    }
  }

  /**
   * Emit ticket assigned notification
   */
  emitTicketAssigned(
    assignedToId: number,
    ticketId: number,
    title: string,
    assignedBy: number,
  ) {
    this.emitToUser(assignedToId, 'ticket:assigned', {
      ticketId,
      title,
      assignedBy,
      assignedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit ticket created notification to all admins and staff
   */
  async emitTicketCreated(
    ticketId: number,
    title: string,
    priority: string,
    createdBy: number,
  ) {
    const payload = {
      ticketId,
      title,
      priority,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    // Ensure the creator receives the event immediately.
    this.emitToUser(createdBy, 'ticket:created', payload);

    await this.broadcastToRoles('ticket:created', {
      ...payload,
    }, ['admin', 'staff', 'agent'], { excludeUserIds: [createdBy] });
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // Try auth token first (preferred for socket.io)
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    // Fallback to query param for compatibility with ws-style clients.
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    // Fallback to Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}