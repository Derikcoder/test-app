/**
 * @file FieldAgentSelfProfile.test.jsx
 * @description Regression tests for field agent job status visibility and pending quote access.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FieldAgentSelfProfile from '../../components/FieldAgentSelfProfile';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user-agent-1',
      role: 'fieldServiceAgent',
      userName: 'agentuser',
      email: 'agent@example.com',
      businessName: 'WKD Field Ops',
      token: 'token-123',
      fieldServiceAgentProfile: 'agent-profile-1',
    },
  }),
}));

describe('FieldAgentSelfProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/agents/me') {
        return Promise.resolve({
          data: {
            _id: 'agent-profile-1',
            firstName: 'Test',
            lastName: 'Agent',
            employeeId: 'FA-001',
            email: 'agent@example.com',
            phoneNumber: '0821234567',
            status: 'active',
            skills: ['Generator Repairs'],
          },
        });
      }

      if (url === '/service-calls/my-assigned') {
        return Promise.resolve({
          data: [
            {
              _id: 'call-1',
              callNumber: 'SC-000001',
              status: 'awaiting-quote-approval',
              priority: 'medium',
              title: 'Bennie Henning Generator Service',
              description: 'Quote pending customer acceptance',
              bookingRequest: {
                contact: {
                  contactPerson: 'Bennie Henning',
                  contactPhone: '0821234567',
                  customerType: 'private',
                },
                administrativeAddress: {},
                machineAddress: {},
                generatorDetails: {},
              },
              quotation: {
                _id: 'quote-1',
                quotationNumber: 'QT-000001',
                title: 'Quotation for SC-000001',
                status: 'sent',
                totalAmount: 1250,
                shareToken: 'quote-share-token',
                createdBy: {
                  userName: 'agentuser',
                  role: 'fieldServiceAgent',
                },
              },
            },
          ],
        });
      }

      if (url === '/service-calls/eligible-unassigned/agent-profile-1') {
        return Promise.resolve({
          data: {
            jobs: [],
            meta: {
              remainingDailySelfAccepts: 2,
              weeklyParticipationDaysUsed: 0,
            },
          },
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('shows awaiting-acceptance jobs with a pending quote quick-view action', async () => {
    render(
      <BrowserRouter>
        <FieldAgentSelfProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /awaiting acceptance/i }).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/sc-000001/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /view quote pdf/i })).toBeInTheDocument();
  });

  it('allows the field agent to resend a pending quotation email', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: 'Quotation sent successfully',
        quotationNumber: 'QT-000001',
        channels: ['email'],
      },
    });

    render(
      <BrowserRouter>
        <FieldAgentSelfProfile />
      </BrowserRouter>
    );

    const resendButton = await screen.findByRole('button', { name: /resend quote/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/quotations/quote-1/send',
        { channels: ['email'] },
        { headers: { Authorization: 'Bearer token-123' } }
      );
    });
  });
});
