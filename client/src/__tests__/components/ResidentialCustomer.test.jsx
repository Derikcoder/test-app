/**
 * @file ResidentialCustomer.test.jsx
 * @description Regression tests for authenticated customer invoice payment flow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResidentialCustomer from '../../components/ResidentialCustomer';
import api from '../../api/axios';

const mockNavigate = vi.fn();

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockUpdateUser = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'customer-user-1',
      role: 'customer',
      token: 'customer-token-1',
      customerProfile: 'cust-123',
      email: 'jamie@example.com',
    },
    updateUser: mockUpdateUser,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'cust-123' }),
    useNavigate: () => mockNavigate,
  };
});

describe('ResidentialCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/customers/cust-123') {
        return Promise.resolve({
          data: {
            _id: 'cust-123',
            customerId: 'CUST-001',
            customerType: 'residential',
            accountStatus: 'active',
            contactFirstName: 'Jamie',
            contactLastName: 'Customer',
            email: 'jamie@example.com',
            phoneNumber: '0821234567',
            alternatePhone: '0827654321',
            physicalAddress: '12 Main Street, Pretoria',
            physicalAddressDetails: {
              streetAddress: '12 Main Street',
              suburb: 'Monument Park',
              cityDistrict: 'Pretoria',
              province: 'Gauteng',
              postalCode: '0181',
            },
            notes: JSON.stringify({
              machineCount: 2,
              extraNotes: 'Customer prefers WhatsApp updates.',
            }),
            createdAt: '2026-04-01T08:00:00.000Z',
            updatedAt: '2026-04-01T08:00:00.000Z',
          },
        });
      }

      if (url === '/service-calls') {
        return Promise.resolve({ data: [
          {
            _id: 'call-1',
            callNumber: 'SC-000001',
            customer: 'cust-123',
            serviceType: 'Electrical Repair',
            status: 'completed',
            title: 'Generator inspection and repair',
            description: 'Performed full service on the standby generator.',
            createdAt: '2026-04-12T08:00:00.000Z',
            assignedAgent: { firstName: 'Erik', lastName: 'Smit', employeeId: 'AGT-101' },
            bookingRequest: {
              generatorDetails: {
                siteName: 'Main Office Generator',
                generatorMakeModel: 'Perkins',
                machineModelNumber: '4008TAG2A',
              },
            },
            feedbackHistory: [
              {
                stage: 'invoice',
                rating: 5,
                feedback: 'Very happy with the turnaround time.',
                submittedAt: '2026-04-12T09:00:00.000Z',
              },
            ],
          },
        ] });
      }

      if (url === '/quotations?customer=cust-123') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/invoices?customer=cust-123') {
        return Promise.resolve({
          data: [
            {
              _id: 'invoice-1',
              invoiceNumber: 'INV-000901',
              documentType: 'proForma',
              workflowStatus: 'approved',
              paymentStatus: 'unpaid',
              totalAmount: 5750,
              balance: 5750,
              paidAmount: 0,
              depositRequired: true,
              depositAmount: 2500,
              depositReason: 'Parts procurement deposit',
              serviceCall: 'call-1',
              createdAt: '2026-04-10T08:00:00.000Z',
              dueDate: '2026-04-20T08:00:00.000Z',
              receipts: [
                {
                  receiptNumber: 'RCT-000001',
                  purpose: 'Deposit for electrical repair',
                  amount: 2500,
                  issuedAt: '2026-04-12T11:00:00.000Z',
                },
              ],
            },
          ],
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('shows the authenticated customer a pending pro-forma payment action', async () => {
    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    expect(await screen.findByText(/pending billing & payments/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /pay deposit/i })).toBeInTheDocument();
  });

  it('shows the latest customer review and grouped service history context', async () => {
    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    expect(await screen.findByText(/latest customer review/i)).toBeInTheDocument();
    expect(await screen.findByText(/very happy with the turnaround time/i)).toBeInTheDocument();
    expect(await screen.findByText(/electrical repair/i)).toBeInTheDocument();
    expect(await screen.findByText(/erik smit/i)).toBeInTheDocument();
  });

  it('surfaces serviced machine details in the customer asset panel and links to its history', async () => {
    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    expect((await screen.findAllByText(/main office generator/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/perkins/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/4008tag2a/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/generator/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /view 1 service/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/\/customers\/residential\/cust-123\/assets\//),
      expect.objectContaining({ state: expect.any(Object) })
    );
  });

  it('allows the customer to edit and save their own profile information', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({
      data: {
        _id: 'cust-123',
        customerId: 'CUST-001',
        customerType: 'residential',
        accountStatus: 'active',
        contactFirstName: 'Jamie',
        contactLastName: 'Customer',
        email: 'updated@example.com',
        phoneNumber: '0820000000',
        physicalAddress: '22 New Street, Pretoria',
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-16T08:00:00.000Z',
      },
    });

    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    const editButton = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'updated@example.com' } });
    fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '0820000000' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/customers/cust-123',
        expect.objectContaining({
          email: 'updated@example.com',
          phoneNumber: '0820000000',
        }),
        { headers: { Authorization: 'Bearer customer-token-1' } }
      );
    });
  });

  it('splits a flat onboarding address into the correct editable fields', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/customers/cust-123') {
        return Promise.resolve({
          data: {
            _id: 'cust-123',
            customerId: 'CUST-001',
            customerType: 'residential',
            accountStatus: 'active',
            contactFirstName: 'Jamie',
            contactLastName: 'Customer',
            email: 'jamie@example.com',
            phoneNumber: '0821234567',
            alternatePhone: '0827654321',
            physicalAddress: '547 Makou Straat, Monument Park, Pretoria, Gauteng, 0182',
            notes: '',
            createdAt: '2026-04-01T08:00:00.000Z',
            updatedAt: '2026-04-01T08:00:00.000Z',
          },
        });
      }

      if (url === '/service-calls') return Promise.resolve({ data: [] });
      if (url === '/quotations?customer=cust-123') return Promise.resolve({ data: [] });
      if (url === '/invoices?customer=cust-123') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));

    expect(screen.getByLabelText(/street address/i)).toHaveValue('547 Makou Straat');
    expect(screen.getByLabelText(/suburb/i)).toHaveValue('Monument Park');
    expect(screen.getByLabelText(/city \/ district/i)).toHaveValue('Pretoria');
    expect(screen.getByLabelText(/province/i)).toHaveValue('Gauteng');
    expect(screen.getByLabelText(/postal code/i)).toHaveValue('0182');
  });

  it('preserves the onboarding address when the profile only has a flat physicalAddress value', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/customers/cust-123') {
        return Promise.resolve({
          data: {
            _id: 'cust-123',
            customerId: 'CUST-001',
            customerType: 'residential',
            accountStatus: 'active',
            contactFirstName: 'Jamie',
            contactLastName: 'Customer',
            email: 'jamie@example.com',
            phoneNumber: '0821234567',
            alternatePhone: '0827654321',
            physicalAddress: '12 Main Street, Pretoria',
            notes: '',
            createdAt: '2026-04-01T08:00:00.000Z',
            updatedAt: '2026-04-01T08:00:00.000Z',
          },
        });
      }

      if (url === '/service-calls') return Promise.resolve({ data: [] });
      if (url === '/quotations?customer=cust-123') return Promise.resolve({ data: [] });
      if (url === '/invoices?customer=cust-123') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    vi.mocked(api.put).mockResolvedValueOnce({
      data: {
        _id: 'cust-123',
        customerId: 'CUST-001',
        customerType: 'residential',
        accountStatus: 'active',
        contactFirstName: 'Jamie',
        contactLastName: 'Customer',
        email: 'jamie@example.com',
        phoneNumber: '0820000000',
        physicalAddress: '12 Main Street, Pretoria',
      },
    });

    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '0820000000' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/customers/cust-123',
        expect.objectContaining({
          physicalAddress: '12 Main Street, Pretoria',
          phoneNumber: '0820000000',
        }),
        { headers: { Authorization: 'Bearer customer-token-1' } }
      );
    });
  });

  it('allows the customer to update their password from the service profile screen', async () => {
    vi.mocked(api.put)
      .mockResolvedValueOnce({
        data: {
          _id: 'cust-123',
          customerId: 'CUST-001',
          customerType: 'residential',
          accountStatus: 'active',
          contactFirstName: 'Jamie',
          contactLastName: 'Customer',
          email: 'jamie@example.com',
          phoneNumber: '0821234567',
        },
      })
      .mockResolvedValueOnce({
        data: {
          token: 'customer-token-2',
          email: 'jamie@example.com',
          role: 'customer',
          customerProfile: 'cust-123',
        },
      });

    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /edit profile/i }));

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newsecure123' } });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: 'newsecure123' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/auth/profile',
        expect.objectContaining({
          email: 'jamie@example.com',
          password: 'newsecure123',
        }),
        { headers: { Authorization: 'Bearer customer-token-1' } }
      );
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ token: 'customer-token-2' }));
  });

  it('allows the customer to submit the required deposit from within the app', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        _id: 'invoice-1',
        invoiceNumber: 'INV-000901',
        paymentStatus: 'partial',
        paidAmount: 2500,
        balance: 3250,
      },
    });

    render(
      <BrowserRouter>
        <ResidentialCustomer />
      </BrowserRouter>
    );

    const payButton = await screen.findByRole('button', { name: /pay deposit/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/invoices/invoice-1/payment',
        expect.objectContaining({
          amount: 2500,
          method: 'card',
        }),
        { headers: { Authorization: 'Bearer customer-token-1' } }
      );
    });
  });
});
