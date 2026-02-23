'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/orders', label: 'Orders', icon: '📋' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
    { href: '/dashboard/products', label: 'Products', icon: '🏷️' },
    { href: '/dashboard/suppliers', label: 'Suppliers', icon: '🏭' },
    { href: '/dashboard/ledger', label: 'Ledger', icon: '📒' },
    { divider: true },
    { href: '/dashboard/assistant', label: 'AI Assistant', icon: '🤖' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
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

    if (status === 'loading') {
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
                {children}
            </main>
        </div>
    );
}
