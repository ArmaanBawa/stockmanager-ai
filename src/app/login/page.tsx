'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('verified') === 'true') {
            setSuccess('Email verified successfully! You can now sign in.');
        }
        const err = searchParams.get('error');
        if (err === 'invalid-token') {
            setError('Invalid verification link. Please register again.');
        } else if (err === 'token-expired') {
            setError('Verification link has expired. Please register again.');
        } else if (err === 'verification-failed') {
            setError('Verification failed. Please try again.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            if (result.error.includes('EMAIL_NOT_VERIFIED')) {
                setError('Please verify your email before signing in. Check your inbox for the verification link.');
            } else {
                setError('Invalid email or password');
            }
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg" />
            <div className="auth-card animate-in">
                <h1 className="auth-title">StockManager AI</h1>
                <p className="auth-subtitle">Sign in to your procurement platform</p>

                {success && (
                    <div style={{
                        padding: '12px 16px',
                        background: 'var(--success-bg)',
                        border: '1px solid var(--success)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--success)',
                        fontSize: 14,
                        marginBottom: 16,
                    }}>
                        ✅ {success}
                    </div>
                )}

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><div className="spinner" /> Signing in...</> : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don&apos;t have an account? <Link href="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="loading-page"><div className="spinner" /> Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
