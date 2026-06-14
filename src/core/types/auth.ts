export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'REVOKED';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
