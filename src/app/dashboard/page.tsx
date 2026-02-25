'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
    stats: {
        totalOrders: number;
        activeOrders: number;
        totalCustomers: number;
        totalProducts: number;
        totalStockValue: number;
        totalStockUnits: number;
        totalSpent: number;
    };
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        createdAt: string;
        customer: { name: string };
        items: Array<{ product: { name: string } }>;
    }>;
}

interface Insight {
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/dashboard').then(r => r.json()),
            fetch('/api/ai/insights').then(r => r.json()),
        ]).then(([dashData, insightData]) => {
            setData(dashData);
            setInsights(Array.isArray(insightData) ? insightData : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="loading-page"><div className="spinner" /> Loading dashboard...</div>;
    }

    const stats = data?.stats;

    const statusEmoji: Record<string, string> = {
        PLACED: '📋', ACCEPTED: '✅', IN_MANUFACTURING: '🏭', DISPATCHED: '🚚', DELIVERED: '📦', CANCELLED: '❌',
    };

    const insightIcons: Record<string, { icon: string; bg: string }> = {
        critical: { icon: '🔴', bg: 'var(--danger-bg)' },
        warning: { icon: '🟡', bg: 'var(--warning-bg)' },
        info: { icon: 'ℹ️', bg: 'var(--info-bg)' },
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of your procurement activity</p>
                </div>
                <Link href="/dashboard/orders" className="btn btn-primary">+ New Order</Link>
            </div>

            {/* Stats Grid */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value">{stats?.totalOrders || 0}</div>
                    <div className="stat-change">{stats?.activeOrders || 0} active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Customers</div>
                    <div className="stat-value">{stats?.totalCustomers || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Products</div>
                    <div className="stat-value">{stats?.totalProducts || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Inventory</div>
                    <div className="stat-value">{stats?.totalStockUnits || 0}</div>
                    <div className="stat-change">₹{(stats?.totalStockValue || 0).toLocaleString()} value</div>
                </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Recent Orders */}
                <div className="card">
                    <div className="flex-between" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Orders</h3>
                        <Link href="/dashboard/orders" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>View all →</Link>
                    </div>
                    {data?.recentOrders && data.recentOrders.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {data.recentOrders.map(order => (
                                <div key={order.id} className="insight-card">
                                    <div style={{ fontSize: 24 }}>{statusEmoji[order.status] || '📋'}</div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600 }}>{order.orderNumber}</h4>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {order.customer.name} • ₹{order.totalAmount.toLocaleString()}
                                        </p>
                                        <div className="flex-gap" style={{ marginTop: 6 }}>
                                            <span className={`badge badge-${order.status.toLowerCase()}`}>
                                                {order.status.replace('_', ' ')}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No orders yet</p>
                            <Link href="/dashboard/orders" className="btn btn-primary btn-sm">Create your first order</Link>
                        </div>
                    )}
                </div>

                {/* AI Insights */}
                <div className="card">
                    <div className="flex-between" style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>🤖 AI Insights</h3>
                        <Link href="/dashboard/assistant" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ask AI →</Link>
                    </div>
                    {insights.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {insights.slice(0, 5).map((insight, i) => (
                                <div key={i} className="insight-card">
                                    <div
                                        className="insight-icon"
                                        style={{ background: insightIcons[insight.severity]?.bg }}
                                    >
                                        {insightIcons[insight.severity]?.icon}
                                    </div>
                                    <div className="insight-content">
                                        <h4>{insight.title}</h4>
                                        <p>{insight.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>✨ All looking good! No alerts.</p>
                            <p style={{ fontSize: 13 }}>Add customers, products, and orders to get AI insights.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
