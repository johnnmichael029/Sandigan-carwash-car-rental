import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import gcashQrFallback from '../../../assets/img/gcash-qr.png';

const PaymentSettingsManager = ({ isDark }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [methods, setMethods] = useState([]);
    const [downPaymentPercent, setDownPaymentPercent] = useState(30);
    const [isDpSaving, setIsDpSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        label: '',
        type: 'qr', // 'qr' | 'bank' | 'counter'
        accountName: '',
        accountNumber: '',
        qrImageBase64: null,
        isActive: true,
        sortOrder: 1
    });
    const [qrPreview, setQrPreview] = useState(null);

    // Fetch settings on mount
    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/settings`, { headers: authHeaders(), withCredentials: true });
            const settingsArray = res.data || [];

            const pmSetting = settingsArray.find(s => s.key === 'payment_methods');
            if (pmSetting && Array.isArray(pmSetting.value)) {
                setMethods(pmSetting.value);
            }

            const dpSetting = settingsArray.find(s => s.key === 'rental_down_payment_percent');
            if (dpSetting && dpSetting.value !== undefined) {
                setDownPaymentPercent(dpSetting.value);
            }
        } catch (err) {
            console.error('Failed to fetch payment settings:', err);
            Swal.fire('Error', 'Failed to load payment settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Save rental down payment percent
    const handleSaveDownPayment = async () => {
        const val = Number(downPaymentPercent);
        if (isNaN(val) || val < 0 || val > 100) {
            Swal.fire('Invalid Value', 'Down payment must be between 0% and 100%', 'warning');
            return;
        }
        setIsDpSaving(true);
        try {
            await axios.post(`${API_BASE}/settings/update`, {
                key: 'rental_down_payment_percent',
                value: val
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                icon: 'success',
                title: 'Down Payment Updated!',
                text: `Car rental down payment set to ${val}%`,
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)'
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update down payment', 'error');
        } finally {
            setIsDpSaving(false);
        }
    };

    // Open Modal for Create or Edit
    const handleOpenModal = (method = null) => {
        if (method) {
            setEditingMethod(method);
            setFormData({
                id: method.id || `method-${Date.now()}`,
                label: method.label || '',
                type: method.type || 'qr',
                accountName: method.accountName || '',
                accountNumber: method.accountNumber || '',
                qrImageBase64: method.qrImageBase64 || null,
                isActive: method.isActive !== undefined ? method.isActive : true,
                sortOrder: method.sortOrder ?? (methods.length + 1)
            });
            setQrPreview(method.qrImageBase64 || null);
        } else {
            setEditingMethod(null);
            setFormData({
                id: `method-${Date.now()}`,
                label: '',
                type: 'qr',
                accountName: '',
                accountNumber: '',
                qrImageBase64: null,
                isActive: true,
                sortOrder: methods.length + 1
            });
            setQrPreview(null);
        }
        setIsModalOpen(true);
    };

    // Handle QR image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('File Too Large', 'QR Code image must be under 2MB', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setFormData(prev => ({ ...prev, qrImageBase64: reader.result }));
            setQrPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Save Method to DB
    const handleSaveMethod = async (e) => {
        e.preventDefault();
        if (!formData.label.trim()) {
            Swal.fire('Validation Error', 'Please enter a payment method name', 'warning');
            return;
        }

        let updatedList = [];
        if (editingMethod) {
            updatedList = methods.map(m => m.id === editingMethod.id ? { ...formData } : m);
        } else {
            updatedList = [...methods, { ...formData }];
        }

        setSaving(true);
        try {
            await axios.post(`${API_BASE}/settings/update`, {
                key: 'payment_methods',
                value: updatedList
            }, { headers: authHeaders(), withCredentials: true });

            setMethods(updatedList);
            setIsModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: editingMethod ? 'Payment Method Updated!' : 'Payment Method Added!',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)'
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to save payment method', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Toggle active status inline
    const handleToggleActive = async (id) => {
        const updatedList = methods.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
        try {
            await axios.post(`${API_BASE}/settings/update`, {
                key: 'payment_methods',
                value: updatedList
            }, { headers: authHeaders(), withCredentials: true });
            setMethods(updatedList);
        } catch (err) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    };

    // Delete method
    const handleDeleteMethod = async (id, label) => {
        const { isConfirmed } = await Swal.fire({
            title: `Delete ${label}?`,
            text: 'This payment method will no longer be available on the booking page.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)'
        });
        if (!isConfirmed) return;

        const updatedList = methods.filter(m => m.id !== id);
        try {
            await axios.post(`${API_BASE}/settings/update`, {
                key: 'payment_methods',
                value: updatedList
            }, { headers: authHeaders(), withCredentials: true });
            setMethods(updatedList);
            Swal.fire({ icon: 'success', title: 'Deleted!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Error', 'Failed to delete payment method', 'error');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading payment configuration...</p>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column gap-4">
            {/* Top Configuration Cards */}
            <div className="row g-3">
                {/* Down Payment % Card */}
                <div className="col-12 col-md-6">
                    <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0 font-poppins text-dark-secondary d-flex align-items-center gap-2">
                                🚗 Car Rental Down Payment
                            </h6>
                            <span className="badge rounded-pill px-3 py-1 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.8rem', fontWeight: 600 }}>
                                Active: {downPaymentPercent}%
                            </span>
                        </div>
                        <p className="text-muted small mb-3">
                            Set the required down payment percentage customers must pay when requesting a car rental on the public booking page.
                        </p>
                        <div className="input-group">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="form-control form-control-sm"
                                value={downPaymentPercent}
                                onChange={(e) => setDownPaymentPercent(e.target.value)}
                                style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                            />
                            <span className="input-group-text" style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}>%</span>
                            <button
                                className="btn btn-primary btn-sm px-4 fw-bold text-white font-poppins"
                                onClick={handleSaveDownPayment}
                                disabled={isDpSaving}
                            >
                                {isDpSaving ? <span className="spinner-border spinner-border-sm" /> : 'Save Rate'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Info Summary */}
                <div className="col-12 col-md-6">
                    <div className="p-4 rounded-4 shadow-sm h-100 d-flex flex-column justify-content-between" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                        <div>
                            <h6 className="fw-bold mb-2 font-poppins text-dark-secondary">
                                💡 Payment Architecture
                            </h6>
                            <p className="text-muted small mb-2">
                                Customers choose their preferred payment method at Step 4. All QR codes and account details added here are instantly rendered on the live booking page.
                            </p>
                        </div>
                        <div className="d-flex gap-3 mt-2">
                            <div className="px-3 py-2 rounded-3 text-center flex-fill" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <span className="d-block fw-bold fs-5" style={{ color: '#818cf8' }}>{methods.length}</span>
                                <span className="small text-muted">Total Methods</span>
                            </div>
                            <div className="px-3 py-2 rounded-3 text-center flex-fill" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                                <span className="d-block fw-bold fs-5" style={{ color: '#4ade80' }}>{methods.filter(m => m.isActive).length}</span>
                                <span className="small text-muted">Active in Booking</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Methods Table Header */}
            <div className="rounded-4 p-4 shadow-sm" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div>
                        <h5 className="fw-bold font-poppins text-dark-secondary mb-0">Configured Payment Methods</h5>
                        <small className="text-muted font-poppins">Manage QR codes, bank accounts, and payment instructions</small>
                    </div>
                    <button
                        className="btn btn-save text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.85rem', borderRadius: '8px', fontWeight: 600 }}
                        onClick={() => handleOpenModal()}
                    >
                        + Add Payment Method
                    </button>
                </div>

                {/* Methods List */}
                {methods.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        No payment methods configured yet. Click "+ Add Payment Method" to get started.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead className="table-light">
                                <tr>
                                    <th className="border-0 font-poppins ps-3" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Method / Label</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Type</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Account Details</th>
                                    <th className="border-0 font-poppins text-center" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>QR Image</th>
                                    <th className="border-0 font-poppins text-center" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                                    <th className="border-0 font-poppins text-end pe-3" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {methods.map((method) => (
                                    <tr key={method.id} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.02)', background: 'var(--theme-input-bg)' }}>
                                        <td className="ps-3 rounded-start">
                                            <div className="d-flex align-items-center gap-2">
                                                <span style={{ fontSize: '1.2rem' }}>
                                                    {method.type === 'qr' && ''}
                                                    {method.type === 'bank' && ''}
                                                    {method.type === 'counter' && ''}
                                                </span>
                                                <div>
                                                    <span className="fw-bold font-poppins d-block" style={{ color: 'var(--theme-content-text)', fontSize: '0.9rem' }}>
                                                        {method.label}
                                                    </span>
                                                    <span className="small text-muted font-poppins">Sort Order: {method.sortOrder ?? 1}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge rounded-pill px-2 py-1 font-poppins" style={{
                                                background: method.type === 'qr' ? 'rgba(99,102,241,0.12)' : method.type === 'bank' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: method.type === 'qr' ? '#818cf8' : method.type === 'bank' ? '#60a5fa' : '#fbbf24',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase'
                                            }}>
                                                {method.type}
                                            </span>
                                        </td>
                                        <td>
                                            {method.type === 'counter' ? (
                                                <span className="text-muted small font-poppins">Pay in cash upon arrival</span>
                                            ) : (
                                                <div className="font-poppins" style={{ fontSize: '0.82rem' }}>
                                                    <div className="fw-semibold text-dark-secondary">{method.accountName || '—'}</div>
                                                    <div className="text-muted" style={{ fontFamily: 'monospace' }}>{method.accountNumber || '—'}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {method.type === 'qr' ? (
                                                <img
                                                    src={method.qrImageBase64 || gcashQrFallback}
                                                    alt={method.label}
                                                    style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: '#fff', padding: '2px' }}
                                                />
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(method.id)}
                                                className="btn btn-sm rounded-pill font-poppins"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '3px 12px',
                                                    background: method.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.1)',
                                                    color: method.isActive ? '#4ade80' : '#ef4444',
                                                    border: `1px solid ${method.isActive ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`
                                                }}
                                            >
                                                {method.isActive ? '● Active' : '○ Inactive'}
                                            </button>
                                        </td>
                                        <td className="pe-3 text-end rounded-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-sm font-poppins"
                                                    style={{ background: 'rgba(35,160,206,0.1)', border: '1px solid rgba(35,160,206,0.3)', color: '#23A0CE', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600 }}
                                                    onClick={() => handleOpenModal(method)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-sm font-poppins"
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600 }}
                                                    onClick={() => handleDeleteMethod(method.id, method.label)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <AdminModalWrapper show={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
                    <div className="modal-content rounded-4 shadow border-0" style={{ background: 'var(--theme-modal-bg)' }}>
                        <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                            <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0">
                                {editingMethod ? `Edit ${editingMethod.label}` : 'Add Payment Method'}
                            </h5>
                            <button type="button" className="btn-close shadow-none" onClick={() => setIsModalOpen(false)}></button>
                        </div>
                        <form onSubmit={handleSaveMethod}>
                            <div className="modal-body p-4 d-flex flex-column gap-3">
                                {/* Label */}
                                <div>
                                    <label className="form-label text-muted small fw-bold font-poppins mb-1">Method Name / Label *</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="e.g. GCash, BDO Bank Transfer, Pay at Counter"
                                        value={formData.label}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        required
                                        style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="form-label text-muted small fw-bold font-poppins mb-1">Payment Type</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                    >
                                        <option value="qr">QR Code (GCash, Maya, etc.)</option>
                                        <option value="bank">Bank Account Transfer (BDO, BPI, UnionBank)</option>
                                        <option value="counter">Pay at Counter (Cash in Store)</option>
                                    </select>
                                </div>

                                {/* Account Fields — only if not counter */}
                                {formData.type !== 'counter' && (
                                    <>
                                        <div>
                                            <label className="form-label text-muted small fw-bold font-poppins mb-1">Account Holder Name</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. Alona Trinidad"
                                                value={formData.accountName}
                                                onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                                style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label text-muted small fw-bold font-poppins mb-1">
                                                {formData.type === 'qr' ? 'Mobile / Account Number (for 1-click copy)' : 'Bank Account Number'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. 09480669935 or 1234-5678-9012"
                                                value={formData.accountNumber}
                                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                                style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* QR Image Upload — only if QR */}
                                {formData.type === 'qr' && (
                                    <div>
                                        <label className="form-label text-muted small fw-bold font-poppins mb-1">Upload QR Code Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control form-control-sm"
                                            onChange={handleImageChange}
                                            style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                        />
                                        <div className="small text-muted mt-1">PNG, JPG, WebP up to 2MB. Leave blank to use default fallback.</div>
                                        {qrPreview && (
                                            <div className="mt-2 text-center p-2 rounded-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <img src={qrPreview} alt="QR Preview" style={{ width: '120px', height: '120px', objectFit: 'contain', background: '#fff', borderRadius: '8px', padding: '6px' }} />
                                                <div className="small text-success mt-1">✓ QR Preview Ready</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Sort Order & Active */}
                                <div className="row g-2">
                                    <div className="col-6">
                                        <label className="form-label text-muted small fw-bold font-poppins mb-1">Display Sort Order</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control form-control-sm"
                                            value={formData.sortOrder}
                                            onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                                            style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-content-text)' }}
                                        />
                                    </div>
                                    <div className="col-6 d-flex align-items-end pb-1">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="isActiveSwitch"
                                                checked={formData.isActive}
                                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label className="form-check-label small font-poppins fw-bold" htmlFor="isActiveSwitch" style={{ color: 'var(--theme-content-text)' }}>
                                                Active
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-top-0 px-4 pb-4 pt-0 gap-2">
                                <button type="button" className="btn btn-light rounded-pill px-4 font-poppins" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-save text-white rounded-pill px-4 font-poppins" disabled={saving}>
                                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : (editingMethod ? 'Save Changes' : 'Create Method')}
                                </button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default PaymentSettingsManager;
