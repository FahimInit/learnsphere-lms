import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
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

describe('LearnSphere Frontend Foundation & Authentication Views', () => {
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
});
