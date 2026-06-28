import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  test('redirects unauthenticated users to the login page', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
