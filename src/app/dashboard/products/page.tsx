'use client';

import { useEffect, useState } from 'react';

interface Product {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    unitPrice: number;
    unit: string;
    reorderLevel: number;
    customer?: { id: string; name: string };
}

interface Customer { id: string; name: string; }

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
    customerName?: string;
    reorderLevel: number;
    totalStock: number;
    totalUsed: number;
    dailyUsageRate: number;
    daysRemaining: number | null;
    isLowStock: boolean;
    lots: InventoryLot[];
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showUsage, setShowUsage] = useState(false);
    const [showAddStock, setShowAddStock] = useState(false);
    const [usageForm, setUsageForm] = useState({ productId: '', quantity: 1, reason: '' });
    const [addStockForm, setAddStockForm] = useState({ productId: '', quantity: 1, costPerUnit: 0, note: '' });
    const [form, setForm] = useState({ name: '', description: '', unitPrice: 0, unit: 'm' });

    const fetchData = () => {
        Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/customers').then(r => r.json()),
            fetch('/api/inventory').then(r => r.json()),
        ]).then(([p, c, inv]) => {
            setProducts(p);
            setCustomers(c);
            setInventory(inv);
            setLoading(false);
        });
    };

    useEffect(() => { fetchData(); }, []);

    const getStock = (productId: string) => inventory.find(i => i.productId === productId);

    const resetForm = () => {
        setForm({ name: '', description: '', unitPrice: 0, unit: 'm' });
        setEditId(null);
    };

    const openAdd = () => { resetForm(); setShowModal(true); };
    const openEdit = (p: Product) => {
        setForm({
            name: p.name, description: p.description || '',
            unitPrice: p.unitPrice, unit: 'm',
        });
        setEditId(p.id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, unitPrice: Number(form.unitPrice) };
        const url = editId ? `/api/products/${editId}` : '/api/products';
        await fetch(url, {
            method: editId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        setShowModal(false);
        resetForm();
        fetchData();
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await fetch(`/api/products/${deleteId}`, { method: 'DELETE' });
        setDeleteId(null);
        fetchData();
    };

    const handleUsage = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...usageForm, quantity: Number(usageForm.quantity) }),
        });
        if (res.ok) {
            setShowUsage(false);
            setUsageForm({ productId: '', quantity: 1, reason: '' });
            fetchData();
        } else {
            const data = await res.json();
            alert(data.error || 'Error recording usage');
        }
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/inventory', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: addStockForm.productId,
                quantity: Number(addStockForm.quantity),
                costPerUnit: Number(addStockForm.costPerUnit) || undefined,
                note: addStockForm.note,
            }),
        });
        if (res.ok) {
            setShowAddStock(false);
            setAddStockForm({ productId: '', quantity: 1, costPerUnit: 0, note: '' });
            fetchData();
        } else {
            const data = await res.json();
            alert(data.error || 'Error adding stock');
        }
    };

    const openAddStock = (productId?: string) => {
        const product = products.find(p => p.id === productId);
        setAddStockForm({
            productId: productId || '',
            quantity: 1,
            costPerUnit: product?.unitPrice || 0,
            note: '',
        });
        setShowAddStock(true);
    };

    const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    const lowStockItems = inventory.filter(i => i.isLowStock);
    const totalStock = inventory.reduce((s, i) => s + i.totalStock, 0);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products & Inventory</h1>
                    <p className="page-subtitle">Manage products, track stock levels and lot-wise quantities</p>
                </div>
                <div className="flex-gap">
                    <button type="button" onClick={() => setShowUsage(true)} className="btn btn-secondary">📦 Record Usage</button>
                    <button type="button" onClick={() => openAddStock()} className="btn btn-secondary">➕ Add Stock</button>
                    <button type="button" onClick={openAdd} className="btn btn-primary">+ Add Product</button>
                </div>
            </div>

            {/* Low Stock Alert */}
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
                    <div className="stat-value">{products.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Stock</div>
                    <div className="stat-value">{totalStock}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Low Stock Items</div>
                    <div className="stat-value" style={lowStockItems.length > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text' } : {}}>
                        {lowStockItems.length}
                    </div>
                </div>
            </div>

            {products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {products.map(p => {
                        const stock = getStock(p.id);
                        const isExpanded = expanded === p.id;
                        return (
                            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : p.id)}>
                                <div className="flex-between">
                                    <div className="flex-gap" style={{ gap: 16 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: stock?.isLowStock ? 'var(--danger-bg)' : stock ? 'var(--success-bg)' : 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                            {stock?.isLowStock ? '⚠️' : '📦'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                Base Price: ₹{p.unitPrice.toLocaleString()}/m
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-gap" style={{ gap: 16 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: stock?.isLowStock ? 'var(--danger)' : stock ? 'var(--success)' : 'var(--text-muted)' }}>
                                                {stock ? stock.totalStock : 0} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{p.unit}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {stock ? (
                                                    <>
                                                        {stock.daysRemaining !== null ? `~${stock.daysRemaining} days left` : 'No usage data'}
                                                        {stock.dailyUsageRate > 0 && ` • ${stock.dailyUsageRate}/${p.unit}/day`}
                                                    </>
                                                ) : 'No stock yet'}
                                            </div>
                                        </div>
                                        <div className="flex-gap" onClick={e => e.stopPropagation()}>
                                            <button type="button" onClick={() => openAddStock(p.id)} className="btn btn-primary btn-sm">+ Stock</button>
                                            <button type="button" onClick={() => openEdit(p)} className="btn btn-secondary btn-sm">Edit</button>
                                            <button type="button" onClick={() => setDeleteId(p.id)} className="btn btn-danger btn-sm">Delete</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded: description + lot details */}
                                {isExpanded && (
                                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                        {p.description && (
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                                {p.description}
                                            </div>
                                        )}
                                        <div className="flex-gap" style={{ marginBottom: 12, gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                                            <span>Base Price: <strong style={{ color: 'var(--text-primary)' }}>₹{p.unitPrice.toLocaleString()}/m</strong></span>
                                            {stock && <span>Total Used: <strong style={{ color: 'var(--text-primary)' }}>{stock.totalUsed} m</strong></span>}
                                        </div>
                                        {stock && stock.lots.length > 0 ? (
                                            <>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Lot Details</div>
                                                <div className="table-container">
                                                    <table className="table">
                                                        <thead><tr><th>Lot #</th><th>Received</th><th>Initial</th><th>Remaining</th><th>Cost/Unit</th></tr></thead>
                                                        <tbody>
                                                            {stock.lots.map(lot => (
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
                                            </>
                                        ) : (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No inventory lots yet. Stock is added when orders are delivered.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card empty-state">
                    <p>🏷️ No products yet</p>
                    <p style={{ fontSize: 13, marginBottom: 16 }}>Add products to start tracking inventory and orders</p>
                    <button type="button" onClick={openAdd} className="btn btn-primary">Add Product</button>
                </div>
            )}

            {/* Add/Edit Product Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Edit Product' : 'Add Product'}</h3>
                            <button type="button" className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Product Name *</label>
                                <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Base Price (₹ per meter)</label>
                                <input type="number" className="form-input" value={form.unitPrice} onChange={e => update('unitPrice', e.target.value)} min="0" step="0.01" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Product</h3>
                            <button type="button" className="modal-close" onClick={() => setDeleteId(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px 0', color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete this product? This action cannot be undone and will delete all associated records.
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={() => setDeleteId(null)} className="btn btn-secondary">Cancel</button>
                            <button type="button" onClick={confirmDelete} className="btn btn-danger">Delete Product</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Usage Modal */}
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

            {/* Add Stock Modal */}
            {showAddStock && (
                <div className="modal-overlay" onClick={() => setShowAddStock(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Stock</h3>
                            <button className="modal-close" onClick={() => setShowAddStock(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddStock}>
                            <div className="form-group">
                                <label className="form-label">Product</label>
                                <select className="form-select" value={addStockForm.productId} onChange={e => {
                                    const product = products.find(p => p.id === e.target.value);
                                    setAddStockForm(prev => ({ ...prev, productId: e.target.value, costPerUnit: product?.unitPrice || 0 }));
                                }} required>
                                    <option value="">Select product</option>
                                    {products.map(p => {
                                        const stock = getStock(p.id);
                                        return <option key={p.id} value={p.id}>{p.name} (Current: {stock?.totalStock || 0} {p.unit})</option>;
                                    })}
                                </select>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Quantity to Add</label>
                                    <input type="number" className="form-input" value={addStockForm.quantity} onChange={e => setAddStockForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} min="1" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cost per Unit (₹)</label>
                                    <input type="number" className="form-input" value={addStockForm.costPerUnit} onChange={e => setAddStockForm(prev => ({ ...prev, costPerUnit: Number(e.target.value) }))} min="0" step="0.01" />
                                </div>
                            </div>
                            {addStockForm.productId && (
                                <div style={{ padding: '12px 16px', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                    📊 Current stock: <strong style={{ color: 'var(--text-primary)' }}>{getStock(addStockForm.productId)?.totalStock || 0}</strong>
                                    {' → After adding: '}
                                    <strong style={{ color: 'var(--success)' }}>{(getStock(addStockForm.productId)?.totalStock || 0) + (addStockForm.quantity || 0)}</strong>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input className="form-input" value={addStockForm.note} onChange={e => setAddStockForm(prev => ({ ...prev, note: e.target.value }))} placeholder="e.g. Purchased from vendor, Restocked" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddStock(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
