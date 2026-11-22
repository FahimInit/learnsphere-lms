import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { InstructorDashboardPage } from './features/instructor/InstructorDashboardPage';
import { CourseCatalogPage } from './features/catalog/CourseCatalogPage';
import { StudentDashboardPage } from './features/learning/StudentDashboardPage';
import { InstructorAssessmentsPanel } from './features/assessments/InstructorAssessmentsPanel';
import { StudentAssessmentsPanel } from './features/assessments/StudentAssessmentsPanel';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { CourseCommunityPanel } from './features/discussions/CourseCommunityPanel';
import { CertificateViewerPage } from './features/certificates/CertificateViewerPage';
import { AdminConsolePage } from './features/admin/AdminConsolePage';
import { useAuthStore } from './stores/authStore';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LearnSphere Frontend Views & Interactive Workflows', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: true,
      isLoading: false,
    });
  });

  it('renders the LearnSphere brand header and primary callouts', () => {
    const { getByText } = render(<App />);
    expect(getByText('LearnSphere')).toBeInTheDocument();
    expect(
      getByText(/Master New Skills with Structured Interactive Courses/i)
    ).toBeInTheDocument();
  });

  it('renders LoginPage with email and password inputs', () => {
    const { getByText, getByLabelText } = renderWithProviders(<LoginPage />, '/login');
    expect(getByText('Welcome back')).toBeInTheDocument();
    expect(getByLabelText('Email Address')).toBeInTheDocument();
    expect(getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders RegisterPage and allows toggling between Student and Instructor roles', () => {
    const { getByText } = renderWithProviders(<RegisterPage />, '/register');
    expect(getByText('Create your account')).toBeInTheDocument();
    expect(getByText('Create Student Account')).toBeInTheDocument();

    fireEvent.click(getByText('Instructor'));
    expect(getByText('Create Instructor Account')).toBeInTheDocument();
  });

  it('renders InstructorDashboardPage and opens the Create New Course wizard modal', () => {
    const { getByText } = renderWithProviders(
      <InstructorDashboardPage />,
      '/instructor'
    );
    expect(getByText('Instructor Studio')).toBeInTheDocument();

    fireEvent.click(getByText('New Course'));
    expect(getByText('Create New Course')).toBeInTheDocument();
    expect(getByText('Create Draft & Open Editor')).toBeInTheDocument();
  });

  it('renders CourseCatalogPage with search bar and filter controls', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <CourseCatalogPage />,
      '/courses'
    );
    expect(getByText('Explore Industry-Standard Courses')).toBeInTheDocument();
    expect(getByLabelText('Search courses')).toBeInTheDocument();
    expect(getByLabelText('Filter by difficulty level')).toBeInTheDocument();
    expect(getByLabelText('Filter by price')).toBeInTheDocument();
  });

  it('renders StudentDashboardPage with KPI cards and enrollment filter tabs', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        name: 'Alice Learner',
        email: 'alice@learnsphere.test',
        role: 'student',
        status: 'active',
        avatarUrl: '',
        headline: '',
        bio: '',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'test-token',
      isInitialized: true,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(
      <StudentDashboardPage />,
      '/dashboard'
    );
    expect(getByText(/Welcome back, Alice Learner/i)).toBeInTheDocument();
    expect(getByText('Enrolled Courses')).toBeInTheDocument();
    expect(getByText('Average Completion')).toBeInTheDocument();
  });

  it('renders InstructorAssessmentsPanel with quiz and assignment builders', () => {
    const { getByText } = renderWithProviders(
      <InstructorAssessmentsPanel courseId="course-1" />,
      '/instructor'
    );
    expect(getByText(/Quizzes & Question Bank/i)).toBeInTheDocument();
    expect(
      getByText(/Assignments & Student Submissions/i)
    ).toBeInTheDocument();
    expect(getByText('Create Quiz')).toBeInTheDocument();
    expect(getByText('Create Assignment')).toBeInTheDocument();
  });

  it('renders StudentAssessmentsPanel and toggles between quizzes and assignments tabs', () => {
    const { getByText } = renderWithProviders(
      <StudentAssessmentsPanel courseId="course-1" />,
      '/learn/course-1'
    );
    expect(getByText('Course Assessments')).toBeInTheDocument();
    expect(getByText(/No quizzes published/i)).toBeInTheDocument();

    fireEvent.click(getByText(/Assignments \(0\)/i));
    expect(getByText(/No assignments published/i)).toBeInTheDocument();
  });

  it('renders NotificationsPage with unread filter and mark-all-read action', () => {
    const { getByText } = renderWithProviders(
      <NotificationsPage />,
      '/notifications'
    );
    expect(getByText('Notification Center')).toBeInTheDocument();
    expect(getByText('Mark All Read')).toBeInTheDocument();
  });

  it('renders CourseCommunityPanel with discussions and instructor announcement publisher', () => {
    const { getByText } = renderWithProviders(
      <CourseCommunityPanel courseId="course-1" canManage />,
      '/instructor'
    );
    expect(
      getByText(/Course Discussions & Announcements/i)
    ).toBeInTheDocument();
    expect(getByText('Start a Discussion Thread')).toBeInTheDocument();

    fireEvent.click(getByText(/Announcements \(0\)/i));
    expect(getByText('Broadcast Course Announcement')).toBeInTheDocument();
  });

  it('renders CertificateViewerPage with verification code input', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <CertificateViewerPage />,
      '/certificates/verify'
    );
    expect(
      getByText(/Certificate Verification & Viewer/i)
    ).toBeInTheDocument();
    expect(
      getByLabelText('Certificate Verification Code')
    ).toBeInTheDocument();
    expect(getByText('Verify Code')).toBeInTheDocument();
  });

  it('renders AdminConsolePage with governance tabs', () => {
    const { getByText } = renderWithProviders(<AdminConsolePage />, '/admin');
    expect(getByText('Admin Governance Console')).toBeInTheDocument();
    expect(getByText('Platform Analytics')).toBeInTheDocument();
    expect(getByText('Users')).toBeInTheDocument();
    expect(getByText('Audit Logs & Settings')).toBeInTheDocument();
  });
});
