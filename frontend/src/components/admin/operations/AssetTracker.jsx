import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import SharedSearchBar from '../shared/SharedSearchBar';
import { filterDataBySearch } from '../shared/searchUtils';
import getPaginationRange from '../getPaginationRange';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

const AssetTracker = ({ assets, bays, onRefresh, isDark }) => {
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', category: 'Equipment', serialNumber: '', purchaseDate: '', serviceCycleBookings: 500, bayId: '', description: '' });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 5;

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        if (selectedAsset) {
            const updated = assets.find(a => a._id === selectedAsset._id);
            if (updated) setSelectedAsset(updated);
        }
    }, [assets]);

    const filtered = filterDataBySearch(assets, debouncedSearch, ['name', 'category', 'serialNumber', 'status']);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const openAdd = () => { setEditing(null); setForm({ name: '', category: 'Equipment', serialNumber: '', purchaseDate: '', serviceCycleBookings: 500, bayId: '', description: '' }); setShowModal(true); };
    const openEdit = (a) => { setEditing(a); setForm({ name: a.name, category: a.category, serialNumber: a.serialNumber || '', purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '', serviceCycleBookings: a.serviceCycleBookings, bayId: a.bayId?._id || a.bayId || '', description: a.description || '' }); setShowModal(true); };
    const openDetails = (a) => { setSelectedAsset(a); setShowDetails(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return Swal.fire('Error', 'Asset name is required', 'error');
        try {
            const payload = { ...form, bayId: form.bayId || null, purchaseDate: form.purchaseDate || null };
            if (editing) {
                await axios.put(`${API_BASE}/assets/${editing._id}`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({
                    title: 'Asset Updated Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            } else {
                await axios.post(`${API_BASE}/assets`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ icon: 'success', title: 'Asset Registered', timer: 1500, showConfirmButton: true });
            }
            setShowModal(false); onRefresh();
        } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Failed to save', 'error'); }
    };

    const handleDelete = (a) => {
        Swal.fire({ title: `Delete "${a.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
            .then(async (r) => { if (r.isConfirmed) { await axios.delete(`${API_BASE}/assets/${a._id}`, { headers: authHeaders(), withCredentials: true }); onRefresh(); } });
    };

    const statusColor = (s) => {
        if (s === 'Active') return '#28a745';
        if (s === 'Degraded') return '#ffc107';
        if (s === 'Under Maintenance') return '#dc3545';
        return '#6c757d';
    };

    const usagePercent = (a) => a.serviceCycleBookings > 0 ? Math.min(100, Math.round((a.usageCounter / a.serviceCycleBookings) * 100)) : 0;
    const usageBarColor = (pct) => pct >= 90 ? '#dc3545' : pct >= 70 ? '#ffc107' : '#28a745';

    return (
        <div className="font-poppins">
            <div className="d-flex justify-content-end align-items-center mb-4">
                <SharedSearchBar searchTerm={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search assets..." />
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 d-flex flex-column" style={{ minHeight: 500 }}>
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark-secondary">Equipment & Assets</h6>
                    <button className="btn btn-save btn-sm text-white px-3 d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                        onClick={openAdd}>
                        + Register New Asset
                    </button>
                </div>
                <div className='card-body p-0 flex-grow-1 d-flex flex-column'>
                    <div className="table-responsive pb-2">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                            <thead className="bg-light text-muted small">
                                <tr className="border-bottom">
                                    <th className="ps-4 py-3" style={{ width: '25%' }}>Asset Details</th>
                                    <th className="py-3" style={{ width: '15%' }}>Category</th>
                                    <th className="py-3" style={{ width: '15%' }}>Location (Bay)</th>
                                    <th className="py-3" style={{ width: '25%' }}>Usage & Health</th>
                                    <th className="py-3">Status</th>
                                    <th className="pe-4 py-3 text-end" style={{ width: '10%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan="6" className="p-5 text-center text-muted">No equipment found matching your "<strong className='fw-bold'>{search}</strong>"</td></tr>
                                ) : (
                                    paginated.map(a => {
                                        const pct = usagePercent(a);
                                        return (
                                            <tr key={a._id} onClick={() => openDetails(a)} style={{ cursor: 'pointer' }} >
                                                <td className="ps-4 py-3">
                                                    <div className="fw-bold text-dark-secondary">{a.name}</div>
                                                    {a.serialNumber && <small className="text-muted small">S/N: {a.serialNumber}</small>}
                                                </td>
                                                <td className="text-muted">{a.category}</td>
                                                <td>
                                                    <span className="badge rounded-pill bg-light border text-dark-secondary px-3" style={{ fontSize: '0.7rem' }}>
                                                        {a.bayId?.name || 'Unassigned'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column gap-1" style={{ maxWidth: '180px' }}>
                                                        <div className="d-flex justify-content-between small">
                                                            <span className="text-muted" style={{ fontSize: '0.65rem' }}>Lifecycle Progress</span>
                                                            <span className="fw-bold" style={{ fontSize: '0.65rem', color: usageBarColor(pct) }}>{a.usageCounter} / {a.serviceCycleBookings}</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pct}%`, height: '100%', background: usageBarColor(pct), borderRadius: 3, transition: 'width 0.4s ease' }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge rounded-pill" style={{ background: `${statusColor(a.status)}20`, color: statusColor(a.status), fontSize: '0.7rem', padding: '6px 12px' }}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="pe-4 text-end" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => openEdit(a)} className="btn btn-sm border-0 bg-transparent me-1">
                                                        <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} title='Edit Asset' />
                                                    </button>
                                                    <button onClick={() => handleDelete(a)} className="btn btn-sm text-danger-hover border-0 bg-transparent">
                                                        <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} title='Delete Asset' />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {filtered.length > PER_PAGE && (
                <div className="card-footer border-top py-3 d-flex justify-content-between align-items-center mt-auto shadow-sm rounded-4 mb-4" style={{ background: 'var(--theme-card-bg)' }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                        Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <button
                            className="btn btn-sm p-0 rounded-circle border-0"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            style={{ width: '30px', height: '30px', background: page === 1 ? '#f1f5f9' : 'transparent' }}
                        >
                            <img src={leftArrowIcon} style={{ width: '9px', opacity: page === 1 ? 0.3 : 0.7 }} alt="prev" />
                        </button>
                        {getPaginationRange(page, totalPages).map((p, idx) => (
                            p === '...' ? (
                                <span key={`dot-l-${idx}`} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>...</span>
                            ) : (
                                <button
                                    key={`lp-${p}`}
                                    onClick={() => setPage(p)}
                                    className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${page === p ? 'text-white shadow-sm' : 'text-muted'}`}
                                    style={{ width: '30px', height: '30px', fontSize: '0.78rem', background: page === p ? '#23A0CE' : 'transparent' }}
                                >
                                    {p}
                                </button>
                            )
                        ))}
                        <button
                            className="btn btn-sm p-0 rounded-circle border-0"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            style={{ width: '30px', height: '30px', background: page >= totalPages ? '#f1f5f9' : 'transparent' }}
                        >
                            <img src={rightArrowIcon} style={{ width: '9px', opacity: page >= totalPages ? 0.3 : 0.7 }} alt="next" />
                        </button>
                    </div>
                </div>
            )}

            <AdminModalWrapper show={showModal} onClose={() => setShowModal(false)} size="md">
                <div className="modal-content border-0 rounded-4 shadow text-dark-secondary" style={{ background: 'var(--theme-card-bg)' }}>
                    <div className="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title fw-bold text-dark-secondary">{editing ? 'Update Asset Details' : 'Register New Asset'}</h5>
                        <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)} />
                    </div>
                    <div className="modal-body p-4 text-start">
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Asset Name *</label>
                            <input className="form-control rounded-3 text-dark-secondary shadow-none border" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pressure Washer #1" />
                        </div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Category</label>
                                <select className="form-select rounded-3 text-dark-secondary shadow-none border" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Rental Fleet">Rental Fleet</option>
                                    <option value="Facility">Facility</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Serial Number</label>
                                <input className="form-control rounded-3 text-dark-secondary shadow-none border" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder="Manufacturer S/N" />
                            </div>
                        </div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Purchase Date</label>
                                <input type="date" className="form-control rounded-3 text-dark-secondary shadow-none border" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Service Cycle (Uses)</label>
                                <input type="number" className="form-control rounded-3 text-dark-secondary shadow-none border" value={form.serviceCycleBookings} onChange={e => setForm({ ...form, serviceCycleBookings: Number(e.target.value) })} placeholder="500" />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Assigned Bay Location</label>
                            <select className="form-select rounded-3 text-dark-secondary shadow-none border" value={form.bayId} onChange={e => setForm({ ...form, bayId: e.target.value })}>
                                <option value="">-- No Bay Assigned --</option>
                                {bays.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="mb-0">
                            <label className="form-label text-muted small fw-bold">Asset Description</label>
                            <textarea
                                className="form-control rounded-3 text-dark-secondary shadow-none border"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Add notes about usage, condition, or specifics..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="modal-footer border-0 pt-0 pb-4 justify-content-between px-4">
                        <button type="button" className="btn btn-danger px-4 rounded-3 border-0" onClick={() => setShowModal(false)} style={{ fontWeight: 600 }}>Cancel</button>
                        <button type="button" className="btn btn-save text-white px-4 rounded-3 shadow-sm border-0" onClick={handleSave} style={{ fontWeight: 600 }}>
                            {editing ? 'Save Changes' : 'Register Asset'}
                        </button>
                    </div>
                </div>
            </AdminModalWrapper>

            {/* Asset Details Modal */}
            <AdminModalWrapper show={showDetails} onClose={() => setShowDetails(false)} size="lg">
                <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden text-dark-secondary " style={{ background: 'var(--theme-card-bg)' }}>
                    {selectedAsset && (
                        <>
                            <div className="modal-header border-0 pt-4 px-4 pb-0 d-flex flex-column align-items-start" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                <div className="d-flex justify-content-between w-100 align-items-start mb-3">
                                    <div>
                                        <h4 className="modal-title fw-bold text-white mb-1">Asset Details: {selectedAsset.name}</h4>
                                        <p className="text-light opacity-75 small mb-1">Detailed information and health history for <span className="fw-bold">{selectedAsset.name}</span></p>
                                        <span className="badge rounded-pill" style={{ background: `${statusColor(selectedAsset.status)}20`, color: statusColor(selectedAsset.status), fontSize: '0.75rem', padding: '6px 12px' }}>
                                            {selectedAsset.status}
                                        </span>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowDetails(false)} />
                                </div>
                            </div>
                            <div className="modal-body p-4 pt-0">
                                <div className="row g-4 mt-2">
                                    <div className="col-md-5 border-end">
                                        <h6 className="fw-bold text-muted small mb-3">ASSET INFORMATION</h6>
                                        <div className="mb-3">
                                            <small className="text-muted d-block small fw-bold" style={{ fontSize: '0.7rem' }}>Category</small>
                                            <span className="fw-medium text-dark-secondary">{selectedAsset.category}</span>
                                        </div>
                                        <div className="mb-3">
                                            <small className="text-muted d-block small fw-bold" style={{ fontSize: '0.7rem' }}>Serial Number</small>
                                            <span className="fw-medium text-dark-secondary">{selectedAsset.serialNumber || 'N/A'}</span>
                                        </div>
                                        <div className="mb-3">
                                            <small className="text-muted d-block small fw-bold" style={{ fontSize: '0.7rem' }}>Location</small>
                                            <span className="fw-medium text-dark-secondary">{selectedAsset.bayId?.name || 'N/A'}</span>
                                        </div>
                                        <div className="mb-4">
                                            <small className="text-muted d-block small fw-bold" style={{ fontSize: '0.7rem' }}>Description</small>
                                            <p className="text-dark-secondary small mb-0" style={{ lineHeight: '1.5' }}>
                                                {selectedAsset.description || 'No description provided for this asset.'}
                                            </p>
                                        </div>

                                        <h6 className="fw-bold text-muted small mb-3 mt-4">HEALTH METRICS</h6>
                                        <div className="p-3 rounded-3 bg-light border-start border-4" style={{ borderColor: usageBarColor(usagePercent(selectedAsset)) }}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="small text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Usage Lifetime</span>
                                                <span className="fw-bold small" style={{ color: usageBarColor(usagePercent(selectedAsset)) }}>{usagePercent(selectedAsset)}%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${usagePercent(selectedAsset)}%`, height: '100%', background: usageBarColor(usagePercent(selectedAsset)), borderRadius: 4, transition: 'width 0.6s ease' }} />
                                            </div>
                                            <small className="text-muted mt-2 d-block" style={{ fontSize: '0.65rem' }}>
                                                {selectedAsset.usageCounter} out of {selectedAsset.serviceCycleBookings} uses until maintenance.
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col-md-7 ps-md-4" style={{ background: 'var(--theme-card-bg)' }}>
                                        <h6 className="fw-bold text-muted small mb-3">MAINTENANCE & USAGE HISTORY</h6>
                                        {!selectedAsset ? (
                                            <div className="text-center p-4"><div className="spinner-border text-primary spinner-border-sm" /> Loading history...</div>
                                        ) : selectedAsset.maintenanceLogs?.length === 0 ? (
                                            <p className="text-muted small">No past transactions found.</p>
                                        ) : (
                                            <div className="p-0 rounded-4 bg-white d-flex flex-column" style={{ minHeight: '350px', maxHeight: '420px', overflowY: 'auto' }}>

                                                {selectedAsset.maintenanceLogs?.length > 0 ? (
                                                    <div className="w-100">
                                                        {selectedAsset.maintenanceLogs.slice(0).reverse().map((log, i, arr) => {
                                                            const logIndex = arr.length - i;
                                                            return (
                                                                <div key={i} className="py-3 d-flex align-items-center justify-content-between border-bottom hover-bg-light transition-all" style={{ background: i % 2 === 0 ? 'var(--theme-card-bg)' : 'var(--theme-card-bg)' }}>
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-muted" style={{ width: 40, height: 40, background: 'var(--theme-card-header-bg)', fontSize: '0.85rem' }}>
                                                                            {logIndex}
                                                                        </div>
                                                                        <div>
                                                                            <div className="fw-bold text-dark-secondary mb-0 text-truncate" style={{ fontSize: '0.9rem', lineHeight: '1.2', maxWidth: '180px' }}>
                                                                                {log.description.replace('Maintenance Completed: ', '')}
                                                                            </div>
                                                                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                            </small>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-end">
                                                                        <div className="fw-bold text-success" style={{ fontSize: '1rem' }}>
                                                                            ₱{(Number(log.laborCost) || 0).toLocaleString()}
                                                                        </div>
                                                                        <span className="badge bg-light border text-muted px-2 py-1" style={{ fontSize: '0.6rem', fontWeight: 600 }}>
                                                                            {log.performedBy}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center py-5">
                                                        <div className="bg-light p-3 rounded-circle shadow-sm mb-3">
                                                            <img src={leftArrowIcon} style={{ width: '24px', opacity: 0.2, transform: 'rotate(-90deg)' }} alt="history" />
                                                        </div>
                                                        <span className="small text-muted fw-medium">No history logs recorded yet.<br />History will automatically populate as projects are completed.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-4 pt-2">
                                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetails(false)} style={{ background: isDark ? 'var(--theme-bg-secondary)' : '' }}>Close Details</button>
                            </div>
                        </>
                    )}
                </div>
            </AdminModalWrapper >
        </div >
    );
};

export default AssetTracker;
