/**
 * @file Sidebar.test.jsx
 * @description Regression tests for global sidebar actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

const mockLogout = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'agent-1',
      role: 'fieldServiceAgent',
      userName: 'agentuser',
      email: 'agent@example.com',
      businessName: 'WKD Field Ops',
      token: 'token-123',
    },
    logout: mockLogout,
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a logout action for field service agents', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('logs the user out when the logout action is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
