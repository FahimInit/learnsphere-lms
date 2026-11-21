import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookOpen, GraduationCap, ShieldCheck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LandingFoundation(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LearnSphere
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="default">Platform v1.0</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <Badge variant="default">Production-Grade MERN LMS</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Master New Skills with Structured Interactive Courses
          </h1>
          <p className="text-lg text-slate-600">
            LearnSphere connects ambitious students, expert instructors, and platform
            administrators in a unified learning workspace.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button size="lg">Explore Catalog</Button>
            <Button variant="outline" size="lg">
              Instructor Studio
            </Button>
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
      </main>
    </div>
  );
}

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<LandingFoundation />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
