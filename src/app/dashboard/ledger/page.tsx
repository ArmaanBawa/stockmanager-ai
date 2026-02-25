'use client';

import { useEffect, useState } from 'react';

interface LedgerEntry {
    id: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    description?: string;
    customerId?: string;
    createdAt: string;
    product: { id: string; name: string };
    order?: { id: string; orderNumber: string };
}

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; }

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [summary, setSummary] = useState({ totalSales: 0, totalRevenue: 0, totalItemsSold: 0 });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({ customerId: '', productId: '', from: '', to: '' });

    const fetchLedger = () => {
        const params = new URLSearchParams();
        if (filters.customerId) params.set('customerId', filters.customerId);
        if (filters.productId) params.set('productId', filters.productId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);

        fetch(`/api/ledger?${params}`).then(r => r.json()).then(data => {
            setEntries(data.entries || []);
            setSummary(data.summary || {});
        });
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/ledger').then(r => r.json()),
            fetch('/api/customers').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
        ]).then(([ledgerData, s, p]) => {
            setEntries(ledgerData.entries || []);
            setSummary(ledgerData.summary || {});
            setCustomers(s);
            setProducts(p);
            setLoading(false);
        });
    }, []);

    useEffect(() => { if (!loading) fetchLedger(); }, [filters]);

    const getCustomerName = (customerId?: string) => {
        if (!customerId) return '—';
        return customers.find(c => c.id === customerId)?.name || '—';
    };

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Ledger</h1>
                    <p className="page-subtitle">Track all sales transactions and revenue by customer</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid">
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Sales</div>
                    <div className="stat-value">{summary.totalSales}</div>
                </div>
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value">₹{(summary.totalRevenue || 0).toLocaleString()}</div>
                </div>
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Items Sold</div>
                    <div className="stat-value">{summary.totalItemsSold}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
                        <label className="form-label">Customer</label>
                        <select className="form-select" value={filters.customerId} onChange={e => setFilters(prev => ({ ...prev, customerId: e.target.value }))}>
                            <option value="">All Customers</option>
                            {customers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
                        <label className="form-label">Product</label>
                        <select className="form-select" value={filters.productId} onChange={e => setFilters(prev => ({ ...prev, productId: e.target.value }))}>
                            <option value="">All Products</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                        <label className="form-label">From</label>
                        <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                        <label className="form-label">To</label>
                        <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))} />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ customerId: '', productId: '', from: '', to: '' })}>Clear</button>
                </div>
            </div>

            {entries.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Product</th>
                                <th>Order</th>
                                <th>Qty Sold</th>
                                <th>Selling Price</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id}>
                                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 500 }}>{getCustomerName(entry.customerId ?? undefined)}</td>
                                    <td style={{ fontWeight: 500 }}>{entry.product.name}</td>
                                    <td>
                                        {entry.order ? (
                                            <code style={{ fontSize: 12, color: 'var(--accent-light)' }}>{entry.order.orderNumber}</code>
                                        ) : '—'}
                                    </td>
                                    <td>{entry.quantity}</td>
                                    <td>₹{entry.unitPrice.toLocaleString()}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{entry.totalAmount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>📒 No sales yet</p>
                    <p style={{ fontSize: 13 }}>Sales records appear automatically when orders are placed.</p>
                </div>
            )}
        </div>
    );
}
