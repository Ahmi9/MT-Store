// Same rules as checkout() in the database, checked earlier so the
// customer is told exactly which field to fix.

import { isValidPkPhone } from './phone';

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
}

export type CustomerErrors = Partial<Record<keyof CustomerInput, string>>;

// Longest Pakistani city name is "Khairpur Nathan Shah" (20) — allow 10 more.
export const CITY_MAX = 30;
export const NAME_MIN = 2;
export const NAME_MAX = 100;

export function validateCustomer(c: CustomerInput): CustomerErrors {
  const errors: CustomerErrors = {};
  const name = c.name.trim();
  const city = c.city.trim();
  const email = c.email.trim();

  if (name.length < NAME_MIN) errors.name = 'Please enter your name (at least 2 letters).';
  else if (name.length > NAME_MAX) errors.name = 'Name is too long (max 100 characters).';

  if (!isValidPkPhone(c.phone)) errors.phone = 'Please enter a valid Pakistani mobile number, e.g. 03001234567.';

  if (!c.address.trim()) errors.address = 'Please enter your delivery address.';

  if (!city) errors.city = 'Please enter your city.';
  else if (city.length > CITY_MAX) errors.city = `City name is too long (max ${CITY_MAX} characters).`;

  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = 'Please check your email address (or leave it empty).';

  return errors;
}
