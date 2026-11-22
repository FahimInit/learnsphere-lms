import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Shield,
  Users,
  BookCheck,
  Flag,
  FolderKanban,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Plus,
  Settings,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { UserProfile } from '@/types/auth';
import { CategoryItem, CourseItem } from '@/types/course';
import {
  AdminAnalyticsPayload,
  AuditLogItem,
  PlatformSettingsItem,
} from '@/types/phase7';
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

type AdminTab =
  | 'overview'
  | 'courses'
  | 'users'
  | 'categories'
  | 'moderation'
  | 'audit';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export function AdminConsolePage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // User search/filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Course rejection reason inputs keyed by courseId
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>(
    {}
  );

  // Category creation state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Platform settings state
  const [platformName, setPlatformName] = useState('LearnSphere');
  const [supportEmail, setSupportEmail] = useState('');
  const [allowInstructorSignup, setAllowInstructorSignup] = useState(true);
  const [announcementBanner, setAnnouncementBanner] = useState('');

  const { data: analytics } = useQuery<AdminAnalyticsPayload>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/admin');
      return res.data.data;
    },
  });

  const { data: usersData } = useQuery<{ users: UserProfile[] }>({
    queryKey: ['admin-users', userSearch, userRoleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set('q', userSearch.trim());
      if (userRoleFilter) params.set('role', userRoleFilter);
      const res = await apiClient.get(`/admin/users?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab === 'users',
  });

  const { data: pendingCourses = [] } = useQuery<CourseItem[]>({
    queryKey: ['admin-pending-courses'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/courses/pending');
      return res.data.data.courses;
    },
    enabled: activeTab === 'courses' || activeTab === 'overview',
  });

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories?includeInactive=true');
      return res.data.data.categories;
    },
    enabled: activeTab === 'categories',
  });

  const { data: reportedData } = useQuery<{
    reportedDiscussions: Array<{
      _id: string;
      title: string;
      content: string;
      reportReason: string;
      author?: { name: string; email: string };
      course?: { title: string };
    }>;
    reportedComments: Array<{
      _id: string;
      content: string;
      reportReason: string;
      author?: { name: string; email: string };
      discussion?: { title: string };
    }>;
  }>({
    queryKey: ['admin-reported'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/moderation/reported');
      return res.data.data;
    },
    enabled: activeTab === 'moderation',
  });

  const { data: auditLogs = [] } = useQuery<AuditLogItem[]>({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/audit-logs');
      return res.data.data.logs;
    },
    enabled: activeTab === 'audit',
  });

  const { data: settingsData } = useQuery<PlatformSettingsItem>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/settings');
      return res.data.data.settings;
    },
    enabled: activeTab === 'audit',
  });

  useEffect(() => {
    if (settingsData) {
      setPlatformName(settingsData.platformName);
      setSupportEmail(settingsData.supportEmail);
      setAllowInstructorSignup(settingsData.allowInstructorSignup);
      setAnnouncementBanner(settingsData.announcementBanner || '');
    }
  }, [settingsData]);

  const moderateCourseMutation = useMutation({
    mutationFn: async ({
      courseId,
      action,
    }: {
      courseId: string;
      action: 'approve' | 'reject';
    }) => {
      await apiClient.patch(`/admin/courses/${courseId}/moderate`, {
        action,
        rejectionReason: rejectionNotes[courseId] || '',
      });
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-pending-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setBanner({
        type: 'success',
        message:
          vars.action === 'approve'
            ? 'Course approved and published.'
            : 'Course rejected with feedback.',
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: 'active' | 'suspended';
    }) => {
      await apiClient.patch(`/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setBanner({ type: 'success', message: 'User account status updated.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: 'student' | 'instructor' | 'admin';
    }) => {
      await apiClient.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setBanner({ type: 'success', message: 'User role updated.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim(),
      });
    },
    onSuccess: () => {
      setNewCatName('');
      setNewCatDesc('');
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      setBanner({ type: 'success', message: 'Category created.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setBanner({ type: 'success', message: 'Category deleted.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({
      type,
      id,
      action,
    }: {
      type: 'discussion' | 'comment';
      id: string;
      action: 'dismiss' | 'remove';
    }) => {
      await apiClient.patch(`/admin/moderation/${type}/${id}`, { action });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reported'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setBanner({ type: 'success', message: 'Moderation decision applied.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/admin/settings', {
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        allowInstructorSignup,
        announcementBanner: announcementBanner.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setBanner({ type: 'success', message: 'Platform settings saved.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactElement }> =
    [
      {
        id: 'overview',
        label: 'Platform Analytics',
        icon: <Activity className="h-4 w-4" />,
      },
      {
        id: 'courses',
        label: `Course Review (${pendingCourses.length})`,
        icon: <BookCheck className="h-4 w-4" />,
      },
      {
        id: 'users',
        label: 'Users',
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: <FolderKanban className="h-4 w-4" />,
      },
      {
        id: 'moderation',
        label: `Reported (${analytics?.summary.reportedContentCount ?? 0})`,
        icon: <Flag className="h-4 w-4" />,
      },
      {
        id: 'audit',
        label: 'Audit Logs & Settings',
        icon: <Settings className="h-4 w-4" />,
      },
    ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin Governance Console
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Monitor platform health, moderate courses &amp; reports, and manage
            users
          </p>
        </div>
      </div>

      {banner ? (
        <div
          className={`flex items-center justify-between rounded-lg border p-3.5 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === 'overview' && analytics ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Platform Users</CardDescription>
                <CardTitle className="text-2xl">
                  {analytics.summary.totalUsers}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {analytics.summary.activeUsers} active •{' '}
                {analytics.summary.suspendedUsers} suspended
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Courses (Published / Total)</CardDescription>
                <CardTitle className="text-2xl text-indigo-600">
                  {analytics.summary.publishedCourses} /{' '}
                  {analytics.summary.totalCourses}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {analytics.summary.pendingApprovalCourses} awaiting review
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Enrollments</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">
                  {analytics.summary.totalEnrollments}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {analytics.summary.completedEnrollments} completions
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Certificates Issued</CardDescription>
                <CardTitle className="text-2xl">
                  {analytics.summary.certificatesIssued}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {analytics.summary.reportedContentCount} reported items pending
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Published Courses by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.breakdowns.categoriesDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="courses"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Role Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.breakdowns.usersByRole}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {analytics.breakdowns.usersByRole.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* TAB 2: COURSE MODERATION QUEUE */}
      {activeTab === 'courses' ? (
        <div className="space-y-4">
          {pendingCourses.length === 0 ? (
            <Card className="py-12 text-center text-sm text-slate-500">
              No courses currently awaiting administrator review.
            </Card>
          ) : (
            pendingCourses.map((course) => (
              <Card key={course._id}>
                <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <Badge variant="warning">Pending Review</Badge>
                    </div>
                    <CardDescription>
                      Instructor: {course.instructor?.name} (
                      {course.instructor?.email}) • Category:{' '}
                      {course.category?.name} • {course.totalLessonsCount}{' '}
                      lessons
                    </CardDescription>
                    <p className="text-sm text-slate-700 pt-1">
                      {course.shortDescription}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:w-72">
                    <Input
                      placeholder="Rejection feedback (required if rejecting)"
                      value={rejectionNotes[course._id] || ''}
                      onChange={(e) =>
                        setRejectionNotes((prev) => ({
                          ...prev,
                          [course._id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        isLoading={moderateCourseMutation.isPending}
                        onClick={() =>
                          moderateCourseMutation.mutate({
                            courseId: course._id,
                            action: 'approve',
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        isLoading={moderateCourseMutation.isPending}
                        onClick={() =>
                          moderateCourseMutation.mutate({
                            courseId: course._id,
                            action: 'reject',
                          })
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' ? (
        <Card>
          <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>
                Assign roles and manage account activation/suspension
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(usersData?.users || []).map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateUserRoleMutation.mutate({
                            userId: u.id,
                            role: e.target.value as
                              | 'student'
                              | 'instructor'
                              | 'admin',
                          })
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="student">student</option>
                        <option value="instructor">instructor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={u.status === 'active' ? 'success' : 'danger'}
                        className="capitalize"
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {u.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            updateUserStatusMutation.mutate({
                              userId: u.id,
                              status: 'suspended',
                            })
                          }
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateUserStatusMutation.mutate({
                              userId: u.id,
                              status: 'active',
                            })
                          }
                        >
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {/* TAB 4: CATEGORIES */}
      {activeTab === 'categories' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Course Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newCatName.trim().length < 2) return;
                  createCategoryMutation.mutate();
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <Input
                  placeholder="Category name (e.g., Mobile Engineering)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <Input
                  placeholder="Short description..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
                <Button type="submit" isLoading={createCategoryMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat._id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {cat.description || 'No description'}
                    </CardDescription>
                    <p className="mt-2 text-xs font-medium text-indigo-600">
                      {cat.courseCount} published courses
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategoryMutation.mutate(cat._id)}
                    title="Delete unused category"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* TAB 5: REPORTED CONTENT MODERATION */}
      {activeTab === 'moderation' ? (
        <div className="space-y-4">
          {(reportedData?.reportedDiscussions.length || 0) === 0 &&
          (reportedData?.reportedComments.length || 0) === 0 ? (
            <Card className="py-12 text-center text-sm text-slate-500">
              No reported discussions or comments awaiting moderation.
            </Card>
          ) : (
            <>
              {(reportedData?.reportedDiscussions || []).map((d) => (
                <Card key={d._id} className="border-amber-200">
                  <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="space-y-1">
                      <Badge variant="warning">Reported Thread</Badge>
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <p className="text-xs text-slate-500">
                        Author: {d.author?.name} • Reason:{' '}
                        <strong className="text-red-700">{d.reportReason}</strong>
                      </p>
                      <p className="text-sm text-slate-700 pt-1">{d.content}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          resolveReportMutation.mutate({
                            type: 'discussion',
                            id: d._id,
                            action: 'dismiss',
                          })
                        }
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          resolveReportMutation.mutate({
                            type: 'discussion',
                            id: d._id,
                            action: 'remove',
                          })
                        }
                      >
                        Delete Thread
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {(reportedData?.reportedComments || []).map((c) => (
                <Card key={c._id} className="border-amber-200">
                  <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="space-y-1">
                      <Badge variant="warning">Reported Reply</Badge>
                      <p className="text-xs text-slate-500">
                        Author: {c.author?.name} • Reason:{' '}
                        <strong className="text-red-700">{c.reportReason}</strong>
                      </p>
                      <p className="text-sm text-slate-700 pt-1">{c.content}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          resolveReportMutation.mutate({
                            type: 'comment',
                            id: c._id,
                            action: 'dismiss',
                          })
                        }
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          resolveReportMutation.mutate({
                            type: 'comment',
                            id: c._id,
                            action: 'remove',
                          })
                        }
                      >
                        Delete Reply
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : null}

      {/* TAB 6: AUDIT LOGS & PLATFORM SETTINGS */}
      {activeTab === 'audit' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Platform Settings</CardTitle>
              <CardDescription>
                Configure global LearnSphere behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Platform Name"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
              <Input
                label="Support Email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <Input
                label="Global Announcement Banner"
                placeholder="Optional site-wide notice..."
                value={announcementBanner}
                onChange={(e) => setAnnouncementBanner(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allowInstructorSignup}
                  onChange={(e) => setAllowInstructorSignup(e.target.checked)}
                />
                Allow Instructor Self-Registration
              </label>
              <Button
                className="w-full"
                isLoading={saveSettingsMutation.isPending}
                onClick={() => saveSettingsMutation.mutate()}
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Platform Audit Trail</CardTitle>
              <CardDescription>
                Immutable log of administrative governance actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No administrative actions recorded yet.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <Badge variant="outline" className="mr-2">
                        {log.action}
                      </Badge>
                      <span className="font-medium text-slate-800">
                        {log.actor?.name || 'Admin'}
                      </span>{' '}
                      acted on {log.targetType} ({log.targetId.slice(-6)})
                    </div>
                    <span className="text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
