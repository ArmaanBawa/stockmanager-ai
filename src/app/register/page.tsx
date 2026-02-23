'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
                <p className="auth-subtitle">Create your business account on StockManager AI</p>

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
