import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

const resetSchema = z.object({
  token: z.string().trim().min(16, 'Valid reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export function ResetPasswordPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialToken = searchParams.get('token') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: initialToken,
      password: '',
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await apiClient.post('/auth/reset-password', values);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setServerError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            Provide your reset token and choose a new password
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverError ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          ) : null}

          {isSuccess ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Password updated! Redirecting you to sign in...</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Reset Token"
              placeholder="Paste your password reset token"
              error={errors.token?.message}
              {...register('token')}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 chars with letters & numbers"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Reset Password
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-slate-100 pt-4 text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
