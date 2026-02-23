'use client';

import { useEffect, useState } from 'react';

interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; unitPrice: number; unit: string; supplierId?: string; }
interface OrderItem { product: { name: string }; quantity: number; unitPrice: number; total: number; }
interface StatusHistory { status: string; note?: string; createdAt: string; }
interface ManufacturingStage { id: string; stage: string; status: string; note?: string; }
interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    notes?: string;
    createdAt: string;
    supplier: { id: string; name: string };
    items: OrderItem[];
    statusHistory?: StatusHistory[];
    manufacturingStages?: ManufacturingStage[];
}

const STATUSES = ['PLACED', 'ACCEPTED', 'IN_MANUFACTURING', 'DISPATCHED', 'DELIVERED'];
const STATUS_EMOJI: Record<string, string> = {
    PLACED: '📋', ACCEPTED: '✅', IN_MANUFACTURING: '🏭', DISPATCHED: '🚚', DELIVERED: '📦', CANCELLED: '❌',
};
const MFG_STAGES = ['RAW_MATERIAL_PREP', 'ASSEMBLY', 'QUALITY_CHECK', 'PACKAGING'];
const MFG_LABELS: Record<string, string> = {
    RAW_MATERIAL_PREP: 'Raw Material Prep', ASSEMBLY: 'Assembly', QUALITY_CHECK: 'Quality Check', PACKAGING: 'Packaging',
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState('');

    const [newOrder, setNewOrder] = useState({ supplierId: '', notes: '', items: [{ productId: '', quantity: 1, unitPrice: 0 }] });

    const fetchOrders = () => {
        const params = filterStatus ? `?status=${filterStatus}` : '';
        fetch(`/api/orders${params}`).then(r => r.json()).then(setOrders);
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/orders').then(r => r.json()),
            fetch('/api/suppliers').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
        ]).then(([o, s, p]) => {
            setOrders(o);
            setSuppliers(s);
            setProducts(p);
            setLoading(false);
        });
    }, []);

    useEffect(() => { if (!loading) fetchOrders(); }, [filterStatus]);

    const viewOrder = async (id: string) => {
        const data = await fetch(`/api/orders/${id}`).then(r => r.json());
        setSelectedOrder(data);
    };

    const updateStatus = async (orderId: string, status: string) => {
        await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note: `Status updated to ${status}` }),
        });
        viewOrder(orderId);
        fetchOrders();
    };

    const updateMfgStage = async (orderId: string, stageId: string, status: string) => {
        await fetch(`/api/orders/${orderId}/manufacturing`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stageId, status }),
        });
        viewOrder(orderId);
    };

    const addItem = () => setNewOrder(prev => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0 }] }));
    const removeItem = (i: number) => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i: number, field: string, value: string | number) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.map((item, idx) => {
                if (idx !== i) return item;
                const updated = { ...item, [field]: value };
                if (field === 'productId') {
                    const product = products.find(p => p.id === value);
                    if (product) updated.unitPrice = product.unitPrice;
                }
                return updated;
            }),
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplierId: newOrder.supplierId,
                notes: newOrder.notes,
                items: newOrder.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
            }),
        });
        setShowCreate(false);
        setNewOrder({ supplierId: '', notes: '', items: [{ productId: '', quantity: 1, unitPrice: 0 }] });
        fetchOrders();
    };

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    // Order detail view
    if (selectedOrder) {
        const currentIdx = STATUSES.indexOf(selectedOrder.status);
        const nextStatus = currentIdx < STATUSES.length - 1 ? STATUSES[currentIdx + 1] : null;

        return (
            <div className="animate-in">
                <div className="page-header">
                    <div>
                        <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary btn-sm" style={{ marginBottom: 8 }}>← Back to Orders</button>
                        <h1 className="page-title">{selectedOrder.orderNumber}</h1>
                        <p className="page-subtitle">{selectedOrder.supplier.name} • ₹{selectedOrder.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="flex-gap">
                        <span className={`badge badge-${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status.replace('_', ' ')}</span>
                        {nextStatus && selectedOrder.status !== 'CANCELLED' && (
                            <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedOrder.id, nextStatus)}>
                                → {nextStatus.replace('_', ' ')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid-2" style={{ alignItems: 'start' }}>
                    {/* Timeline */}
                    <div className="card">
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Order Timeline</h3>
                        <div className="timeline">
                            {STATUSES.map((status, i) => {
                                const historyEntry = selectedOrder.statusHistory?.find(h => h.status === status);
                                const isCompleted = currentIdx >= i;
                                const isActive = currentIdx === i;
                                return (
                                    <div key={status} className="timeline-item">
                                        <div className={`timeline-dot ${isActive ? 'active' : ''} ${isCompleted && !isActive ? 'completed' : ''}`}>
                                            {isCompleted ? '✓' : ''}
                                        </div>
                                        <div className="timeline-content">
                                            <h4 style={{ opacity: isCompleted ? 1 : 0.4 }}>{STATUS_EMOJI[status]} {status.replace('_', ' ')}</h4>
                                            {historyEntry && (
                                                <>
                                                    {historyEntry.note && <p>{historyEntry.note}</p>}
                                                    <p className="timeline-date">{new Date(historyEntry.createdAt).toLocaleString()}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Manufacturing Stages */}
                        {selectedOrder.manufacturingStages && selectedOrder.manufacturingStages.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--warning)' }}>🏭 Manufacturing Progress</h4>
                                {selectedOrder.manufacturingStages.map(stage => (
                                    <div key={stage.id} className="insight-card" style={{ marginBottom: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div className="flex-between">
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>{MFG_LABELS[stage.stage] || stage.stage}</span>
                                                <span className={`badge badge-${stage.status === 'COMPLETED' ? 'delivered' : stage.status === 'IN_PROGRESS' ? 'in_manufacturing' : 'placed'}`}>
                                                    {stage.status}
                                                </span>
                                            </div>
                                        </div>
                                        {stage.status !== 'COMPLETED' && selectedOrder.status === 'IN_MANUFACTURING' && (
                                            <div className="flex-gap">
                                                {stage.status === 'PENDING' && (
                                                    <button className="btn btn-secondary btn-sm" onClick={() => updateMfgStage(selectedOrder.id, stage.id, 'IN_PROGRESS')}>Start</button>
                                                )}
                                                {stage.status === 'IN_PROGRESS' && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => updateMfgStage(selectedOrder.id, stage.id, 'COMPLETED')}>Complete</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="card">
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Order Items</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{item.product.name}</td>
                                            <td>{item.quantity}</td>
                                            <td>₹{item.unitPrice.toLocaleString()}</td>
                                            <td style={{ fontWeight: 600 }}>₹{item.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                                        <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>₹{selectedOrder.totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {selectedOrder.notes && (
                            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
                                <strong>Notes:</strong> {selectedOrder.notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Track and manage purchase orders</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ New Order</button>
            </div>

            {/* Filters */}
            <div className="flex-gap" style={{ marginBottom: 20 }}>
                <button className={`btn ${filterStatus === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilterStatus('')}>All</button>
                {STATUSES.map(s => (
                    <button key={s} className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilterStatus(s)}>
                        {STATUS_EMOJI[s]} {s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {orders.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Supplier</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                                    <td>{order.supplier.name}</td>
                                    <td>{order.items.map(i => i.product.name).join(', ')}</td>
                                    <td>₹{order.totalAmount.toLocaleString()}</td>
                                    <td><span className={`badge badge-${order.status.toLowerCase()}`}>{order.status.replace('_', ' ')}</span></td>
                                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td><button onClick={() => viewOrder(order.id)} className="btn btn-secondary btn-sm">View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>📋 No orders yet</p>
                    <p style={{ fontSize: 13, marginBottom: 16 }}>Place your first order to get started</p>
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary">Create Order</button>
                </div>
            )}

            {/* Create Order Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create New Order</h3>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Supplier *</label>
                                <select className="form-select" value={newOrder.supplierId} onChange={e => setNewOrder(prev => ({ ...prev, supplierId: e.target.value }))} required>
                                    <option value="">Select supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <label className="form-label">Order Items</label>
                            {newOrder.items.map((item, i) => (
                                <div key={i} className="flex-gap" style={{ marginBottom: 12, gap: 8 }}>
                                    <select className="form-select" style={{ flex: 2 }} value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                                        <option value="">Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" className="form-input" style={{ flex: 1 }} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1" placeholder="Qty" required />
                                    <input type="number" className="form-input" style={{ flex: 1 }} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} min="0" step="0.01" placeholder="Price" required />
                                    {newOrder.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="btn btn-danger btn-sm">×</button>}
                                </div>
                            ))}
                            <button type="button" onClick={addItem} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>+ Add Item</button>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" value={newOrder.notes} onChange={e => setNewOrder(prev => ({ ...prev, notes: e.target.value }))} />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Place Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
