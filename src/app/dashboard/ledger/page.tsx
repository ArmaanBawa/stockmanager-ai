'use client';

import { useEffect, useState } from 'react';

interface LedgerEntry {
    id: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    description?: string;
    supplierId?: string;
    createdAt: string;
    product: { id: string; name: string; sku?: string };
    order?: { id: string; orderNumber: string };
}

interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; }

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [summary, setSummary] = useState({ totalPurchases: 0, totalSpent: 0, totalItems: 0 });
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({ supplierId: '', productId: '', from: '', to: '' });

    const fetchLedger = () => {
        const params = new URLSearchParams();
        if (filters.supplierId) params.set('supplierId', filters.supplierId);
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
            fetch('/api/suppliers').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
        ]).then(([ledgerData, s, p]) => {
            setEntries(ledgerData.entries || []);
            setSummary(ledgerData.summary || {});
            setSuppliers(s);
            setProducts(p);
            setLoading(false);
        });
    }, []);

    useEffect(() => { if (!loading) fetchLedger(); }, [filters]);

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Digital Ledger</h1>
                    <p className="page-subtitle">Permanent record of all purchase transactions</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid">
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Purchases</div>
                    <div className="stat-value">{summary.totalPurchases}</div>
                </div>
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Spent</div>
                    <div className="stat-value">₹{summary.totalSpent.toLocaleString()}</div>
                </div>
                <div className="stat-card card-glow">
                    <div className="stat-label">Total Items</div>
                    <div className="stat-value">{summary.totalItems}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
                        <label className="form-label">Supplier</label>
                        <select className="form-select" value={filters.supplierId} onChange={e => setFilters(prev => ({ ...prev, supplierId: e.target.value }))}>
                            <option value="">All Suppliers</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                    <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ supplierId: '', productId: '', from: '', to: '' })}>Clear</button>
                </div>
            </div>

            {entries.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>Order</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id}>
                                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{entry.product.name}</div>
                                        {entry.product.sku && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.product.sku}</div>}
                                    </td>
                                    <td>
                                        {entry.order ? (
                                            <code style={{ fontSize: 12, color: 'var(--accent-light)' }}>{entry.order.orderNumber}</code>
                                        ) : '—'}
                                    </td>
                                    <td>{entry.quantity}</td>
                                    <td>₹{entry.unitPrice.toLocaleString()}</td>
                                    <td style={{ fontWeight: 600 }}>₹{entry.totalAmount.toLocaleString()}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.description || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>📒 No ledger entries yet</p>
                    <p style={{ fontSize: 13 }}>Purchase records appear automatically when orders are delivered.</p>
                </div>
            )}
        </div>
    );
}
