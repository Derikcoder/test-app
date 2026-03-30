import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import ServiceCalls from '../../components/ServiceCalls';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
 default: {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
 },
}));

vi.mock('../../components/Sidebar', () => ({
 default: () => <div data-testid="sidebar" />,
}));

vi.mock('../../components/CreateQuoteModal', () => ({
 default: () => <button type="button">Create Quote</button>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
 const actual = await vi.importActual('react-router-dom');
 return {
  ...actual,
  useNavigate: () => mockNavigate,
 };
});

const renderServiceCalls = () => {
 localStorage.setItem('userInfo', JSON.stringify({
  _id: 'user-1',
  email: 'ops@acme.com',
  token: 'token-123',
  role: 'superAdmin',
  businessName: 'Acme Plant',
 }));

 return render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
   <AuthProvider>
    <ServiceCalls />
   </AuthProvider>
  </BrowserRouter>
 );
};

describe('ServiceCalls timeline asset filter', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  vi.mocked(api.get)
   .mockResolvedValueOnce({
    data: [
     {
      _id: 'call-1',
      callNumber: 'SC-000101',
      title: 'Emergency Repair - Acme Plant (Main Site)',
      status: 'completed',
      serviceType: 'Emergency Repair',
      scheduledDate: '2026-03-01T09:00:00.000Z',
      bookingRequest: {
       contact: {
        customerType: 'business',
        companyName: 'Acme Plant',
        contactEmail: 'ops@acme.com',
       },
       generatorDetails: {
        equipmentLabelId: 'EQ-100001',
       },
      },
     },
     {
      _id: 'call-2',
      callNumber: 'SC-000102',
      title: 'Preventive Maintenance - Acme Plant (Main Site)',
      status: 'scheduled',
      serviceType: 'Preventive Maintenance',
      scheduledDate: '2026-03-02T09:00:00.000Z',
      bookingRequest: {
       contact: {
        customerType: 'business',
        companyName: 'Acme Plant',
        contactEmail: 'ops@acme.com',
       },
      },
      description: 'Machine Label ID: EQ-200002',
     },
     {
      _id: 'call-3',
      callNumber: 'SC-000103',
      title: 'Fuel System Service - Other Company (Site A)',
      status: 'pending',
      serviceType: 'Fuel System Service',
      scheduledDate: '2026-03-03T09:00:00.000Z',
      bookingRequest: {
       contact: {
        customerType: 'business',
        companyName: 'Other Company',
        contactEmail: 'ops@other.com',
       },
       generatorDetails: {
        equipmentLabelId: 'EQ-999999',
       },
      },
     },
     {
      _id: 'call-4',
      callNumber: 'SC-000104',
      title: 'Maintenance - Acme Plant (Malformed Label)',
      status: 'completed',
      serviceType: 'Preventive Maintenance',
      scheduledDate: '2026-03-05T09:00:00.000Z',
      bookingRequest: {
       contact: {
        customerType: 'business',
        companyName: 'Acme Plant',
        contactEmail: 'ops@acme.com',
       },
      },
      description: 'Machine Label ID: <script>alert(1)</script>',
     },
    ],
   })
   .mockResolvedValueOnce({ data: [] });
 });

 it('shows asset options and filters business timeline by selected machine label', async () => {
  renderServiceCalls();

  expect(await screen.findByRole('heading', { name: /business service timeline/i })).toBeInTheDocument();

  const assetSelect = await waitFor(() => {
   const select = screen
    .getAllByRole('combobox')
    .find((element) => within(element).queryByRole('option', { name: /all assets/i }));

   expect(select).toBeTruthy();
   return select;
  });

  const timelineHeading = screen.getByRole('heading', { name: /business service timeline/i });
  const timelineSection = timelineHeading.closest('section');
  expect(timelineSection).toBeTruthy();

  expect(within(assetSelect).getByRole('option', { name: 'EQ-100001' })).toBeInTheDocument();
  expect(within(assetSelect).getByRole('option', { name: 'EQ-200002' })).toBeInTheDocument();
  expect(within(assetSelect).getByRole('option', { name: 'EQ-999999' })).toBeInTheDocument();

  expect(within(timelineSection).getByText(/emergency repair - acme plant/i)).toBeInTheDocument();
  expect(within(timelineSection).getByText(/preventive maintenance - acme plant/i)).toBeInTheDocument();

  fireEvent.change(assetSelect, { target: { value: 'EQ-100001' } });

  await waitFor(() => {
    expect(within(timelineSection).getByText(/emergency repair - acme plant/i)).toBeInTheDocument();
    expect(within(timelineSection).queryByText(/preventive maintenance - acme plant/i)).not.toBeInTheDocument();
    expect(within(timelineSection).queryByText(/fuel system service - other company/i)).not.toBeInTheDocument();
  });
 });

 it('ignores malformed fallback labels and keeps valid EQ fallback labels', async () => {
  renderServiceCalls();

  const assetSelect = await waitFor(() => {
   const select = screen
    .getAllByRole('combobox')
    .find((element) => within(element).queryByRole('option', { name: /all assets/i }));

   expect(select).toBeTruthy();
   return select;
  });

  expect(within(assetSelect).getByRole('option', { name: 'EQ-200002' })).toBeInTheDocument();
  expect(within(assetSelect).queryByRole('option', { name: /script/i })).not.toBeInTheDocument();
 });
});
