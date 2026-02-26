'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Redirect to check-email page instead of auto-signing in
            router.push('/check-email');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        }

        setLoading(false);
    };

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <div className="auth-page">
            <div className="auth-bg" />
            <div className="auth-card animate-in">
                <h1 className="auth-title">Get Started</h1>
                <p className="auth-subtitle">Create your business account on SalesManager AI</p>

                <button
                    type="button"
                    className="btn-google"
                    onClick={async () => {
                        setGoogleLoading(true);
                        await fetch('/api/auth/google-action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'signup' }),
                        });
                        signIn('google', { callbackUrl: '/dashboard' });
                    }}
                    disabled={googleLoading}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    {googleLoading ? 'Connecting...' : 'Sign up with Google'}
                </button>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Your Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.name}
                            onChange={e => update('name', e.target.value)}
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Business Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.businessName}
                            onChange={e => update('businessName', e.target.value)}
                            placeholder="Acme Corporation"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={form.email}
                            onChange={e => update('email', e.target.value)}
                            placeholder="you@company.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={form.password}
                            onChange={e => update('password', e.target.value)}
                            placeholder="Min 6 characters"
                            minLength={6}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><div className="spinner" /> Creating account...</> : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
