import { authFetch } from './api';
import { TeamMember } from '../types';

export async function getTeamMembers(): Promise<TeamMember[]> {
    const res = await authFetch('/api/team');
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch team');
    }
    return res.json();
}

export async function generateInviteCode(): Promise<{ code: string; expiresAt: string }> {
    const res = await authFetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate invite code');
    }
    return res.json();
}

export async function joinTeam(code: string): Promise<{ message: string; businessId: string; businessName: string }> {
    const res = await authFetch('/api/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to join team');
    }
    return res.json();
}

export async function updateMemberRole(userId: string, role: string): Promise<void> {
    const res = await authFetch(`/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
    }
}

export async function removeMember(userId: string): Promise<void> {
    const res = await authFetch(`/api/team/${userId}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove member');
    }
}
