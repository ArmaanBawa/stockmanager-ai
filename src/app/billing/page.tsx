'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type SubscriptionStatus = {
    active: boolean;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
};

const FEATURES = [
    { icon: '🤖', title: 'Full AI Inventory Analysis', desc: 'Deep insights and predictions on your stock levels.' },
    { icon: '🎙️', title: 'Voice Assistant Mobile Access', desc: 'Control your business hands-free from the mobile app.' },
    { icon: '📋', title: 'Unlimited Order Tracking', desc: 'Track every order from placement to delivery.' },
    { icon: '📊', title: 'AI-Powered Ledger & Reports', desc: 'Automated purchase records and business summaries.' },
    { icon: '🔔', title: 'Smart Reorder Alerts', desc: 'Never run out of stock with proactive AI alerts.' },
];

export default function BillingPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const router = useRouter();
    const { status: authStatus } = useSession();
    const isLoggedIn = authStatus === 'authenticated';

    useEffect(() => {
        fetch('/api/billing/status')
            .then((res) => res.json())
            .then((data) => setSubscription(data))
            .catch(() => setSubscription(null))
            .finally(() => setStatusLoading(false));
    }, []);

    const handleSubscribe = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/billing/checkout', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'Failed to initialize checkout');

            const { subscriptionId, keyId } = data;
            const options = {
                key: keyId,
                subscription_id: subscriptionId,
                name: 'ProcureFlow AI',
                description: 'Super++ Plan — ₹1,499/month',
                handler: async function (response: { razorpay_subscription_id: string; razorpay_payment_id: string }) {
                    // Immediately confirm the subscription in our DB (don't wait for webhook)
                    try {
                        await fetch('/api/billing/confirm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                            }),
                        });
                    } catch {
                        // Even if confirm fails, webhook will handle it — still redirect
                    }
                    router.push('/dashboard?payment_success=true');
                },
                theme: { color: '#c4622d' },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setError(response.error.description || 'Payment failed');
            });
            rzp.open();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/billing/cancel', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'Failed to cancel subscription');
            // Update local state to reflect cancellation
            setSubscription((prev) => prev ? { ...prev, cancelAtPeriodEnd: true } : prev);
            setCancelConfirm(false);
        } catch (err: any) {
            setError(err.message || 'Failed to cancel subscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split-page">
            <div className="grain-overlay" />

            {/* LEFT — Plan showcase */}
            <div className="auth-split-left">
                <div className="auth-left-glow-1" />
                <div className="auth-left-glow-2" />
                <div className="auth-left-orb auth-left-orb-1" />
                <div className="auth-left-orb auth-left-orb-2" />
                <div className="auth-left-orb auth-left-orb-3" />

                <div className="auth-left-content">
                    <div className="auth-left-badge land-zoom-in" style={{ animationDelay: '0.1s' }}>
                        <span className="land-badge-dot" />
                        Super++ Plan
                    </div>
                    <h1 className="auth-left-title land-zoom-in" style={{ animationDelay: '0.25s' }}>
                        Everything you need to run your business{' '}
                        <span className="auth-left-accent">smarter</span>
                    </h1>
                    <p className="auth-left-sub land-zoom-in" style={{ animationDelay: '0.4s' }}>
                        One plan. Full access to AI analysis, mobile voice assistant, and unlimited order tracking.
                    </p>

                    <div className="auth-left-features">
                        {FEATURES.map((f, i) => (
                            <div
                                className="auth-left-feature land-zoom-in"
                                key={i}
                                style={{ animationDelay: `${0.55 + i * 0.1}s` }}
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

            {/* RIGHT — Billing form */}
            <div className="auth-split-right">
                <div className="auth-card">
                    <Link href={isLoggedIn && subscription?.active ? '/dashboard' : isLoggedIn ? '/' : '/login'} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        marginBottom: '24px',
                        transition: 'color 0.2s',
                    }}>
                        {isLoggedIn && subscription?.active ? '← Back to dashboard' : isLoggedIn ? '← Back to home' : '← Back to sign in'}
                    </Link>

                    <h1 className="auth-title">ProcureFlow Pro</h1>
                    <p className="auth-subtitle">Manage your subscription</p>

                    {statusLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px', color: 'var(--text-muted)' }}>
                            <div className="spinner" /> Checking subscription...
                        </div>

                    ) : subscription?.active ? (
                        /* ── ACTIVE ── */
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <span className="badge badge-delivered" style={{ fontSize: '13px', padding: '5px 12px' }}>
                                    ✓ Active
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {subscription.status}
                                </span>
                            </div>

                            <div style={{
                                background: 'var(--accent-glow)',
                                border: '1px solid rgba(217,119,87,0.2)',
                                borderRadius: 'var(--radius-md)',
                                padding: '20px',
                                marginBottom: '24px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>₹1,499</span>
                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/month</span>
                                </div>
                                {subscription.currentPeriodEnd && (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {subscription.cancelAtPeriodEnd ? '⚠ Cancels on' : '🔄 Renews on'}{' '}
                                        <strong style={{ color: 'var(--text-primary)' }}>
                                            {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'long', year: 'numeric',
                                            })}
                                        </strong>
                                    </p>
                                )}
                            </div>

                            {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="btn btn-primary btn-lg"
                                    style={{ width: '100%' }}
                                >
                                    Go to Dashboard
                                </button>

                                {subscription.cancelAtPeriodEnd ? (
                                    <p style={{
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        color: 'var(--text-muted)',
                                        padding: '10px 0',
                                    }}>
                                        ⚠️ Your subscription is set to cancel at the end of the billing period.
                                    </p>
                                ) : !cancelConfirm ? (
                                    <button
                                        onClick={() => setCancelConfirm(true)}
                                        className="btn btn-secondary btn-lg"
                                        style={{ width: '100%' }}
                                    >
                                        Cancel Subscription
                                    </button>
                                ) : (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px',
                                    }}>
                                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 600 }}>
                                            Are you sure you want to cancel?
                                        </p>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                            You'll keep access until the end of your current billing period
                                            {subscription.currentPeriodEnd && (
                                                <> ({new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                })})</>
                                            )}.
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={handleCancel}
                                                disabled={loading}
                                                className="btn btn-lg"
                                                style={{
                                                    flex: 1,
                                                    background: 'rgba(239,68,68,0.9)',
                                                    color: '#fff',
                                                    border: 'none',
                                                }}
                                            >
                                                {loading ? <><div className="spinner" /> Cancelling...</> : 'Yes, Cancel'}
                                            </button>
                                            <button
                                                onClick={() => setCancelConfirm(false)}
                                                className="btn btn-secondary btn-lg"
                                                style={{ flex: 1 }}
                                            >
                                                Keep Plan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    ) : (
                        /* ── NO SUBSCRIPTION ── */
                        <div>
                            <div style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '20px',
                                marginBottom: '24px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>₹1,499</span>
                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/month</span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Billed monthly · Cancel anytime</p>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {FEATURES.map((f, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--success)', fontSize: '15px', flexShrink: 0, fontWeight: 700 }}>✓</span>
                                        {f.title}
                                    </li>
                                ))}
                            </ul>

                            {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={handleSubscribe}
                                    disabled={loading}
                                    className="btn btn-primary btn-lg"
                                    style={{ width: '100%' }}
                                >
                                    {loading ? <><div className="spinner" /> Processing...</> : 'Subscribe Now — ₹1,499/mo'}
                                </button>
                                {isLoggedIn && (
                                    <button
                                        onClick={() => router.push('/')}
                                        className="btn btn-secondary btn-lg"
                                        style={{ width: '100%' }}
                                    >
                                        ← Back to Home
                                    </button>
                                )}
                            </div>

                            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                Secured by Razorpay · ₹1,499 charged monthly
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
