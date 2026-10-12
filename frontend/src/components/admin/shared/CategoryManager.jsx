import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from './AdminModalWrapper';

const VEHICLE_CATEGORIES = [
    'Sedan',
    'SUV',
    'MPV / AUV',
    'Hatchback / Compact',
    'Van',
    'Pick-up',
    'Motorcycle',
    'Jeep / Utility',
    'Other'
];

const isLightColor = (hex) => {
    if (!hex || typeof hex !== 'string') return false;
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 175;
};

const getBadgeStyle = (bgColor, textColor, isDark) => {
    let bg = bgColor || '#23A0CE';
    let text = textColor || '#ffffff';

    const bgIsLight = isLightColor(bg);
    const textIsLight = isLightColor(text);

    // If both bg and text are light (e.g. white on white), force text to dark for visibility
    if (bgIsLight && textIsLight) {
        text = '#0f172a';
    } else if (!bgIsLight && !textIsLight) {
        // If both bg and text are dark, force text to white
        text = '#ffffff';
    }

    return {
        background: bg,
        color: text,
        border: bgIsLight ? '1px solid rgba(0,0,0,0.18)' : '1px solid rgba(255,255,255,0.12)'
    };
};

const CategoryManager = ({ show, onClose, onUpdate, endpoint, title, subtitle, itemName, isDark }) => {
    const isVehicleType = endpoint === 'vehicle-types';

    const defaultForm = {
        name: '',
        color: '#23A0CE',
        textColor: '#ffffff',
        description: '',
        category: isVehicleType ? 'Sedan' : ''
    };

    const [categories, setCategories] = useState([]);
    const [newCatData, setNewCatData] = useState(defaultForm);
    const [editingCat, setEditingCat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [customCategories, setCustomCategories] = useState([]);

    const availableCategories = useMemo(() => {
        const cats = new Set(VEHICLE_CATEGORIES);
        categories.forEach(c => {
            if (c.category && typeof c.category === 'string' && c.category.trim()) {
                cats.add(c.category.trim());
            }
        });
        customCategories.forEach(c => cats.add(c));
        return Array.from(cats);
    }, [categories, customCategories]);

    const handleAddNewGroup = async () => {
        const { value: newGroup, isConfirmed } = await Swal.fire({
            title: 'New Vehicle Group',
            input: 'text',
            inputLabel: 'Category Group Name',
            inputPlaceholder: 'e.g. Heavy Commercial, Tricycle, Crossover',
            showCancelButton: true,
            confirmButtonText: 'Add Group',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#23A0CE',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            inputValidator: (val) => {
                if (!val || !val.trim()) return 'Please enter a group name.';
                const trimmed = val.trim();
                if (availableCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                    return 'This category group already exists.';
                }
            }
        });

        if (isConfirmed && newGroup && newGroup.trim()) {
            const formatted = newGroup.trim();
            setCustomCategories(prev => [...prev, formatted]);
            if (editingCat) {
                setEditingCat(prev => ({ ...prev, category: formatted }));
            } else {
                setNewCatData(prev => ({ ...prev, category: formatted }));
            }
            Swal.fire({
                title: 'Group Added!',
                text: `"${formatted}" is now available in category options.`,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/${endpoint}`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data);
            if (onUpdate) onUpdate(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (show) {
            fetchCategories();
            setEditingCat(null);
            setSearchTerm('');
            setFilterCategory('ALL');
        }
    }, [show, endpoint]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/${endpoint}`, newCatData, { headers: authHeaders(), withCredentials: true });
            setNewCatData(defaultForm);
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
        const result = await Swal.fire({
            title: `Delete "${cat.name}"?`,
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/${endpoint}/${cat._id}`, { headers: authHeaders(), withCredentials: true });
            if (editingCat?._id === cat._id) setEditingCat(null);
            fetchCategories();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const filteredCategories = useMemo(() => {
        return categories.filter(cat => {
            const matchesSearch = !searchTerm ||
                cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = !isVehicleType || filterCategory === 'ALL' || cat.category === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [categories, searchTerm, filterCategory, isVehicleType]);

    const currentForm = editingCat || newCatData;

    return (
        <AdminModalWrapper show={show} onClose={onClose} size="lg">
            <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                <div className="modal-header border-0 py-4 px-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                    <div className="text-white">
                        <h5 className="modal-title fw-bold font-poppins mb-1">{title}</h5>
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
                                    <input
                                        type="text"
                                        className="form-control rounded-3 shadow-none border-light py-2"
                                        required
                                        placeholder={isVehicleType ? "e.g. Fortuner, Civic, Wigo" : "e.g. Retail Office"}
                                        value={currentForm.name}
                                        onChange={e => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCatData({ ...newCatData, name: e.target.value })}
                                    />
                                </div>

                                {isVehicleType && (
                                    <div className="mb-3">
                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                            <label className="form-label text-muted small fw-bold mb-0">
                                                Vehicle Category Group <span className="text-primary">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddNewGroup}
                                                className="btn btn-link btn-sm p-0 text-decoration-none fw-bold d-flex align-items-center gap-1"
                                                style={{ fontSize: '0.72rem', color: '#23A0CE' }}
                                                title="Add a custom vehicle category group"
                                            >

                                            </button>
                                        </div>
                                        <div className="input-group">
                                            <select
                                                className="form-select rounded-start-3 shadow-none border-light py-2"
                                                value={currentForm.category || 'Sedan'}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, category: e.target.value }) : setNewCatData({ ...newCatData, category: e.target.value })}
                                            >
                                                {availableCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleAddNewGroup}
                                                className="btn btn-outline-secondary rounded-end-3 px-3 shadow-none border-light d-flex align-items-center justify-content-center"
                                                title="Add New Category Group"
                                                style={{ fontSize: '0.85rem' }}
                                            >
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>
                                        <div className="form-text small text-light-gray200" style={{ fontSize: '0.72rem' }}>
                                            Used to group this model dynamically on the Dashboard chart.
                                        </div>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="form-label text-muted small fw-bold mb-1">Description (optional)</label>
                                    <input
                                        type="text"
                                        className="form-control rounded-3 shadow-none border-light py-2"
                                        placeholder="Brief description"
                                        value={currentForm.description || ''}
                                        onChange={e => editingCat ? setEditingCat({ ...editingCat, description: e.target.value }) : setNewCatData({ ...newCatData, description: e.target.value })}
                                    />
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                        <input
                                            type="color"
                                            className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1"
                                            style={{ height: '38px' }}
                                            value={currentForm.color || '#23A0CE'}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCatData({ ...newCatData, color: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                        <input
                                            type="color"
                                            className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1"
                                            style={{ height: '38px' }}
                                            value={currentForm.textColor || '#ffffff'}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, textColor: e.target.value }) : setNewCatData({ ...newCatData, textColor: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-muted small fw-bold mb-2">Preview</label>
                                    <div className="p-3 border rounded-3 bg-white text-center shadow-sm d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70px' }}>
                                        <span className="badge rounded-pill px-4 py-2" style={{ ...getBadgeStyle(currentForm.color, currentForm.textColor, isDark), fontSize: '0.85rem' }}>
                                            {currentForm.name || 'Preview'}
                                        </span>
                                        {isVehicleType && (
                                            <div className="small text-muted mt-2" style={{ fontSize: '0.72rem' }}>
                                                Category: <strong className="text-secondary">{currentForm.category || 'Sedan'}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex gap-2">
                                    {editingCat && (
                                        <button type="button" className="btn btn-light btn-sm flex-fill rounded-3 py-2 fw-bold" onClick={() => setEditingCat(null)}>
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3 py-2 fw-bold">
                                        {editingCat ? 'Save Changes' : `+ Create ${itemName}`}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right: List of Tags */}
                        <div className="col-md-7 p-4 bg-white d-flex flex-column" style={{ maxHeight: '560px' }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6 className="fw-bold text-dark-secondary mb-0">All {itemName}s ({categories.length})</h6>
                            </div>

                            {/* Search & Filter Toolbar */}
                            <div className="d-flex gap-2 mb-3">
                                <div className="input-group input-group-sm flex-fill">
                                    <span className="input-group-text bg-light border-light text-muted">
                                        <i className="bi bi-search"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-light shadow-none"
                                        placeholder={`Search ${itemName.toLowerCase()}s...`}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button className="btn btn-light border-light" type="button" onClick={() => setSearchTerm('')}>
                                            <i className="bi bi-x"></i>
                                        </button>
                                    )}
                                </div>
                                {isVehicleType && (
                                    <select
                                        className="form-select form-select-sm shadow-none"
                                        style={{ width: 'auto', minWidth: '135px' }}
                                        value={filterCategory}
                                        onChange={e => setFilterCategory(e.target.value)}
                                    >
                                        <option value="ALL">All Categories</option>
                                        {availableCategories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="flex-fill overflow-y-auto pe-1">
                                {filteredCategories.length === 0 ? (
                                    <div className="py-5 text-center text-muted small opacity-50">
                                        {categories.length === 0 ? `No ${itemName.toLowerCase()}s defined yet` : 'No matches found'}
                                    </div>
                                ) : (
                                    filteredCategories.map(cat => (
                                        <div key={cat._id} className="p-3 mb-2 rounded-4 border border-light bg-light shadow-none hover-shadow-sm transition-all animate-fade-in">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-2 flex-fill overflow-hidden pe-2">
                                                    <span
                                                        className="badge rounded-pill px-3 py-2 fw-bold flex-shrink-0"
                                                        style={{
                                                            ...getBadgeStyle(cat.color, cat.textColor, isDark),
                                                            fontSize: '0.72rem'
                                                        }}
                                                    >
                                                        {cat.name}
                                                    </span>
                                                    {isVehicleType && (
                                                        <span
                                                            className="badge rounded-pill px-2.5 py-1 flex-shrink-0"
                                                            style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 600,
                                                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.16)' : '#e0f2fe',
                                                                color: isDark ? '#38bdf8' : '#0369a1',
                                                                border: isDark ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid #bae6fd'
                                                            }}
                                                        >
                                                            {cat.category || 'Sedan'}
                                                        </span>
                                                    )}
                                                    <span className="text-muted small text-truncate" title={cat.description}>{cat.description || ''}</span>
                                                    {cat.isSystem && <span className="badge bg-secondary rounded-pill flex-shrink-0" style={{ fontSize: '0.6rem' }}>System</span>}
                                                </div>
                                                <div className="d-flex gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingCat({ ...cat, category: cat.category || 'Sedan' })}
                                                        className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1 font-poppins"
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(cat)}
                                                        className={`btn btn-sm rounded-3 px-3 py-1 font-poppins ${cat.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`}
                                                        style={{ fontSize: '0.7rem' }}
                                                        disabled={cat.isSystem}
                                                    >
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
                </div>
                <div className="modal-footer border-0 p-4 pt-2">
                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose} style={{ background: isDark ? 'var(--theme-bg-secondary)' : '' }}>Close Library</button>
                </div>
            </div>
        </AdminModalWrapper>
    );
};

export default CategoryManager;
