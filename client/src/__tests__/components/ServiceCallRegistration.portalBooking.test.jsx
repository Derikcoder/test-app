/**
 * @file ServiceCallRegistration.portalBooking.test.jsx
 * @description Regression tests for customer-portal booking flows across grouped customer types.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ServiceCallRegistration from '../../components/ServiceCallRegistration';
import api from '../../api/axios';

const navigateMock = vi.fn();

const locationState = {
  isCustomerPortalBooking: true,
  customer: {
    _id: 'cust-branch-1',
    customerType: 'branch',
    parentAccount: 'ho-123',
    businessName: 'Branch Co',
    contactFirstName: 'Brenda',
    contactLastName: 'Branch',
    email: 'branch@example.com',
    phoneNumber: '0812345678',
    physicalAddressDetails: {
      streetAddress: '12 Main St',
      suburb: 'Central',
      cityDistrict: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
    },
  },
  portalServiceCalls: [],
  prefillCustomer: {
    customerType: 'branch',
    businessName: 'Branch Co',
    contactFirstName: 'Brenda',
    contactLastName: 'Branch',
    email: 'branch@example.com',
    phoneNumber: '0812345678',
    physicalAddressDetails: {
      streetAddress: '12 Main St',
      suburb: 'Central',
      cityDistrict: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
    },
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: locationState }),
  };
});

vi.mock('../../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock('../../components/CreateQuoteModal', () => ({
  default: () => <button type="button">Create Quote</button>,
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user-customer-1',
      role: 'customer',
      token: 'token-123',
    },
  }),
}));

describe('ServiceCallRegistration portal grouped customer booking', () => {
  const completeRequiredFieldsAndSubmit = () => {
    fireEvent.change(
      screen.getByPlaceholderText('Generator Make / Brand / Series'),
      { target: { value: 'Perkins 1104' } }
    );

    fireEvent.change(
      screen.getByPlaceholderText('Equipment Model Number'),
      { target: { value: '1104A-44TG1' } }
    );

    fireEvent.change(
      screen.getByPlaceholderText('Capacity (kVA)'),
      { target: { value: '150' } }
    );

    fireEvent.change(
      screen.getByLabelText('Preferred Site Visit Date (required)'),
      { target: { value: '2026-12-01' } }
    );

    fireEvent.click(screen.getByLabelText(/i confirm that the information is accurate/i));
    fireEvent.click(screen.getByRole('button', { name: /book service call/i }));
  };

  beforeEach(() => {
    vi.clearAllMocks();

    locationState.customer.customerType = 'branch';
    locationState.customer.parentAccount = 'ho-123';
    locationState.prefillCustomer.customerType = 'branch';

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/service-calls') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/customers') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { _id: 'call-1' } });
  });

  it('submits branch portal booking with linked head office id and redirects to customer services', async () => {
    render(<ServiceCallRegistration />);

    completeRequiredFieldsAndSubmit();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    const postPayload = vi.mocked(api.post).mock.calls[0][1];

    expect(postPayload.title).toBe('Preventive Maintenance - Branch Co');
    expect(postPayload.bookingRequest.contact.businessStructure).toBe('group');
    expect(postPayload.bookingRequest.contact.businessRole).toBe('branch');
    expect(postPayload.bookingRequest.contact.headOfficeId).toBe('ho-123');

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/customer/services');
    }, { timeout: 3000 });
  });

  it('submits franchise portal booking when parentAccount is populated object data', async () => {
    locationState.customer.customerType = 'franchise';
    locationState.customer.parentAccount = { _id: 'ho-456' };
    locationState.prefillCustomer.customerType = 'franchise';

    render(<ServiceCallRegistration />);

    completeRequiredFieldsAndSubmit();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    const postPayload = vi.mocked(api.post).mock.calls[0][1];
    expect(postPayload.bookingRequest.contact.businessStructure).toBe('group');
    expect(postPayload.bookingRequest.contact.businessRole).toBe('branch');
    expect(postPayload.bookingRequest.contact.headOfficeId).toBe('ho-456');
  });
});
