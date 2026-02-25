'use client';

import { useEffect, useState } from 'react';

interface Customer {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    _count: { products: number; orders: number };
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '' });

    const fetchCustomers = () => {
        fetch('/api/customers').then(r => r.json()).then(data => {
            setCustomers(data);
            setLoading(false);
        });
    };

    useEffect(() => { fetchCustomers(); }, []);

    const resetForm = () => {
        setForm({ name: '', contactName: '', email: '', phone: '', address: '' });
        setEditId(null);
    };

    const openAdd = () => { resetForm(); setShowModal(true); };
    const openEdit = (s: Customer) => {
        setForm({ name: s.name, contactName: s.contactName || '', email: s.email || '', phone: s.phone || '', address: s.address || '' });
        setEditId(s.id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editId ? `/api/customers/${editId}` : '/api/customers';
        await fetch(url, {
            method: editId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setShowModal(false);
        resetForm();
        fetchCustomers();
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await fetch(`/api/customers/${deleteId}`, { method: 'DELETE' });
        setDeleteId(null);
        fetchCustomers();
    };

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    if (loading) return <div className="loading-page"><div className="spinner" /> Loading...</div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Manage your customers</p>
                </div>
                <button type="button" onClick={openAdd} className="btn btn-primary">+ Add Customer</button>
            </div>

            {customers.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Products</th>
                                <th>Orders</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td>{s.contactName || '—'}</td>
                                    <td>{s.email || '—'}</td>
                                    <td>{s.phone || '—'}</td>
                                    <td>{s._count.products}</td>
                                    <td>{s._count.orders}</td>
                                    <td>
                                        <div className="flex-gap">
                                            <button type="button" onClick={() => openEdit(s)} className="btn btn-secondary btn-sm">Edit</button>
                                            <button type="button" onClick={() => setDeleteId(s.id)} className="btn btn-danger btn-sm">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <p>👥 No customers yet</p>
                    <p style={{ fontSize: 13, marginBottom: 16 }}>Add your first customer to start managing orders</p>
                    <button type="button" onClick={openAdd} className="btn btn-primary">Add Customer</button>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Edit Customer' : 'Add Customer'}</h3>
                            <button type="button" className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Contact Person</label>
                                    <input className="form-input" value={form.contactName} onChange={e => update('contactName', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => update('phone', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" value={form.email} onChange={e => update('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <textarea className="form-textarea" value={form.address} onChange={e => update('address', e.target.value)} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add Customer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Customer</h3>
                            <button type="button" className="modal-close" onClick={() => setDeleteId(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px 0', color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete this customer? This action cannot be undone and will delete all associated products and orders.
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={() => setDeleteId(null)} className="btn btn-secondary">Cancel</button>
                            <button type="button" onClick={confirmDelete} className="btn btn-danger">Delete Customer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
