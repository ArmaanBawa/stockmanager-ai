import { authFetch } from './api';
import { Product, InventoryItem } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const res = await authFetch('/api/products');
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function createProduct(data: {
  name: string;
  description?: string;
  unitPrice: number;
  unit?: string;
}): Promise<Product> {
  const res = await authFetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create product');
  }
  return res.json();
}

export async function updateProduct(
  id: string,
  data: { name?: string; description?: string; unitPrice?: number; unit?: string }
): Promise<Product> {
  const res = await authFetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await authFetch('/api/inventory');
  if (!res.ok) throw new Error('Failed to load inventory');
  return res.json();
}

export async function recordUsage(data: {
  productId: string;
  quantity: number;
  reason?: string;
}): Promise<void> {
  const res = await authFetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record usage');
  }
}

export async function addStock(data: {
  productId: string;
  quantity: number;
  costPerUnit: number;
  note?: string;
}): Promise<void> {
  const res = await authFetch('/api/inventory', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add stock');
  }
}

