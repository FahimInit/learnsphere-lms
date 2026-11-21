export type UserRole = 'student' | 'instructor' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl: string;
  headline: string;
  bio: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionPayload {
  user: UserProfile;
  accessToken: string;
}
