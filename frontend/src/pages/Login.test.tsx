import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../api/client';
import Login from './Login';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Signed in dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function getEmailInput() {
  return screen.getByPlaceholderText('you@example.com');
}

function getPasswordInput() {
  return screen.getByPlaceholderText('••••••••');
}

describe('Login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('renders required email and password fields', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(getEmailInput()).toBeRequired();
    expect(getEmailInput()).toHaveAttribute('type', 'email');
    expect(getPasswordInput()).toBeRequired();
    expect(getPasswordInput()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  test('does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(api.post).not.toHaveBeenCalled();
  });

  test('does not submit an invalid email address', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getEmailInput(), 'not-an-email');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(api.post).not.toHaveBeenCalled();
  });

  test('shows submit button loading state while login is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}) as any);
    renderLogin();

    await user.type(getEmailInput(), 'user@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    });
  });

  test('shows validation message returned by the API', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { error: 'Invalid email or password' } },
    });
    renderLogin();

    await user.type(getEmailInput(), 'user@example.com');
    await user.type(getPasswordInput(), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  test('submits valid input and navigates after successful login', async () => {
    const user = userEvent.setup();
    const authUser = {
      id: 1,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      monthlyIncome: 2500,
    };
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'test-token',
        user: authUser,
      },
    });
    renderLogin();

    await user.type(getEmailInput(), 'user@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Signed in dashboard')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    });
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
    });
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(authUser);
  });
});
