import { authFetch } from './api';
import { DashboardData, Insight } from '../types';

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await authFetch('/api/dashboard');
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function fetchInsights(): Promise<Insight[]> {
  const res = await authFetch('/api/ai/insights');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

