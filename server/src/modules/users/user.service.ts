import { User, hashPassword, PublicUserProfile } from './user.model';
import { AppError } from '../../utils/AppError';
import { signAccessToken } from '../../utils/jwt';
import { UpdateProfileInput, ChangePasswordInput } from './user.validator';

export class UserService {
  async getProfile(userId: string): Promise<PublicUserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }
    return user.toPublicProfile();
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.headline !== undefined) user.headline = input.headline;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;

    await user.save();
    return user.toPublicProfile();
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash +refreshTokens');
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const isCurrentValid = await user.comparePassword(input.currentPassword);
    if (!isCurrentValid) {
      throw AppError.badRequest('Current password is incorrect');
    }

    if (input.currentPassword === input.newPassword) {
      throw AppError.badRequest('New password must be different from current password');
    }

    user.passwordHash = await hashPassword(input.newPassword);
    user.refreshTokens = [];
    await user.save();
  }

  async upgradeToInstructor(
    userId: string
  ): Promise<{ user: PublicUserProfile; accessToken: string }> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    if (user.role === 'instructor' || user.role === 'admin') {
      throw AppError.badRequest(`Account already has ${user.role} privileges`);
    }

    user.role = 'instructor';
    await user.save();

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    return {
      user: user.toPublicProfile(),
      accessToken,
    };
  }
}

export const userService = new UserService();
