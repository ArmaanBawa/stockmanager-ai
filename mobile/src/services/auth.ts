import { API_BASE_URL } from '../config';
import { saveToken, clearToken, getToken } from './api';
import { User } from '../types';

/**
 * Login using the mobile-login JWT endpoint.
 * POST /api/auth/mobile-login with { email, password }
 * Returns { token, user }
 */
export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Invalid email or password');
  }

  const data = await res.json();
  await saveToken(data.token);

  return data.user as User;
}

/**
 * Get the current session user info by verifying the stored token.
 */
export async function getSession(): Promise<User | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    // Decode the JWT payload to get user info (no verification needed client-side)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      await clearToken();
      return null;
    }

    return {
      id: payload.sub || '',
      name: payload.name || '',
      email: payload.email || '',
      businessId: payload.businessId || '',
      businessName: payload.businessName || '',
    };
  } catch {
    return null;
  }
}

/**
 * Logout — clear stored token.
 */
export async function logout(): Promise<void> {
  await clearToken();
}
