import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CheckCircle2,
  Printer,
  Search,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { CertificateItem } from '@/types/phase7';
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

export function CertificateViewerPage(): React.ReactElement {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [lookupInput, setLookupInput] = useState(code || '');

  const { data, isLoading, error } = useQuery<{
    valid: boolean;
    certificate: CertificateItem;
  }>({
    queryKey: ['certificate-verify', code],
    queryFn: async () => {
      const res = await apiClient.get(`/certificates/verify/${code}`);
      return res.data.data;
    },
    enabled: Boolean(code),
    retry: false,
  });

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupInput.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/certificates/verify/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
          <Link
            to={user ? '/dashboard' : '/courses'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {user ? 'Back to Dashboard' : 'Browse Courses'}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Certificate Verification &amp; Viewer
          </h1>
          <p className="text-sm text-slate-500">
            Verify the authenticity of any LearnSphere completion certificate
          </p>
        </div>

        {data?.certificate ? (
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        ) : null}
      </div>

      {/* Verification Lookup Bar */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <form
            onSubmit={handleVerifySubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1">
              <Input
                aria-label="Certificate Verification Code"
                placeholder="Enter certificate code (e.g., LS-2026-A1B2C3D4)"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4" />
              Verify Code
            </Button>
          </form>
        </CardContent>
      </Card>

      {!code ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-base">
              Public Certificate Registry
            </CardTitle>
            <CardDescription>
              Enter a unique LearnSphere certificate ID above to confirm student
              completion and course details.
            </CardDescription>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center text-sm text-slate-500">
          Verifying certificate signature...
        </Card>
      ) : error || !data?.certificate ? (
        <Card className="border-red-200 bg-red-50/50 py-10 text-center">
          <CardContent className="space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
            <CardTitle className="text-lg text-red-900">
              Certificate Not Found
            </CardTitle>
            <p className="text-sm text-red-700">
              {extractErrorMessage(error) ||
                `No authentic certificate was found for code "${code}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified Authentic:</strong> This certificate was issued by
              LearnSphere and matches our cryptographic registry.
            </span>
          </div>

          {/* Printable Certificate Canvas */}
          <div className="rounded-2xl border-8 border-double border-indigo-900/20 bg-white p-8 shadow-lg sm:p-12">
            <div className="space-y-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Award className="h-8 w-8" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">
                  LearnSphere LMS • Official Credential
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Certificate of Completion
                </h2>
              </div>

              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wider text-slate-500">
                  This certifies that
                </p>
                <p className="text-3xl font-bold text-indigo-700 sm:text-4xl">
                  {data.certificate.studentNameSnapshot}
                </p>
                <p className="text-sm text-slate-600">
                  has successfully fulfilled all curriculum requirements and completed
                </p>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {data.certificate.courseTitleSnapshot}
                </p>
              </div>

              <div className="grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Lead Instructor
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {data.certificate.instructorNameSnapshot}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Date Issued
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {new Date(data.certificate.issuedAt).toLocaleDateString(
                      'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Certificate ID
                  </p>
                  <div className="mt-1">
                    <Badge variant="default" className="font-mono">
                      {data.certificate.certificateCode}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
