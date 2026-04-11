import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';

const CreateBookingModal = ({ onClose, onSave, showToast }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isQuickMode, setIsQuickMode] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        emailAddress: '',
        vehicleType: '',
        serviceType: [],
        bookingTime: '',
        detailer: '',
        assignedTo: '',
        smcId: '',
        promoCode: '',
        purchasedProducts: [],
        bayId: '',
    });

    const [smcDiscountInfo, setSmcDiscountInfo] = useState({ isValid: false, percentage: 0, error: '' });
    const [promoInfo, setPromoInfo] = useState({ isValid: false, discount: 0, type: 'Flat', error: '', code: '' });
    const [isVerifyingSMC, setIsVerifyingSMC] = useState(false);
    const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

    const handleSMCVerification = async () => {
        if (!formData.smcId || formData.smcId.length < 5) {
            setSmcDiscountInfo({ isValid: false, percentage: 0, error: 'Enter a valid ID' });
            return;
        }
        setIsVerifyingSMC(true);
        try {
            const cleanSmcId = encodeURIComponent(formData.smcId.replace(/\s+/g, '').toUpperCase());
            const res = await axios.get(`${API_BASE}/crm/validate-smc/${cleanSmcId}`, { headers: authHeaders(), withCredentials: true });
            if (res.data.isValid) {
                setSmcDiscountInfo({ isValid: true, percentage: res.data.discountPercentage, error: '' });
                showToast(`SMC Applied: ${res.data.discountPercentage}% Discount Active!`);
            } else {
                setSmcDiscountInfo({ isValid: false, percentage: 0, error: res.data.message || 'Invalid Card' });
            }
        } catch (err) {
            setSmcDiscountInfo({ isValid: false, percentage: 0, error: 'Validation failed' });
        } finally {
            setIsVerifyingSMC(false);
        }
    };

    const handlePromoVerification = async () => {
        if (!formData.promoCode) return;
        setIsVerifyingPromo(true);
        try {
            const res = await axios.post(`${API_BASE}/promotions/validate`, {
                code: formData.promoCode.trim().toUpperCase(),
                totalPrice: computedSubtotal,
                customerEmail: formData.emailAddress
            }, { headers: authHeaders(), withCredentials: true });

            if (res.data.valid) {
                const discount = res.data.discountType === 'Percentage'
                    ? (computedSubtotal * (res.data.discountValue / 100))
                    : res.data.discountValue;

                setPromoInfo({ isValid: true, discount, type: res.data.discountType, error: '', code: formData.promoCode.toUpperCase() });
                showToast(`Promo Applied! Saved ₱${discount.toLocaleString()}`);
            } else {
                setPromoInfo({ ...promoInfo, isValid: false, error: res.data.message });
            }
        } catch (err) {
            setPromoInfo({ ...promoInfo, isValid: false, error: 'Invalid or expired promo code' });
        } finally {
            setIsVerifyingPromo(false);
        }
    };

    const [availability, setAvailability] = useState({});
    const [dynamicPricingData, setDynamicPricingData] = useState([]);
    const [detailers, setDetailers] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [bays, setBays] = useState([]);

    const getProductStock = (prod) => {
        if (!prod || !inventory || !inventory.length) return null;

        // Strategy 1: Match by Category Tag
        if (prod.category && prod.category !== 'General') {
            const catMatch = inventory.find(i =>
                i.category?.trim().toLowerCase() === prod.category.trim().toLowerCase()
            );
            if (catMatch) return Math.floor(catMatch.currentStock);
        }

        // Strategy 2: Fallback to Robust Name Matching
        const search = prod.name?.trim().toLowerCase();
        const item = inventory.find(i =>
            i.name?.trim().toLowerCase() === search ||
            i.name?.toLowerCase().includes(search) ||
            search.includes(i.name?.toLowerCase())
        );

        return item ? item.currentStock : null;
    };

    useEffect(() => {
        Promise.all([
            axios.get(`${API_BASE}/booking/availability`, { headers: authHeaders(), withCredentials: true }),
            axios.get(`${API_BASE}/pricing`),
            axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true }),
            axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true }),
            axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true }),
            axios.get(`${API_BASE}/bays`, { headers: authHeaders(), withCredentials: true })
        ])
            .then(([availRes, pricingRes, empRes, prodRes, invRes, baysRes]) => {
                setAvailability(availRes.data);
                if (pricingRes.data && pricingRes.data.dynamicPricing) {
                    setDynamicPricingData(pricingRes.data.dynamicPricing);
                }
                if (empRes && empRes.data) {
                    setDetailers(empRes.data.filter(e => e.role === 'detailer'));
                }
                if (prodRes && prodRes.data) {
                    setProducts(prodRes.data.filter(p => p.isActive !== false));
                }
                if (invRes && invRes.data) {
                    setInventory(invRes.data);
                }
                if (baysRes && baysRes.data) {
                    setBays(baysRes.data);
                }
            })
            .catch(err => console.error("Failed to fetch create mode data", err));
    }, []);

    const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];
    const formatTo12Hour = (hourStr) => {
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:00 ${ampm}`;
    };

    const availableHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;
        return allHours.filter(hour => {
            const hourInt = parseInt(hour);
            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;
            return hourInt >= currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            const hourKey = hour.toString().padStart(2, '0');
            const bookedCount = availability[hourKey] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            return { raw: hour, label: `${formatTo12Hour(hour)} (${slotsLeft} slots left)` };
        });
    }, [availability]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const toggleService = (serviceLabel) => {
        setFormData(prev => {
            const current = prev.serviceType;
            if (current.includes(serviceLabel)) {
                return { ...prev, serviceType: current.filter(item => item !== serviceLabel) };
            } else {
                return { ...prev, serviceType: [...current, serviceLabel] };
            }
        });
    };

    const addRetailProduct = () => {
        const sel = document.getElementById('createRetailSelect');
        const qtyInput = document.getElementById('createRetailQty');
        const qty = parseInt(qtyInput?.value) || 1;
        if (!sel || !sel.value) return;

        const prodMatch = products.find(p => p._id === sel.value);
        if (prodMatch) {
            const availableStock = getProductStock(prodMatch);
            const currentTotalInCart = formData.purchasedProducts
                .filter(p => p.productId === prodMatch._id || p.productName === prodMatch.name)
                .reduce((s, p) => s + p.quantity, 0);

            if (availableStock !== null && (currentTotalInCart + qty) > availableStock) {
                Swal.fire({
                    title: 'Insufficient Stock',
                    text: `Cannot add ${qty}. You already have ${currentTotalInCart} in cart. Total exceeds available ${availableStock} units of ${prodMatch.name}.`,
                    icon: 'error',
                    confirmButtonColor: '#23A0CE'
                });
                return;
            }

            setFormData(prev => ({
                ...prev,
                purchasedProducts: [...prev.purchasedProducts, { productId: prodMatch._id, productName: prodMatch.name, category: prodMatch.category, quantity: qty, price: prodMatch.basePrice }]
            }));
            sel.value = '';
            if (qtyInput) qtyInput.value = '1';
        }
    };

    const removeRetailProduct = (idx) => {
        setFormData(prev => ({
            ...prev,
            purchasedProducts: prev.purchasedProducts.filter((_, i) => i !== idx)
        }));
    };

    const handleSave = async () => {
        // Validation logic
        if (isQuickMode) {
            if (!formData.vehicleType || formData.serviceType.length === 0 || !formData.bookingTime || !formData.assignedTo) {
                Swal.fire('Incomplete', 'Please fill in vehicle, services, detailer, and time.', 'warning');
                return;
            }
        } else {
            if (!formData.firstName || !formData.lastName || !formData.vehicleType || formData.serviceType.length === 0 || !formData.bookingTime || !formData.assignedTo) {
                Swal.fire('Incomplete', 'Please fill in all required fields.', 'warning');
                return;
            }
        }

        setIsSaving(true);
        try {
            // Prepare submission data with defaults if in Quick Mode to satisfy DB requirements
            const submissionData = {
                ...formData,
                firstName: isQuickMode ? "Walk-in" : formData.firstName,
                lastName: isQuickMode ? "Customer" : formData.lastName,
                emailAddress: isQuickMode ? "walkin@example.com" : (formData.emailAddress || "walkin@example.com"),
                phoneNumber: isQuickMode ? "00000000000" : (formData.phoneNumber || "00000000000"),
                discountAmount: liveSMCDiscount,
                smcId: smcDiscountInfo.isValid ? formData.smcId : null,
                promoCode: promoInfo.isValid ? promoInfo.code : null,
                promoDiscount: livePromoDiscount,
                assignedTo: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.assignedTo,
                detailer: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.detailer,
                bayId: (!formData.bayId || formData.bayId === '') ? null : formData.bayId
            };

            await axios.post(`${API_BASE}/booking`, submissionData, { headers: authHeaders(), withCredentials: true });
            showToast('New booking created successfully.');
            onSave();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create booking.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const activeVehicleData = useMemo(() => {
        return dynamicPricingData.find(v => v.vehicleType === formData.vehicleType) || null;
    }, [dynamicPricingData, formData.vehicleType]);

    const computedSubtotal = useMemo(() => {
        let sum = 0;
        if (activeVehicleData) {
            sum += formData.serviceType.reduce((s, name) => {
                const serv = activeVehicleData.services?.find(x => x.name === name);
                const add = activeVehicleData.addons?.find(a => a.name === name);
                if (serv) return s + serv.price;
                if (add) return s + add.price;
                return s;
            }, 0);
        }
        if (formData.purchasedProducts && formData.purchasedProducts.length > 0) {
            sum += formData.purchasedProducts.reduce((s, p) => s + (p.price * p.quantity), 0);
        }
        return sum;
    }, [activeVehicleData, formData.serviceType, formData.purchasedProducts]);

    const liveSMCDiscount = smcDiscountInfo.isValid ? computedSubtotal * (smcDiscountInfo.percentage / 100) : 0;
    const livePromoDiscount = promoInfo.isValid ? promoInfo.discount : 0;
    const liveTotalPrice = Math.max(0, computedSubtotal - liveSMCDiscount - livePromoDiscount);

    return (
        <AdminModalWrapper show={true} onClose={onClose} size="lg">
            <div className="modal-content rounded-4 shadow border-0 bg-white">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-center flex-wrap gap-2">
                    <div className="me-auto">
                        <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>Create New Booking</h5>
                        <div className="mt-1">
                            <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                Estimated Total: ₱{liveTotalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Quick Mode Toggle */}
                    <div className="form-check form-switch d-flex align-items-center gap-2 bg-light rounded-pill px-3 py-2 border">
                        <input
                            className="form-check-input mt-0"
                            type="checkbox"
                            role="switch"
                            id="quickModeSwitch"
                            checked={isQuickMode}
                            onChange={(e) => setIsQuickMode(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <label className="form-check-label font-poppins fw-600 mb-0" htmlFor="quickModeSwitch" style={{ fontSize: '0.85rem', cursor: 'pointer', color: isQuickMode ? '#23A0CE' : '#666' }}>
                            ⚡ Quick Walk-in
                        </label>
                    </div>

                    <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                </div>
                <div className="modal-body p-4">
                    <div className="row g-4">
                        {!isQuickMode && (
                            <div className="col-12">
                                <h6 className="fw-bold mb-3 font-poppins" style={{ fontSize: '0.9rem', color: '#23A0CE' }}>CUSTOMER INFORMATION</h6>
                                <div className="row g-3">
                                    <div className="col-md-6 text-start">
                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>First Name</label>
                                        <input type="text" name="firstName" className="form-control form-control-sm shadow-none" value={formData.firstName} onChange={handleChange} placeholder="Required" />
                                    </div>
                                    <div className="col-md-6 text-start">
                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Last Name</label>
                                        <input type="text" name="lastName" className="form-control form-control-sm shadow-none" value={formData.lastName} onChange={handleChange} placeholder="Required" />
                                    </div>
                                    <div className="col-md-6 text-start">
                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Email Address</label>
                                        <input type="email" name="emailAddress" className="form-control form-control-sm shadow-none" value={formData.emailAddress} onChange={handleChange} placeholder="Optional" />
                                    </div>
                                    <div className="col-md-6 text-start">
                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Phone (No leading 0)</label>
                                        <input type="text" name="phoneNumber" className="form-control form-control-sm shadow-none" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="e.g. 9123456789" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="col-12">
                            <h6 className="fw-bold mb-3 font-poppins" style={{ fontSize: '0.9rem', color: '#23A0CE' }}>{isQuickMode ? 'BOOKING DETAILS' : 'VEHICLE & SERVICES'}</h6>
                            <div className="row g-3">
                                <div className="col-md-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Vehicle Type</label>
                                    <select name="vehicleType" className="form-select form-select-sm shadow-none" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value, serviceType: [] })}>
                                        <option value="">-- Select Vehicle --</option>
                                        {dynamicPricingData.map(v => <option key={v._id} value={v.vehicleType}>{v.vehicleType}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Preferred Time Slot</label>
                                    <select name="bookingTime" className="form-select form-select-sm shadow-none" value={formData.bookingTime} onChange={handleChange}>
                                        <option value="">-- Select Time --</option>
                                        {availableHours.map(h => <option key={h.raw} value={h.raw}>{h.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Sandigan Membership Card (SMC)</label>
                                    <div className="d-flex gap-2">
                                        <input type="text" name="smcId" className="form-control form-control-sm shadow-none font-monospace text-uppercase" placeholder="Scan or type SMC-XXXXXX" value={formData.smcId} onChange={handleChange} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSMCVerification(); } }} />
                                        <button type="button" className="btn btn-sm btn-outline-primary shadow-none px-3" onClick={handleSMCVerification} disabled={isVerifyingSMC || !formData.smcId}>
                                            {isVerifyingSMC ? '...' : 'Verify'}
                                        </button>
                                    </div>
                                    {smcDiscountInfo.isValid && <small className="text-success d-block mt-1 fw-medium" style={{ fontSize: '0.75rem' }}>Valid SMC — {smcDiscountInfo.percentage}% Discount Applied</small>}
                                    {smcDiscountInfo.error && <small className="text-danger d-block mt-1" style={{ fontSize: '0.75rem' }}>{smcDiscountInfo.error}</small>}
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Promo Code</label>
                                    <div className="d-flex gap-2">
                                        <input type="text" name="promoCode" className="form-control form-control-sm shadow-none font-monospace text-uppercase" placeholder="Enter Code" value={formData.promoCode} onChange={handleChange} />
                                        <button type="button" className="btn btn-sm btn-outline-primary shadow-none px-3" onClick={handlePromoVerification} disabled={isVerifyingPromo || !formData.promoCode}>
                                            {isVerifyingPromo ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                    {promoInfo.isValid && <small className="text-success d-block mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>Promo Active: -₱{promoInfo.discount.toLocaleString()}</small>}
                                    {promoInfo.error && <small className="text-danger d-block mt-1" style={{ fontSize: '0.7rem' }}>{promoInfo.error}</small>}
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Assigned Detailer</label>
                                    <select
                                        name="detailer"
                                        className="form-select form-select-sm shadow-none"
                                        value={formData.assignedTo}
                                        onChange={e => {
                                            const selected = detailers.find(d => d._id === e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                assignedTo: e.target.value,
                                                detailer: selected ? selected.fullName : ''
                                            }));
                                        }}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        <option value="">—- Unassigned -—</option>
                                        {detailers.map(d => (
                                            <option key={d._id} value={d._id}>{d.fullName}</option>
                                        ))}

                                    </select>
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Assigned Bay</label>
                                    <select
                                        name="bayId"
                                        className="form-select form-select-sm shadow-none"
                                        value={formData.bayId}
                                        onChange={handleChange}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        <option value="">—- Unassigned -—</option>
                                        {bays.map(b => (
                                            <option key={b._id} value={b._id} disabled={b.status === 'Maintenance' || b.status === 'Occupied'}>
                                                {b.name} ({b.status === 'Occupied' ? 'Unavailable' : b.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Services Requested</label>
                                    <div className="row row-cols-2 row-cols-lg-4 g-2 mb-2">
                                        {activeVehicleData?.services?.map(service => {
                                            const isSelected = formData.serviceType.includes(service.name);
                                            return (
                                                <div className="col" key={service.name}>
                                                    <button type="button" onClick={() => toggleService(service.name)} className={`btn rounded-pill px-3 w-100 btn-active ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`} style={{ fontSize: '0.8rem' }}>
                                                        {isSelected && <span className="me-1">✓</span>} {service.name}
                                                        <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>₱{service.price}</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <label className="form-label mb-1 brand-primary" style={{ fontSize: '0.8rem' }}>Add-ons</label>
                                    {activeVehicleData?.addons?.length > 0 && (
                                        <div className="row row-cols-2 row-cols-lg-4 g-2">
                                            {activeVehicleData.addons.map(addon => {
                                                const isSelected = formData.serviceType.includes(addon.name);
                                                return (
                                                    <div className="col" key={addon.name}>
                                                        <button type="button" onClick={() => toggleService(addon.name)} className={`btn rounded-pill px-3 w-100 btn-active ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`} style={{ fontSize: '0.8rem' }}>
                                                            {isSelected && <span className="me-1">✓</span>} {addon.name}
                                                            <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>₱{addon.price}</span>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Retail / Products Section */}
                                    <label className="form-label brand-primary mt-3 mb-1" style={{ fontSize: '0.8rem' }}>Retail / Products</label>
                                    <div className="d-flex flex-column gap-2">
                                        {formData.purchasedProducts.length === 0 && (
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>No retail items added yet.</span>
                                        )}
                                        {formData.purchasedProducts.map((p, idx) => (
                                            <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'var(--theme-content-bg)', border: '1px solid var(--theme-content-border)' }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge" style={{ background: '#23A0CE' }}>{p.productName}</span>
                                                    <span className="" style={{ fontSize: '0.75rem', fontWeight: 500 }}>x{p.quantity} (₱{(p.price * p.quantity).toLocaleString()})</span>
                                                </div>
                                                <button type="button" className="btn btn-sm text-danger p-0 border-0 shadow-none" onClick={() => removeRetailProduct(idx)}>✖</button>
                                            </div>
                                        ))}
                                        {products.length > 0 && (
                                            <div className="d-flex gap-2 align-items-center mt-1">
                                                <select id="createRetailSelect" className="form-select form-select-sm shadow-none flex-grow-1" style={{ fontSize: '0.75rem' }}>
                                                    <option value="">-- Select Product --</option>
                                                    {products.map(prod => {
                                                        const stock = getProductStock(prod);
                                                        const outOfStock = stock !== null && stock <= 0;
                                                        return (
                                                            <option key={prod._id} value={prod._id} disabled={outOfStock}>
                                                                {prod.name} (₱{prod.basePrice}){stock !== null ? ` — Stock: ${stock}` : ''}{outOfStock ? ' [Out of Stock]' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <input
                                                    type="number"
                                                    id="createRetailQty"
                                                    className="form-control form-control-sm shadow-none text-center"
                                                    style={{ width: '55px', fontSize: '0.75rem' }}
                                                    defaultValue="1"
                                                    min="1"
                                                    max={99}
                                                />
                                                <button type="button" className="btn btn-sm btn-outline-primary shadow-none" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={addRetailProduct}>+ Add</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer border-top-0 pb-4 px-4 pt-1 justify-content-end gap-2">
                    <button className="btn btn-light rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
                    <button className="btn rounded-pill px-4 shadow-sm font-poppins brand-primary" style={{ fontSize: '0.85rem' }} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Creating...' : 'Create Booking'}
                    </button>
                </div>
            </div>
        </AdminModalWrapper>
    );
};

export default CreateBookingModal;
