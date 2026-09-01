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

const MaintenanceProjects = ({ projects, assets, bays, employees, inventoryItems, onRefresh }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', assetId: '', bayId: '', priority: 'Medium', assignedPersonnel: '', startDate: '', partsUsed: [], laborCost: 0 });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 5;

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(handler);
    }, [search]);

    const filtered = filterDataBySearch(projects, debouncedSearch, ['title', 'status', 'priority', 'description']);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const openAdd = () => { setEditing(null); setForm({ title: '', description: '', assetId: '', bayId: '', priority: 'Medium', assignedPersonnel: '', startDate: '', partsUsed: [], laborCost: 0 }); setShowModal(true); };
    const openEdit = (p) => {
        setEditing(p);
        setForm({
            title: p.title,
            description: p.description || '',
            assetId: p.assetId?._id || '',
            bayId: p.bayId?._id || '',
            priority: p.priority,
            assignedPersonnel: p.assignedPersonnel?._id || '',
            startDate: p.startDate ? p.startDate.slice(0, 10) : '',
            partsUsed: p.partsUsed || [],
            laborCost: p.laborCost || 0
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return Swal.fire('Error', 'Title is required', 'error');
        try {
            const payload = { ...form, assetId: form.assetId || null, bayId: form.bayId || null, assignedPersonnel: form.assignedPersonnel || null, startDate: form.startDate || null };
            if (editing) {
                await axios.put(`${API_BASE}/maintenance/${editing._id}`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({
                    title: 'Project Updated Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            } else {
                await axios.post(`${API_BASE}/maintenance`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ icon: 'success', title: 'Project Created', timer: 1500, showConfirmButton: true });
            }
            setShowModal(false); onRefresh();
        } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Failed to save', 'error'); }
    };

    const handleComplete = (p) => {
        Swal.fire({ title: `Complete "${p.title}"?`, text: 'This will deduct parts from inventory and log the expense.', icon: 'question', showCancelButton: true, confirmButtonColor: '#28a745', confirmButtonText: 'Complete' })
            .then(async (r) => {
                if (r.isConfirmed) {
                    try {
                        await axios.post(`${API_BASE}/maintenance/${p._id}/complete`, {}, { headers: authHeaders(), withCredentials: true });
                        Swal.fire({ icon: 'success', title: 'Project Completed!', text: 'Inventory deducted & expense logged.', timer: 2000, showConfirmButton: true });
                        onRefresh();
                    } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Failed', 'error'); }
                }
            });
    };

    const handleCancel = (p) => {
        Swal.fire({ title: `Cancel "${p.title}"?`, text: 'Are you sure you want to cancel this maintenance project?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Cancel Project' })
            .then(async (r) => {
                if (r.isConfirmed) {
                    try {
                        await axios.put(`${API_BASE}/maintenance/${p._id}`, { status: 'Cancelled' }, { headers: authHeaders(), withCredentials: true });
                        Swal.fire({ icon: 'success', title: 'Project Cancelled!', timer: 2000, showConfirmButton: true });
                        onRefresh();
                    } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Failed to cancel', 'error'); }
                }
            });
    };

    const handleDelete = (p) => {
        Swal.fire({ title: `Delete "${p.title}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
            .then(async (r) => { if (r.isConfirmed) { await axios.delete(`${API_BASE}/maintenance/${p._id}`, { headers: authHeaders(), withCredentials: true }); onRefresh(); } });
    };

    const addPart = () => {
        setForm({ ...form, partsUsed: [...form.partsUsed, { inventoryId: '', name: '', quantity: 1, costPerUnit: 0 }] });
    };

    const removePart = (index) => {
        const updatedParts = [...form.partsUsed];
        updatedParts.splice(index, 1);
        setForm({ ...form, partsUsed: updatedParts });
    };

    const handlePartChange = (index, field, value) => {
        const updatedParts = [...form.partsUsed];
        if (field === 'inventoryId') {
            const item = (inventoryItems.items || inventoryItems).find(i => i._id === value);
            updatedParts[index] = { ...updatedParts[index], inventoryId: value, name: item?.name || '', costPerUnit: item?.costPerUnit || 0 };
        } else {
            updatedParts[index] = { ...updatedParts[index], [field]: value };
        }
        setForm({ ...form, partsUsed: updatedParts });
    };

    const priorityColor = (p) => ({ Critical: '#dc3545', High: '#fd7e14', Medium: '#ffc107', Low: '#28a745' }[p] || '#6c757d');
    const statusColor = (s) => ({ Pending: '#ffc107', 'In Progress': '#17a2b8', Completed: '#28a745', Cancelled: '#dc3545' }[s] || '#6c757d');

    return (
        <>
            <div className="d-flex justify-content-end align-items-center mb-4">
                <SharedSearchBar searchTerm={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search projects..." />

            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 d-flex flex-column" style={{ minHeight: 475 }}>
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark-secondary">Maintenance Projects</h6>
                    <button className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                        onClick={openAdd}>
                        + Create Project
                    </button>
                </div>
                <div className='card-body p-0 flex-grow-1 d-flex flex-column'>
                    <div className="table-responsive flex-grow-1 ">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                            <thead className="bg-light font-poppins text-muted small">
                                <tr className="border-bottom">
                                    <th className="ps-4 py-3" style={{ width: '25%' }}>Project Details</th>
                                    <th className="py-3" style={{ width: '15%' }}>Planned Start Date</th>
                                    <th className="py-3" style={{ width: '15%' }}>Asset / Location</th>
                                    <th className="py-3" style={{ width: '15%' }}>Assigned To</th>
                                    <th className="py-3" style={{ width: '12%' }}>Priority</th>
                                    <th className="py-3" style={{ width: '15%' }}>Status</th>
                                    <th className="pe-4 py-3 text-end" style={{ width: '10%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan="6" className="p-5 text-center text-muted">No maintenance projects found matching your "<strong className='fw-bold'>{search}</strong>"</td></tr>
                                ) : (
                                    paginated.map(p => (
                                        <tr key={p._id}>
                                            <td className="ps-4 py-3">
                                                <div className="fw-bold text-dark-secondary">{p.title}</div>
                                                <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>{p.description}</small>
                                            </td>
                                            <td className="py-3">
                                                <div className="text-muted small">{new Date(p.startDate).toLocaleDateString()}</div>
                                            </td>
                                            <td>
                                                <div className="small text-dark-secondary fw-semibold">{p.assetId?.name || 'Facility'}</div>
                                                <div className="text-muted small">{p.bayId?.name || 'N/A'}</div>
                                            </td>
                                            <td>
                                                <div className="small text-dark-secondary fw-bold">{p.assignedPersonnel?.fullName || 'Unassigned'}</div>
                                            </td>
                                            <td>
                                                <span className="badge rounded-pill px-2 py-1" style={{ background: `${priorityColor(p.priority)}20`, color: priorityColor(p.priority), fontSize: '0.65rem' }}>
                                                    {p.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge rounded-pill me-2" style={{ background: `${statusColor(p.status)}20`, color: statusColor(p.status), fontSize: '0.7rem', padding: '6px 12px' }}>
                                                    {p.status}
                                                </span>
                                                {p.status !== 'Completed' && p.status !== 'Cancelled' && (
                                                    <>
                                                        <button onClick={() => handleCancel(p)} className="btn btn-sm border-0 shadow-sm rounded-pill btn-active me-2" title="Cancel Project">
                                                            <span style={{ color: '#dc3545' }}>X</span>
                                                        </button>
                                                        <button onClick={() => handleComplete(p)} className="btn btn-sm border-0 shadow-sm rounded-pill btn-active" title="Complete Project">
                                                            <span style={{ color: '#28a745' }}>✓</span>
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                            <td className="pe-4 text-end">
                                                <div className="d-flex gap-1 justify-content-end align-items-center">

                                                    <button onClick={() => openEdit(p)} className="btn btn-sm border-0 bg-transparent">
                                                        <img src={editIcon} alt="E" style={{ width: 17 }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(p)} className="btn btn-sm border-0 bg-transparent">
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

                {filtered.length > PER_PAGE && (
                    <div className="card-footer border-top py-3 d-flex justify-content-between align-items-center mt-auto" style={{ background: 'var(--theme-card-bg)' }}>
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
                            {getPaginationRange(page, totalPages).map((pg, idx) => (
                                pg === '...' ? (
                                    <span key={`dot-l-${idx}`} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>...</span>
                                ) : (
                                    <button
                                        key={`lp-${pg}`}
                                        onClick={() => setPage(pg)}
                                        className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${page === pg ? 'text-white shadow-sm' : 'text-muted'}`}
                                        style={{ width: '30px', height: '30px', fontSize: '0.78rem', background: page === pg ? '#23A0CE' : 'transparent' }}
                                    >
                                        {pg}
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
            </div>


            <AdminModalWrapper show={showModal} onClose={() => setShowModal(false)} size="lg">
                <div className="modal-content border-0 rounded-4 shadow text-dark-secondary">
                    <div className="modal-header border-0 pb-0 px-4 pt-4">
                        <h5 className="modal-title fw-bold text-dark-secondary font-poppins">{editing ? 'Update Maintenance Details' : 'Initialize New Project'}</h5>
                        <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                    </div>
                    <div className="modal-body p-4 text-start">
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Project Title / Goal *</label>
                            <input className="form-control rounded-3" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bay 1 Pump Replacement" />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted small fw-bold">Detailed Description</label>
                            <textarea className="form-control rounded-3" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What exactly needs to be done?" />
                        </div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Target Asset</label>
                                <select className="form-select rounded-3 text-dark-secondary" value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })}>
                                    <option value="">-- No Specific Asset --</option>
                                    {assets.map(a => <option key={a._id} value={a._id}>{a.name} ({a.category})</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label text-muted small fw-bold">Location (Bay)</label>
                                <select className="form-select rounded-3 text-dark-secondary" value={form.bayId} onChange={e => setForm({ ...form, bayId: e.target.value })}>
                                    <option value="">-- No Specific Location --</option>
                                    {bays.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label text-muted small fw-bold">Priority Level</label>
                                <select className="form-select rounded-3 text-dark-secondary" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="Low">Low</option><option value="Medium">Medium</option>
                                    <option value="High">High</option><option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label text-muted small fw-bold">Assigned Personnel</label>
                                <select className="form-select rounded-3 text-dark-secondary" value={form.assignedPersonnel} onChange={e => setForm({ ...form, assignedPersonnel: e.target.value })}>
                                    <option value="">-- Unassigned --</option>
                                    {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label text-muted small fw-bold">Planned Start Date</label>
                                <input type="date" className="form-control rounded-3 text-dark-secondary" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="mb-3 mt-3">
                            <label className="form-label text-muted small fw-bold">Labor Cost (₱)</label>
                            <input type="number" className="form-control rounded-3 text-dark-secondary" value={form.laborCost} onChange={e => setForm({ ...form, laborCost: Number(e.target.value) })} placeholder="0.00" />
                        </div>

                        <div className="border-top pt-3 mt-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label text-muted small fw-bold mb-0">Parts & Supplies Used</label>
                                <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2 rounded-pill" style={{ fontSize: '0.7rem' }} onClick={addPart}>+ Add Part</button>
                            </div>
                            {form.partsUsed.length === 0 ? (
                                <p className="text-muted small italic mb-0">No parts added to this project.</p>
                            ) : (
                                <div className="bg-light p-2 rounded-3">
                                    {form.partsUsed.map((part, idx) => (
                                        <div key={idx} className="row g-2 align-items-center mb-2">
                                            <div className="col-7">
                                                <select className="form-select form-select-sm rounded-2 text-dark-secondary" value={part.inventoryId} onChange={e => handlePartChange(idx, 'inventoryId', e.target.value)}>
                                                    <option value="">-- Select Item --</option>
                                                    {(inventoryItems.items || inventoryItems).map(item => (
                                                        <option key={item._id} value={item._id}>{item.name} (Stock: {item.currentStock.toFixed(2)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-3">
                                                <input type="number" className="form-control form-control-sm rounded-2 text-dark-secondary" placeholder="Qty" value={part.quantity} onChange={e => handlePartChange(idx, 'quantity', Number(e.target.value))} />
                                            </div>
                                            <div className="col-2 text-end">
                                                <button type="button" className="btn text-danger p-0 " onClick={() => removePart(idx)}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer border-0 pt-0 pb-4 justify-content-between px-4">
                        <button type="button" className="btn btn-danger px-4 rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="button" className="btn text-white px-4 rounded-3 shadow-sm" onClick={handleSave} style={{ background: '#23A0CE', fontWeight: 600 }}>
                            {editing ? 'Save Changes' : 'Initialize Project'}
                        </button>
                    </div>
                </div>
            </AdminModalWrapper>
        </>
    );
};

export default MaintenanceProjects;
