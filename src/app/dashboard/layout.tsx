'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/orders', label: 'Orders', icon: '📋' },
    { href: '/dashboard/products', label: 'Products & Inventory', icon: '📦' },
    { href: '/dashboard/customers', label: 'Customers', icon: '👥' },
    { href: '/dashboard/ledger', label: 'Sales Ledger', icon: '💰' },
    { divider: true },
    { href: '/dashboard/team', label: 'Team', icon: '🏢' },
    { href: '/dashboard/assistant', label: 'AI Assistant', icon: '🤖' },
    { href: '/billing', label: 'Billing & Plan', icon: '💳' },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [billingChecked, setBillingChecked] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Detect payment_success query param
    useEffect(() => {
        if (searchParams.get('payment_success') === 'true') {
            setPaymentSuccess(true);
            // Clean the URL without reloading
            window.history.replaceState({}, '', pathname);
            // Auto-dismiss after 6 seconds
            const timer = setTimeout(() => setPaymentSuccess(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, pathname]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;

        // Skip billing check if user just completed payment
        if (searchParams.get('payment_success') === 'true') {
            setBillingChecked(true);
            return;
        }

        let active = true;
        fetch('/api/billing/status')
            .then(async (res) => {
                if (!res.ok) throw new Error('Billing status failed');
                return res.json();
            })
            .then((data) => {
                if (!active) return;
                if (!data?.active) {
                    router.push('/billing');
                }
            })
            .catch(() => {
                if (active) router.push('/billing');
            })
            .finally(() => {
                if (active) setBillingChecked(true);
            });

        return () => {
            active = false;
        };
    }, [status, router]);

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('stockmanager-theme') as 'light' | 'dark' | null;
        const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(preferred);
        document.documentElement.setAttribute('data-theme', preferred);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('stockmanager-theme', next);
    };

    if (status === 'loading' || !billingChecked) {
        return <div className="loading-page"><div className="spinner" /> Loading...</div>;
    }

    if (!session) return null;

    const user = session.user as { name?: string; businessName?: string };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo"><span style={{ WebkitTextFillColor: 'initial' }}>⚡</span> StockManager AI</div>
                <nav className="sidebar-nav">
                    {navItems.map((item, i) =>
                        'divider' in item ? (
                            <div key={i} className="sidebar-divider" />
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            >
                                <span className="icon">{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    )}
                </nav>
                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme}>
                        <span className="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </button>
                    <div className="sidebar-user">
                        <strong>{user?.name}</strong>
                        {(user as { businessName?: string })?.businessName}
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 12, width: '100%' }}
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
            <main className="main-content page-container">
                {paymentSuccess && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'fadeIn 0.4s ease',
                    }}>
                        <span style={{ fontSize: '24px' }}>🎉</span>
                        <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                                Payment successful!
                            </strong>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '2px 0 0' }}>
                                Your subscription is now active. Welcome to SalesManager AI!
                            </p>
                        </div>
                        <button
                            onClick={() => setPaymentSuccess(false)}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: '4px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div className="loading-page"><div className="spinner" /> Loading...</div>}>
            <DashboardInner>{children}</DashboardInner>
        </Suspense>
    );
}

