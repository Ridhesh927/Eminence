import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../components/Shared/NotificationBell';
import authReducer from '../redux/slices/authSlice';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:3000' }
  }
}));

// Mock Socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }))
}));

const createMockStore = (initialAuthState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { id: 'test-user-id', name: 'Test Customer', role: 'customer' },
        token: 'fake-jwt-token',
        ...initialAuthState,
      }
    }
  });
};

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification bell icon with badge count for customer', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        unreadCount: 2,
        notifications: [
          {
            id: 'notif-1',
            title: 'Driver Assigned!',
            message: 'Driver Ramesh Patil has accepted your booking.',
            type: 'driver_assigned',
            isRead: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 'notif-2',
            title: 'Driver Arrived! 📍',
            message: 'Driver reached pickup location.',
            type: 'arrived',
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ]
      }
    });

    const store = createMockStore();
    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <NotificationBell role="customer" />
          </MemoryRouter>
        </Provider>
      );
    });

    // Verify unread badge shows 2
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Click bell to toggle menu
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    await act(async () => {
      fireEvent.click(bellButton);
    });

    // Verify header and notifications exist
    expect(screen.getByText('Order & Trip Alerts')).toBeInTheDocument();
    expect(screen.getByText('Driver Assigned!')).toBeInTheDocument();
    expect(screen.getByText('Driver Arrived! 📍')).toBeInTheDocument();
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('renders admin filters including SOS and Support for admin user', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        unreadCount: 3,
        notifications: [
          {
            id: 'notif-sos-1',
            title: '🚨 DRIVER SOS: Sachin More',
            message: 'Engine breakdown at Katraj Tunnel.',
            type: 'sos',
            isRead: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 'notif-support-1',
            title: 'New Support Ticket #TKT-4412',
            message: 'Customer raised ticket: Billing inquiry',
            type: 'support',
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ]
      }
    });

    const store = createMockStore({
      user: { id: 'admin-id', name: 'Super Admin', role: 'admin' }
    });

    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <NotificationBell role="admin" />
          </MemoryRouter>
        </Provider>
      );
    });

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    await act(async () => {
      fireEvent.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Admin Dispatch & SOS Alerts')).toBeInTheDocument();
    });

    // Check admin specific filter pills
    expect(screen.getByText(/🚨 SOS/i)).toBeInTheDocument();
    expect(screen.getByText(/💬 Support/i)).toBeInTheDocument();
    expect(screen.getByText(/🚚 Trips/i)).toBeInTheDocument();
  });
});
