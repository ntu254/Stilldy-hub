import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'
import { Injectable, Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(private readonly authService: AuthService) {}

  private extractToken(client: Socket): string | null {
    let token =
      client.handshake.auth?.token ||
      (client.handshake.query?.token as string) ||
      client.handshake.headers?.authorization

    if (!token || typeof token !== 'string') {
      return null
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7)
    }

    token = token.trim()
    return token || null
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client)

      if (!token) {
        this.logger.warn(`Connection rejected (no token provided): ${client.id}`)
        client.disconnect(true)
        return
      }

      const payload = await this.authService.verifyToken(token)
      if (!payload || !payload.userID) {
        this.logger.warn(`Connection rejected (invalid token): ${client.id}`)
        client.disconnect(true)
        return
      }

      const userId = payload.userID.toString()
      await client.join(userId)
      this.logger.log(`Client ${client.id} authenticated successfully and joined Room/User ID: ${userId}`)
    } catch (error: any) {
      this.logger.error(`Authentication error on connection: ${error.message}`)
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  sendNotificationToUser(userId: string, payload: any) {
    if (!this.server) {
      this.logger.error('WebSocket server is not initialized')
      return
    }
    this.server.to(userId).emit('newNotification', payload)
    this.logger.log(`Emitted newNotification to Room/User ID ${userId}`)
  }
}

