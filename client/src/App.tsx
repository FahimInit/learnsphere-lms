import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookOpen, ShieldCheck, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  ProtectedRoute,
  RoleGuard,
  GuestOnlyRoute,
} from '@/components/layout/RouteGuards';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { InstructorDashboardPage } from '@/features/instructor/InstructorDashboardPage';
import { CourseEditorPage } from '@/features/instructor/CourseEditorPage';
import { CourseCatalogPage } from '@/features/catalog/CourseCatalogPage';
import { CourseDetailsPage } from '@/features/catalog/CourseDetailsPage';
import { StudentDashboardPage } from '@/features/learning/StudentDashboardPage';
import { CoursePlayerPage } from '@/features/learning/CoursePlayerPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { CertificateViewerPage } from '@/features/certificates/CertificateViewerPage';
import { AdminConsolePage } from '@/features/admin/AdminConsolePage';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LandingHome(): React.ReactElement {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center space-y-5">
        <Badge variant="default">Production-Grade MERN LMS</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Master New Skills with Structured Interactive Courses
        </h1>
        <p className="text-lg text-slate-600">
          LearnSphere connects ambitious students, expert instructors, and platform
          administrators in a unified learning workspace.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/courses">
            <Button size="lg">Explore Catalog</Button>
          </Link>
          {user ? (
            <Link
              to={
                user.role === 'instructor' || user.role === 'admin'
                  ? '/instructor'
                  : '/dashboard'
              }
            >
              <Button variant="outline" size="lg">
                {user.role === 'instructor' || user.role === 'admin'
                  ? 'Open Instructor Studio'
                  : 'My Learning Dashboard'}
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button variant="outline" size="lg">
                Create Free Account
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <BookOpen className="h-6 w-6 text-indigo-600 mb-2" />
            <CardTitle>Interactive Curriculum</CardTitle>
            <CardDescription>
              Structured sections, video & markdown lessons, and auto-resume learning.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Track progress accurately across every module and earn verifiable certificates.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BarChart3 className="h-6 w-6 text-indigo-600 mb-2" />
            <CardTitle>Quizzes & Assignments</CardTitle>
            <CardDescription>
              Instant automated quiz grading and instructor assignment reviews.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Multi-type question support with attempt limits and detailed grade histories.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="h-6 w-6 text-indigo-600 mb-2" />
            <CardTitle>Role-Based Governance</CardTitle>
            <CardDescription>
              Dedicated workflows for Students, Instructors, and Administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Course review queues, real-time notifications, and deep platform analytics.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AppRoutes(): React.ReactElement {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<LandingHome />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/courses/:slugOrId" element={<CourseDetailsPage />} />
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:courseId"
          element={
            <ProtectedRoute>
              <CoursePlayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <InstructorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/instructor/courses/:courseId/edit"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <CourseEditorPage />
            </RoleGuard>
          }
        />
        <Route
          path="/certificates/verify"
          element={<CertificateViewerPage />}
        />
        <Route
          path="/certificates/verify/:code"
          element={<CertificateViewerPage />}
        />
        <Route
          path="/certificates/:code"
          element={<CertificateViewerPage />}
        />
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AdminConsolePage />
            </RoleGuard>
          }
        />
        <Route path="*" element={<LandingHome />} />
      </Routes>
    </MainLayout>
  );
}

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
