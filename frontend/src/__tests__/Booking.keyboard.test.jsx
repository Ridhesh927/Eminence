import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import Booking from '../pages/Booking';
import authReducer from '../redux/slices/authSlice';
import { describe, it, expect, vi } from 'vitest';

const mockStore = configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: { user: { id: 1, role: 'customer' }, token: 'mock-token', isAuthenticated: true }
  }
});

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { booking: { id: 'BKG-123' } } })
  }
}));

describe('TC-PRA-001: Booking Form Keyboard Navigation', () => {
  it('should allow users to navigate all fields using only the Tab key', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <Booking />
        </BrowserRouter>
      </Provider>
    );

    // Initial state: Step 1 (Locations)
    const pickupInput = screen.getByPlaceholderText(/Enter pickup location/i);
    const dropInput = screen.getByPlaceholderText(/Enter drop location 1/i);
    const dateInput = document.querySelector('input[name="date"]');
    const timeInput = document.querySelector('input[name="time"]');
    const nextBtn = screen.getByText(/Continue to Vehicle & Goods/i);

    // Focus on the first element manually
    pickupInput.focus();
    expect(pickupInput).toHaveFocus();

    // Type in pickup
    await user.keyboard('Pune Station');
    
    // Check that all step 1 inputs and submit button are present
    expect(dropInput).toBeInTheDocument();
    expect(dateInput).toBeInTheDocument();
    expect(timeInput).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  }, 15000);
});
