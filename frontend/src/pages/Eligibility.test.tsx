import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Eligibility from './Eligibility';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockEligibilityData = {
  userProfile: {
    annualIncome: 24000,
    avgMonthlySpend: 850.5,
    savingsRate: 18.25,
  },
  results: [
    {
      product: {
        id: 1,
        type: 'ISA',
        name: 'Student Saver ISA',
        description: 'A flexible savings account for students.',
        interestRate: 4.5,
      },
      isEligible: true,
      score: 82,
      improvementTips: ['You meet the key eligibility checks.'],
    },
    {
      product: {
        id: 2,
        type: 'CREDIT_CARD',
        name: 'Starter Credit Card',
        description: 'Build credit with a low limit card.',
      },
      isEligible: false,
      score: 38,
      improvementTips: ['Increase your savings rate.', 'Reduce monthly spending.'],
    },
  ],
};

describe('Eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading state while eligibility data is loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}) as any);

    render(<Eligibility />);

    expect(screen.getByText(/calculating eligibility/i)).toBeInTheDocument();
  });

  test('renders profile summary and product data from the API', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockEligibilityData });

    render(<Eligibility />);

    expect(await screen.findByRole('heading', { name: /product eligibility/i })).toBeInTheDocument();
    expect(screen.getByText('£24,000')).toBeInTheDocument();
    expect(screen.getByText('£850.50')).toBeInTheDocument();
    expect(screen.getByText('18.3%')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Student Saver ISA')).toBeInTheDocument();
    expect(screen.getByText('Starter Credit Card')).toBeInTheDocument();
    expect(screen.getByText('82/100')).toBeInTheDocument();
    expect(screen.getByText('38/100')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/eligibility');
  });

  test('shows empty state when the API returns no products', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        userProfile: { annualIncome: 0, avgMonthlySpend: 0, savingsRate: 0 },
        results: [],
      },
    });

    render(<Eligibility />);

    expect(await screen.findByRole('heading', { name: /no eligible products found/i })).toBeInTheDocument();
    expect(screen.getByText(/try another product type/i)).toBeInTheDocument();
  });

  test('shows API error state when eligibility data fails to load', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    render(<Eligibility />);

    expect(await screen.findByText(/failed to load eligibility data/i)).toBeInTheDocument();
  });

  test('filters products when a product type button is selected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockEligibilityData });
    const user = userEvent.setup();

    render(<Eligibility />);

    expect(await screen.findByText('Student Saver ISA')).toBeInTheDocument();
    expect(screen.getByText('Starter Credit Card')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /credit card/i }));

    await waitFor(() => {
      expect(screen.queryByText('Student Saver ISA')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Starter Credit Card')).toBeInTheDocument();
  });
});
