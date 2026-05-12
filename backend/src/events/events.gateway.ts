import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    role?: string;
    bots?: Set<string>;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth as any)?.token ||
      (client.handshake.headers.authorization as string)?.replace(
        /^Bearer /,
        '',
      );

    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: no token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.bots = new Set();
      this.logger.log(`Socket connected: ${client.id} (user ${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBot')
  joinBot(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() botId: string,
  ) {
    if (!botId || !client.data.userId) return { ok: false };

    if (client.data.bots) {
      for (const prev of client.data.bots) {
        client.leave(`bot:${prev}`);
      }
      client.data.bots.clear();
    }

    client.join(`bot:${botId}`);
    client.data.bots!.add(botId);
    return { ok: true };
  }

  @SubscribeMessage('leaveBot')
  leaveBot(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() botId: string,
  ) {
    if (!botId) return { ok: false };
    client.leave(`bot:${botId}`);
    client.data.bots?.delete(botId);
    return { ok: true };
  }

  notifyNewMessage(botId: string, message: any) {
    if (!botId) return;
    this.server.to(`bot:${botId}`).emit('newMessage', message);
  }

  notifyUserRead(botId: string, userId: string) {
    if (!botId) return;
    this.server.to(`bot:${botId}`).emit('userRead', { botId, userId });
  }
}
