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
    supplier?: { id: string; name: string };
}

interface Supplier { id: string; name: string; }

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', sku: '', description: '', unitPrice: 0, unit: 'pcs', reorderLevel: 10, supplierId: '' });

    const fetchData = () => {
        Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/suppliers').then(r => r.json()),
        ]).then(([p, s]) => { setProducts(p); setSuppliers(s); setLoading(false); });
    };

    useEffect(() => { fetchData(); }, []);

    const resetForm = () => {
        setForm({ name: '', sku: '', description: '', unitPrice: 0, unit: 'pcs', reorderLevel: 10, supplierId: '' });
        setEditId(null);
    };

    const openAdd = () => { resetForm(); setShowModal(true); };
    const openEdit = (p: Product) => {
        setForm({
            name: p.name, sku: p.sku || '', description: p.description || '',
            unitPrice: p.unitPrice, unit: p.unit, reorderLevel: p.reorderLevel,
            supplierId: p.supplier?.id || '',
        });
        setEditId(p.id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, unitPrice: Number(form.unitPrice), reorderLevel: Number(form.reorderLevel) };
        if (!payload.supplierId) delete (payload as Record<string, unknown>).supplierId;
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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">Manage products you purchase from suppliers</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">+ Add Product</button>
            </div>

            {products.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Unit Price</th>
                                <th>Unit</th>
                                <th>Reorder Level</th>
                                <th>Supplier</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        {p.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>}
                                    </td>
                                    <td><code style={{ color: 'var(--accent-light)', fontSize: 13 }}>{p.sku || '—'}</code></td>
                                    <td>₹{p.unitPrice.toLocaleString()}</td>
                                    <td>{p.unit}</td>
                                    <td>{p.reorderLevel}</td>
                                    <td>{p.supplier?.name || '—'}</td>
                                    <td>
                                        <div className="flex-gap">
                                            <button onClick={() => openEdit(p)} className="btn btn-secondary btn-sm">Edit</button>
                                            <button onClick={() => handleDelete(p.id)} className="btn btn-danger btn-sm">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>🏷️ No products yet</p>
                    <p style={{ fontSize: 13, marginBottom: 16 }}>Add products to start tracking inventory and orders</p>
                    <button onClick={openAdd} className="btn btn-primary">Add Product</button>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Edit Product' : 'Add Product'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Product Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU</label>
                                    <input className="form-input" value={form.sku} onChange={e => update('sku', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Unit Price (₹)</label>
                                    <input type="number" className="form-input" value={form.unitPrice} onChange={e => update('unitPrice', e.target.value)} min="0" step="0.01" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit</label>
                                    <select className="form-select" value={form.unit} onChange={e => update('unit', e.target.value)}>
                                        <option value="pcs">Pieces</option>
                                        <option value="kg">Kilograms</option>
                                        <option value="ltr">Litres</option>
                                        <option value="m">Meters</option>
                                        <option value="box">Boxes</option>
                                        <option value="pack">Packs</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Reorder Level</label>
                                    <input type="number" className="form-input" value={form.reorderLevel} onChange={e => update('reorderLevel', e.target.value)} min="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Supplier</label>
                                    <select className="form-select" value={form.supplierId} onChange={e => update('supplierId', e.target.value)}>
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
