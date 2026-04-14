import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../../api/config';
import { swrFetcher, SWR_CONFIG } from '../../../api/swrFetcher';
import { TableSkeleton } from '../../SkeletonLoaders';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import SharedSearchBar from '../shared/SharedSearchBar';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';
import getPaginationRange from '../getPaginationRange';

const SOCKET_URL = API_BASE.replace('/api', '');

const PER_PAGE = 10;

// Same palette as mobile app getStatusColor
const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'completed':   return { bg: '#22c55e20', text: '#22c55e', border: '#22c55e50' };
        case 'pending':     return { bg: '#f59e0b20', text: '#f59e0b', border: '#f59e0b50' };
        case 'confirmed':   return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f650' };
        case 'queued':      return { bg: '#c023ce20', text: '#c023ce', border: '#c023ce50' };
        case 'cancelled':   return { bg: '#ef444420', text: '#ef4444', border: '#ef444450' };
        case 'in progress': return { bg: '#23A0CE20', text: '#23A0CE', border: '#23A0CE50' };
        case 'in-progress': return { bg: '#ce672320', text: '#ce6723', border: '#ce672350' };
        case 'active':      return { bg: '#22c55e20', text: '#22c55e', border: '#22c55e50' };
        case 'returned':    return { bg: '#9ca3af20', text: '#9ca3af', border: '#9ca3af50' };
        default:            return { bg: 'var(--theme-badge-muted-bg)', text: 'var(--theme-content-text-secondary)', border: 'transparent' };
    }
};

