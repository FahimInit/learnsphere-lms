import { User, hashPassword, PublicUserProfile, IUserDocument } from '../users/user.model';
import { AppError } from '../../utils/AppError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
} from '../../utils/jwt';
import { emailService } from '../../infrastructure/email/email.service';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validator';

export interface AuthSessionResult {
  user: PublicUserProfile;
  accessToken: string;
  refreshToken: string;
}

const MAX_ACTIVE_SESSIONS = 5;

function issueTokensForUser(user: IUserDocument): {
  accessToken: string;
  refreshToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });

  const { token: refreshToken, tokenHash, expiresAt } = signRefreshToken(
    user._id.toString()
  );

  return { accessToken, refreshToken, tokenHash, expiresAt };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthSessionResult> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const { rawToken: verificationToken, tokenHash: verificationHash } =
      generateRandomToken(32);

    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? 'student',
      status: 'active',
      headline: input.headline ?? '',
      emailVerificationTokenHash: verificationHash,
      lastLoginAt: new Date(),
    });

    const { accessToken, refreshToken, tokenHash, expiresAt } = issueTokensForUser(user);
    user.refreshTokens = [{ tokenHash, expiresAt, createdAt: new Date() }];
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      subject: 'Welcome to LearnSphere — Verify Your Email',
      text: `Welcome to LearnSphere, ${user.name}! Your verification token is: ${verificationToken}`,
    });

    return {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthSessionResult> {
    const user = await User.findOne({ email: input.email }).select(
      '+passwordHash +refreshTokens'
    );

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended by an administrator'
      );
    }

    const now = new Date();
    const activeSessions = (user.refreshTokens || []).filter(
      (session) => session.expiresAt > now
    );

    const { accessToken, refreshToken, tokenHash, expiresAt } = issueTokensForUser(user);
    activeSessions.push({ tokenHash, expiresAt, createdAt: now });

    user.refreshTokens = activeSessions.slice(-MAX_ACTIVE_SESSIONS);
    user.lastLoginAt = now;
    await user.save();

    return {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    };
  }

  async refreshSession(rawRefreshToken?: string): Promise<AuthSessionResult> {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is missing');
    }

    const decoded = verifyRefreshToken(rawRefreshToken);
    const incomingHash = hashToken(rawRefreshToken);

    const user = await User.findById(decoded.sub).select('+refreshTokens');
    if (!user) {
      throw AppError.unauthorized('Account associated with refresh token was not found');
    }

    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended by an administrator'
      );
    }

    const now = new Date();
    const validSessions = (user.refreshTokens || []).filter(
      (session) => session.expiresAt > now
    );

    const matchingSession = validSessions.find(
      (session) => session.tokenHash === incomingHash
    );

    if (!matchingSession) {
      // Possible token reuse / replay attempt: revoke all active sessions for safety
      user.refreshTokens = [];
      await user.save();
      throw AppError.unauthorized('Refresh token is invalid or has already been rotated');
    }

    const remainingSessions = validSessions.filter(
      (session) => session.tokenHash !== incomingHash
    );

    const { accessToken, refreshToken, tokenHash, expiresAt } = issueTokensForUser(user);
    remainingSessions.push({ tokenHash, expiresAt, createdAt: now });

    user.refreshTokens = remainingSessions.slice(-MAX_ACTIVE_SESSIONS);
    await user.save();

    return {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const decoded = verifyRefreshToken(rawRefreshToken);
      const incomingHash = hashToken(rawRefreshToken);
      const user = await User.findById(decoded.sub).select('+refreshTokens');
      if (!user) return;

      user.refreshTokens = (user.refreshTokens || []).filter(
        (session) => session.tokenHash !== incomingHash
      );
      await user.save();
    } catch {
      // Ignore expired token errors during logout
    }
  }

  async forgotPassword(
    input: ForgotPasswordInput
  ): Promise<Record<string, never>> {
    const user = await User.findOne({ email: input.email }).select(
      '+passwordResetTokenHash +passwordResetExpiresAt'
    );

    if (!user) {
      return {};
    }

    const { rawToken, tokenHash } = generateRandomToken(32);
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      subject: 'LearnSphere — Password Reset Request',
      text: `Use the following token to reset your password within 60 minutes: ${rawToken}`,
    });

    return {};
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +refreshTokens');

    if (!user) {
      throw AppError.badRequest('Invalid or expired password reset token');
    }

    user.passwordHash = await hashPassword(input.password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokens = [];
    await user.save();
  }

  async verifyEmail(rawToken: string): Promise<PublicUserProfile> {
    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
    }).select('+emailVerificationTokenHash');

    if (!user) {
      throw AppError.badRequest('Invalid or expired email verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    await user.save();

    return user.toPublicProfile();
  }

  async getCurrentUser(userId: string): Promise<PublicUserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user.toPublicProfile();
  }
}

export const authService = new AuthService();
