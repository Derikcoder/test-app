import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SingleBusinessCustomer from '../../components/SingleBusinessCustomer';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'customer-1' }),
  };
});

const renderProfile = () => {
  localStorage.setItem('userInfo', JSON.stringify({
    _id: 'user-1',
    email: 'admin@example.com',
    token: 'token-123',
    role: 'superAdmin',
  }));

  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SingleBusinessCustomer />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('BusinessCustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('supports multi-site and machine onboarding from the customer profile', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          _id: 'customer-1',
          customerId: 'CUST-001',
          customerType: 'singleBusiness',
          businessName: 'Acme Plant',
          contactFirstName: 'Jane',
          contactLastName: 'Doe',
          email: 'jane@example.com',
          phoneNumber: '0123456789',
          sites: [
            {
              _id: 'site-1',
              siteName: 'Main Plant',
              address: '1 Main Road, Midrand',
              contactPerson: 'Jane Doe',
              contactPhone: '0123456789',
              serviceTypes: ['Generator service'],
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: [] });

    vi.mocked(api.post)
      .mockResolvedValueOnce({
        data: {
          _id: 'site-2',
          siteName: 'Warehouse',
          address: '5 Storage Lane, Midrand',
          contactPerson: 'John Smith',
          contactPhone: '0112223333',
          serviceTypes: ['Preventive maintenance', 'Generator service'],
        },
      })
      .mockResolvedValueOnce({
        data: {
          _id: 'equipment-1',
          equipmentId: 'EQ-000001',
          equipmentType: 'Generator',
          brand: 'Cummins',
          model: 'C220',
          serialNumber: 'SN-001',
          siteId: 'site-1',
          status: 'operational',
          location: 'Plant room',
        },
      });

    renderProfile();

    expect(await screen.findByRole('heading', { name: /acme plant/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /multi-site onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /machine onboarding/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/site name/i), { target: { value: 'Warehouse' } });
    fireEvent.change(screen.getByPlaceholderText(/street address/i), { target: { value: '5 Storage Lane' } });
    fireEvent.change(screen.getByPlaceholderText(/suburb/i), { target: { value: 'Midrand' } });
    fireEvent.change(screen.getByPlaceholderText(/city \/ district/i), { target: { value: 'Johannesburg' } });
    fireEvent.change(screen.getByPlaceholderText(/province/i), { target: { value: 'Gauteng' } });
    fireEvent.change(screen.getByPlaceholderText(/postal \/ zip code/i), { target: { value: '1685' } });
    fireEvent.change(screen.getByPlaceholderText(/site contact person/i), { target: { value: 'John Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/site contact phone/i), { target: { value: '0112223333' } });
    fireEvent.change(screen.getByLabelText(/preferred service types/i), { target: { value: 'Preventive maintenance, Generator service' } });

    fireEvent.click(screen.getByRole('button', { name: /add site/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        '/customers/customer-1/sites',
        expect.objectContaining({
          siteName: 'Warehouse',
          serviceTypes: ['Preventive maintenance', 'Generator service'],
          addressDetails: expect.objectContaining({
            streetAddress: '5 Storage Lane',
            suburb: 'Midrand',
            cityDistrict: 'Johannesburg',
            province: 'Gauteng',
            postalCode: '1685',
          }),
        }),
        {
          headers: { Authorization: 'Bearer token-123' },
        }
      );
    });

    fireEvent.change(screen.getByLabelText(/assign to site/i), { target: { value: 'site-1' } });
    fireEvent.change(screen.getByLabelText(/machine type/i), { target: { value: 'Generator' } });
    fireEvent.change(screen.getByPlaceholderText(/brand/i), { target: { value: 'Cummins' } });
    fireEvent.change(screen.getByPlaceholderText(/model/i), { target: { value: 'C220' } });
    fireEvent.change(screen.getByPlaceholderText(/serial number/i), { target: { value: 'SN-001' } });
    fireEvent.change(screen.getByPlaceholderText(/plant room \/ bay \/ roof level/i), { target: { value: 'Plant room' } });

    fireEvent.click(screen.getByRole('button', { name: /add machine/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        '/equipment',
        expect.objectContaining({
          customer: 'customer-1',
          siteId: 'site-1',
          equipmentType: 'Generator',
          brand: 'Cummins',
          model: 'C220',
          serialNumber: 'SN-001',
          location: 'Plant room',
          status: 'operational',
        }),
        {
          headers: { Authorization: 'Bearer token-123' },
        }
      );
    });

    expect(screen.getByText(/warehouse added successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/eq-000001 created successfully/i)).toBeInTheDocument();
    expect(screen.getByText('EQ-000001')).toBeInTheDocument();
  });
});