const MobileCustomersModule = ({ isDark }) => {
    const { data, isLoading, mutate } = useSWR('/customer-auth/all', swrFetcher, SWR_CONFIG);
    const customers = data || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // ── KPI Summary ────────────────────────────────────────────────────────────
    const totalRegistered = customers.length;
    const thisMonthCount = useMemo(() => {
        const now = new Date();
        return customers.filter(c => {
            const created = new Date(c.createdAt);
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;
    }, [customers]);
    const withBookings = customers.filter(c => c.bookingCount > 0).length;
    const noBookings = customers.filter(c => c.bookingCount === 0).length;

    // ── Search & Filter ────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return customers.filter(c =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.phone || '').includes(term)
        );
    }, [customers, searchTerm]);

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

    useEffect(() => { setPage(1); }, [searchTerm]);

    // 🔴 Real-time: Socket.io listener for new mobile registrations
    useEffect(() => {
        const socket = io(SOCKET_URL, { withCredentials: true });

        socket.on('new_mobile_customer', (newCustomer) => {
            mutate(prev => {
                if (!prev) return [{ ...newCustomer, bookingCount: 0 }];
                // Prevent duplicates
                const exists = prev.some(c => c._id === newCustomer._id);
                if (exists) return prev;
                return [{ ...newCustomer, bookingCount: 0 }, ...prev];
            }, false); // false = don't revalidate from server, use local data
        });

        return () => socket.disconnect();
    }, [mutate]);

    // ── Open History Modal ─────────────────────────────────────────────────────
    const fetchHistory = async (customer) => {
        if (!customer) return;
        setIsLoadingHistory(true);
        try {
            const res = await axios.get(`${API_BASE}/customer-auth/${customer._id}/bookings`, {
                headers: authHeaders(), withCredentials: true
            });
            setCustomerHistory(res.data);
        } catch (err) {
            setCustomerHistory({ bookings: [], customer });
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleViewHistory = (customer) => {
        setSelectedCustomer(customer);
        setCustomerHistory(null);
        fetchHistory(customer);
    };

    // ── Real-time: Refetch history when selected customer has new activity ─────
    useEffect(() => {
        if (!selectedCustomer) return;
        const socket = io(SOCKET_URL, { withCredentials: true });

        const handleBookingEvent = (data) => {
            // Match by email (most reliable cross-collection key)
            const email = data.emailAddress || data.email;
            if (email && email.toLowerCase() === selectedCustomer.email?.toLowerCase()) {
                fetchHistory(selectedCustomer);
                mutate(); // also refresh the customer list counts
            }
        };

        socket.on('new_booking',   handleBookingEvent);
        socket.on('update_booking',handleBookingEvent);
        socket.on('new_rental',    handleBookingEvent);
        socket.on('update_rental', handleBookingEvent);

        return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCustomer?._id]);

    const kpiCards = [
        {
            title: 'Total Registered',
            value: totalRegistered,
            icon: '📱',
            color: '#23A0CE',
            bg: 'linear-gradient(135deg,#23A0CE15,#23A0CE05)',
            dot: '#23A0CE',
            desc: 'All app account holders',
            isCount: true
        },
        {
            title: 'New This Month',
            value: thisMonthCount,
            icon: '🆕',
            color: '#22c55e',
            bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)',
            dot: '#22c55e',
            desc: 'Signups in current month',
            isCount: true
        },
        {
            title: 'Active Bookers',
            value: withBookings,
            icon: '📅',
            color: '#8b5cf6',
            bg: 'linear-gradient(135deg,#8b5cf615,#8b5cf605)',
            dot: '#8b5cf6',
            desc: 'Customers who booked',
            isCount: true
        },
        {
            title: 'No Bookings Yet',
            value: noBookings,
            icon: '💤',
            color: '#f59e0b',
            bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)',
            dot: '#f59e0b',
            desc: 'Registered but inactive',
            isCount: true
        },
    ];

    if (isLoading) return <div className="p-4"><TableSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* ── Header ── */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins d-flex align-items-center gap-2" style={{ fontWeight: 700, color: 'var(--theme-content-text)' }}>
                        Mobile App Registry
                        <span title="Live updates active" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'pulse 2s infinite' }} />
                    </h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>
                        Registered customer accounts from the Sandigan mobile application
                    </p>
                </div>
                <button
                    className="btn btn-sm btn-outline-secondary px-3 rounded-pill d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => mutate()}
                >
                    ↻ Refresh
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div className="row g-3 mb-4">
                {kpiCards.map((card, idx) => (
                    <div className="col-6 col-md-3" key={idx}>
                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden position-relative" style={{ background: 'var(--theme-card-bg)' }}>
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                            <div className="p-3 position-relative">
                                {/* Dot indicator */}
                                <div className="position-absolute top-0 end-0 p-3">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                </div>
                                {/* Icon */}
                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                    style={{ width: '40px', height: '40px', background: card.bg, fontSize: '1.2rem' }}>
                                    {card.icon}
                                </div>
                                {/* Label */}
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--theme-content-text-secondary)' }}>
                                    {card.title}
                                </p>
                                {/* Value */}
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                    {card.value.toLocaleString()}
                                </h3>
                                {/* Description */}
                                <small style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.72rem' }}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Customer Table ── */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ background: 'var(--theme-card-header-bg)' }}>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--theme-content-text)' }}>Registered Accounts</h6>
                    <SharedSearchBar
                        searchTerm={searchTerm}
                        onDebouncedSearch={(val) => setSearchTerm(val)}
                        placeholder="Search name, email, phone..."
                        debounceDelay={400}
                        width="280px"
                    />
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead className="small" style={{ background: 'var(--theme-card-header-bg)', color: 'var(--theme-content-text)' }}>
                                <tr>
                                    <th className="ps-4 py-3">Customer</th>
                                    <th className="ps-4 py-3">Phone</th>
                                    <th className="ps-4 py-3">Bookings</th>
                                    <th className="ps-4 py-3">Member Since</th>
                                    <th className="pe-4 text-end ps-4 py-3">Last Visited</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-5 text-center text-muted">
                                            No registered customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map(customer => (
                                        <tr
                                            key={customer._id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleViewHistory(customer)}
                                        >
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" style={{ width: 40, height: 40, background: 'var(--brand-dark)', fontSize: '0.9rem' }}>
                                                        {customer.firstName.charAt(0).toUpperCase()}{customer.lastName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: '0.9rem', color: 'var(--theme-content-text)' }}>
                                                            {customer.firstName} {customer.lastName}
                                                        </div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{customer.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--theme-content-text-secondary)' }}>{customer.phone || '—'}</td>
                                            <td>
                                                <span className="badge rounded-pill px-3 py-1"
                                                    style={{
                                                        background: customer.bookingCount > 0 ? 'linear-gradient(135deg,#22c55e15,#22c55e05)' : 'var(--theme-badge-muted-bg)',
                                                        color: customer.bookingCount > 0 ? '#22c55e' : 'var(--theme-content-text-secondary)',
                                                        border: `1px solid ${customer.bookingCount > 0 ? '#22c55e40' : 'var(--theme-content-border)'}`,
                                                        fontSize: '0.75rem', fontWeight: 600
                                                    }}>
                                                    {customer.bookingCount} booking{customer.bookingCount !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                {new Date(customer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="pe-4 text-end text-muted" style={{ fontSize: '0.8rem' }}>
                                                {customer.lastVisitDate
                                                    ? new Date(customer.lastVisitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                    : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {filtered.length > PER_PAGE && (
                    <div className="card-footer border-top py-3 d-flex justify-content-between align-items-center" style={{ background: 'var(--theme-card-bg)' }}>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <button
                                className="btn btn-sm p-0 rounded-circle border-0"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                style={{ width: '30px', height: '30px', background: page === 1 ? 'transparent' : 'var(--theme-badge-muted-bg)', opacity: page === 1 ? 0.3 : 1 }}
                            >
                                <img src={leftArrowIcon} style={{ width: '9px' }} alt="prev" />
                            </button>
                            {getPaginationRange(page, totalPages).map((p, idx) => (
                                p === '...' ? (
                                    <span key={`dot-${idx}`} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>...</span>
                                ) : (
                                    <button
                                        key={`p-${p}`}
                                        onClick={() => setPage(p)}
                                        className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${page === p ? 'btn-save text-white shadow-sm' : 'text-muted'}`}
                                        style={{ width: '30px', height: '30px', fontSize: '0.78rem', background: page === p ? '' : 'transparent' }}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}
                            <button
                                className="btn btn-sm p-0 rounded-circle border-0"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                style={{ width: '30px', height: '30px', background: page >= totalPages ? 'transparent' : 'var(--theme-badge-muted-bg)', opacity: page >= totalPages ? 0.3 : 1 }}
                            >
                                <img src={rightArrowIcon} style={{ width: '9px' }} alt="next" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Customer History Modal ── */}
            {selectedCustomer && (
                <AdminModalWrapper show={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} dialogStyle={{ maxWidth: '700px' }}>
                    <div className="modal-content border-0 rounded-4 shadow overflow-hidden" style={{ background: 'var(--theme-card-bg)' }}>
                        {/* Modal Header */}
                        <div className="modal-header border-0 pb-4 pt-5 px-5 position-relative" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                            <button type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-3" onClick={() => setSelectedCustomer(null)} />
                            <div className="d-flex align-items-center gap-4 w-100 text-white">
                                <div className="rounded-circle d-flex align-items-center justify-content-center brand-accent fw-bold shadow-lg" style={{ width: 80, height: 80, fontSize: '2rem', background: 'var(--brand-active)' }}>
                                    {selectedCustomer.firstName.charAt(0).toUpperCase()}{selectedCustomer.lastName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-grow-1">
                                    <h4 className="mb-1 fw-bold font-poppins">{selectedCustomer.firstName} {selectedCustomer.lastName}</h4>
                                    <p className="mb-2 text-light opacity-75 d-flex gap-3" style={{ fontSize: '0.85rem' }}>
                                        <span>Email: {selectedCustomer.email}</span>
                                        <span>Phone: {selectedCustomer.phone || 'N/A'}</span>
                                    </p>
                                </div>
                                <div className="text-end pe-2">
                                    <p className="mb-1 text-light opacity-75 small text-uppercase">Member Since</p>
                                    <p className="mb-0 text-info fw-bold" style={{ fontSize: '0.9rem' }}>
                                        {new Date(selectedCustomer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body – Booking History */}
                        <div className="modal-body p-4">
                            <h6 className="fw-bold mb-3" style={{ color: 'var(--theme-content-text)' }}>
                                📋 Booking History
                                {customerHistory && (
                                    <span className="badge rounded-pill ms-2 px-3" style={{ background: '#23A0CE20', color: '#23A0CE', fontSize: '0.75rem' }}>
                                        {customerHistory.bookings.length} record{customerHistory.bookings.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </h6>

                            {isLoadingHistory ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                                    <span className="text-muted">Loading history...</span>
                                </div>
                            ) : customerHistory?.bookings?.length === 0 ? (
                                <div className="text-center py-5">
                                    <div style={{ fontSize: '3rem' }}>💤</div>
                                    <p className="text-muted mt-2">This customer hasn't made any bookings yet.</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="pe-1 custom-scrollbar">
                                    {customerHistory?.bookings?.map((booking, idx) => (
                                        <div key={booking._id} className="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom" style={{ borderColor: 'var(--theme-content-border)' }}>
                                            <div className="rounded-circle d-flex align-items-center justify-content-center text-muted"
                                                style={{ width: 32, height: 32, flexShrink: 0, fontSize: '0.8rem', background: 'var(--theme-card-header-bg)' }}>
                                                {(customerHistory.bookings.length - idx)}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="fw-bold" style={{ fontSize: '0.85rem', color: 'var(--theme-content-text)' }}>
                                                        {booking._type === 'rental'
                                                            ? `Car Rental — ${booking.vehicleName || 'Vehicle'}`
                                                            : (Array.isArray(booking.serviceType) ? booking.serviceType.join(', ') : booking.serviceType || 'Car Wash Service')}
                                                    </span>
                                                    <span className="fw-bold text-success" style={{ fontSize: '0.85rem' }}>
                                                        ₱{(booking.totalPrice || booking.estimatedTotal || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-muted">
                                                        {new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </small>
                                                    {(() => { const sc = getStatusColor(booking.status); return (
                                                    <span className="badge rounded-pill px-2"
                                                        style={{ fontSize: '0.65rem', fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                        {booking.status || 'Completed'}
                                                    </span>
                                                    ); })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer border-0 p-4 pt-2">
                            <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setSelectedCustomer(null)}
                                style={{ fontWeight: 600, background: isDark ? 'var(--theme-bg-secondary)' : '' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default MobileCustomersModule;
