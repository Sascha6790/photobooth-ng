import { UserRole } from '../entities/user.entity';

export interface JwtPayload {
  sub: string; // User ID
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}