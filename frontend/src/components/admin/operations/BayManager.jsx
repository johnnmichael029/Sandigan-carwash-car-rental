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
import maintenanceIcon from '../../../assets/icon/maintenance-brand.png';
import approvedIcon from '../../../assets/icon/approved.png';

const BayManager = ({ bays, onRefresh }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingBay, setEditingBay] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'Standard Wash', description: '' });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 6;

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(handler);
    }, [search]);

    const filtered = filterDataBySearch(bays, debouncedSearch, ['name', 'type', 'status', 'description']);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const openAdd = () => { setEditingBay(null); setForm({ name: '', type: 'Standard Wash', description: '' }); setShowModal(true); };
    const openEdit = (bay) => { setEditingBay(bay); setForm({ name: bay.name, type: bay.type, description: bay.description || '' }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return Swal.fire('Error', 'Bay name is required', 'error');
        try {
            if (editingBay) {
                await axios.put(`${API_BASE}/bays/${editingBay._id}`, form, { headers: authHeaders(), withCredentials: true });
                Swal.fire({
                    title: 'Item Updated Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            } else {
                await axios.post(`${API_BASE}/bays`, form, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ icon: 'success', title: 'Bay Created', timer: 1500, showConfirmButton: true });
            }
            setShowModal(false);
            onRefresh();
        } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Failed to save bay', 'error'); }
    };

    const handleDelete = (bay) => {
        Swal.fire({ title: `Delete "${bay.name}"?`, text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
            .then(async (r) => {
                if (r.isConfirmed) {
                    await axios.delete(`${API_BASE}/bays/${bay._id}`, { headers: authHeaders(), withCredentials: true });
                    Swal.fire({ icon: 'success', title: 'Bay Deleted', timer: 1500, showConfirmButton: true });
                    onRefresh();
                }
            });
    };

    const handleStatusToggle = async (bay, newStatus) => {
        try {
            await axios.put(`${API_BASE}/bays/${bay._id}`, { status: newStatus }, { headers: authHeaders(), withCredentials: true });
            onRefresh();
        } catch (err) { console.error(err); }
    };

    const statusColor = (s) => {
        if (s === 'Available') return '#28a745';
        if (s === 'Occupied') return '#ffc107';
        if (s === 'Maintenance') return '#dc3545';
        return '#6c757d';
    };

    return (
        <>
            <div className="d-flex justify-content-end align-items-center mb-4">
                <SharedSearchBar searchTerm={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search bays..." />
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 d-flex flex-column" style={{ minHeight: 560 }}>
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark-secondary">Washing Bays</h6>
                    <button className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                        onClick={openAdd}>
                        + Add New Bay
                    </button>
                </div>
                <div className='card-body p-0 flex-grow-1 d-flex flex-column'>
                    <div className="table-responsive pb-2">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                            <thead className="bg-light font-poppins text-muted small">
                                <tr className="border-bottom">
                                    <th className="ps-4 py-3" style={{ width: '30%' }}>Bay Identifier</th>
                                    <th className="py-3" style={{ width: '20%' }}>Service Type</th>
                                    <th className="py-3" style={{ width: '25%' }}>Description / Notes</th>
                                    <th className="py-3">Status</th>
                                    <th className="pe-4 py-3 text-end" style={{ width: '10%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan="5" className="p-5 text-center text-muted">No washing bays found matching your "<strong className='fw-bold'>{search}</strong>"</td></tr>
                                ) : (
                                    paginated.map(bay => (
                                        <tr key={bay._id}>
                                            <td className="ps-4 py-3">
                                                <div className="fw-bold text-dark-secondary">{bay.name}</div>
                                                <small className="text-muted small">ID: {bay._id.slice(-6).toUpperCase()}</small>
                                            </td>
                                            <td>
                                                <span className="badge rounded-pill bg-light border text-dark-secondary px-3" style={{ fontSize: '0.7rem' }}>
                                                    {bay.type}
                                                </span>
                                            </td>
                                            <td className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                                                {bay.description || 'No notes provided'}
                                            </td>
                                            <td>
                                                <span className="badge rounded-pill" style={{ background: `${statusColor(bay.status)}20`, color: statusColor(bay.status), fontSize: '0.7rem', padding: '6px 12px' }}>
                                                    {bay.status === 'Occupied' ? 'Unavailable' : bay.status}
                                                </span>
                                            </td>
                                            <td className="pe-4 text-end">
                                                <div className="d-flex gap-1 justify-content-end align-items-center">
                                                    {bay.status === 'Available' ? (
                                                        <button onClick={() => handleStatusToggle(bay, 'Maintenance')} className="btn btn-sm border-0 bg-transparent" title="Set to Maintenance">
                                                            <img src={maintenanceIcon} alt="Maintenance" style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    ) : bay.status === 'Maintenance' && (
                                                        <button onClick={() => handleStatusToggle(bay, 'Available')} className="btn btn-sm border-0 bg-transparent" title="Set to Available">
                                                            <img src={approvedIcon} alt="Available" style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(bay)} className="btn btn-sm border-0 bg-transparent">
                                                        <img src={editIcon} alt="E" style={{ width: 17 }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(bay)} className="btn btn-sm border-0 bg-transparent">
                                                        <img src={deleteIcon} alt="D" style={{ width: 17 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {filtered.length > PER_PAGE && (
                <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center mt-auto">
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
                <div className="modal-content border-0 rounded-4 shadow">
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold text-dark-secondary font-poppins">{editingBay ? 'Update Bay Details' : 'Register New Bay'}</h5>
                        <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                    </div>
                    <div className="modal-body p-4 text-start">
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Bay Name / Identifier *</label>
                            <input className="form-control rounded-3 text-dark-secondary" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bay 1 - Standard" />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Service Type</label>
                            <select className="form-select rounded-3 text-dark-secondary" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                <option value="Standard Wash">Standard Wash</option>
                                <option value="Motorcycle">Motorcycle</option>
                                <option value="Detailing">Detailing</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                        <div className="mb-0">
                            <label className="form-label text-muted small fw-bold">Description / Notes</label>
                            <textarea className="form-control rounded-3 text-dark-secondary" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details about this bay..." />
                        </div>
                    </div>
                    <div className="modal-footer border-0 pt-0 pb-4 justify-content-between px-4">
                        <button type="button" className="btn btn-danger px-4 rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="button" className="btn text-white px-4 rounded-3 shadow-sm" onClick={handleSave} style={{ background: '#23A0CE', fontWeight: 600 }}>
                            {editingBay ? 'Save Changes' : 'Create Bay'}
                        </button>
                    </div>
                </div>
            </AdminModalWrapper>
        </>
    );
};

export default BayManager;
