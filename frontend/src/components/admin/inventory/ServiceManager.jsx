import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, InventorySkeleton } from '../../SkeletonLoaders';
import deleteIcon from '../../../assets/icon/delete.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';

const ServiceSettingsPage = ({ user, isDark }) => {
    // Shared state
    const [activeTab, setActiveTab] = useState('wash');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [addModal, setAddModal] = useState({ isOpen: false, type: '', input: '' });

    // Wash Pricing State
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);

    // Rental Fleet State
    const [fleet, setFleet] = useState([]);
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [editingFleet, setEditingFleet] = useState(null);

    useEffect(() => {
        Promise.all([fetchPricing(), fetchFleet()]).finally(() => setIsLoading(false));
    }, []);

    const fetchPricing = async () => {
        try {
            const res = await axios.get(`${API_BASE}/pricing`, { headers: authHeaders(), withCredentials: true });
            setVehicles(res.data.dynamicPricing || []);
        } catch (err) {
            console.error('Error fetching pricing:', err);
        }
    };

    const fetchFleet = async () => {
        try {
            const res = await axios.get(`${API_BASE}/rental-fleet/admin`, { headers: authHeaders(), withCredentials: true });
            setFleet(res.data || []);
        } catch (err) {
            console.error('Error fetching fleet:', err);
        }
    };

    const handleSelectVehicle = (v) => {
        setSelectedVehicle(v);
        // Deep copy so we can edit without affecting the list until saved
        setEditingDoc(JSON.parse(JSON.stringify(v)));
    };

    const handleCreateVehicle = () => {
        setAddModal({ isOpen: true, type: 'wash', input: '' });
    };

    const handleDeleteVehicle = async (id, name) => {
        const result = await Swal.fire({
            title: `Delete ${name}?`,
            text: "This will remove all its pricing data permanently.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE}/pricing/${id}`, { headers: authHeaders(), withCredentials: true });
            setVehicles(vehicles.filter(v => v._id !== id));
            if (selectedVehicle?._id === id) {
                setSelectedVehicle(null);
                setEditingDoc(null);
            }
            Swal.fire('Deleted!', '', 'success');
        } catch (err) {
            Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    const handleSaveDoc = async () => {
        if (!editingDoc || !editingDoc._id) return;

        // Validation Check
        const hasEmptyNames = [...editingDoc.services, ...editingDoc.addons].some(item => !item.name.trim());
        if (hasEmptyNames) {
            Swal.fire('Incomplete Data', 'All services and add-ons must have a name.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/pricing/${editingDoc._id}`, {
                vehicleType: editingDoc.vehicleType,
                services: editingDoc.services,
                addons: editingDoc.addons
            }, { headers: authHeaders(), withCredentials: true });

            if (res.data && res.data._id) {
                setVehicles(prev => prev.map(v => v._id === res.data._id ? res.data : v));
                setSelectedVehicle(res.data);
                setEditingDoc(JSON.parse(JSON.stringify(res.data))); // Refresh edit buffer
                Swal.fire({
                    title: 'Item Added Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            }
        } catch (err) {
            console.error("Pricing Save Error:", err);
            const errMsg = err.response?.data?.error || 'Failed to save changes. Please try again.';
            Swal.fire('Save Failed', errMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    /* --- Fleet Handlers --- */
    const handleSelectFleet = (f) => {
        setSelectedFleet(f);
        setEditingFleet(JSON.parse(JSON.stringify(f)));
    };

    const handleCreateFleetVehicle = () => {
        setAddModal({ isOpen: true, type: 'rental', input: '' });
    };

    const handleAddModalSubmit = async () => {
        const { type, input: name } = addModal;
        if (!name.trim()) return;

        setAddModal({ ...addModal, isOpen: false });

        if (type === 'wash') {
            try {
                const res = await axios.post(`${API_BASE}/pricing`, {
                    vehicleType: name, services: [], addons: []
                }, { headers: authHeaders(), withCredentials: true });
                setVehicles([...vehicles, res.data]);
                Swal.fire('Success', 'Vehicle added. Select it to add services.', 'success');
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || 'Failed to create', 'error');
            }
        } else if (type === 'rental') {
            try {
                const res = await axios.post(`${API_BASE}/rental-fleet`, {
                    vehicleName: name, vehicleType: 'Sedan', seats: 5, pricePerDay: 2000
                }, { headers: authHeaders(), withCredentials: true });
                setFleet([...fleet, res.data]);
                Swal.fire('Success', 'Rental vehicle added.', 'success');
            } catch (err) {
                Swal.fire('Error', err.response?.data?.error || 'Failed to create', 'error');
            }
        }
    };

    const handleDeleteFleet = async (id, name) => {
        const result = await Swal.fire({
            title: `Delete ${name}?`,
            text: "This vehicle will be permanently removed.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE}/rental-fleet/${id}`, { headers: authHeaders(), withCredentials: true });
            setFleet(fleet.filter(f => f._id !== id));
            if (selectedFleet?._id === id) { setSelectedFleet(null); setEditingFleet(null); }
            Swal.fire('Deleted!', '', 'success');
        } catch (err) {
            Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    const handleSaveFleet = async () => {
        if (!editingFleet || !editingFleet._id) return;
        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/rental-fleet/${editingFleet._id}`, editingFleet, { headers: authHeaders(), withCredentials: true });
            setFleet(prev => prev.map(f => f._id === res.data._id ? res.data : f));
            setSelectedFleet(res.data);
            setEditingFleet(JSON.parse(JSON.stringify(res.data)));
            Swal.fire({ title: 'Saved Successfully!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) {
            Swal.fire('Save Failed', err.response?.data?.error || 'Failed to save', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingFleet(prev => ({ ...prev, imageBase64: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const addServiceOrAddon = (type) => {
        const newItem = { name: '', price: 0 };
        setEditingDoc(prev => ({
            ...prev,
            [type]: [...prev[type], newItem]
        }));
    };

    const removeServiceOrAddon = (type, index) => {
        setEditingDoc(prev => {
            const arr = [...prev[type]];
            arr.splice(index, 1);
            return { ...prev, [type]: arr };
        });
    };

    const updateItem = (type, index, field, value) => {
        setEditingDoc(prev => {
            const arr = [...prev[type]];
            arr[index] = { ...arr[index], [field]: field === 'price' ? Number(value) : value };
            return { ...prev, [type]: arr };
        });
    };

    if (isLoading) return <div className="p-4"><InventorySkeleton /></div>;

    return (
        <div>
            {/* Tabs Header */}
            <div className="border-bottom pb-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Service Settings</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Configure car wash pricing and rental fleet.</p>
                </div>
                <div className="d-flex bg-light rounded-pill p-1 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
                    <button
                        className={`btn rounded-pill px-4 py-2 ${activeTab === 'wash' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted'}`}
                        style={{ fontWeight: 600, border: 'none', transition: 'all 0.3s' }}
                        onClick={() => setActiveTab('wash')}
                    >
                        Car Wash Pricing
                    </button>
                    <button
                        className={`btn rounded-pill px-4 py-2 ${activeTab === 'rental' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted'}`}
                        style={{ fontWeight: 600, border: 'none', transition: 'all 0.3s' }}
                        onClick={() => setActiveTab('rental')}
                    >
                        Car Rental Fleet
                    </button>
                </div>
            </div>

            {/* Content Container */}
            {activeTab === 'wash' && (
                <div className="row g-4">
                    <div className="col-12 mb-2 d-flex justify-content-end">
                        <button onClick={handleCreateVehicle} className="btn btn-save rounded-3 text-white fw-bold shadow-sm">
                            + Add Wash Vehicle Map
                        </button>
                    </div>
                    {/* Left Col: Vehicle List */}
                    <div className="col-12 col-md-4 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            <div className="card-header bg-white border-bottom py-3">
                                <h6 className="mb-0 fw-bold text-dark-secondary">Select Vehicle</h6>
                            </div>
                            <ul className="list-group list-group-flush" style={{ maxHeight: '700px', overflowY: 'auto' }}>
                                {vehicles.map(v => (
                                    <li
                                        key={v._id}
                                        className={`list-group-item service-settings d-flex justify-content-between align-items-center cursor-pointer p-3  ${selectedVehicle?._id === v._id ? 'service-settings-active text-white' : ''}`}
                                        onClick={() => handleSelectVehicle(v)}
                                        style={{ cursor: 'pointer', transition: '0.2s' }}
                                    >
                                        <span className="fw-bold font-poppins" style={{ fontSize: '0.9rem' }}>{v.vehicleType}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{v.services?.length + v.addons?.length || 0} items</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Col: Editor */}
                    <div className="col-12 col-md-8 col-lg-9">
                        {!editingDoc ? (
                            <div className="card border-0 shadow-sm rounded-4 h-100 d-flex align-items-center justify-content-center p-5 text-muted">
                                <p>Select a vehicle from the left to manage its services and prices.</p>
                            </div>
                        ) : (
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold font-poppins">Pricing for {editingDoc.vehicleType}</h5>
                                    <button onClick={() => handleDeleteVehicle(editingDoc._id, editingDoc.vehicleType)} className="btn">
                                        <img src={deleteIcon} alt="Delete Icon" style={{ width: '16px' }} />
                                    </button>
                                </div>

                                <div className="card-body p-4 p-lg-5">
                                    {/* Core Services */}
                                    <div className="mb-5">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="fw-bold text-dark-secondary mb-0">Core Services</h6>
                                            <button onClick={() => addServiceOrAddon('services')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Service</button>
                                        </div>
                                        {editingDoc.services.length === 0 ? <p className="text-muted small">No core services defined.</p> : (
                                            <div className="table-responsive">
                                                <table className="table table-borderless table-sm mb-0">
                                                    <thead className="border-bottom text-muted small">
                                                        <tr>
                                                            <th>Service Name</th>
                                                            <th style={{ width: '200px' }}>Price (₱)</th>
                                                            <th style={{ width: '50px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {editingDoc.services.map((item, idx) => (
                                                            <tr key={idx} className="border-bottom">
                                                                <td className="py-2">
                                                                    <input type="text" className="form-control form-control-sm" value={item.name} onChange={(e) => updateItem('services', idx, 'name', e.target.value)} placeholder="e.g. Wash" />
                                                                </td>
                                                                <td className="py-2">
                                                                    <input type="number" className="form-control form-control-sm" value={item.price} onChange={(e) => updateItem('services', idx, 'price', e.target.value)} placeholder="0" min="0" />
                                                                </td>
                                                                <td className="py-2 text-end">
                                                                    <button onClick={() => removeServiceOrAddon('services', idx)} className="btn btn-sm text-danger p-1">✕</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Addons */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="fw-bold brand-primary mb-0">Add-ons & Extras</h6>
                                            <button onClick={() => addServiceOrAddon('addons')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Item</button>
                                        </div>
                                        {editingDoc.addons.length === 0 ? <p className="text-muted small">No add-ons defined.</p> : (
                                            <div className="table-responsive">
                                                <table className="table table-borderless table-sm mb-0">
                                                    <thead className="border-bottom text-muted small">
                                                        <tr>
                                                            <th>Addon Name</th>
                                                            <th style={{ width: '200px' }}>Price (₱)</th>
                                                            <th style={{ width: '50px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {editingDoc.addons.map((item, idx) => (
                                                            <tr key={idx} className="border-bottom">
                                                                <td className="py-2">
                                                                    <input type="text" className="form-control form-control-sm" value={item.name} onChange={(e) => updateItem('addons', idx, 'name', e.target.value)} placeholder="e.g. Detailing" />
                                                                </td>
                                                                <td className="py-2">
                                                                    <input type="number" className="form-control form-control-sm" value={item.price} onChange={(e) => updateItem('addons', idx, 'price', e.target.value)} placeholder="0" min="0" />
                                                                </td>
                                                                <td className="py-2 text-end">
                                                                    <button onClick={() => removeServiceOrAddon('addons', idx)} className="btn btn-sm text-danger p-1">✕</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="card-footer bg-light p-3 text-end">
                                    <button
                                        onClick={handleSaveDoc}
                                        className="btn btn-success px-5 rounded-pill shadow"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save All Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* RENTAL FLEET TAB */}
            {activeTab === 'rental' && (
                <div className="row g-4">
                    <div className="col-12 mb-2 d-flex justify-content-end">
                        <button onClick={handleCreateFleetVehicle} className="btn btn-save rounded-3 text-white fw-bold shadow-sm">
                            + Add Rental Vehicle
                        </button>
                    </div>
                    {/* Left Col: Fleet List */}
                    <div className="col-12 col-md-4 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            <div className="card-header bg-white border-bottom py-3">
                                <h6 className="mb-0 fw-bold text-dark-secondary">Rental Fleet</h6>
                            </div>
                            <ul className="list-group list-group-flush" style={{ maxHeight: '700px', overflowY: 'auto' }}>
                                {fleet.map(f => (
                                    <li
                                        key={f._id}
                                        className={`list-group-item service-settings d-flex justify-content-between align-items-center cursor-pointer p-3  ${selectedFleet?._id === f._id ? 'service-settings-active text-white' : ''}`}
                                        onClick={() => handleSelectFleet(f)}
                                        style={{ cursor: 'pointer', transition: '0.2s' }}
                                    >
                                        <div className="d-flex flex-column">
                                            <span className="fw-bold font-poppins" style={{ fontSize: '0.9rem' }}>{f.vehicleName}</span>
                                            <span style={{ fontSize: '0.75rem', opacity: selectedFleet?._id === f._id ? 0.9 : 0.6 }}>{f.seats}-Seater • ₱{f.pricePerDay}</span>
                                        </div>
                                        {f.isAvailable ? <span title="Available" style={{ fontSize: '0.8rem' }}>🟢</span> : <span title="Unavailable" style={{ fontSize: '0.8rem' }}>🔴</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Col: Fleet Editor */}
                    <div className="col-12 col-md-8 col-lg-9">
                        {!editingFleet ? (
                            <div className="card border-0 shadow-sm rounded-4 h-100 d-flex align-items-center justify-content-center p-5 text-muted" style={{ minHeight: '400px' }}>
                                <p>Select a vehicle to manage details.</p>
                            </div>
                        ) : (
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold font-poppins">Edit {editingFleet.vehicleName}</h5>
                                    <button onClick={() => handleDeleteFleet(editingFleet._id, editingFleet.vehicleName)} className="btn">
                                        <img src={deleteIcon} alt="Delete" style={{ width: '16px' }} />
                                    </button>
                                </div>
                                <div className="card-body p-4 p-lg-5">
                                    <div className="row g-4">
                                        {/* Image Upload */}
                                        <div className="col-12 col-lg-5 text-center">
                                            <div className="mb-3 position-relative rounded-4 overflow-hidden bg-light d-flex align-items-center justify-content-center" style={{ height: '220px', border: '2px dashed #cbd5e1' }}>
                                                {editingFleet.imageBase64 ? (
                                                    <img src={editingFleet.imageBase64} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span className="text-muted">No Image</span>
                                                )}
                                                <div className="position-absolute bottom-0 w-100 p-2 bg-dark bg-opacity-50">
                                                    <input type="file" accept="image/*" id="fleetImgUpload" className="d-none" onChange={handleImageUpload} />
                                                    <label htmlFor="fleetImgUpload" className="btn btn-sm btn-outline-light rounded-pill m-0" style={{ cursor: 'pointer' }}>Change Image</label>
                                                </div>
                                            </div>
                                            <p className="text-muted small">Upload realistic car image.</p>
                                        </div>
                                        {/* Form Fields */}
                                        <div className="col-12 col-lg-7">
                                            <div className="mb-3">
                                                <label className="form-label fw-bold text-muted small">Vehicle Name</label>
                                                <input type="text" className="form-control" value={editingFleet.vehicleName} onChange={e => setEditingFleet({ ...editingFleet, vehicleName: e.target.value })} placeholder="e.g. Luxurious Red Sports Car" />
                                            </div>
                                            <div className="row g-3 mb-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold text-muted small">Vehicle Type</label>
                                                    <select className="form-select" value={editingFleet.vehicleType} onChange={e => setEditingFleet({ ...editingFleet, vehicleType: e.target.value })}>
                                                        <option value="Sedan">Sedan</option>
                                                        <option value="SUV">SUV</option>
                                                        <option value="Van">Van</option>
                                                        <option value="Hatchback">Hatchback</option>
                                                        <option value="Pick-up">Pick-up</option>
                                                        <option value="Crossover">Crossover</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold text-muted small">Seats</label>
                                                    <input type="number" className="form-control" value={editingFleet.seats} onChange={e => setEditingFleet({ ...editingFleet, seats: Number(e.target.value) })} min="1" />
                                                </div>
                                            </div>
                                            <div className="row g-3 mb-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold text-muted small">Price Per Day (₱)</label>
                                                    <input type="number" className="form-control" value={editingFleet.pricePerDay} onChange={e => setEditingFleet({ ...editingFleet, pricePerDay: Number(e.target.value) })} min="0" />
                                                </div>
                                                <div className="col-md-6 d-flex flex-column justify-content-center">
                                                    <label className="form-label fw-bold text-muted small">Availability</label>
                                                    <div className="form-check form-switch pt-1">
                                                        <input className="form-check-input" type="checkbox" role="switch" id="fleetAvailable" checked={editingFleet.isAvailable} onChange={e => setEditingFleet({ ...editingFleet, isAvailable: e.target.checked })} />
                                                        <label className="form-check-label" htmlFor="fleetAvailable">{editingFleet.isAvailable ? 'Available' : 'Unavailable'}</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label fw-bold text-muted small">Description / Features</label>
                                                <textarea className="form-control" rows="2" value={editingFleet.description} onChange={e => setEditingFleet({ ...editingFleet, description: e.target.value })} placeholder="e.g. Automatic, Gas, Leather Seats" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-footer bg-light p-3 text-end">
                                    <button onClick={handleSaveFleet} className="btn btn-success px-5 rounded-pill shadow" disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Fleet Vehicle'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Custom Admin Add Modal using AdminModalWrapper */}
            <AdminModalWrapper
                show={addModal.isOpen}
                onClose={() => setAddModal({ isOpen: false, type: '', input: '' })}
                size="md"
            >
                <div className="rounded border-0 p-4 p-md-5 text-center shadow-lg" style={{ backgroundColor: 'var(--theme-modal-bg)', width: '450px', maxWidth: '100%', margin: '0 auto' }}>
                    <h3 className="fw-bold mb-4" style={{ color: 'var(--theme-content-text)' }}>
                        {addModal.type === 'wash' ? 'New Vehicle Type' : 'New Rental Vehicle'}
                    </h3>
                    <input
                        type="text"
                        className="form-control form-control-lg mb-4"
                        style={{ border: '2px solid var(--theme-input-border)', color: 'var(--theme-content-text)', backgroundColor: 'var(--theme-input-bg)', borderRadius: '4px' }}
                        placeholder={addModal.type === 'wash' ? "e.g., Luxury SUV" : "e.g., Toyota Fortuner 2024"}
                        value={addModal.input}
                        onChange={(e) => setAddModal({ ...addModal, input: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddModalSubmit(); }}
                    />
                    <div className="d-flex justify-content-center gap-3">
                        <button className="btn btn-save px-4 fw-bold text-white shadow-sm" onClick={handleAddModalSubmit}>OK</button>
                        <button className="btn btn-secondary px-4 fw-bold shadow-sm" onClick={() => setAddModal({ isOpen: false, type: '', input: '' })}>Cancel</button>
                    </div>
                </div>
            </AdminModalWrapper>
        </div>
    );
};


export default ServiceSettingsPage;