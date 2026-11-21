import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  User as UserIcon,
  BookOpen,
  LayoutDashboard,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Navbar(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LearnSphere
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              to="/courses"
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Catalog
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                My Learning
              </Link>
            ) : null}

            {user && (user.role === 'instructor' || user.role === 'admin') ? (
              <Link
                to="/instructor"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Instructor Studio
              </Link>
            ) : null}

            {user && user.role === 'admin' ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin Console
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Badge
                variant={
                  user.role === 'admin'
                    ? 'danger'
                    : user.role === 'instructor'
                    ? 'default'
                    : 'secondary'
                }
                className="capitalize"
              >
                {user.role}
              </Badge>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  <UserIcon className="h-4 w-4" />
                  <span className="max-w-[140px] truncate">{user.name}</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
