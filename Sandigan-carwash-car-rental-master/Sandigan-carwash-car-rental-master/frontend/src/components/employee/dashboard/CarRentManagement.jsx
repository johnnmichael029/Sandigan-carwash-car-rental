import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import TopHeader from './TopHeader';
import { API_BASE, SOCKET_URL, authHeaders } from '../../../api/config';
import { io } from 'socket.io-client';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';
import getPaginationRange from '../../admin/getPaginationRange';
import refreshIcon from '../../../assets/icon/refresh.png';
import refreshDarkThemeIcon from '../../../assets/icon/refresh-dark-theme.png';
import pendingIcon from '../../../assets/icon/pending-booking-brand.png';
import ReceiptModal from './ReceiptModal';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';
import editBooking from '../../../assets/icon/edit-book.png';


const STATUS_COLORS = {
    Pending: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    Confirmed: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    Active: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    Returned: { bg: 'rgba(156,163,175,0.1)', text: '#9ca3af', border: 'rgba(156,163,175,0.2)' },
    Cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

const StatusBadge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.Pending;
    return (
        <span style={{
            background: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`,
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
        }}>
            {status}
        </span>
    );
};

/* ─── Detail Modal ─── */
const RentalDetailModal = ({ rental, onClose, onStatusChange, onReceipt, isDark }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ ...rental });
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [paymentData, setPaymentData] = useState(rental.payment || null);

    const handleSendPickupReminder = async () => {
        if (!rental.emailAddress) {
            Swal.fire({ title: 'No Email', text: 'This customer has no email address on record.', icon: 'warning', background: 'var(--theme-modal-bg)', color: 'var(--theme-content-text)' });
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: 'Send Pickup Reminder?',
            text: `Send an email reminder to ${rental.fullName} (${rental.emailAddress}) that their vehicle is ready for pickup?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#eab308',
            confirmButtonText: 'Yes, Send Reminder',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
        });
        if (!isConfirmed) return;

        setIsSendingReminder(true);
        try {
            const res = await axios.post(
                `${API_BASE}/car-rentals/${rental._id}/pickup-reminder`,
                {},
                { headers: authHeaders(), withCredentials: true }
            );
            if (onStatusChange && res.data.rental) onStatusChange(res.data.rental);
            Swal.fire({
                icon: 'success',
                title: 'Reminder Sent!',
                text: `Pickup reminder has been sent to ${rental.emailAddress}`,
                background: 'var(--theme-modal-bg)',
                color: 'var(--theme-content-text)',
                timer: 2500,
                showConfirmButton: false,
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to send pickup reminder.', 'error');
        } finally {
            setIsSendingReminder(false);
        }
    };

    const getCurrentEmployeeName = () => {
        try {
            const stored = localStorage.getItem('employee');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.fullName || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() || 'Staff';
            }
        } catch (_) { }
        return 'Staff';
    };

    useEffect(() => {
        setPaymentData(rental.payment || null);
    }, [rental]);

    const handlePreviewProof = (imageSrc) => {
        if (!imageSrc) return;
        Swal.fire({
            imageUrl: imageSrc,
            imageAlt: 'Payment Screenshot',
            showConfirmButton: false,
            showCloseButton: true,
            background: 'var(--theme-modal-bg)',
            width: '90%',
            maxWidth: '650px',
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                image: 'rounded-3 img-fluid'
            }
        });
    };

    const handleVerifyRentalPayment = async (action) => {
        let rejectionReason = null;
        if (action === 'reject') {
            const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Reject Payment?',
                input: 'textarea',
                inputPlaceholder: 'Reason for rejection (e.g. invalid reference number, unclear screenshot)...',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Reject Payment',
                background: 'var(--theme-modal-bg)',
                color: 'var(--theme-content-text)',
                inputValidator: (val) => (!val?.trim() ? 'Please provide a rejection reason.' : null)
            });
            if (!isConfirmed || !reason) return;
            rejectionReason = reason;
        } else {
            const { isConfirmed } = await Swal.fire({
                title: 'Verify & Confirm Payment?',
                text: 'Mark this down payment as verified and notify the customer?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#22c55e',
                confirmButtonText: 'Yes, Verify Payment',
                background: 'var(--theme-modal-bg)',
                color: 'var(--theme-content-text)',
            });
            if (!isConfirmed) return;
        }

        setIsVerifyingPayment(true);
        try {
            const res = await axios.patch(
                `${API_BASE}/car-rentals/${rental._id}/payment-verify`,
                { action, rejectionReason },
                { headers: authHeaders(), withCredentials: true }
            );
            const currentEmployeeName = getCurrentEmployeeName();
            const updatedPayment = res.data.payment || {
                ...paymentData,
                status: action === 'verify' ? 'Verified' : 'Rejected',
                verifiedByName: currentEmployeeName,
                verifiedBy: currentEmployeeName
            };
            setPaymentData(updatedPayment);
            if (onStatusChange && res.data.rental) onStatusChange(res.data.rental);
            Swal.fire({ icon: 'success', title: `Payment ${action === 'verify' ? 'verified' : 'rejected'}!`, toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525' });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update payment', 'error');
        } finally {
            setIsVerifyingPayment(false);
        }
    };

    useEffect(() => {
        if (rental) {
            setEditForm({
                ...rental,
                rentalStartDate: rental.rentalStartDate ? rental.rentalStartDate.split('T')[0] : '',
                returnDate: rental.returnDate ? rental.returnDate.split('T')[0] : ''
            });
        }
    }, [rental]);

    const handleStatusUpdate = async (newStatus) => {
        let cancellationReason = null;
        if (newStatus === 'Cancelled') {
            const { value: reason } = await Swal.fire({
                title: 'Cancellation Reason',
                input: 'textarea',
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)',
                confirmButtonColor: '#ef4444',
                showCancelButton: true
            });
            if (!reason) return;
            cancellationReason = reason;
        } else {
            const result = await Swal.fire({
                title: `Update to ${newStatus}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#23A0CE',
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)'
            });
            if (!result.isConfirmed) return;
        }

        setIsUpdating(true);
        try {
            const res = await axios.patch(`${API_BASE}/car-rentals/${rental._id}/status`, { status: newStatus, cancellationReason }, { headers: authHeaders(), withCredentials: true });
            onStatusChange(res.data);
            Swal.fire({ icon: 'success', title: 'Updated!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525' });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveEdit = async () => {
        setIsUpdating(true);
        try {
            const res = await axios.put(`${API_BASE}/car-rentals/${rental._id}`, editForm, { headers: authHeaders(), withCredentials: true });
            onStatusChange(res.data);
            setIsEditing(false);
            Swal.fire({ icon: 'success', title: 'Saved!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525' });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to save', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const nextActions = {
        Pending: [{ label: 'Confirm', status: 'Confirmed' }, { label: '✕ Cancel', status: 'Cancelled' }],
        Confirmed: [{ label: 'Mark Active', status: 'Active' }, { label: '✕ Cancel', status: 'Cancelled' }],
        Active: [{ label: 'Mark Returned', status: 'Returned' }],
    };
    const actions = nextActions[rental.status] || [];

    const fieldRow = (label, val, fieldKey = null) => {
        const isEditingField = isEditing && fieldKey;
        return (
            <div className="d-flex justify-content-between py-2 align-items-center" style={{ borderBottom: '1px solid var(--theme-content-border)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--theme-content-text-secondary)', minWidth: '100px' }}>{label}</span>
                {isEditingField ? (
                    <input
                        type={fieldKey.toLowerCase().includes('date') ? 'date' : 'text'}
                        className="form-control form-control-sm text-end"
                        style={{ background: 'var(--theme-hover-bg)', border: 'none', color: 'var(--theme-content-text)', fontWeight: 600, width: '60%' }}
                        value={editForm[fieldKey] || ''}
                        onChange={(e) => setEditForm({ ...editForm, [fieldKey]: e.target.value })}
                    />
                ) : (
                    <span style={{ color: 'var(--theme-content-text)', fontWeight: 600, textAlign: 'right' }}>{val || '—'}</span>
                )}
            </div>
        );
    };

    // Helper for Timeline Icons
    const getStatusIcon = (status) => {
        const icons = {
            Pending: pendingIcon,
            Confirmed: pendingIcon, // Example: import confirmIcon from '...'
            Active: pendingIcon,    // Example: import activeIcon from '...'
            Returned: pendingIcon // Example: import completedIcon from '...'
        };
        const selectedIcon = icons[status] || pendingIcon;
        return <img src={selectedIcon} alt={status} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
    };

    return (
        <AdminModalWrapper show={!!rental} onClose={onClose} size="lg">
            <div className="modal-content rounded-4 shadow border-0" style={{ background: 'var(--theme-modal-bg)' }}>
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-start flex-wrap gap-2">
                    <div>
                        <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>
                            Rental Details <span className="fw-normal text-dark-secondary" style={{ fontSize: '0.75rem' }}>#{rental.rentalId || rental._id.substring(0, 8)}</span>
                        </h5>
                        <div className="mt-1">
                            <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                Total: ₱{rental.estimatedTotal?.toLocaleString()}
                            </span>
                            <span className="ms-2">
                                <StatusBadge status={rental.status} />
                            </span>
                        </div>
                    </div>
                    <button type="button" className="btn-close shadow-none ms-auto" onClick={onClose}></button>
                </div>

                <div className="p-4 pt-3 ">
                    <div className="row g-4 overflow-hidden">
                        {/* Details Section (Left) */}
                        <div className="col-md-7 border-end" >
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h6 className="text-uppercase fw-bold mb-0" style={{ color: '#23A0CE', fontSize: '0.65rem', letterSpacing: '1px' }}>Customer Information</h6>
                            </div>

                            <div className="row g-3">
                                {/* Name Field */}
                                <div className="col-12">
                                    <label className="text-muted mb-1 d-block" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
                                    {isEditing ? (
                                        <input type="text" className="form-control form-control-sm shadow-none" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
                                    ) : (
                                        <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }}>{rental.fullName}</div>
                                    )}
                                </div>

                                {/* Contact & Vehicle row */}
                                <div className="col-6">
                                    <label className="text-muted mb-1 d-block" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phone / Contact</label>
                                    {isEditing ? (
                                        <input type="text" className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }} value={editForm.contactNumber} onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })} />
                                    ) : (
                                        <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }}>{rental.contactNumber}</div>
                                    )}
                                </div>
                                <div className="col-6">
                                    <label className="text-muted mb-1 d-block" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Vehicle Type</label>
                                    <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }}>{rental.vehicleName}</div>
                                </div>

                                {/* Destination */}
                                <div className="col-12">
                                    <label className="text-muted mb-1 d-block" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Destination</label>
                                    {isEditing ? (
                                        <input type="text" className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }} value={editForm.destination} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} />
                                    ) : (
                                        <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }}>{rental.destination}</div>
                                    )}
                                </div>

                                <div className="col-12 text-start">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Customer Address </label>
                                    {isEditing ? (
                                        <input type="text" className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                                    ) : (
                                        <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)' }}>{rental.address}</div>
                                    )}
                                </div>


                                {/* Notes */}
                                <div className="col-12">
                                    <label className="text-muted mb-1 d-block" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Special Notes / Instructions</label>
                                    {isEditing ? (
                                        <textarea className="form-control form-control-sm shadow-none" rows="2" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontWeight: 500, fontSize: '0.85rem' }} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Add any special requirements..." />
                                    ) : (
                                        <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontWeight: 500, fontSize: '0.85rem', minHeight: '40px' }}>{rental.notes || 'No special notes provided.'}</div>
                                    )}
                                </div>

                                <div className="col-12 mt-4">
                                    <h6 className="text-uppercase fw-bold mb-3" style={{ color: '#23A0CE', fontSize: '0.65rem', letterSpacing: '1px' }}>Rental Period</h6>
                                    <div className="row g-2">
                                        <div className="col-5">
                                            <label className="text-muted mb-1 d-block" style={{ fontSize: '0.7rem' }}>Pick-up Date</label>
                                            {isEditing ? (
                                                <input type="date" className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontWeight: 600 }} value={editForm.rentalStartDate} onChange={(e) => setEditForm({ ...editForm, rentalStartDate: e.target.value })} />
                                            ) : (
                                                <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontSize: '0.85rem' }}>{new Date(rental.rentalStartDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            )}
                                        </div>
                                        <div className="col-5">
                                            <label className="text-muted mb-1 d-block" style={{ fontSize: '0.7rem' }}>Return Date</label>
                                            {isEditing ? (
                                                <input type="date" className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontWeight: 600 }} value={editForm.returnDate} onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })} />
                                            ) : (
                                                <div className="form-control form-control-sm shadow-none" style={{ background: 'var(--theme-hover-bg)', color: 'var(--theme-content-text)', fontSize: '0.85rem' }}>{new Date(rental.returnDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            )}
                                        </div>
                                        <div className="col-2">
                                            <label className="text-muted mb-1 d-block text-center" style={{ fontSize: '0.7rem' }}>Day(s)</label>
                                            <div className="p-2 rounded-2 text-center" style={{ color: '#23A0CE', fontWeight: 800, fontSize: '0.85rem' }}>{rental.rentalDays}</div>
                                        </div>
                                    </div>
                                    {/* Pickup Reminder Notice */}
                                    {rental.pickupReminderSentAt && (
                                        <div className="small mt-2 p-2 rounded-2 d-flex align-items-center justify-content-between" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#fbbf24', fontSize: '0.75rem' }}>
                                            <span>⏰ Pickup reminder sent on {new Date(rental.pickupReminderSentAt).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            {rental.pickupReminderCount > 1 && <span className="badge bg-warning text-dark">{rental.pickupReminderCount}x sent</span>}
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* Timeline Section — right column now split: status logs + payment */}
                        <div className="col-md-5 ps-md-4 position-relative" style={{ borderColor: 'var(--theme-content-border)!important' }}>
                            <p className="text-uppercase fw-bold mb-4" style={{ color: '#23A0CE', fontSize: '0.65rem', letterSpacing: '1px' }}>STATUS LOGS</p>

                            <div className="d-flex flex-column gap-4 position-relative">
                                {/* Optimized Timeline Connector Line */}
                                <div style={{ position: 'absolute', left: '15px', top: '15px', bottom: '15px', width: '2px', background: 'rgba(35,160,206,0.2)', zIndex: 0 }} />

                                {rental.statusLogs?.map((log, i) => (
                                    <div key={i} className="position-relative d-flex gap-3 align-items-start" style={{ zIndex: 1 }}>
                                        <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                            style={{ width: '32px', height: '32px', background: 'var(--theme-card-bg)', border: '2px solid #23A0CE', color: '#23A0CE', flexShrink: 0 }}>
                                            {getStatusIcon(log.status)}
                                        </div>
                                        <div className="flex-fill">
                                            <p className="mb-0 fw-bold" style={{ color: 'var(--theme-content-text)', fontSize: '0.85rem' }}>{log.status}</p>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                {new Date(log.timestamp).toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric', year: '2-digit' })},
                                                {' '}{new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── PAYMENT VERIFICATION PANEL ── */}
                            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--theme-content-border)' }}>
                                <p className="text-uppercase fw-bold mb-3" style={{ color: '#23A0CE', fontSize: '0.65rem', letterSpacing: '1px' }}>PAYMENT</p>
                                {!paymentData || !paymentData.status || paymentData.status === 'none' ? (
                                    <div className="p-3 rounded-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <span style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.82rem' }}>No payment submitted yet.</span>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        {/* Status Badge */}
                                        {(() => {
                                            const st = (paymentData.status || '').toLowerCase();
                                            const isVer = st === 'verified';
                                            const isRej = st === 'rejected';
                                            return (
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Status</span>
                                                    <span style={{
                                                        padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                                        background: isVer ? 'rgba(74,222,128,0.12)' : isRej ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                                        color: isVer ? '#4ade80' : isRej ? '#ef4444' : '#f59e0b',
                                                        border: `1px solid ${isVer ? 'rgba(74,222,128,0.3)' : isRej ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                                                    }}>
                                                        {isVer ? '✓ Verified' : isRej ? '✕ Rejected' : '⏳ Pending Review'}
                                                    </span>
                                                </div>
                                            );
                                        })()}

                                        <div className="d-flex flex-column gap-1 mb-3" style={{ fontSize: '0.8rem' }}>
                                            <div className="d-flex justify-content-between">
                                                <span style={{ color: 'var(--theme-content-text-secondary)' }}>Method</span>
                                                <span style={{ color: 'var(--theme-content-text)', fontWeight: 600 }}>{paymentData.method || '—'}</span>
                                            </div>
                                            {paymentData.referenceNumber && (
                                                <div className="d-flex justify-content-between">
                                                    <span style={{ color: 'var(--theme-content-text-secondary)' }}>Reference No</span>
                                                    <span style={{ color: 'var(--theme-content-text)', fontFamily: 'monospace', fontWeight: 600 }}>{paymentData.referenceNumber}</span>
                                                </div>
                                            )}
                                            {paymentData.amountPaid && (
                                                <div className="d-flex justify-content-between">
                                                    <span style={{ color: 'var(--theme-content-text-secondary)' }}>Down Payment</span>
                                                    <span style={{ color: '#4ade80', fontWeight: 700 }}>₱{paymentData.amountPaid?.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {paymentData.rejectionReason && (
                                                <div className="d-flex justify-content-between text-danger">
                                                    <span>Reason</span>
                                                    <span style={{ fontWeight: 600 }}>{paymentData.rejectionReason}</span>
                                                </div>
                                            )}
                                        </div>

                                        {paymentData.proofImageBase64 && (
                                            <div className="mb-3 text-center">
                                                <div className="small mb-1 text-start" style={{ color: 'var(--theme-content-text-secondary)' }}>Screenshot</div>
                                                <div
                                                    onClick={() => handlePreviewProof(paymentData.proofImageBase64)}
                                                    style={{ cursor: 'pointer', display: 'inline-block' }}
                                                    title="Click to view full image"
                                                >
                                                    <img src={paymentData.proofImageBase64} alt="Proof" style={{ maxHeight: '100px', maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }} />
                                                    <div className="small mt-1 text-info" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Click to view full image</div>
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const st = (paymentData.status || '').toLowerCase();
                                            return (
                                                <div>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm flex-fill fw-bold"
                                                            onClick={() => handleVerifyRentalPayment('verify')}
                                                            disabled={isVerifyingPayment || st === 'verified'}
                                                            style={{ background: st === 'verified' ? 'rgba(74,222,128,0.05)' : 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', borderRadius: '8px' }}
                                                        >
                                                            {isVerifyingPayment ? <span className="spinner-border spinner-border-sm" /> : (st === 'verified' ? '✓ Verified' : '✓ Verify Payment')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm flex-fill fw-bold"
                                                            onClick={() => handleVerifyRentalPayment('reject')}
                                                            disabled={isVerifyingPayment || st === 'rejected'}
                                                            style={{ background: st === 'rejected' ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '8px' }}
                                                        >
                                                            {st === 'rejected' ? '✕ Rejected' : '✕ Reject'}
                                                        </button>
                                                    </div>
                                                    {(paymentData.verifiedBy || paymentData.verifiedByName || st === 'verified' || st === 'rejected') && (() => {
                                                        const verifiedName = paymentData.verifiedByName ||
                                                            (typeof paymentData.verifiedBy === 'object' && paymentData.verifiedBy ? (paymentData.verifiedBy?.fullName || `${paymentData.verifiedBy?.firstName || ''} ${paymentData.verifiedBy?.lastName || ''}`.trim()) : null) ||
                                                            getCurrentEmployeeName();
                                                        return (
                                                            <div className="small mt-2 text-center text-muted" style={{ fontSize: '0.75rem' }}>
                                                                {st === 'verified' ? 'Verified' : 'Updated'} by <strong style={{ color: 'var(--theme-content-text)' }}>{verifiedName}</strong>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer border-top-0 pb-4 px-4 pt-1 justify-content-end gap-2" style={{ background: 'transparent' }}>
                    {isEditing ? (
                        <>
                            <button className="btn btn-light rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={() => setIsEditing(false)}>Discard</button>
                            <button className="btn btn-primary rounded-pill px-4 shadow-sm font-poppins text-white" style={{ fontSize: '0.85rem' }} onClick={handleSaveEdit} disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Rental Update Actions */}
                            {actions.map((act) => (
                                <button key={act.label} className={`btn btn-sm px-4 py-2 fw-bold rounded-pill shadow-none ${act.status === 'Cancelled' ? 'btn-outline-danger' : 'btn-primary text-white'}`} style={{ fontSize: '0.85rem' }} onClick={() => handleStatusUpdate(act.status)} disabled={isUpdating}>
                                    {isUpdating ? '...' : act.label}
                                </button>
                            ))}

                            {/* Send Pickup Reminder Button (for Pending or Confirmed bookings) */}
                            {['Pending', 'Confirmed'].includes(rental.status) && rental.emailAddress && (
                                <button
                                    type="button"
                                    className="btn btn-outline-warning rounded-pill px-4 shadow-sm font-poppins d-flex align-items-center gap-2"
                                    style={{ fontSize: '0.85rem' }}
                                    onClick={handleSendPickupReminder}
                                    disabled={isSendingReminder}
                                >
                                    {isSendingReminder ? <span className="spinner-border spinner-border-sm" /> : 'Send Pickup Reminder'}
                                </button>
                            )}

                            {/* Receipt Button for active/confirmed/returned rentals */}
                            {rental.status !== 'Cancelled' && (
                                <button
                                    className="btn btn-outline-primary rounded-pill px-4 shadow-sm font-poppins d-flex align-items-center gap-2"
                                    style={{ fontSize: '0.85rem', borderColor: '#23A0CE', color: '#23A0CE' }}
                                    onClick={() => onReceipt(rental)}
                                >
                                    Generate Receipt
                                </button>
                            )}

                            {!['Returned', 'Cancelled'].includes(rental.status) && (
                                <button className="btn brand-primary rounded-pill px-4 shadow-sm font-poppins d-flex align-items-center gap-2 border-0" style={{ fontSize: '0.85rem' }} onClick={() => setIsEditing(true)}>
                                    <img src={editBooking} alt="" style={{ width: '16px' }} />
                                    Edit Details
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AdminModalWrapper>
    );
};

/* ═══════════════════════════════════════════
   MAIN CAR RENT MANAGEMENT COMPONENT
═══════════════════════════════════════════ */
const CarRentManagement = ({ employee, isDark }) => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedRental, setSelectedRental] = useState(null);
    const [showReceipt, setShowReceipt] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [fleet, setFleet] = useState([]);

    const fetchRentals = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/car-rentals`, { headers: authHeaders(), withCredentials: true });
            setRentals(res.data);

            const fleetRes = await axios.get(`${API_BASE}/rental-fleet`);
            setFleet(fleetRes.data);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to fetch rentals', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRentals();
    }, []);

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    useEffect(() => {
        const socket = io(SOCKET_URL, { withCredentials: true });

        // Listen for new rental requests submitted via the public booking page
        socket.on('new_rental', async (newRental) => {
            // Add to the top of the list immediately
            setRentals(prev => [newRental, ...prev]);

            // Also refresh fleet — the booked vehicle is now unavailable
            try {
                const fleetRes = await axios.get(`${API_BASE}/rental-fleet`);
                setFleet(fleetRes.data);
            } catch (err) { /* non-critical */ }

            // Show a friendly notification toast
            Swal.fire({
                title: 'New Rental Request!',
                text: `${newRental.fullName} requested a ${newRental.vehicleName}`,
                icon: 'info',
                toast: true,
                position: 'top-end',
                timer: 4000,
                showConfirmButton: false,
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)'
            });
        });

        // Listen for realtime fleet availability updates
        socket.on('fleet_updated', async () => {
            try {
                const fleetRes = await axios.get(`${API_BASE}/rental-fleet`);
                setFleet(fleetRes.data);
            } catch (err) {
                console.error('[SOCKET_SYNC_ERR] Failed to update fleet list:', err);
            }
        });

        return () => socket.disconnect();
    }, []);

    const filtered = rentals.filter(r => {
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        const q = search.toLowerCase();
        const matchSearch = !q || r.rentalId?.toLowerCase().includes(q)
            || r.fullName?.toLowerCase().includes(q)
            || r.vehicleName?.toLowerCase().includes(q)
            || r.destination?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRentals = filtered.slice(startIndex, startIndex + itemsPerPage);
    const paginationRange = getPaginationRange(currentPage, totalPages);

    const kpi = () => ({
        Pending: rentals.filter(r => r.status === 'Pending').length,
        Confirmed: rentals.filter(r => r.status === 'Confirmed').length,
        Active: rentals.filter(r => r.status === 'Active').length,
        Returned: rentals.filter(r => r.status === 'Returned').length,
        Cancelled: rentals.filter(r => r.status === 'Cancelled').length,
    });

    const counts = kpi();

    const kpiCards = [
        { title: 'Pending Requests', value: counts.Pending, color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)', dot: '#f59e0b', icon: '📥', desc: 'Awaiting action' },
        { title: 'Confirmed Bookings', value: counts.Confirmed, color: '#3b82f6', bg: 'linear-gradient(135deg,#3b82f615,#3b82f605)', dot: '#3b82f6', icon: '✅', desc: 'Approved for pickup' },
        { title: 'Active Rentals', value: counts.Active, color: '#22c55e', bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)', dot: '#22c55e', icon: '🚗', desc: 'Currently with clients' },
        { title: 'Returned Vehicles', value: counts.Returned, color: '#9ca3af', bg: 'linear-gradient(135deg,#9ca3af15,#9ca3af05)', dot: '#9ca3af', icon: '🗓️', desc: 'Completed bookings' },
    ];

    const handleStatusChange = (updatedRental) => {
        setRentals(prev => prev.map(r => r._id === updatedRental._id ? updatedRental : r));
        setSelectedRental(updatedRental);
    };

    return (
        <div>
            <TopHeader
                employee={employee}
                title="Car Rental Management"
                subtitle="Track and manage all active car rental requests"
                isDark={isDark}
            />

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {kpiCards.map((card, idx) => (
                    <div className="col-6 col-md-3" key={idx}>
                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden position-relative" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                            <div className="p-3 position-relative">
                                {/* Dot indicator */}
                                <div className="position-absolute top-0 end-0 p-3">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                </div>
                                {/* Icon */}
                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                    style={{ width: '40px', height: '40px', background: card.bg, color: card.color, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {card.icon}
                                </div>
                                {/* Label */}
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                    {card.title}
                                </p>
                                {/* Value */}
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.5rem', lineHeight: 1 }}>
                                    {loading ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : card.value.toLocaleString()}
                                </h3>
                                {/* Description */}
                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="d-flex flex-col flex-md-row align-items-start align-items-md-center gap-3 mb-4 flex-wrap">
                <SharedSearchBar
                    placeholder="Search by ID, Customer, Vehicle..."
                    onDebouncedSearch={(val) => setSearch(val)}
                    width="300px"
                />

                <div className="d-flex gap-2 flex-wrap">
                    {['All', 'Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className="btn btn-sm"
                            style={{
                                background: statusFilter === s ? '#23A0CE' : 'var(--theme-card-bg)',
                                color: statusFilter === s ? '#fff' : 'var(--theme-content-text-secondary)',
                                border: `1px solid ${statusFilter === s ? '#23A0CE' : 'var(--theme-content-border)'}`,
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                padding: '5px 14px',
                                fontWeight: 600
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="ms-md-auto d-flex gap-2">
                    <button className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                        onClick={() => setIsCreateModalOpen(true)}>
                        + Rental
                    </button>
                    <button onClick={fetchRentals} className="btn btn-sm d-flex align-items-center justify-content-center shadow-sm" style={{ height: '36px', width: '36px', borderRadius: '8px', background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', color: 'var(--theme-content-text)' }}>
                        <img src={isDark ? refreshDarkThemeIcon : refreshIcon} alt="Refresh" style={{ width: '16px', height: '16px' }} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="mt-2 text-muted">Fetching rentals...</p>
                    </div>
                ) : paginatedRentals.length === 0 ? (
                    <div className="text-center py-5">
                        <p className="text-muted">No rental records found.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead style={{ background: 'rgba(35,160,206,0.05)' }}>
                                <tr>
                                    <th className="ps-4 border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Rental ID</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Customer</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Vehicle</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Rental Period</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Day(s)</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Est. Total</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Destination</th>
                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                                    <th className="pe-4 border-0 text-end font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRentals.map((r) => (
                                    <tr key={r._id}>
                                        <td className="ps-4" style={{ color: '#23A0CE', fontSize: '0.8rem', fontWeight: 700 }}>{r.rentalId}</td>
                                        <td>
                                            <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>
                                                {r.fullName}
                                                {r.pickupReminderSentAt && (
                                                    <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.62rem', fontWeight: 600 }}>⏰ Reminder Sent</span>
                                                )}
                                            </div>
                                            <small style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.75rem' }}>{r.contactNumber}</small>
                                        </td>
                                        <td >{r.vehicleName}</td>
                                        <td style={{ color: 'var(--theme-content-text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                            {new Date(r.rentalStartDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                            {' – '}
                                            {new Date(r.returnDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {['Pending', 'Confirmed'].includes(r.status) && new Date(r.rentalStartDate) <= new Date() && (
                                                <div className="text-warning fw-bold mt-1" style={{ fontSize: '0.7rem' }}>
                                                    ⚠️ Due for Pickup
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">{r.rentalDays}d</td>
                                        <td style={{ color: '#23A0CE', fontWeight: 700 }}>₱{r.estimatedTotal?.toLocaleString()}</td>
                                        <td style={{ color: 'var(--theme-content-text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.destination}</td>
                                        <td><StatusBadge status={r.status} /></td>
                                        <td className="pe-4 text-end">
                                            <button
                                                onClick={() => setSelectedRental(r)}
                                                style={{ background: 'rgba(35,160,206,0.1)', border: '1px solid rgba(35,160,206,0.3)', color: '#23A0CE', borderRadius: '8px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3" style={{ borderTop: '1px solid var(--theme-content-border)' }}>
                        <div className="text-muted small">
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} requests
                        </div>
                        <nav>
                            <ul className="pagination pagination-sm mb-0 gap-1">
                                {/* Prev */}
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link border-0 rounded-pill shadow-none" onClick={() => setCurrentPage(prev => prev - 1)} style={{ background: 'transparent', color: 'var(--theme-content-text)' }}>
                                        &larr;
                                    </button>
                                </li>

                                {/* Range */}
                                {paginationRange.map((p, idx) => (
                                    <li key={idx} className={`page-item ${p === currentPage ? 'active' : ''} ${p === '...' ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link border-0 rounded-circle shadow-none d-flex align-items-center justify-content-center"
                                            onClick={() => typeof p === 'number' && setCurrentPage(p)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                background: p === currentPage ? '#23A0CE' : 'transparent',
                                                color: p === currentPage ? '#fff' : 'var(--theme-content-text)',
                                                fontWeight: p === currentPage ? 700 : 400
                                            }}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ))}

                                {/* Next */}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link border-0 rounded-pill shadow-none" onClick={() => setCurrentPage(prev => prev + 1)} style={{ background: 'transparent', color: 'var(--theme-content-text)' }}>
                                        &rarr;
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRental && (
                <RentalDetailModal
                    rental={selectedRental}
                    onClose={() => setSelectedRental(null)}
                    onStatusChange={handleStatusChange}
                    onReceipt={(r) => {
                        setShowReceipt(r);
                    }}
                    isDark={isDark}
                />
            )}

            {/* Create Rental Modal */}
            {isCreateModalOpen && (
                <CreateRentalModal
                    fleet={fleet}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={(newRental) => {
                        setRentals([newRental, ...rentals]);
                        setIsCreateModalOpen(false);
                    }}
                />
            )}

            {/* Receipt Modal */}
            {showReceipt && (
                <ReceiptModal
                    booking={showReceipt}
                    onClose={() => setShowReceipt(null)}
                    isDark={isDark}
                />
            )}
        </div>
    );
};

const CreateRentalModal = ({ fleet, onClose, onSuccess, rental }) => {
    const [form, setForm] = useState({
        fullName: '', contactNumber: '', emailAddress: 'walkin@sandigan.com', address: 'Walk-in',
        vehicleId: '', rentalStartDate: '', returnDate: '', destination: '', notes: '',
        requirementsAcknowledged: true
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE}/car-rentals`, form, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ icon: 'success', title: 'Created!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            onSuccess(res.data.rental);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create rental.', 'error');
        } finally {
            setSubmitting(false);
        }
    };
    let liveEstimatedTotal = 0;
    if (form.vehicleId && form.rentalStartDate && form.returnDate) {
        const vehicle = fleet.find(v => v._id === form.vehicleId);
        if (vehicle) {
            const start = new Date(form.rentalStartDate);
            const end = new Date(form.returnDate);
            if (end > start) {
                const diffMs = end - start;
                const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                liveEstimatedTotal = days * vehicle.pricePerDay;
            }
        }
    }
    const nowLocal = new Date();
    nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
    const minDateTime = nowLocal.toISOString().slice(0, 16);

    return (
        <AdminModalWrapper show={true} onClose={onClose} size="lg" >
            <div className="modal-content rounded-4 shadow border-0" style={{ background: 'var(--theme-modal-bg)' }}>
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-center flex-wrap gap-2">
                    <div className="me-auto">
                        <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>Create New Rental</h5>
                        <div className="mt-1">
                            <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                Estimated Total: ₱{liveEstimatedTotal.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button type="button" className="btn-close shadow-none ms-auto" onClick={onClose}></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body p-4 pt-4">
                    <div className="row g-3">
                        <div className="col-md-6 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Full Name </label>
                            <input required type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Customer name" />
                        </div>
                        <div className="col-md-6 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Contact Number </label>
                            <input required type="text" className="form-control" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="e.g. 09123456789" />
                        </div>

                        <div className="col-md-12 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Vehicle </label>
                            <select required className="form-select" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                                <option value="">Select Vehicle...</option>
                                {fleet.map(v => (
                                    <option key={v._id} value={v._id}>{v.vehicleName} ({v.vehicleType}) - ₱{v.pricePerDay}/day - {v.isAvailable ? 'AVAILABLE' : 'RESERVED'}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Pick-up Date </label>
                            <input required type="datetime-local" className="form-control" min={minDateTime} value={form.rentalStartDate} onChange={e => setForm({ ...form, rentalStartDate: e.target.value })} />
                        </div>
                        <div className="col-md-6 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Return Date </label>
                            <input required type="datetime-local" className="form-control" min={form.rentalStartDate || minDateTime} value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} />
                        </div>

                        <div className="col-12 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Destination </label>
                            <input required type="text" className="form-control" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Manila, Tagaytay" />
                        </div>

                        <div className="col-12 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Customer Address </label>
                            <input required type="text" className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="e.g. 123 Rizal St., Quezon City" />
                        </div>

                        <div className="col-12 text-start">
                            <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Special Notes (Optional)</label>
                            <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes?" />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                        <button type="submit" className="btn btn-save px-4 rounded-pill shadow-sm py-2 text-white fw-bold" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminModalWrapper>
    );
};

export default CarRentManagement;
