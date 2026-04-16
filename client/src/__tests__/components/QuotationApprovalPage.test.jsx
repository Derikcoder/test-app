/**
 * @file QuotationApprovalPage.test.jsx
 * @description Regression tests for customer onboarding redirect after quotation acceptance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationApprovalPage from '../../components/QuotationApprovalPage';
import api from '../../api/axios';

const mockNavigate = vi.fn();

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'quote-token-1' }),
    useNavigate: () => mockNavigate,
  };
});

describe('QuotationApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockResolvedValue({
      data: {
        quotationNumber: 'QT-000001',
        status: 'sent',
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        lineItems: [],
        subtotal: 1000,
        vatAmount: 150,
        totalAmount: 1150,
        vatRate: 0.15,
        customer: {
          name: 'Jane Prospect',
          email: 'jane@example.com',
        },
      },
    });
  });

  it('redirects a newly onboarded customer to login with the temporary access key', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        message: 'Quotation accepted and portal ready.',
        portalAccountCreated: true,
        portalUser: {
          email: 'jane@example.com',
          userName: 'jane',
          temporaryAccessKey: '1234567',
        },
      },
    });

    render(<QuotationApprovalPage />);

    const acceptButton = await screen.findByRole('button', { name: /accept quotation/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/login',
        expect.objectContaining({
          state: expect.objectContaining({
            email: 'jane@example.com',
            password: '1234567',
          }),
        })
      );
    });
  });
});
