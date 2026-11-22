import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  User as UserIcon,
  BookOpen,
  LayoutDashboard,
  Shield,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/features/notifications/NotificationBell';

export function Navbar(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link to="/" onClick={closeMobileMenu} className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LearnSphere
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link
              to="/courses"
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-indigo-600 transition-colors"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              Catalog
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-indigo-600 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                My Learning
              </Link>
            ) : null}

            {user && (user.role === 'instructor' || user.role === 'admin') ? (
              <Link
                to="/instructor"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-indigo-600 transition-colors"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                Instructor Studio
              </Link>
            ) : null}

            {user && user.role === 'admin' ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-indigo-600 transition-colors"
              >
                <Shield className="h-4 w-4 shrink-0" />
                Admin Console
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <NotificationBell />
              <Badge
                variant={
                  user.role === 'admin'
                    ? 'danger'
                    : user.role === 'instructor'
                    ? 'default'
                    : 'secondary'
                }
                className="hidden sm:inline-flex capitalize"
              >
                {user.role}
              </Badge>
              <Link to="/profile" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm">
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="max-w-[110px] truncate">{user.name}</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="Log out"
                className="hidden sm:inline-flex"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
          <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
            <Link
              to="/courses"
              onClick={closeMobileMenu}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-indigo-600"
            >
              <BookOpen className="h-4 w-4" />
              Catalog
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-indigo-600"
              >
                <LayoutDashboard className="h-4 w-4" />
                My Learning
              </Link>
            ) : null}

            {user && (user.role === 'instructor' || user.role === 'admin') ? (
              <Link
                to="/instructor"
                onClick={closeMobileMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-indigo-600"
              >
                <Sparkles className="h-4 w-4" />
                Instructor Studio
              </Link>
            ) : null}

            {user && user.role === 'admin' ? (
              <Link
                to="/admin"
                onClick={closeMobileMenu}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-indigo-600"
              >
                <Shield className="h-4 w-4" />
                Admin Console
              </Link>
            ) : null}
          </nav>

          <div className="mt-3 border-t border-slate-100 pt-3">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {user.name}
                  </span>
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
                </div>
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <UserIcon className="h-4 w-4" />
                  Profile &amp; Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:hidden">
                <Link to="/login" onClick={closeMobileMenu}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={closeMobileMenu}>
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
