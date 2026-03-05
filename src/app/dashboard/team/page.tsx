'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    createdAt: string;
}

export default function TeamPage() {
    const { data: session } = useSession();
    const currentUser = session?.user as { id?: string; role?: string } | undefined;
    const isOwner = currentUser?.role === 'OWNER';

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchMembers = async () => {
        try {
            setFetchError(null);
            const res = await fetch('/api/team');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to fetch team');
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setMembers(data);
            }
        } catch (e: unknown) {
            console.error('Team fetch error:', e);
            setFetchError((e as Error).message || 'Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMembers(); }, []);

    useEffect(() => {
        if (actionMsg) {
            const t = setTimeout(() => setActionMsg(null), 4000);
            return () => clearTimeout(t);
        }
    }, [actionMsg]);

    const handleGenerateInvite = async () => {
        setInviteLoading(true);
        try {
            const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            const data = await res.json();
            setInviteCode(data.code);
        } catch (e: unknown) {
            setActionMsg({ type: 'error', text: (e as Error).message || 'Failed to generate invite code' });
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            setActionMsg({ type: 'success', text: 'Invite code copied to clipboard!' });
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setJoinLoading(true);
        try {
            const res = await fetch('/api/team/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinCode.trim() }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            const data = await res.json();
            setActionMsg({ type: 'success', text: data.message });
            setShowJoinModal(false);
            setJoinCode('');
            fetchMembers();
        } catch (e: unknown) {
            setActionMsg({ type: 'error', text: (e as Error).message || 'Failed to join team' });
        } finally {
            setJoinLoading(false);
        }
    };

    const handleChangeRole = async (memberId: string, memberName: string, currentRole: string) => {
        const newRole = currentRole === 'OWNER' ? 'MEMBER' : 'OWNER';
        if (!confirm(`Change ${memberName}'s role to ${newRole}?`)) return;
        try {
            const res = await fetch(`/api/team/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            setActionMsg({ type: 'success', text: `${memberName} is now ${newRole}` });
            fetchMembers();
        } catch (e: unknown) {
            setActionMsg({ type: 'error', text: (e as Error).message || 'Failed to update role' });
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from the team? They will lose access to all shared data.`)) return;
        try {
            const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            setActionMsg({ type: 'success', text: `${memberName} has been removed` });
            fetchMembers();
        } catch (e: unknown) {
            setActionMsg({ type: 'error', text: (e as Error).message || 'Failed to remove member' });
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    if (fetchError) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Team</h1>
                        <p className="page-subtitle">Manage team members and access to your organization</p>
                    </div>
                </div>
                <div className="card empty-state" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>❌ {fetchError}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Please check your connection and try again.
                    </p>
                    <button type="button" onClick={() => { setLoading(true); fetchMembers(); }} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            {/* Action Message Toast */}
            {actionMsg && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 1000,
                    background: actionMsg.type === 'success'
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                        : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                    border: `1px solid ${actionMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderRadius: 12, padding: '14px 20px', maxWidth: 360,
                    animation: 'fadeIn 0.3s ease',
                }}>
                    <span style={{ fontSize: 14, color: actionMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                        {actionMsg.type === 'success' ? '✅' : '❌'} {actionMsg.text}
                    </span>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Team</h1>
                    <p className="page-subtitle">Manage team members and access to your organization</p>
                </div>
                <div className="flex-gap">
                    <button type="button" onClick={() => setShowJoinModal(true)} className="btn btn-secondary">🔗 Join Team</button>
                    {isOwner && (
                        <button type="button" onClick={() => { setShowInviteModal(true); setInviteCode(null); }} className="btn btn-primary">+ Invite Member</button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Members</div>
                    <div className="stat-value">{members.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Owners</div>
                    <div className="stat-value">{members.filter(m => m.role === 'OWNER').length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Members</div>
                    <div className="stat-value">{members.filter(m => m.role === 'MEMBER').length}</div>
                </div>
            </div>

            {/* Members Table */}
            {members.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined</th>
                                {isOwner && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => (
                                <tr key={member.id}>
                                    <td>
                                        <div className="flex-gap" style={{ gap: 10, alignItems: 'center' }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: member.role === 'OWNER' ? 'var(--accent)' : 'var(--bg-glass)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontWeight: 700, fontSize: 14,
                                            }}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{member.name}</span>
                                                {member.id === currentUser?.id && (
                                                    <span style={{
                                                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                                                        background: 'rgba(59,130,246,0.2)', color: '#3b82f6',
                                                        padding: '2px 6px', borderRadius: 6,
                                                    }}>You</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{member.email}</td>
                                    <td>
                                        <span className={`badge badge-${member.role === 'OWNER' ? 'accepted' : 'placed'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {new Date(member.createdAt).toLocaleDateString()}
                                    </td>
                                    {isOwner && (
                                        <td>
                                            {member.id !== currentUser?.id ? (
                                                <div className="flex-gap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChangeRole(member.id, member.name, member.role)}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        {member.role === 'OWNER' ? '⬇ Make Member' : '⬆ Make Owner'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMember(member.id, member.name)}
                                                        className="btn btn-danger btn-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>🏢 No team members</p>
                    <p style={{ fontSize: 13, marginBottom: 16 }}>Invite others to collaborate on your business</p>
                    {isOwner && (
                        <button type="button" onClick={() => setShowInviteModal(true)} className="btn btn-primary">Invite Member</button>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Invite Team Member</h3>
                            <button type="button" className="modal-close" onClick={() => setShowInviteModal(false)}>×</button>
                        </div>
                        {inviteCode ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                    Share this code with your team member:
                                </p>
                                <div style={{
                                    fontSize: 36, fontWeight: 800, letterSpacing: 8,
                                    background: 'var(--bg-glass)', padding: '16px 24px',
                                    borderRadius: 14, border: '1px solid var(--accent)',
                                    color: 'var(--text-primary)', display: 'inline-block',
                                }}>
                                    {inviteCode}
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                                    Valid for 24 hours
                                </p>
                                <button type="button" onClick={handleCopyCode} className="btn btn-primary" style={{ marginTop: 16 }}>
                                    📋 Copy Code
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                    Generate an invite code for a new team member to join your organization.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleGenerateInvite}
                                    className="btn btn-primary"
                                    disabled={inviteLoading}
                                >
                                    {inviteLoading ? 'Generating...' : 'Generate Invite Code'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Join a Team</h3>
                            <button type="button" className="modal-close" onClick={() => setShowJoinModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleJoinTeam}>
                            <div className="form-group">
                                <label className="form-label">Enter the invite code shared by the team owner:</label>
                                <input
                                    className="form-input"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A1B2C3"
                                    maxLength={6}
                                    style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!joinCode.trim() || joinLoading}>
                                    {joinLoading ? 'Joining...' : 'Join Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

