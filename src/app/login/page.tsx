'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const SHOWCASE_FEATURES = [
    { icon: '💬', title: 'AI Chat Assistant', desc: 'Ask anything about your business in plain English.' },
    { icon: '📦', title: 'Live Inventory', desc: 'Real-time stock tracking that updates with every order.' },
    { icon: '📊', title: 'Sales Analytics', desc: 'Revenue breakdowns and performance at a glance.' },
];

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const leftRef = useRef<HTMLDivElement>(null);
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

    // Mouse-reactive glow on left panel
    useEffect(() => {
        const el = leftRef.current;
        if (!el) return;
        const glow = el.querySelector('.auth-left-mouse-glow') as HTMLElement;
        if (!glow) return;

        const handleMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            glow.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(217, 119, 87, 0.08), transparent 60%)`;
        };

        el.addEventListener('mousemove', handleMove);
        return () => el.removeEventListener('mousemove', handleMove);
    }, []);

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
            } else if (result.error.includes('SUBSCRIPTION_REQUIRED')) {
                setError('Your subscription is inactive. Please subscribe to continue.');
                setTimeout(() => router.push('/billing'), 2000);
            } else {
                setError('Invalid email or password');
            }
            setLoading(false);
        } else {
            router.push('/billing');
        }
    };

    return (
        <div className="auth-split-page">
            <div className="grain-overlay" />

            {/* LEFT — Animated showcase */}
            <div className="auth-split-left" ref={leftRef}>
                <div className="auth-left-mouse-glow" />
                <div className="auth-left-glow-1" />
                <div className="auth-left-glow-2" />
                <div className="auth-left-orb auth-left-orb-1" />
                <div className="auth-left-orb auth-left-orb-2" />
                <div className="auth-left-orb auth-left-orb-3" />

                <div className="auth-left-content">
                    <div className="auth-left-badge land-zoom-in" style={{ animationDelay: '0.1s' }}>
                        <span className="land-badge-dot" />
                        AI-Powered Platform
                    </div>
                    <h1 className="auth-left-title land-zoom-in" style={{ animationDelay: '0.25s' }}>
                        Manage your business<br />
                        with <span className="auth-left-accent">intelligence</span>
                    </h1>
                    <p className="auth-left-sub land-zoom-in" style={{ animationDelay: '0.4s' }}>
                        Your AI sales assistant that knows your inventory, customers, and numbers inside out.
                    </p>

                    <div className="auth-left-features">
                        {SHOWCASE_FEATURES.map((f, i) => (
                            <div
                                className="auth-left-feature land-zoom-in"
                                key={i}
                                style={{ animationDelay: `${0.55 + i * 0.12}s` }}
                            >
                                <span className="auth-left-feature-icon">{f.icon}</span>
                                <div>
                                    <div className="auth-left-feature-title">{f.title}</div>
                                    <div className="auth-left-feature-desc">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT — Login form */}
            <div className="auth-split-right">
                <div className="auth-card">
                    <Link href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        marginBottom: '24px',
                        transition: 'color 0.2s',
                    }}>
                        ← Back to home
                    </Link>
                    <h1 className="auth-title">SalesManager AI</h1>
                    <p className="auth-subtitle">Sign in to your sales platform</p>

                    <button
                        type="button"
                        className="btn-google"
                        onClick={() => {
                            setGoogleLoading(true);
                            signIn('google', { callbackUrl: '/dashboard' });
                        }}
                        disabled={googleLoading}
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                        {googleLoading ? 'Connecting...' : 'Continue with Google'}
                    </button>

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

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
