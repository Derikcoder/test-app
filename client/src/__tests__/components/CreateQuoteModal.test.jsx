/**
 * @file CreateQuoteModal.test.jsx
 * @description Unit tests for CreateQuoteModal customer prefill behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateQuoteModal from '../../components/CreateQuoteModal';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const baseProps = {
  token: 'test-token',
  isSuperUser: true,
  triggerLabel: 'Create Quote',
  sourceData: {
    serviceCallId: 'sc-123',
    customerId: 'cust-123',
    customerLabel: 'Acme Mining Plant 4',
    serviceType: 'Preventive Maintenance',
    title: 'Quotation for SC-000123',
    description: 'Service scope',
    lineItems: [{ description: 'Service Work', quantity: 1, unitPrice: 0 }],
  },
};

describe('CreateQuoteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({
      data: {
        _id: 'quote-1',
        quotationNumber: 'QT-000001',
      },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: {
        _id: 'quote-1',
        quotationNumber: 'QT-000001',
      },
    });
  });

  it('should render prefilled customer label when selected customer is not in fetched customer list', async () => {
    render(<CreateQuoteModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue(/acme mining plant 4/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('option', { name: /select customer/i })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should prefer fetched customer name when selected customer exists in fetched list', async () => {
    const standardQuoteProps = {
      ...baseProps,
      sourceData: {
        ...baseProps.sourceData,
        serviceCallId: '',
      },
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          _id: 'cust-123',
          businessName: 'WKD Industrial Customer',
        },
      ],
    });

    render(<CreateQuoteModal {...standardQuoteProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/customers', {
        headers: { Authorization: 'Bearer test-token' },
      });
      expect(screen.getByRole('option', { name: /wkd industrial customer/i })).toBeInTheDocument();
    });
  });

  it('should submit via service-call shortcut endpoint when serviceCallId and customerId are provided', async () => {
    render(<CreateQuoteModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    const submitButton = await screen.findByRole('button', { name: /submit quote/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/quotations/from-service-call/sc-123',
        expect.objectContaining({
          serviceType: 'Preventive Maintenance',
          title: 'Quotation for SC-000123',
        }),
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );
    });
  });

  it('should send the quote by email when email is selected before submit', async () => {
    render(<CreateQuoteModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    const emailCheckbox = await screen.findByRole('checkbox', { name: /email/i });
    fireEvent.click(emailCheckbox);

    const submitButton = screen.getByRole('button', { name: /submit quote/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/quotations/quote-1/send',
        { channels: ['email'] },
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );
    });
  });

  it('should allow decimal quantities for partial-unit line items', async () => {
    render(<CreateQuoteModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    const quantityInput = await screen.findByLabelText(/qty/i);

    expect(quantityInput).toHaveAttribute('step', '0.01');
    expect(quantityInput).toHaveAttribute('min', '0.01');

    fireEvent.change(quantityInput, { target: { value: '1.5' } });
    expect(quantityInput).toHaveValue(1.5);
  });

  it('should keep the original customer context locked when editing a quote', async () => {
    render(
      <CreateQuoteModal
        token="test-token"
        editMode
        forceOpen
        existingQuotation={{
          _id: 'quote-1',
          recipientSnapshot: {
            name: 'Bennie Henning',
            email: 'bennie@example.com',
          },
          customer: null,
          serviceType: 'Preventive Maintenance',
          title: 'Quotation for SC-000001',
          description: 'Prospect quote',
          lineItems: [{ description: 'Oil', quantity: 1.5, unitPrice: 75 }],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue(/bennie henning/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('option', { name: /select customer/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/quotations/quote-1',
        expect.objectContaining({
          title: 'Quotation for SC-000001',
          serviceType: 'Preventive Maintenance',
        }),
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );
    });
  });

  it('should display auto template source metadata when returned by API', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        _id: 'quote-2',
        quotationNumber: 'QT-000002',
        autoResolution: {
          source: 'equipment-history',
          confidence: 'high',
          equipment: {
            equipmentId: 'EQ-000001',
            brand: 'Perkins',
            model: '404A-22G1',
          },
          historyStats: {
            totalHistoryEventsConsidered: 3,
            totalEquipmentEvaluated: 2,
          },
          recentServiceHistory: [
            {
              callNumber: 'SC-000012',
              serviceType: 'Emergency Repair',
              status: 'completed',
              completedDate: '2026-03-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

    render(<CreateQuoteModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    const submitButton = await screen.findByRole('button', { name: /submit quote/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/auto template source selected/i)).toBeInTheDocument();
      expect(screen.getByText(/source: equipment history \(high confidence\)/i)).toBeInTheDocument();
      expect(screen.getByText(/history considered: 3 events across 2 equipment records/i)).toBeInTheDocument();
      expect(screen.getByText(/sc-000012/i)).toBeInTheDocument();
    });
  });
});
