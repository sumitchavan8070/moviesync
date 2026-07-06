import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { TokenPayload } from '../types/index.js';

export class AuthService {
  signRoomToken(payload: Omit<TokenPayload, 'exp'>, expiresInHours?: number): string {
    const hours = expiresInHours ?? config.sessionExpiryHours;
    const exp = Math.floor(Date.now() / 1000) + hours * 3600;
    return jwt.sign({ ...payload, exp }, config.roomTokenSecret, {
      algorithm: 'HS256',
    });
  }

  verifyRoomToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.roomTokenSecret) as TokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  signHostToken(roomId: string, participantId: string): string {
    return this.signRoomToken({ roomId, participantId, isHost: true });
  }

  signGuestToken(roomId: string, participantId: string): string {
    return this.signRoomToken({ roomId, participantId, isHost: false });
  }
}

export const authService = new AuthService();
