import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, InventorySkeleton } from '../../SkeletonLoaders';
import deleteIcon from '../../../assets/icon/delete.png';

const ServiceSettingsPage = ({ user }) => {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE}/pricing`, { headers: authHeaders(), withCredentials: true });
            setVehicles(res.data.dynamicPricing || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to load pricing data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectVehicle = (v) => {
        setSelectedVehicle(v);
        // Deep copy so we can edit without affecting the list until saved
        setEditingDoc(JSON.parse(JSON.stringify(v)));
    };

    const handleCreateVehicle = async () => {
        const { value: name } = await Swal.fire({
            title: 'New Vehicle Type',
            input: 'text',
            inputPlaceholder: 'e.g., Luxury SUV',
            showCancelButton: true,
            confirmButtonColor: '#23A0CE'
        });
        if (!name) return;

        try {
            const res = await axios.post(`${API_BASE}/pricing`, {
                vehicleType: name,
                services: [],
                addons: []
            }, { headers: authHeaders(), withCredentials: true });
            setVehicles([...vehicles, res.data]);
            Swal.fire('Success', 'Vehicle added. Select it to add services.', 'success');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create', 'error');
        }
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
            <div className="border-bottom pb-3 mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Service & Pricing Settings</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Dynamic pricing configuration for bookings.</p>
                </div>
                <button onClick={handleCreateVehicle} className="btn btn-save rounded-3 text-white fw-bold shadow-sm">
                    + Add Vehicle Type
                </button>
            </div>

            <div className="row g-4">
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
        </div>
    );
};


export default ServiceSettingsPage;