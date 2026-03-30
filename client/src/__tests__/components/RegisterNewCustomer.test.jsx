import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterNewCustomer from '../../components/RegisterNewCustomer';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
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
  };
});

vi.mock('@react-google-maps/api', () => ({
  Autocomplete: ({ children, onLoad }) => {
    if (onLoad) {
      onLoad({ getPlace: () => null });
    }

    return <div>{children}</div>;
  },
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="map-marker" />,
  useJsApiLoader: () => ({
    isLoaded: false,
    loadError: null,
  }),
}));

const renderRegisterNewCustomer = () => {
  localStorage.setItem('userInfo', JSON.stringify({
    _id: 'user-1',
    email: 'admin@example.com',
    token: 'token-123',
    role: 'superAdmin',
  }));

  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RegisterNewCustomer />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RegisterNewCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      value: vi.fn(),
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: -26.2041,
              longitude: 28.0473,
            },
          });
        }),
      },
    });
  });

  it('removes the existing customer and service request flow', async () => {
    renderRegisterNewCustomer();

    expect(screen.getByRole('heading', { name: /business structure/i })).toBeInTheDocument();
    expect(screen.queryByText(/existing customer\?/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /service details/i })).not.toBeInTheDocument();

    const businessStructureHeading = screen.getByRole('heading', { name: /business structure/i });
    const customerDetailsHeading = screen.getByRole('heading', { name: /customer details/i });
    expect(
      businessStructureHeading.compareDocumentPosition(customerDetailsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('submits a customer-only payload with the correct backend customer type', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          _id: 'customer-1',
          customerType: 'headOffice',
          businessName: 'Acme HQ',
        },
      },
    });

    renderRegisterNewCustomer();

    fireEvent.click(screen.getByLabelText(/head office/i));
    fireEvent.change(screen.getByLabelText(/head office name/i), { target: { value: 'Acme HQ' } });
    fireEvent.change(screen.getByLabelText(/primary head office site name/i), { target: { value: 'Acme HQ Main Site' } });
    fireEvent.change(screen.getByLabelText(/contact person name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/contact person surname/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^email \*/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByPlaceholderText(/street address/i), { target: { value: '1 Main Road' } });
    fireEvent.change(screen.getByPlaceholderText(/suburb/i), { target: { value: 'Midrand' } });
    fireEvent.change(screen.getByPlaceholderText(/city \/ district/i), { target: { value: 'Johannesburg' } });
    fireEvent.change(screen.getByPlaceholderText(/province/i), { target: { value: 'Gauteng' } });
    fireEvent.change(screen.getByPlaceholderText(/postal \/ zip code/i), { target: { value: '1685' } });

    fireEvent.click(screen.getByRole('button', { name: /register customer/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/customers',
      expect.objectContaining({
        customerType: 'headOffice',
        businessName: 'Acme HQ',
        contactFirstName: 'Jane',
        contactLastName: 'Doe',
        email: 'jane@example.com',
        phoneNumber: '0123456789',
        accountStatus: 'active',
        sites: [
          expect.objectContaining({
            siteName: 'Acme HQ Main Site',
            contactPerson: 'Jane Doe',
            contactPhone: '0123456789',
            contactEmail: 'jane@example.com',
          }),
        ],
      }),
      {
        headers: { Authorization: 'Bearer token-123' },
      }
    );

    expect(screen.getByText(/registered successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open customer profile/i })).toBeInTheDocument();
  });
});