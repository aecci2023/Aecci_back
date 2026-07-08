import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/config';
import { corsOptions } from '../config/cors.config';

let ioInstance: SocketIOServer | null = null;

export class SocketService {
  private io: SocketIOServer;

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: corsOptions
    });

    ioInstance = this.io;
    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Admin joins a dedicated room to receive platform notifications
      socket.on('join-admin-room', () => {
        socket.join('admin-room');
        console.log(`Admin socket ${socket.id} joined admin-room`);
      });

      // Any user/partner joins their personal room for targeted notifications
      socket.on('join-user-room', (userId: string) => {
        if (!userId) return;
        socket.join(`user-${userId}`);
        console.log(`Socket ${socket.id} joined user-${userId}`);
      });

      socket.on('join-room', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        socket.join(sessionId);
        socket.to(sessionId).emit('user-joined', { userId, userName });
      });

      socket.on('leave-room', (sessionId: string) => {
        if (!sessionId) return;
        socket.leave(sessionId);
      });

      socket.on('raise-hand', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        this.io.to(sessionId).emit('hand-raised', { userId, userName, timestamp: Date.now() });
      });

      socket.on('lower-hand', (data: { sessionId: string; userId: string }) => {
        const { sessionId, userId } = data;
        if (!sessionId) return;
        this.io.to(sessionId).emit('hand-lowered', { userId });
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  link?: string;
  createdAt: string;
}

/** Emit a notification to a specific user's personal room */
export function emitToUser(userId: string, payload: NotificationPayload) {
  ioInstance?.to(`user-${userId}`).emit('notification', payload);
}

/** Emit a new-verification notification to all connected admins */
export function emitNewVerification(payload: { userId: string; fullName: string | null; companyName: string | null; userType: string | null; createdAt: string }) {
  ioInstance?.to('admin-room').emit('new-verification', payload);
}

/** Emit a notification to all admins in the admin room */
export function emitToAdmins(payload: NotificationPayload) {
  ioInstance?.to('admin-room').emit('notification', payload);
}
