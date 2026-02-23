'use client';

import { useEffect, useState } from 'react';

interface InventoryLot {
    id: string;
    lotNumber: string;
    quantity: number;
    remainingQty: number;
    costPerUnit: number;
    receivedAt: string;
}

interface InventoryItem {
    productId: string;
    productName: string;
    sku?: string;
    unit: string;
    supplierName?: string;
    reorderLevel: number;
    totalStock: number;
    totalUsed: number;
    dailyUsageRate: number;
    daysRemaining: number | null;
    isLowStock: boolean;
    lots: InventoryLot[];
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showUsage, setShowUsage] = useState(false);
    const [usageForm, setUsageForm] = useState({ productId: '', quantity: 1, reason: '' });

    const fetchInventory = () => {
        fetch('/api/inventory').then(r => r.json()).then(data => {
            setInventory(data);
            setLoading(false);
        });
    };

    useEffect(() => { fetchInventory(); }, []);

    const handleUsage = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...usageForm, quantity: Number(usageForm.quantity) }),
        });
        if (res.ok) {
            setShowUsage(false);
            fetchInventory();
        } else {
            const data = await res.json();
            alert(data.error || 'Error recording usage');
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    const lowStockItems = inventory.filter(i => i.isLowStock);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Track stock levels and lot-wise quantities</p>
                </div>
                <button onClick={() => setShowUsage(true)} className="btn btn-primary">📦 Record Usage</button>
            </div>

            {/* Alert Banner */}
            {lowStockItems.length > 0 && (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: 20 }}>
                    <span style={{ fontWeight: 600, color: 'var(--warning)' }}>⚠️ Low Stock Alert:</span>{' '}
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {lowStockItems.map(i => i.productName).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} below reorder level
                    </span>
                </div>
            )}

            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Products</div>
                    <div className="stat-value">{inventory.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Stock</div>
                    <div className="stat-value">{inventory.reduce((s, i) => s + i.totalStock, 0)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Low Stock Items</div>
                    <div className="stat-value" style={lowStockItems.length > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text' } : {}}>
                        {lowStockItems.length}
                    </div>
                </div>
            </div>

            {inventory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {inventory.map(item => (
                        <div key={item.productId} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === item.productId ? null : item.productId)}>
                            <div className="flex-between">
                                <div className="flex-gap" style={{ gap: 16 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: item.isLowStock ? 'var(--danger-bg)' : 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                        {item.isLowStock ? '⚠️' : '📦'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{item.productName}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {item.sku && <>{item.sku} • </>}{item.supplierName || 'No supplier'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: item.isLowStock ? 'var(--danger)' : 'var(--success)' }}>
                                        {item.totalStock} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{item.unit}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {item.daysRemaining !== null ? `~${item.daysRemaining} days left` : 'No usage data'}
                                        {item.dailyUsageRate > 0 && ` • ${item.dailyUsageRate}/${item.unit}/day`}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded lot details */}
                            {expanded === item.productId && item.lots.length > 0 && (
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Lot Details</div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead><tr><th>Lot #</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/Unit</th></tr></thead>
                                            <tbody>
                                                {item.lots.map(lot => (
                                                    <tr key={lot.id}>
                                                        <td><code style={{ color: 'var(--accent-light)', fontSize: 12 }}>{lot.lotNumber}</code></td>
                                                        <td style={{ fontSize: 13 }}>{new Date(lot.receivedAt).toLocaleDateString()}</td>
                                                        <td>{lot.quantity}</td>
                                                        <td>
                                                            <span style={{ fontWeight: 600, color: lot.remainingQty === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                                {lot.remainingQty}
                                                            </span>
                                                        </td>
                                                        <td>₹{lot.costPerUnit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card empty-state">
                    <p>📦 No inventory data yet</p>
                    <p style={{ fontSize: 13 }}>Inventory is auto-updated when orders are marked as delivered.</p>
                </div>
            )}

            {/* Usage Modal */}
            {showUsage && (
                <div className="modal-overlay" onClick={() => setShowUsage(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Record Stock Usage</h3>
                            <button className="modal-close" onClick={() => setShowUsage(false)}>×</button>
                        </div>
                        <form onSubmit={handleUsage}>
                            <div className="form-group">
                                <label className="form-label">Product</label>
                                <select className="form-select" value={usageForm.productId} onChange={e => setUsageForm(prev => ({ ...prev, productId: e.target.value }))} required>
                                    <option value="">Select product</option>
                                    {inventory.map(i => <option key={i.productId} value={i.productId}>{i.productName} ({i.totalStock} {i.unit} available)</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity Used</label>
                                <input type="number" className="form-input" value={usageForm.quantity} onChange={e => setUsageForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} min="1" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <input className="form-input" value={usageForm.reason} onChange={e => setUsageForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="e.g. Sold, Used in production" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowUsage(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Record Usage</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
