import { authFetch } from './api';
import { Order } from '../types';

export async function fetchOrders(status?: string): Promise<Order[]> {
  const params = status ? `?status=${status}` : '';
  const res = await authFetch(`/api/orders${params}`);
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json();
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await authFetch(`/api/orders/${id}`);
  if (!res.ok) throw new Error('Failed to load order');
  return res.json();
}

export async function createOrder(data: {
  customerId: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}): Promise<Order> {
  const res = await authFetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create order');
  }
  return res.json();
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await authFetch(`/api/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete order');
}

export async function updateOrderStatus(
  id: string,
  status: string,
  note?: string
): Promise<void> {
  const res = await authFetch(`/api/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note: note || `Status updated to ${status}` }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export async function updateMfgStage(
  orderId: string,
  stageId: string,
  status: string
): Promise<void> {
  const res = await authFetch(`/api/orders/${orderId}/manufacturing`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageId, status }),
  });
  if (!res.ok) throw new Error('Failed to update manufacturing stage');
}

