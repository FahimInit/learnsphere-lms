import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User as UserIcon,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(2000).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Must contain at least one letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export function ProfilePage(): React.ReactElement {
  const { user, updateProfile, becomeInstructor } = useAuthStore();
  const [profileStatus, setProfileStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSavingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      headline: user?.headline || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSavingPassword },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const onSaveProfile = async (values: ProfileFormValues) => {
    setProfileStatus(null);
    try {
      await updateProfile(values);
      setProfileStatus({
        type: 'success',
        message: 'Profile updated successfully.',
      });
    } catch (err) {
      setProfileStatus({
        type: 'error',
        message: extractErrorMessage(err),
      });
    }
  };

  const onSavePassword = async (values: PasswordChangeValues) => {
    setPasswordStatus(null);
    try {
      await apiClient.patch('/users/change-password', values);
      resetPasswordForm();
      setPasswordStatus({
        type: 'success',
        message: 'Password changed successfully.',
      });
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message: extractErrorMessage(err),
      });
    }
  };

  const handleUpgradeToInstructor = async () => {
    setIsUpgrading(true);
    setProfileStatus(null);
    try {
      await becomeInstructor();
      setProfileStatus({
        type: 'success',
        message: 'Account upgraded! You now have access to the Instructor Studio.',
      });
    } catch (err) {
      setProfileStatus({
        type: 'error',
        message: extractErrorMessage(err),
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account & Profile Settings
          </h1>
          <p className="text-sm text-slate-500">
            Manage your public profile, account security, and role permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="capitalize">
            {user.role}
          </Badge>
          <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
            {user.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-indigo-600" />
                <CardTitle>Public Profile</CardTitle>
              </div>
              <CardDescription>
                Information visible on courses, certificates, and discussions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileStatus ? (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    profileStatus.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {profileStatus.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{profileStatus.message}</span>
                </div>
              ) : null}

              <form
                onSubmit={handleProfileSubmit(onSaveProfile)}
                className="space-y-4"
                noValidate
              >
                <Input
                  label="Email Address"
                  value={user.email}
                  disabled
                  readOnly
                />

                <Input
                  label="Full Name"
                  error={profileErrors.name?.message}
                  {...registerProfile('name')}
                />

                <Input
                  label="Headline"
                  placeholder="e.g., Full-Stack Software Engineer"
                  error={profileErrors.headline?.message}
                  {...registerProfile('headline')}
                />

                <Input
                  label="Avatar URL"
                  placeholder="https://images.unsplash.com/..."
                  error={profileErrors.avatarUrl?.message}
                  {...registerProfile('avatarUrl')}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Biography
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    placeholder="Share your background, goals, or teaching experience..."
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    {...registerProfile('bio')}
                  />
                  {profileErrors.bio?.message ? (
                    <p className="text-xs text-red-600">
                      {profileErrors.bio.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" isLoading={isSavingProfile}>
                  Save Profile Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>
                Update your password and rotate active sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordStatus ? (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    passwordStatus.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              ) : null}

              <form
                onSubmit={handlePasswordSubmit(onSavePassword)}
                className="space-y-4"
                noValidate
              >
                <Input
                  label="Current Password"
                  type="password"
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />

                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters with letters & numbers"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />

                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={isSavingPassword}
                >
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {user.role === 'student' ? (
            <Card className="border-indigo-200 bg-indigo-50/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base">Teach on LearnSphere</CardTitle>
                </div>
                <CardDescription>
                  Upgrade your account to author courses, quizzes, and assignments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleUpgradeToInstructor}
                  isLoading={isUpgrading}
                  className="w-full"
                >
                  Become an Instructor
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Account ID:</span>
                <span className="font-mono">{user.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Role:</span>
                <span className="capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Status:</span>
                <span className="capitalize">{user.status}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
