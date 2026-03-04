import { authFetch } from './api';
import { LedgerEntry, LedgerSummary } from '../types';

interface LedgerResponse {
  entries: LedgerEntry[];
  summary: LedgerSummary;
}

export async function fetchLedger(filters?: {
  customerId?: string;
  productId?: string;
  from?: string;
  to?: string;
}): Promise<LedgerResponse> {
  const params = new URLSearchParams();
  if (filters?.customerId) params.set('customerId', filters.customerId);
  if (filters?.productId) params.set('productId', filters.productId);
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);

  const query = params.toString();
  const res = await authFetch(`/api/ledger${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to load ledger');
  const data = await res.json();
  return {
    entries: data.entries || [],
    summary: data.summary || { totalSales: 0, totalRevenue: 0, totalItemsSold: 0 },
  };
}

