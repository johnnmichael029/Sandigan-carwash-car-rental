import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';

// Icons
import pendingBooking from '../../../assets/icon/pending-booking-brand.png';
import confirmedBooking from '../../../assets/icon/confirmed-booking-brand.png';
import queuedBooking from '../../../assets/icon/queued-booking-brand.png';
import completedBooking from '../../../assets/icon/completed-booking-brand.png';
import editBooking from '../../../assets/icon/edit-book.png';
import bookDuration from '../../../assets/icon/duration.png';
import inProgressBooking from '../../../assets/icon/in-progress.png';

const BookingModal = ({ booking, onClose, showToast, onSave, onPrint, onSMC, onSMCById }) => {
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [detailers, setDetailers] = useState([]);
    const [formData, setFormData] = useState({
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        phoneNumber: booking.phoneNumber || '',
        emailAddress: booking.emailAddress || '',
        vehicleType: booking.vehicleType || '',
        serviceType: Array.isArray(booking.serviceType) ? booking.serviceType : (booking.serviceType ? booking.serviceType.split(',').map(s => s.trim()) : []),
        bookingTime: booking.bookingTime || '',
        detailer: booking.detailer || '',
        assignedTo: booking.assignedTo?._id || booking.assignedTo || '',
        smcId: booking.smcId || '',
        promoCode: booking.promoCode || '',
        discountAmount: booking.discountAmount || 0,
        purchasedProducts: booking.purchasedProducts || [],
        bayId: booking.bayId?._id || booking.bayId || '',
    });

    const [smcDiscountInfo, setSmcDiscountInfo] = useState({ isValid: !!booking.smcId, percentage: 0, error: '' });
    const [promoInfo, setPromoInfo] = useState({ isValid: !!booking.promoCode, discount: booking.promoDiscount || 0, type: 'Flat', error: '', code: booking.promoCode || '' });
    const [isVerifyingSMC, setIsVerifyingSMC] = useState(false);
    const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

    const handleSMCVerification = async (silent = false) => {
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
                if (!silent) showToast(`SMC Applied: ${res.data.discountPercentage}% Discount Active!`);
            } else {
                setSmcDiscountInfo({ isValid: false, percentage: 0, error: res.data.message || 'Invalid Card' });
            }
        } catch (err) {
            setSmcDiscountInfo({ isValid: false, percentage: 0, error: 'Validation failed' });
        } finally {
            setIsVerifyingSMC(false);
        }
    };

    const handlePromoVerification = async (silent = false) => {
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
                if (!silent) showToast(`Promo Applied! Saved ₱${discount.toLocaleString()}`);
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
    const [products, setProducts] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [bays, setBays] = useState([]);

    // Fetch detailers once on mount
    useEffect(() => {
        axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true })
            .then(res => setDetailers(res.data.filter(e => e.role === 'detailer')))
            .catch(err => console.error('Failed to fetch detailers', err));

        axios.get(`${API_BASE}/bays`, { headers: authHeaders(), withCredentials: true })
            .then(res => setBays(res.data))
            .catch(err => console.error('Failed to fetch bays', err));
    }, []);

    // Fetch availability, pricing, products & inventory when edit mode opens
    useEffect(() => {
        if (editMode) {
            Promise.all([
                axios.get(`${API_BASE}/booking/availability`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/pricing`),
                axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true })
            ])
                .then(([availRes, pricingRes, prodRes, invRes]) => {
                    setAvailability(availRes.data);
                    if (pricingRes.data && pricingRes.data.dynamicPricing) {
                        setDynamicPricingData(pricingRes.data.dynamicPricing);
                    }
                    if (prodRes && prodRes.data) {
                        setProducts(prodRes.data.filter(p => p.isActive !== false));
                    }
                    if (invRes && invRes.data) {
                        setInventoryItems(invRes.data);
                    }
                })
                .catch(err => console.error("Failed to fetch edit mode data", err));
        }
    }, [editMode]);

    // Helper: get available stock for a product by matching its name to inventory items
    const getProductStock = (prod) => {
        if (!prod || !inventoryItems || !inventoryItems.length) return null;

        // Strategy 1: Match by Category Tag (Recommended)
        if (prod.category && prod.category !== 'General') {
            const catMatch = inventoryItems.find(i =>
                i.category?.trim().toLowerCase() === prod.category.trim().toLowerCase()
            );
            if (catMatch) return Math.floor(catMatch.currentStock);
        }

        // Strategy 2: Fallback to Robust Name Matching
        const search = prod.name?.trim().toLowerCase();
        const nameMatch = inventoryItems.find(item =>
            item.name?.trim().toLowerCase() === search ||
            item.name?.toLowerCase().includes(search) ||
            search.includes(item.name?.toLowerCase())
        );

        return nameMatch ? Math.floor(nameMatch.currentStock) : null;
    };

    const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

    // Helper function to convert military time to 12-hour format
    const formatTo12Hour = (hourStr) => {
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // converts 0 to 12 and 13 to 1
        return `${displayHour}:00 ${ampm}`;
    };

    const availableHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;

        return allHours.filter(hour => {
            const hourInt = parseInt(hour);
            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;

            // Include current booking's time so it doesn't vanish from select
            if (hour === booking.bookingTime) return true;

            // Otherwise apply future AND not full rule
            return hourInt > currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            if (hour === booking.bookingTime) {
                return { raw: hour, label: `${formatTo12Hour(hour)} (Current)` };
            }
            const hourKey = hour.toString().padStart(2, '0');
            const bookedCount = availability[hourKey] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            const slotText = slotsLeft <= 3 ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : '';
            return {
                raw: hour,
                label: `${formatTo12Hour(hour)}${slotText}`
            };
        });
    }, [availability, booking.bookingTime]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const toggleService = (serviceLabel) => {
        if (!editMode) return;
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
        const sel = document.getElementById('retailSelect');
        const qtyInput = document.getElementById('retailQty');
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
            sel.value = "";
            if (qtyInput) qtyInput.value = "1";
        }
    };

    const removeRetailProduct = (idx) => {
        setFormData(prev => ({
            ...prev,
            purchasedProducts: prev.purchasedProducts.filter((_, i) => i !== idx)
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        if (!formData.assignedTo || !formData.detailer) {
            Swal.fire('Incomplete', 'Please assign a detailer.', 'warning');
            setIsSaving(false);
            return;
        }
        try {
            const payload = {
                ...formData,
                discountAmount: liveSMCDiscount,
                promoCode: promoInfo.isValid ? promoInfo.code : null,
                promoDiscount: promoInfo.isValid ? promoInfo.discount : 0,
                assignedTo: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.assignedTo,
                detailer: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.detailer,
                bayId: (!formData.bayId || formData.bayId === '') ? null : formData.bayId
            };
            await axios.patch(`${API_BASE}/booking/${booking._id}`, payload, { headers: authHeaders(), withCredentials: true });
            if (showToast) showToast('Booking details updated successfully.');
            if (onSave) onSave(); // Re-fetch data and close
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update booking details.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Process status logs to guarantee 'Pending' is shown even on old records
    let logsToDisplay = [];
    if (booking.statusLogs && booking.statusLogs.length > 0) {
        logsToDisplay = [...booking.statusLogs];
        // For backwards compatibility on old records: prepend Pending using creation date
        if (logsToDisplay[0].status !== 'Pending') {
            logsToDisplay.unshift({ status: 'Pending', timestamp: booking.createdAt });
        }
    } else {
        // Fallback for extremely old records with no logs array
        logsToDisplay = [{ status: 'Pending', timestamp: booking.createdAt }];
        if (booking.status !== 'Pending') {
            logsToDisplay.push({ status: booking.status, timestamp: booking.updatedAt || new Date() });
        }
    }

    // Active vehicle data mapped dynamically
    const activeVehicleData = useMemo(() => {
        return dynamicPricingData.find(v => v.vehicleType === formData.vehicleType) || null;
    }, [dynamicPricingData, formData.vehicleType]);

    // Compute live price based on current formData (updates as employee edits)
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

    const liveSMCDiscount = smcDiscountInfo.isValid && smcDiscountInfo.percentage > 0
        ? computedSubtotal * (smcDiscountInfo.percentage / 100)
        : (booking.discountAmount || 0);

    const livePromoDiscount = promoInfo.isValid ? promoInfo.discount : 0;
    const liveTotalPrice = Math.max(0, computedSubtotal - liveSMCDiscount - livePromoDiscount);

    useEffect(() => {
        if (booking.smcId && !smcDiscountInfo.percentage && !smcDiscountInfo.error) {
            handleSMCVerification(true);
        }
    }, [booking.smcId]);

    // Original stored price for reference
    const storedTotalPrice = booking.totalPrice || 0;

    let durationText = null;
    if (logsToDisplay.length > 0) {
        const inProgressLog = logsToDisplay.find(l => l.status === 'In-progress');
        const completedLog = logsToDisplay.find(l => l.status === 'Completed');
        if (inProgressLog && completedLog) {
            const diffMs = new Date(completedLog.timestamp) - new Date(inProgressLog.timestamp);
            const diffMins = Math.round(diffMs / 60000);
            durationText = `It took ${diffMins} mins from In-progress to Completed.`;
        }
    }

    return (
        <AdminModalWrapper show={!!booking} onClose={onClose} size="lg">
            <div className="modal-content rounded-4 shadow border-0" style={{ background: 'var(--theme-modal-bg)' }}>
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-start flex-wrap gap-2">
                    <div>
                        <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>
                            Booking Details <span className="fw-normal text-dark-secondary" style={{ fontSize: '0.75rem' }}>#{booking.batchId || booking._id.substring(0, 8)}</span>
                        </h5>
                        <div className="mt-1">
                            <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                Total: ₱{(editMode ? liveTotalPrice : storedTotalPrice).toLocaleString()}
                                {editMode && liveTotalPrice !== storedTotalPrice && storedTotalPrice > 0 && (
                                    <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.75rem' }}>(was ₱{storedTotalPrice.toLocaleString()})</span>
                                )}
                            </span>
                        </div>
                    </div>
                    <button type="button" className="btn-close shadow-none ms-auto" onClick={onClose}></button>
                </div>
                <div className="modal-body p-4">
                    <div className="row g-4">
                        {/* LEFT COLUMN: Customer & Edit Form */}
                        <div className="col-md-7 border-end pe-4">
                            <h6 className="fw-bold mb-3 font-poppins" style={{ fontSize: '0.9rem', color: '#23A0CE' }}>CUSTOMER INFORMATION</h6>

                            <div className="row g-3">
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>First Name</label>
                                    <input type="text" name="firstName" className="form-control form-control-sm shadow-none" value={formData.firstName} onChange={handleChange} disabled={!editMode} />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Last Name</label>
                                    <input type="text" name="lastName" className="form-control form-control-sm shadow-none" value={formData.lastName} onChange={handleChange} disabled={!editMode} />
                                </div>
                                <div className="col-12 mb-2">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Email Address</label>
                                    <input type="email" name="emailAddress" className="form-control form-control-sm shadow-none" value={formData.emailAddress} onChange={handleChange} disabled={!editMode} />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Phone</label>
                                    <input type="text" name="phoneNumber" className="form-control form-control-sm shadow-none" value={formData.phoneNumber} onChange={handleChange} disabled={!editMode} />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Vehicle Type</label>
                                    {editMode && dynamicPricingData.length > 0 ? (
                                        <select name="vehicleType" className="form-select form-select-sm shadow-none" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value, serviceType: [] })}>
                                            <option value="" disabled>-- Select Vehicle --</option>
                                            {dynamicPricingData.map(v => (
                                                <option key={v._id} value={v.vehicleType}>{v.vehicleType}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" name="vehicleType" className="form-control form-control-sm shadow-none" value={formData.vehicleType} onChange={handleChange} disabled={!editMode} />
                                    )}
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Sandigan Membership Card (SMC)</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input type="text" name="smcId" className="form-control form-control-sm shadow-none font-monospace text-uppercase" placeholder="Scan SMC ID" value={formData.smcId} onChange={handleChange} disabled={!editMode} />
                                        <div className="d-flex align-items-center gap-2">
                                            {editMode && (
                                                <button type="button" className="btn btn-sm btn-outline-primary shadow-none px-2" onClick={() => handleSMCVerification()} disabled={isVerifyingSMC || !formData.smcId}>
                                                    {isVerifyingSMC ? '...' : 'Verify'}
                                                </button>
                                            )}
                                            {smcDiscountInfo.isValid && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-save shadow-none px-2"
                                                    onClick={() => {
                                                        const currentInput = formData.smcId?.trim().toUpperCase();
                                                        if (currentInput) {
                                                            onSMCById && onSMCById(currentInput);
                                                        }
                                                    }}>
                                                    View
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {smcDiscountInfo.isValid && <small className="text-success d-block mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>SMC Active: {smcDiscountInfo.percentage}% Off</small>}
                                    {smcDiscountInfo.error && <small className="text-danger d-block mt-1" style={{ fontSize: '0.7rem' }}>{smcDiscountInfo.error}</small>}
                                </div>
                                <div className="col-12 col-sm-6 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Promo Code</label>
                                    <div className="d-flex gap-2">
                                        <input type="text" name="promoCode" className="form-control form-control-sm shadow-none font-monospace text-uppercase" placeholder="Enter Code" value={formData.promoCode} onChange={handleChange} disabled={!editMode} />
                                        {editMode && (
                                            <button type="button" className="btn btn-sm btn-outline-primary shadow-none px-2" onClick={() => handlePromoVerification()} disabled={isVerifyingPromo || !formData.promoCode}>
                                                {isVerifyingPromo ? '...' : 'Apply'}
                                            </button>
                                        )}
                                    </div>
                                    {promoInfo.isValid && <small className="text-success d-block mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>Promo Active: -₱{promoInfo.discount.toLocaleString()}</small>}
                                    {promoInfo.error && <small className="text-danger d-block mt-1" style={{ fontSize: '0.7rem' }}>{promoInfo.error}</small>}
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Services Requested</label>
                                    {(!editMode && !activeVehicleData) ? (
                                        <div className="d-flex flex-wrap gap-2">
                                            {formData.serviceType.map(s => (
                                                <span key={s} className="badge bg-primary px-3 py-2 rounded-pill font-poppins">{s}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="row row-cols-2 row-cols-lg-4 g-2 mb-2">
                                                {activeVehicleData?.services?.map(service => {
                                                    const isSelected = formData.serviceType.includes(service.name);
                                                    return (
                                                        <div className="col" key={service.name}>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleService(service.name)}
                                                                disabled={!editMode}
                                                                className={`btn rounded-pill px-3 w-100 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`}
                                                                style={{ opacity: isSelected || editMode ? 1 : 0.5, fontSize: '0.8rem' }}>
                                                                {isSelected && <span className="me-1">✓</span>} {service.name}
                                                                {editMode && <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>₱{service.price}</span>}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <label className="form-label brand-primary mb-1" style={{ fontSize: '0.8rem' }} >Add-ons</label>
                                            {activeVehicleData?.addons?.length > 0 && (
                                                <div className="row row-cols-2 row-cols-lg-2 g-2">
                                                    {activeVehicleData.addons.map(addon => {
                                                        const isSelected = formData.serviceType.includes(addon.name);
                                                        return (
                                                            <div className="col" key={addon.name}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleService(addon.name)}
                                                                    disabled={!editMode}
                                                                    className={`btn rounded-pill px-3 w-100 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`}
                                                                    style={{ opacity: isSelected || editMode ? 1 : 0.5, fontSize: '0.8rem' }}>
                                                                    {isSelected && <span className="me-1">✓</span>} {addon.name}
                                                                    {editMode && <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>₱{addon.price}</span>}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {/* Purchased Retail Products — always visible */}
                                <div className="col-12">
                                    <label className="form-label brand-primary mb-1 mt-1" style={{ fontSize: '0.8rem' }}>Retail / Products Bought</label>
                                    <div className="d-flex flex-column gap-2">
                                        {formData.purchasedProducts.length === 0 && !editMode && (
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>None</span>
                                        )}
                                        {formData.purchasedProducts.map((p, idx) => (
                                            <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)' }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-secondary text-truncate" style={{ maxWidth: '130px' }}>{p.productName}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--theme-content-text)' }}>x{p.quantity} (₱{(p.price * p.quantity).toLocaleString()})</span>
                                                </div>
                                                {editMode && <button type="button" className="btn btn-sm text-danger p-0 border-0 shadow-none" onClick={() => removeRetailProduct(idx)}>✖</button>}
                                            </div>
                                        ))}
                                        {editMode && products.length > 0 && (
                                            <div className="d-flex gap-2 align-items-center mt-1">
                                                <select className="form-select form-select-sm shadow-none w-auto flex-grow-1" id="retailSelect" style={{ fontSize: '0.75rem' }}>
                                                    <option value="">-- Add Retail Item --</option>
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
                                                    id="retailQty"
                                                    className="form-control form-control-sm shadow-none text-center"
                                                    style={{ width: '55px', fontSize: '0.75rem' }}
                                                    defaultValue="1"
                                                    min="1"
                                                    max={99}
                                                />
                                                <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem' }} onClick={addRetailProduct}>Add</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Time Slot</label>
                                    <select name="bookingTime" className="form-select form-select-sm shadow-none" value={formData.bookingTime} onChange={handleChange} disabled={!editMode}>
                                        {availableHours.map((hourObj) => (
                                            <option key={hourObj.raw} value={hourObj.raw}>
                                                {hourObj.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Assigned Detailer</label>
                                    <select
                                        name="assignedTo"
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
                                        disabled={!editMode}
                                    >
                                        <option value="">—- Unassigned -—</option>
                                        {detailers.map(d => (
                                            <option key={d._id} value={d._id}>{d.fullName}</option>
                                        ))}
                                    </select>
                                    {!editMode && !formData.assignedTo && (
                                        <small className="text-warning d-block mt-1" style={{ fontSize: '0.72rem' }}>⚠ No detailer assigned</small>
                                    )}
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Assigned Bay</label>
                                    <select
                                        name="bayId"
                                        className="form-select form-select-sm shadow-none"
                                        value={formData.bayId}
                                        onChange={handleChange}
                                        disabled={!editMode}
                                    >
                                        <option value="">—- Unassigned -—</option>
                                        {bays.map(b => (
                                            <option key={b._id} value={b._id} disabled={(b.status === 'Maintenance' || b.status === 'Occupied') && b._id !== formData.bayId}>
                                                {b.name} ({b.status === 'Occupied' && b._id !== formData.bayId ? 'Unavailable' : b.status})
                                            </option>
                                        ))}
                                    </select>
                                    {!editMode && !formData.bayId && (
                                        <small className="text-warning d-block mt-1" style={{ fontSize: '0.72rem' }}>⚠ No bay assigned</small>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Logs */}
                        <div className="col-md-5 ps-3">
                            <h6 className="fw-bold mb-3 font-poppins" style={{ fontSize: '0.9rem', color: '#23A0CE' }}>STATUS LOGS</h6>
                            {!booking.statusLogs || booking.statusLogs.length === 0 ? (
                                <p className="text-muted font-poppins" style={{ fontSize: '0.85rem' }}>No status changes yet.</p>
                            ) : (
                                <ul className="list-unstyled mb-0 ms-3">
                                    {booking.statusLogs.map((log, i) => {
                                        const isLast = i === booking.statusLogs.length - 1;

                                        // Determine which icon matches the string
                                        let iconSrc = null;
                                        if (log.status === 'Pending') iconSrc = pendingBooking;
                                        else if (log.status === 'Confirmed') iconSrc = confirmedBooking;
                                        else if (log.status === 'Queued') iconSrc = queuedBooking;
                                        else if (log.status === 'Completed') iconSrc = completedBooking;
                                        else if (log.status === 'In-progress') iconSrc = inProgressBooking;

                                        return (
                                            <li key={i} className="position-relative pb-4" style={{ borderLeft: isLast ? '2px solid transparent' : '2px solid #23A0CE', paddingLeft: '28px' }}>
                                                {/* Central Circle with Icon */}
                                                <div className="position-absolute d-flex align-items-center justify-content-center"
                                                    style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--theme-card-bg)', border: log.status === 'Cancelled' ? '2px solid #dc3545' : '2px solid #23A0CE', left: '-18px', top: '-4px', zIndex: 1 }}>
                                                    {iconSrc ? (
                                                        <img src={iconSrc} alt={log.status} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                                    ) : (
                                                        <span style={{ color: log.status === 'Cancelled' ? '#dc3545' : '#23A0CE', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>
                                                            {log.status === 'Cancelled' ? '×' : '•'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Text Block */}
                                                <div className="fw-bold font-poppins" style={{ fontSize: '0.95rem', color: log.status === 'Cancelled' ? '#dc3545' : 'var(--theme-content-text)', paddingTop: '2px' }}>
                                                    {log.status}
                                                </div>
                                                <div className="font-poppins" style={{ fontSize: '0.78rem', marginTop: '0', color: 'var(--theme-content-text-secondary)' }}>
                                                    {new Date(log.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {durationText && (
                                <div className="mt-2 p-3 rounded-3 d-flex align-items-center gap-2" 
                                    style={{ 
                                        backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                                        border: '1px solid rgba(34, 197, 94, 0.2)', 
                                        color: 'var(--theme-content-text)', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 500 
                                    }}>
                                    <img src={bookDuration} alt="" style={{ width: '24px' }} />
                                    {durationText}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer border-top-0 pb-4 px-4 pt-1 justify-content-end gap-2">
                    {editMode ? (
                        <>
                            <button className="btn btn-light rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={() => setEditMode(false)}>Discard</button>
                            <button className="btn rounded-pill px-4 shadow-sm font-poppins brand-primary" style={{ fontSize: '0.85rem' }} onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        // Hide Edit button entirely for terminal statuses
                        !['Completed', 'Cancelled'].includes(booking.status) && (
                            <button className="btn brand-primary rounded-pill px-4 shadow-sm font-poppins d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }} onClick={() => setEditMode(true)}>
                                <img src={editBooking} alt="" style={{ width: '16px' }} />
                                Edit Details
                            </button>
                        )
                    )}

                    {booking.status === 'Completed' && (
                        <div className="d-flex gap-2">
                            <button className="btn btn-receipt btn-outline-primary rounded-pill px-4 shadow-sm font-poppins d-flex align-items-center gap-2"
                                style={{ fontSize: '0.85rem', borderColor: '#23A0CE', color: 'var(--text-secondary)', backgroundColor: 'var(--brand-primary)' }}
                                onClick={() => onPrint(booking)}>
                                Generate Receipt
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AdminModalWrapper>
    );
};

export default BookingModal;
