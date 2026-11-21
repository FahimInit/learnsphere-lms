export type UserRole = 'student' | 'instructor' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
