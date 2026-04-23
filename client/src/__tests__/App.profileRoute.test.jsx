/**
 * @file App.profileRoute.test.jsx
 * @description Regression test for customer self-profile routing via /profile.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: {
      role: 'customer',
      customerProfile: 'cust-123',
      customerType: 'residential',
    },
    loading: false,
  }),
}));

vi.mock('../components/UserProfile', () => ({
  default: () => <div>UserProfilePage</div>,
}));

vi.mock('../components/FieldAgentSelfProfile', () => ({
  default: () => <div>FieldAgentSelfProfilePage</div>,
}));

vi.mock('../components/CustomerPortal', () => ({
  default: () => <div>CustomerPortalPage</div>,
}));

describe('App profile route', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/profile');
  });

  it('redirects a customer from /profile to their linked customer portal page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('CustomerPortalPage')).toBeInTheDocument();
    });

    expect(screen.queryByText('UserProfilePage')).not.toBeInTheDocument();
  });
});
