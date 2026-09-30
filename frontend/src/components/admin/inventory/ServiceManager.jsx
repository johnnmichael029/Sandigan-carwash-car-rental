import { useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import { swrFetcher, SWR_CONFIG_STATIC } from '../../../api/swrFetcher';
import { TableSkeleton, InventorySkeleton } from '../../SkeletonLoaders';
import deleteIcon from '../../../assets/icon/delete.png';
import VehicleTypeSettings from './VehicleTypeSettings';
import PaymentSettingsManager from './PaymentSettingsManager';

const ServiceSettingsPage = ({ user, isDark }) => {
    // ── SWR Data Fetching (static configs — 1hr dedupe) ───────────────────────
    const { data: pricingData, isLoading: loadingPricing, mutate: mutatePricing } = useSWR('/pricing', swrFetcher, SWR_CONFIG_STATIC);
    const { data: fleetData, isLoading: loadingFleet, mutate: mutateFleet } = useSWR('/rental-fleet/admin', swrFetcher, SWR_CONFIG_STATIC);
    const { data: vehicleTypesData, isLoading: loadingTypes, mutate: mutateVehicleTypes } = useSWR('/vehicle-types', swrFetcher, SWR_CONFIG_STATIC);

    const isLoading = loadingPricing || loadingFleet || loadingTypes;
    const vehicles = pricingData?.dynamicPricing || [];
    const fleet = fleetData || [];
    const vehicleTypesList = vehicleTypesData || [];

    // Compat helpers for VehicleTypeSettings onUpdate callback
    const fetchVehicleTypes = () => mutateVehicleTypes();

    // Shared state
    const [activeTab, setActiveTab] = useState('wash');
    const [isSaving, setIsSaving] = useState(false);

    // Wash Pricing State
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);

    // Rental Fleet State
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [editingFleet, setEditingFleet] = useState(null);

    // Global Settings Modals State
    const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);

    const handleSelectVehicle = (v) => {
        setSelectedVehicle(v);
        // Deep copy so we can edit without affecting the list until saved
        const doc = JSON.parse(JSON.stringify(v));
        if (!doc.services) doc.services = [];
        if (!doc.restorePackages) doc.restorePackages = [];
        if (!doc.addons) doc.addons = [];
        setEditingDoc(doc);
    };

    const handleCreateVehicle = async () => {
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'New Vehicle Type',
            html:
                '<div className="text-start mb-2"><label className="small font-poppins text-muted">Vehicle / Model Name</label></div>' +
                '<input id="swal-vname" class="swal2-input mt-1 mb-3" placeholder="e.g., Fortuner, Innova, Sedan">' +
                '<div className="text-start mb-2"><label className="small font-poppins text-muted">Brand / Group Category</label></div>' +
                '<input id="swal-vbrand" class="swal2-input mt-1" placeholder="e.g., Toyota, Mitsubishi, General Categories">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Create',
            confirmButtonColor: '#23A0CE',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            preConfirm: () => {
                const vname = document.getElementById('swal-vname')?.value;
                const vbrand = document.getElementById('swal-vbrand')?.value;
                if (!vname || !vname.trim()) {
                    Swal.showValidationMessage('Please enter a vehicle type name.');
                    return false;
                }
                return { vehicleType: vname.trim(), brandGroup: vbrand ? vbrand.trim() : '' };
            }
        });
        if (!isConfirmed || !formValues) return;
        try {
            const res = await axios.post(`${API_BASE}/pricing`, {
                vehicleType: formValues.vehicleType,
                brandGroup: formValues.brandGroup,
                services: [],
                restorePackages: [],
                addons: []
            }, { headers: authHeaders(), withCredentials: true });
            mutatePricing();
            setSelectedVehicle(res.data);
            const doc = JSON.parse(JSON.stringify(res.data));
            if (!doc.restorePackages) doc.restorePackages = [];
            setEditingDoc(doc);
            Swal.fire({ title: 'Vehicle Added!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create vehicle.', 'error');
        }
    };

    const handleDeleteVehicle = async (id, name) => {
        const result = await Swal.fire({
            title: `Delete ${name}?`,
            text: "This will remove all its pricing data permanently.",
            icon: 'warning',
            showCancelButton: true,
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            confirmButtonColor: '#f43f5e'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE}/pricing/${id}`, { headers: authHeaders(), withCredentials: true });
            mutatePricing();
            if (selectedVehicle?._id === id) {
                setSelectedVehicle(null);
                setEditingDoc(null);
            }
            Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) {
            Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    const handleSaveDoc = async () => {
        if (!editingDoc || !editingDoc._id) return;

        // Validation Check
        const allItems = [
            ...(editingDoc.services || []),
            ...(editingDoc.restorePackages || []),
            ...(editingDoc.addons || [])
        ];
        const hasEmptyNames = allItems.some(item => !item.name.trim());
        if (hasEmptyNames) {
            Swal.fire('Incomplete Data', 'All services, packages, and add-ons must have a name.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/pricing/${editingDoc._id}`, {
                vehicleType: editingDoc.vehicleType,
                brandGroup: editingDoc.brandGroup || '',
                services: editingDoc.services || [],
                restorePackages: editingDoc.restorePackages || [],
                addons: editingDoc.addons || []
            }, { headers: authHeaders(), withCredentials: true });

            if (res.data && res.data._id) {
                mutatePricing();
                setSelectedVehicle(res.data);
                const doc = JSON.parse(JSON.stringify(res.data));
                if (!doc.restorePackages) doc.restorePackages = [];
                setEditingDoc(doc);
                Swal.fire({
                    title: 'Saved Successfully!',
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

    const handleCreateFleetVehicle = async () => {
        const { value: name, isConfirmed } = await Swal.fire({
            title: 'New Rental Vehicle',
            input: 'text',
            inputPlaceholder: 'e.g., Toyota Fortuner 2024',
            showCancelButton: true,
            confirmButtonText: 'Create',
            confirmButtonColor: '#23A0CE',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'Please enter a vehicle name.';
            }
        });
        if (!isConfirmed || !name?.trim()) return;
        try {
            const res = await axios.post(`${API_BASE}/rental-fleet`, {
                vehicleName: name.trim(), vehicleType: vehicleTypesList.length > 0 ? vehicleTypesList[0].name : 'Sedan', seats: 5, pricePerDay: 2000
            }, { headers: authHeaders(), withCredentials: true });
            mutateFleet();
            setSelectedFleet(res.data);
            setEditingFleet(JSON.parse(JSON.stringify(res.data)));
            Swal.fire({ title: 'Rental Vehicle Added!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create vehicle.', 'error');
        }
    };

    const handleDeleteFleet = async (id, name) => {
        const result = await Swal.fire({
            title: `Delete ${name}?`,
            text: "This vehicle will be permanently removed.",
            icon: 'warning',
            showCancelButton: true,
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            confirmButtonColor: '#f43f5e'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE}/rental-fleet/${id}`, { headers: authHeaders(), withCredentials: true });
            mutateFleet();
            if (selectedFleet?._id === id) { setSelectedFleet(null); setEditingFleet(null); }
            Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) {
            Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    const handleSaveFleet = async () => {
        if (!editingFleet || !editingFleet._id) return;
        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/rental-fleet/${editingFleet._id}`, editingFleet, { headers: authHeaders(), withCredentials: true });
            mutateFleet();
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
        const newItem = { name: '', price: 0, description: '' };
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
            if (field === 'inclusions') {
                const list = typeof value === 'string' ? value.split('\n') : (Array.isArray(value) ? value : []);
                arr[index] = { ...arr[index], inclusions: list };
            } else if (field === 'price') {
                arr[index] = { ...arr[index], price: Number(value) };
            } else {
                arr[index] = { ...arr[index], [field]: value };
            }
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
                {/* Tab Navigation matching HRIS design */}
                <div className="d-flex gap-2 p-1 rounded-3" style={{ background: 'var(--theme-input-bg)' }}>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'wash' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('wash')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'wash' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'wash' ? 'var(--theme-content-text)' : 'inherit' }}
                    >

                        Car Wash Pricing
                    </button>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'rental' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('rental')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'rental' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'rental' ? 'var(--theme-content-text)' : 'inherit' }}
                    >

                        Car Rental Fleet
                    </button>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'payment' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('payment')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'payment' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'payment' ? 'var(--theme-content-text)' : 'inherit' }}
                    >
                        Payment Methods
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
                                        <div>
                                            <span className="fw-bold font-poppins d-block" style={{ fontSize: '0.9rem' }}>{v.vehicleType}</span>
                                            {v.brandGroup && <span className="badge bg-info bg-opacity-25 text-info rounded-pill" style={{ fontSize: '0.68rem', fontWeight: 600 }}>{v.brandGroup}</span>}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{(v.services?.length || 0) + (v.restorePackages?.length || 0) + (v.addons?.length || 0)} items</span>
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
                                    {/* Brand / Group Category Field */}
                                    <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(35, 160, 206, 0.08)', border: '1px solid rgba(35, 160, 206, 0.2)' }}>
                                        <div className="row align-items-center g-3">
                                            <div className="col-md-6">
                                                <label className="form-label text-muted fw-bold small mb-1">Brand / Group Category</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={editingDoc.brandGroup || ''}
                                                    onChange={(e) => setEditingDoc({ ...editingDoc, brandGroup: e.target.value })}
                                                    placeholder="e.g. Toyota, Mitsubishi, General Categories, Motorcycles"
                                                />
                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.73rem' }}>
                                                    Group name in booking dropdowns (e.g. "Toyota", "Mitsubishi").
                                                </small>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted fw-bold small mb-1">Vehicle / Model Name</label>

                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={editingDoc.vehicleType || ''}
                                                    onChange={(e) => setEditingDoc({ ...editingDoc, vehicleType: e.target.value })}
                                                    placeholder="e.g. Fortuner"
                                                />
                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.73rem' }}>
                                                    Specific model name (e.g., "Hilux", "Montero").
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                    {/* 1. ✨ Premium Shine & Care Washes */}
                                    <div className="mb-5">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>✨ Premium Shine &amp; Care Washes</h6>
                                            <button onClick={() => addServiceOrAddon('services')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Wash Service</button>
                                        </div>
                                        {(!editingDoc.services || editingDoc.services.length === 0) ? <p className="text-muted small">No wash services defined.</p> : (
                                            <div className="table-responsive">
                                                <table className="table table-borderless align-middle mb-0">
                                                    <thead className="border-bottom text-muted small">
                                                        <tr>
                                                            <th style={{ width: '220px' }}>Service Name &amp; Tags</th>
                                                            <th>Description &amp; Checklist Inclusions (1 item per line)</th>
                                                            <th style={{ width: '130px' }}>Price (₱)</th>
                                                            <th style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {editingDoc.services.map((item, idx) => (
                                                            <tr key={idx} className="border-bottom">
                                                                <td className="py-3 align-top">
                                                                    <input type="text" className="form-control form-control-sm fw-bold mb-2" value={item.name} onChange={(e) => updateItem('services', idx, 'name', e.target.value)} placeholder="Package Name" />
                                                                    <div className="d-flex gap-1">
                                                                        <input type="text" className="form-control form-control-sm text-success" value={item.badge || ''} onChange={(e) => updateItem('services', idx, 'badge', e.target.value)} placeholder="Badge (e.g. BEST VALUE)" style={{ fontSize: '0.75rem' }} />
                                                                        <input type="text" className="form-control form-control-sm text-info" value={item.savings || ''} onChange={(e) => updateItem('services', idx, 'savings', e.target.value)} placeholder="Savings (e.g. 30 MINS)" style={{ fontSize: '0.75rem' }} />
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 align-top">
                                                                    <input type="text" className="form-control form-control-sm mb-2" value={item.description || ''} onChange={(e) => updateItem('services', idx, 'description', e.target.value)} placeholder="Subtitle / short description..." />
                                                                    <textarea className="form-control form-control-sm" rows="3" value={(item.inclusions || []).join('\n')} onChange={(e) => updateItem('services', idx, 'inclusions', e.target.value)} placeholder="Checklist items (1 per line, e.g. Vacuum Cleaning)..." style={{ fontSize: '0.8rem' }} />
                                                                </td>
                                                                <td className="py-3 align-top">
                                                                    <input type="number" className="form-control form-control-sm fw-bold" value={item.price} onChange={(e) => updateItem('services', idx, 'price', e.target.value)} placeholder="0" min="0" />
                                                                </td>
                                                                <td className="py-3 align-top text-end">
                                                                    <button onClick={() => removeServiceOrAddon('services', idx)} className="btn btn-sm text-danger p-1">✕</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. 🧼 Restore & Shine Packages */}
                                    <div className="mb-5">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>🧼 Restore &amp; Shine Packages</h6>
                                            <button onClick={() => addServiceOrAddon('restorePackages')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Package</button>
                                        </div>
                                        {(!editingDoc.restorePackages || editingDoc.restorePackages.length === 0) ? <p className="text-muted small">No restore packages defined for this vehicle.</p> : (
                                            <div className="table-responsive">
                                                <table className="table table-borderless align-middle mb-0">
                                                    <thead className="border-bottom text-muted small">
                                                        <tr>
                                                            <th style={{ width: '220px' }}>Package Name &amp; Tags</th>
                                                            <th>Description &amp; Checklist Inclusions (1 item per line)</th>
                                                            <th style={{ width: '130px' }}>Price (₱)</th>
                                                            <th style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {editingDoc.restorePackages.map((item, idx) => (
                                                            <tr key={idx} className="border-bottom">
                                                                <td className="py-3 align-top">
                                                                    <input type="text" className="form-control form-control-sm fw-bold mb-2" value={item.name} onChange={(e) => updateItem('restorePackages', idx, 'name', e.target.value)} placeholder="Package Name" />
                                                                    <div className="d-flex gap-1">
                                                                        <input type="text" className="form-control form-control-sm text-success" value={item.badge || ''} onChange={(e) => updateItem('restorePackages', idx, 'badge', e.target.value)} placeholder="Badge (e.g. BEST VALUE)" style={{ fontSize: '0.75rem' }} />
                                                                        <input type="text" className="form-control form-control-sm text-info" value={item.savings || ''} onChange={(e) => updateItem('restorePackages', idx, 'savings', e.target.value)} placeholder="Savings (e.g. SAVES ₱600)" style={{ fontSize: '0.75rem' }} />
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 align-top">
                                                                    <input type="text" className="form-control form-control-sm mb-2" value={item.description || ''} onChange={(e) => updateItem('restorePackages', idx, 'description', e.target.value)} placeholder="Subtitle / short description..." />
                                                                    <textarea className="form-control form-control-sm" rows="3" value={(item.inclusions || []).join('\n')} onChange={(e) => updateItem('restorePackages', idx, 'inclusions', e.target.value)} placeholder="Checklist items (1 per line)..." style={{ fontSize: '0.8rem' }} />
                                                                </td>
                                                                <td className="py-3 align-top">
                                                                    <input type="number" className="form-control form-control-sm fw-bold" value={item.price} onChange={(e) => updateItem('restorePackages', idx, 'price', e.target.value)} placeholder="0" min="0" />
                                                                </td>
                                                                <td className="py-3 align-top text-end">
                                                                    <button onClick={() => removeServiceOrAddon('restorePackages', idx)} className="btn btn-sm text-danger p-1">✕</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. ➕ Addons & Extras */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6 className="fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>➕ Add-ons &amp; Extras</h6>
                                            <button onClick={() => addServiceOrAddon('addons')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Item</button>
                                        </div>
                                        {(!editingDoc.addons || editingDoc.addons.length === 0) ? <p className="text-muted small">No add-ons defined.</p> : (
                                            <div className="table-responsive">
                                                <table className="table table-borderless table-sm mb-0">
                                                    <thead className="border-bottom text-muted small">
                                                        <tr>
                                                            <th style={{ minWidth: '150px' }}>Addon Name</th>
                                                            <th>Description <span className="fw-normal opacity-50">(optional)</span></th>
                                                            <th style={{ width: '140px' }}>Price (₱)</th>
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
                                                                    <input type="text" className="form-control form-control-sm" value={item.description || ''} onChange={(e) => updateItem('addons', idx, 'description', e.target.value)} placeholder="Short description..." />
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
                                    <div>
                                        <button onClick={() => setShowVehicleTypeModal(true)} className="btn btn-sm btn-outline-secondary category-tags rounded-pill px-3">
                                            Types Library
                                        </button>
                                        <button onClick={() => handleDeleteFleet(editingFleet._id, editingFleet.vehicleName)} className="btn">
                                            <img src={deleteIcon} alt="Delete" style={{ width: '16px' }} />
                                        </button>
                                    </div>
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
                                                    <div className="d-flex justify-content-between align-items-end mb-1">
                                                        <label className="form-label fw-bold text-muted small m-0">Vehicle Type</label>
                                                    </div>
                                                    <select className="form-select" value={editingFleet.vehicleType} onChange={e => setEditingFleet({ ...editingFleet, vehicleType: e.target.value })}>
                                                        {vehicleTypesList.map(type => (
                                                            <option key={type._id} value={type.name}>{type.name}</option>
                                                        ))}
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
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            role="switch"
                                                            id="fleetAvailable"
                                                            checked={editingFleet.isAvailable}
                                                            onChange={e => setEditingFleet({
                                                                ...editingFleet,
                                                                isAvailable: e.target.checked,
                                                                unavailableReason: e.target.checked ? '' : (editingFleet.unavailableReason || '')
                                                            })}
                                                        />
                                                        <label className="form-check-label" htmlFor="fleetAvailable">
                                                            {editingFleet.isAvailable
                                                                ? <span style={{ color: '#10b981', fontWeight: 600 }}>Available</span>
                                                                : <span style={{ color: '#ef4444', fontWeight: 600 }}>Unavailable</span>}
                                                        </label>
                                                    </div>
                                                    {/* Reason selector — shown only when unavailable */}
                                                    {!editingFleet.isAvailable && (() => {
                                                        const PRESET_REASONS = [
                                                            'Under Maintenance',
                                                            'In Use',
                                                            'No Longer Available',
                                                            'Retired',
                                                        ];
                                                        const isCustom = editingFleet.unavailableReason && !PRESET_REASONS.includes(editingFleet.unavailableReason);
                                                        return (
                                                            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                <label className="form-label fw-bold text-muted small mb-0">Reason</label>
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    style={{ borderColor: '#ef4444', fontSize: '0.8rem' }}
                                                                    value={isCustom ? '__custom__' : (editingFleet.unavailableReason || '')}
                                                                    onChange={e => {
                                                                        if (e.target.value === '__custom__') {
                                                                            setEditingFleet({ ...editingFleet, unavailableReason: '' });
                                                                        } else {
                                                                            setEditingFleet({ ...editingFleet, unavailableReason: e.target.value });
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">— Select a reason —</option>
                                                                    {PRESET_REASONS.map(r => (
                                                                        <option key={r} value={r}>{r}</option>
                                                                    ))}
                                                                    <option value="__custom__">Custom…</option>
                                                                </select>
                                                                {(isCustom || editingFleet.unavailableReason === '') && (
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        style={{ borderColor: '#ef4444', fontSize: '0.8rem' }}
                                                                        placeholder="e.g. Awaiting Parts, Sold, etc."
                                                                        value={isCustom ? editingFleet.unavailableReason : ''}
                                                                        onChange={e => setEditingFleet({ ...editingFleet, unavailableReason: e.target.value })}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
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

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
                <PaymentSettingsManager isDark={isDark} />
            )}

            {/* Modals */}
            {showVehicleTypeModal && (
                <VehicleTypeSettings
                    show={showVehicleTypeModal}
                    isDark={isDark}
                    onClose={() => setShowVehicleTypeModal(false)}
                    onUpdate={fetchVehicleTypes}
                />
            )}
        </div>
    );
};


export default ServiceSettingsPage;