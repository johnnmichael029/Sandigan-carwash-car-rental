import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from './AdminModalWrapper';

const CategoryManager = ({ show, onClose, onUpdate, endpoint, title, subtitle, itemName, isDark }) => {
    const [categories, setCategories] = useState([]);
    const [newCatData, setNewCatData] = useState({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
    const [editingCat, setEditingCat] = useState(null);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/${endpoint}`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data);
            if (onUpdate) onUpdate(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (show) fetchCategories(); }, [show, endpoint]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/${endpoint}`, newCatData, { headers: authHeaders(), withCredentials: true });
            setNewCatData({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
            fetchCategories();
            Swal.fire({ title: `${itemName} Created!`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/${endpoint}/${editingCat._id}`, editingCat, { headers: authHeaders(), withCredentials: true });
            setEditingCat(null);
            fetchCategories();
            Swal.fire({ title: `${itemName} Updated!`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleDelete = async (cat) => {
        if (cat.isSystem) return Swal.fire('Blocked', `System ${itemName.toLowerCase()}s cannot be deleted.`, 'warning');
        const result = await Swal.fire({ title: `Delete "${cat.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4444' });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/${endpoint}/${cat._id}`, { headers: authHeaders(), withCredentials: true });
            if (editingCat?._id === cat._id) setEditingCat(null);
            fetchCategories();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const currentForm = editingCat || newCatData;

    return (
        <AdminModalWrapper show={show} onClose={onClose} size="lg">
            <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                <div className="modal-header border-0 py-4 px-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                    <div className="text-white">
                        <h5 className="modal-title fw-bold font-poppins mb-1 ">{title}</h5>
                        <p className="mb-0 opacity-75 small">{subtitle}</p>
                    </div>
                    <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose} />
                </div>
                <div className="modal-body p-0">
                    <div className="row g-0">
                        {/* Left: Create / Edit Form */}
                        <div className="col-md-5 p-4 border-end bg-light">
                            <h6 className="fw-bold text-dark-secondary mb-3">{editingCat ? `Edit ${itemName}` : 'Create New'}</h6>
                            <form onSubmit={editingCat ? handleUpdate : handleCreate}>
                                <div className="mb-3">
                                    <label className="form-label text-muted small fw-bold mb-1">{itemName} Name</label>
                                    <input type="text" className="form-control rounded-3 shadow-none border-light py-2" required placeholder="e.g. Retail Office"
                                        value={currentForm.name}
                                        onChange={e => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCatData({ ...newCatData, name: e.target.value })} />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-muted small fw-bold mb-1">Description (optional)</label>
                                    <input type="text" className="form-control rounded-3 shadow-none border-light py-2" placeholder="Brief description"
                                        value={currentForm.description}
                                        onChange={e => editingCat ? setEditingCat({ ...editingCat, description: e.target.value }) : setNewCatData({ ...newCatData, description: e.target.value })} />
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                        <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                            value={currentForm.color}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCatData({ ...newCatData, color: e.target.value })} />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                        <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                            value={currentForm.textColor}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, textColor: e.target.value }) : setNewCatData({ ...newCatData, textColor: e.target.value })} />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-muted small fw-bold mb-2">Preview</label>
                                    <div className="p-3 border rounded-3 bg-white text-center shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: '60px' }}>
                                        <span className="badge rounded-pill px-4 py-2" style={{ background: currentForm.color, color: currentForm.textColor, fontSize: '0.85rem' }}>
                                            {currentForm.name || 'Preview'}
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex gap-2">
                                    {editingCat && (
                                        <button type="button" className="btn btn-light btn-sm flex-fill rounded-3 py-2 fw-bold" onClick={() => setEditingCat(null)}>Cancel</button>
                                    )}
                                    <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3 py-2 fw-bold">
                                        {editingCat ? 'Save Changes' : `+ Create ${itemName}`}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right: List of Tags */}
                        <div className="col-md-7 p-4 bg-white" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                            <h6 className="fw-bold text-dark-secondary mb-3">All {itemName}s ({categories.length})</h6>

                            {categories.length === 0 ? (
                                <div className="py-5 text-center text-muted small opacity-50">No {itemName}s defined yet</div>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat._id} className="p-3 mb-3 rounded-4 border border-light bg-light shadow-none hover-shadow-sm transition-all animate-fade-in">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center gap-3 flex-fill overflow-hidden pe-2">
                                                <span className="badge rounded-pill px-3 py-2 fw-bold flex-shrink-0" style={{ background: cat.color, color: cat.textColor, fontSize: '0.72rem' }}>{cat.name}</span>
                                                <span className="text-muted small text-truncate" title={cat.description}>{cat.description || 'No description'}</span>
                                                {cat.isSystem && <span className="badge bg-secondary rounded-pill flex-shrink-0" style={{ fontSize: '0.6rem' }}>System</span>}
                                            </div>
                                            <div className="d-flex gap-1 flex-shrink-0">
                                                <button type="button" onClick={() => setEditingCat(cat)} className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1 font-poppins" style={{ fontSize: '0.7rem' }}>Edit</button>
                                                <button type="button" onClick={() => handleDelete(cat)} className={`btn btn-sm rounded-3 px-3 py-1 font-poppins ${cat.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`} style={{ fontSize: '0.7rem' }} disabled={cat.isSystem}>
                                                    {cat.isSystem ? 'Protected' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-2">
                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose} style={{ background: isDark ? 'var(--theme-bg-secondary)' : '' }}>Close Library</button>
                </div>
            </div>
        </AdminModalWrapper>
    );
};

export default CategoryManager;
