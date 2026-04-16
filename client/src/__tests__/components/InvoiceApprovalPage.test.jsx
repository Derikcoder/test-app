/**
 * @file InvoiceApprovalPage.test.jsx
 * @description Regression tests for pro-forma approval onboarding redirect.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvoiceApprovalPage from '../../components/InvoiceApprovalPage';
import api from '../../api/axios';

const mockNavigate = vi.fn();

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'invoice-token-1' }),
    useNavigate: () => mockNavigate,
  };
});

describe('InvoiceApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockResolvedValue({
      data: {
        invoiceNumber: 'INV-000001',
        title: 'Additional Work Approval',
        documentType: 'proForma',
        workflowStatus: 'awaitingApproval',
        approvalAllowed: true,
        serviceDate: new Date(Date.now() + 86_400_000).toISOString(),
        totalAmount: 1150,
        vatRate: 15,
        pdfUrl: '/api/invoices/share/invoice-token-1/pdf',
        customer: {
          businessName: 'Jane Prospect',
          contactFirstName: 'Jane',
          contactLastName: 'Prospect',
        },
        siteInstruction: {},
        lineItems: [],
      },
    });
  });

  it('redirects to login when approval returns portal onboarding data', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        message: 'Pro-forma approved and customer portal access is ready.',
        workflowStatus: 'approved',
        portalUser: {
          email: 'jane@example.com',
          userName: 'jane',
          temporaryAccessKey: '1234567',
        },
      },
    });

    render(<InvoiceApprovalPage />);

    const approveButton = await screen.findByRole('button', { name: /approve work/i });
    fireEvent.click(approveButton);

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
