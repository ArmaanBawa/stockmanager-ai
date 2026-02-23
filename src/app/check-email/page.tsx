'use client';

import Link from 'next/link';

export default function CheckEmailPage() {
    return (
        <div className="auth-page">
            <div className="auth-bg" />
            <div className="auth-card animate-in" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                <h1 className="auth-title">Check Your Email</h1>
                <p className="auth-subtitle" style={{ marginBottom: 24, lineHeight: 1.6 }}>
                    We&apos;ve sent a verification link to your email address.
                    <br />
                    Please click the link to verify your account.
                </p>
                <div style={{
                    padding: '16px 20px',
                    background: 'var(--info-bg)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginBottom: 24,
                }}>
                    💡 The link expires in <strong style={{ color: 'var(--text-primary)' }}>24 hours</strong>.
                    Check your spam folder if you don&apos;t see the email.
                </div>
                <Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', textDecoration: 'none' }}>
                    Go to Login
                </Link>
                <div className="auth-footer" style={{ marginTop: 16 }}>
                    Didn&apos;t receive the email? <Link href="/register">Try registering again</Link>
                </div>
            </div>
        </div>
    );
}
