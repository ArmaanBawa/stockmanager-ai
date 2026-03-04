import { authFetch } from './api';
import { Customer } from '../types';

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await authFetch('/api/customers');
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
}

export async function createCustomer(data: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<Customer> {
  const res = await authFetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create customer');
  }
  return res.json();
}

export async function updateCustomer(
  id: string,
  data: { name?: string; contactName?: string; email?: string; phone?: string; address?: string }
): Promise<Customer> {
  const res = await authFetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update customer');
  return res.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await authFetch(`/api/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete customer');
}

