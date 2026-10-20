import { z } from 'zod';

// Registration Form Validation Schema
export const registrationSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

// Login Form Validation Schema
export const loginSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
});

// Booking Form Validation Schemas
export const bookingLocationsSchema = z.object({
  pickup: z.string().trim().min(3, 'Pickup address must be at least 3 characters'),
  drops: z.array(z.string().trim().min(3, 'Drop address must be at least 3 characters')).min(1, 'At least one drop address is required'),
  date: z.string().min(1, 'Please select a date')
    .refine((val) => {
      if (!val) return false;
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const utcToday = now.toISOString().split('T')[0];
      const earliestAllowed = localToday < utcToday ? localToday : utcToday;
      return val >= earliestAllowed;
    }, 'Booking date cannot be in the past. Please select today or a future date.')
    .refine((val) => {
      if (!val) return false;
      const maxDate = new Date();
      const currentMonth = maxDate.getMonth();
      maxDate.setMonth(currentMonth + 1);
      if (maxDate.getMonth() > (currentMonth + 1) % 12) {
        maxDate.setDate(0);
      }
      const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
      return val <= maxDateStr;
    }, 'Advance booking is limited to 1 month only.'),
  time: z.string().min(1, 'Please select a pickup time')
});

export const VEHICLE_CAPACITIES = {
  small: 750,
  medium: 1500,
  large: 5000
};

export const bookingDetailsSchema = z.object({
  goodsType: z.string().trim().min(2, 'Please specify goods type'),
  weight: z.coerce.number().positive('Weight must be greater than 0').max(25000, 'Max capacity is 25,000 kg'),
  tempoType: z.enum(['small', 'medium', 'large']),
  totalDistance: z.coerce.number().positive('Distance must be greater than 0 km').max(5000, 'Distance cannot exceed 5000 km')
}).superRefine((data, ctx) => {
  const maxCap = VEHICLE_CAPACITIES[data.tempoType] || 5000;
  if (data.weight > maxCap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Cargo weight (${data.weight}kg) exceeds maximum capacity for ${data.tempoType} vehicle (${maxCap}kg)`,
      path: ['weight']
    });
  }
});

export const bookingPaymentSchema = z.object({
  phone: z.string().trim()
    .min(10, 'Contact phone number must be exactly 10 digits')
    .max(10, 'Contact phone number must be exactly 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)')
});

// Customer Address Schema
export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Label is required (e.g. Home, Office)'),
  street: z.string().trim().min(5, 'Street address must be at least 5 characters'),
  city: z.string().trim().min(2, 'City is required'),
  postalCode: z.string().trim().regex(/^\d{6}$/, 'Postal code must be a 6-digit PIN')
});

// Profile Settings Schema
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  state: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal(''))
});
