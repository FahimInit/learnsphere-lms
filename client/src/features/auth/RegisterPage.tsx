import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, AlertCircle, BookOpen, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { extractErrorMessage } from '@/lib/api';
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

const registerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  role: z.enum(['student', 'instructor']),
  headline: z.string().trim().max(160).optional(),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterPage(): React.ReactElement {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'student',
      headline: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const user = await registerUser(values);
      if (user.role === 'instructor') {
        navigate('/instructor', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join LearnSphere as a Student or Instructor
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                I want to join as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('role', 'student')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    selectedRole === 'student'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setValue('role', 'instructor')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    selectedRole === 'instructor'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Instructor
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              placeholder="Jane Doe"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Professional Headline (Optional)"
              placeholder={
                selectedRole === 'instructor'
                  ? 'Senior Distributed Systems Architect'
                  : 'Computer Science Student'
              }
              error={errors.headline?.message}
              {...register('headline')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 chars with letters & numbers"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create {selectedRole === 'instructor' ? 'Instructor' : 'Student'} Account
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-slate-100 pt-4 text-sm text-slate-600">
          Already have an account?&nbsp;
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
