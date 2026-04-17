import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../../api/config';

import TopHeader from './TopHeader';
import BookingModal from './BookingModal';
import ReceiptModal from './ReceiptModal';
import SMCCardModal from './SMCCardModal';
import CreateBookingModal from './CreateBookingModal';
import HomeServiceOps from './HomeServiceOps';
import getPaginationRange from '../../admin/getPaginationRange';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

/* ─────────────────────────────────────────────
   BOOKING MANAGEMENT
   Parent component to handle active bookings list,
   status updates, and modal triggers.
   ───────────────────────────────────────────── */

const BookingManagement = ({ employee, onNavigate, onShowSMC, isDark }) => {
    // 1. Create state to store all bookings and loading status
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptBooking, setReceiptBooking] = useState(null);
    const [isSMCModalOpen, setIsSMCModalOpen] = useState(false);
    const [smcData, setSMCData] = useState(null);
    const [activeView, setActiveView] = useState('instore'); // 'instore' | 'homeops'

    const [detailers, setDetailers] = useState([]);
    const [bays, setBays] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const handleShowSMC = (bookingId) => {
        axios.get(`${API_BASE}/crm/booking/${bookingId}/smc`, {
            headers: authHeaders(),
            withCredentials: true
        })
            .then(res => {
                setSMCData(res.data);
                setIsSMCModalOpen(true);
            })
            .catch(err => {
                Swal.fire('Error', 'Membership card not found in CRM database.', 'error');
                console.error(err);
            });
    };

    const handleFetchSMCById = (smcId) => {
        axios.get(`${API_BASE}/crm/card/${smcId}`, {
            headers: authHeaders(),
            withCredentials: true
        })
            .then(res => {
                setSMCData(res.data);
                setIsSMCModalOpen(true);
            })
            .catch(err => {
                Swal.fire('Error', 'Card ID not found in database.', 'error');
                console.error(err);
            });
    };

    // Custom Toast Launcher
    const showToast = (message) => {
        const id = Date.now();
        setToasts(prev => {
            const nextList = [...prev, { id, message }];
            // Keep only the latest 2 toasts
            return nextList.length > 2 ? nextList.slice(-2) : nextList;
        });

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    useEffect(() => {
        fetchBookings();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', (newBooking) => {
            setBookings(prev => [newBooking, ...prev]);
            showToast(`New booking received: ${newBooking.batchId || newBooking._id.substring(0, 8)}`);
        });

        socket.on('update_booking', (updatedBooking) => {
            setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        });

        socket.on('update_bay', (updatedBay) => {
            setBays(prev => prev.map(bay => bay._id === updatedBay._id ? updatedBay : bay));
        });

        return () => {
            socket.off('new_booking');
            socket.off('update_booking');
            socket.off('update_bay');
            socket.disconnect();
        };
    }, []); // The empty array [] means it runs ONLY ONCE when loaded

    // Fetch bays and detailers for inline dropdowns
    useEffect(() => {
        axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true })
            .then(res => setDetailers(res.data.filter(e => e.role === 'detailer')))
            .catch(err => console.error('Failed to fetch detailers', err));

        axios.get(`${API_BASE}/bays`, { headers: authHeaders(), withCredentials: true })
            .then(res => setBays(res.data))
            .catch(err => console.error('Failed to fetch bays', err));
    }, []);

    // 3. Create the fetch function
    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${API_BASE}/booking`, {
                headers: authHeaders(),
                withCredentials: true,
            });

            // The backend sends the array in response.data
            setBookings(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            if (error.response?.status === 401) {
                Swal.fire('Session Expired', 'Please log in again.', 'warning').then(() => {
                    localStorage.removeItem('employee');
                    window.location.href = '/login';
                });
            }
            setIsLoading(false);
        }
    };

    // Helper function to convert military time to 12-hour format
    const formatTo12Hour = (hourStr) => {
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // converts 0 to 12 and 13 to 1
        return `${displayHour}:00 ${ampm}`;
    };

    // 4. Handle status selection
    const handleStatusChange = async (bookingId, nextStatus, batchId) => {
        // Guard: do not allow changing a completed booking
        const currentBooking = bookings.find(b => b._id === bookingId);
        if (currentBooking?.status === 'Completed') return;

        const previousBookings = [...bookings];

        // 1. Instantly update the UI, including appending the new log!
        setBookings((prev) =>
            prev.map(b => {
                if (b._id === bookingId) {
                    const newLog = { status: nextStatus, timestamp: new Date() };
                    const newLogs = b.statusLogs ? [...b.statusLogs, newLog] : [{ status: 'Pending', timestamp: b.createdAt }, newLog];
                    return { ...b, status: nextStatus, statusLogs: newLogs };
                }
                return b;
            })
        );

        // 2. Patch the backend database
        try {
            await axios.patch(`${API_BASE}/booking/${bookingId}`, {
                status: nextStatus
            }, {
                headers: authHeaders(),
                withCredentials: true,
            });
            showToast(`Booking ${batchId || bookingId.substring(0, 8)} status updated to ${nextStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert changes on error
            setBookings(previousBookings);

            if (error.response?.status === 401) {
                Swal.fire('Session Expired', 'Please log in again.', 'warning').then(() => {
                    localStorage.removeItem('employee');
                    window.location.href = '/login';
                });
            } else {
                Swal.fire('Error', 'Failed to update booking status', 'error');
            }
        }
    };

    const handleAssignBay = async (bookingId, bayId) => {
        const previousBookings = [...bookings];
        const selectedBay = bays.find(b => b._id === bayId);
        
        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, bayId: selectedBay ? { _id: selectedBay._id, name: selectedBay.name } : null } : b));
        
        try {
            await axios.patch(`${API_BASE}/booking/${bookingId}`, { bayId: bayId || null }, { headers: authHeaders(), withCredentials: true });
            showToast('Bay assigned successfully');
        } catch (err) {
            setBookings(previousBookings);
            Swal.fire('Error', 'Failed to assign Bay', 'error');
        }
    };

    const handleAssignDetailer = async (bookingId, detailerId) => {
        const previousBookings = [...bookings];
        const assignedEmp = detailers.find(d => d._id === detailerId);
        
        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, assignedTo: detailerId ? { _id: detailerId } : null, detailer: assignedEmp?.fullName || '' } : b));
        
        try {
            await axios.patch(`${API_BASE}/booking/${bookingId}`, { 
                assignedTo: detailerId || null, 
                detailer: assignedEmp?.fullName || null 
            }, { headers: authHeaders(), withCredentials: true });
            showToast('Detailer assigned successfully');
        } catch (err) {
            setBookings(previousBookings);
            Swal.fire('Error', 'Failed to assign Detailer', 'error');
        }
    };

    // Calculate Detailer Availability dynamically based on active booking statuses
    const isDetailerBusy = (detailerId, currentBookingAssignedId) => {
        if (detailerId === currentBookingAssignedId) return false;
        return bookings.some(b => {
             const bAssignedId = b.assignedTo?._id || b.assignedTo;
             return bAssignedId === detailerId && ['Confirmed', 'Queued', 'In-progress', 'On the Way'].includes(b.status);
        });
    };

    // Filter Logic
    const filteredBookings = bookings.filter(b => {
        const search = searchTerm.toLowerCase();
        const customerName = `${b.firstName} ${b.lastName}`.toLowerCase();
        const services = Array.isArray(b.serviceType) ? b.serviceType.join(', ').toLowerCase() : b.serviceType?.toLowerCase() || '';
        const bayName = b.bayId?.name?.toLowerCase() || 'none';
        const dateStr = new Date(b.createdAt).toLocaleDateString().toLowerCase();
        const id = b.batchId?.toLowerCase() || b._id.toLowerCase();

        const matchesSearch = customerName.includes(search) ||
            services.includes(search) ||
            bayName.includes(search) ||
            dateStr.includes(search) ||
            id.includes(search);
            
        if (statusFilter !== 'All') {
            const bStatus = b.status || 'Pending';
            if (bStatus !== statusFilter) return false;
        }

        return matchesSearch;
    });

    // Reset to page 1 on search or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    return (
        <div className="position-relative">
            {/* ─── TOAST CONTAINER ─── */}
            <div className="toast-container position-fixed bottom-0 end-0 p-4 mt-5" style={{ zIndex: 1055 }}>
                {toasts.map((toast) => (
                    <div key={toast.id} className="toast show align-items-center text-bg-dark border-0 mb-2 shadow-lg" style={{ transition: 'opacity 0.3s ease-in-out' }} role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="toast-header text-bg-dark border-secondary">
                            <span className="rounded me-2" style={{ width: 14, height: 14, backgroundColor: '#23A0CE' }}></span>
                            <strong className="me-auto font-poppins text-white">Message</strong>
                            <small className="text-light">just now</small>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} aria-label="Close"></button>
                        </div>
                        <div className="toast-body font-poppins" style={{ fontSize: '0.9rem' }}>
                            {toast.message}
                        </div>
                    </div>
                ))}
            </div>

            <TopHeader
                employee={employee}
                title={activeView === 'homeops' ? 'Home Service Ops' : 'Booking Management'}
                subtitle={activeView === 'homeops' ? 'Live dispatch map for Home Service bookings' : 'View and update all carwash bookings'}
                onNavigate={onNavigate}
                isDark={isDark}
            />

            {/* ─── VIEW TOGGLE TABS ─── */}
            <div className="d-flex gap-2 p-1 rounded-3 mb-3 justify-content-end" style={{ background: 'var(--theme-input-bg)' }}>
                <button
                    className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeView === 'instore' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                    onClick={() => setActiveView('instore')}
                    style={{ fontSize: '0.85rem', background: activeView === 'instore' ? 'var(--theme-card-bg)' : 'transparent', color: activeView === 'instore' ? 'var(--theme-content-text)' : 'inherit' }}
                >
                    In-Store
                </button>
                <button
                    className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 position-relative ${activeView === 'homeops' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                    onClick={() => setActiveView('homeops')}
                    style={{ fontSize: '0.85rem', background: activeView === 'homeops' ? 'var(--theme-card-bg)' : 'transparent', color: activeView === 'homeops' ? 'var(--theme-content-text)' : 'inherit' }}
                >
                    Home Service
                    {Array.isArray(bookings) && bookings.filter(b => b?.serviceLocationType === 'Home Service' && !['Completed', 'Cancelled'].includes(b?.status)).length > 0 && (
                        <span style={{
                            position: 'absolute', top: -6, right: -6,
                            background: '#ef4444', color: '#fff', borderRadius: '50%',
                            width: 18, height: 18, fontSize: '0.6rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {bookings.filter(b => b?.serviceLocationType === 'Home Service' && !['Completed', 'Cancelled'].includes(b?.status)).length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── ACTIVE VIEW ─── */}
            {
                activeView === 'homeops' ? (
                    <HomeServiceOps isDark={isDark} />
                ) : (
                    <>
                        {/* 4. Display Loading State or Table */}
                        <div className="rounded-4 p-3 shadow-sm overflow-hidden d-flex flex-column" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', minHeight: 670 }}>

                            <div className="card-header bg-transparent py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div className="d-flex gap-2 overflow-auto" style={{ whiteSpace: 'nowrap', paddingBottom: '4px' }}>
                                    {['All', 'Pending', 'Confirmed', 'Queued', 'In-progress', 'Completed', 'Cancelled'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className="btn btn-sm rounded-pill font-poppins"
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                padding: '4px 16px',
                                                background: statusFilter === status ? '#23A0CE' : 'transparent',
                                                color: statusFilter === status ? '#fff' : 'var(--theme-content-text-secondary)',
                                                border: statusFilter === status ? '1px solid #23A0CE' : '1px solid var(--theme-input-border)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                                <div className="d-flex gap-2">
                                    <SharedSearchBar
                                        placeholder="Search customer or ID..."
                                        onDebouncedSearch={(val) => setSearchTerm(val)}
                                        debounceDelay={400}
                                    />
                                    <button className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                                        onClick={() => setIsCreateModalOpen(true)}>
                                        + Booking
                                    </button>
                                </div>
                            </div>
                            {isLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                    <p className="mt-2 text-dark-gray400">Loading bookings...</p>
                                </div>
                            ) : filteredBookings.length === 0 ? (
                                <div className="text-center py-5 text-dark-gray400">
                                    No bookings found.
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive flex-grow-1" style={{ minHeight: '400px' }}>
                                        <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="border-0 font-poppins ps-3 rounded-start" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Booking Info</th>
                                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase', minWidth: '130px' }}>Assignment</th>
                                                    <th className="border-0 font-poppins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase', minWidth: '140px' }}>Detailer</th>
                                                    <th className="border-0 font-poppins text-center" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase', minWidth: '130px' }}>Status</th>
                                                    <th className='border-0 font-poppins text-end pe-3 rounded-end' style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Loop through sliced bookings */}
                                                {filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((booking) => (
                                                    <tr key={booking._id} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.02)', background: 'var(--theme-input-bg)' }}>
                                                        <td className="ps-3 rounded-start">
                                                            <div className="d-flex flex-column">
                                                                <span style={{ color: '#23A0CE', fontSize: '0.85rem', fontWeight: 700 }}>#{booking.batchId || booking._id.substring(0, 8)}</span>
                                                                <span className="fw-bold my-1" style={{ fontSize: '0.9rem', color: 'var(--theme-content-text)' }}>{booking.firstName} {booking.lastName}</span>
                                                                <span className="text-muted text-truncate d-block" style={{ fontSize: '0.75rem', maxWidth: '180px' }}>
                                                                    {Array.isArray(booking.serviceType) ? booking.serviceType.join(' • ') : booking.serviceType}
                                                                </span>
                                                                <span className="text-muted mt-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                                    <i className="bi bi-clock me-1"></i> {formatTo12Hour(booking.bookingTime)} • {new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm shadow-none font-poppins"
                                                                style={{ fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--theme-input-border)', backgroundColor: 'var(--theme-card-bg)', color: booking.bayId ? 'var(--theme-content-text)' : 'var(--theme-content-text-secondary)' }}
                                                                value={booking.bayId?._id || booking.bayId || ''}
                                                                onChange={(e) => handleAssignBay(booking._id, e.target.value)}
                                                                disabled={booking.status === 'Completed' || booking.status === 'Cancelled' || booking.serviceLocationType === 'Home Service'}
                                                            >
                                                                <option value="">{booking.serviceLocationType === 'Home Service' ? 'N/A (Home Service)' : 'Unassigned Bay'}</option>
                                                                {bays.map(b => {
                                                                    const isBayTaken = (b.status === 'Maintenance' || b.status === 'Occupied') && b._id !== (booking.bayId?._id || booking.bayId);
                                                                    return (
                                                                        <option key={b._id} value={b._id} disabled={isBayTaken}>
                                                                            {b.name} {isBayTaken ? `(${b.status})` : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </td>

                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm shadow-none font-poppins"
                                                                style={{ fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--theme-input-border)', backgroundColor: 'var(--theme-card-bg)', color: booking.assignedTo ? 'var(--theme-content-text)' : 'var(--theme-content-text-secondary)' }}
                                                                value={booking.assignedTo?._id || booking.assignedTo || ''}
                                                                onChange={(e) => handleAssignDetailer(booking._id, e.target.value)}
                                                                disabled={booking.status === 'Completed' || booking.status === 'Cancelled'}
                                                            >
                                                                <option value="">Unassigned Staff</option>
                                                                {detailers.map(d => {
                                                                    const busy = isDetailerBusy(d._id, booking.assignedTo?._id || booking.assignedTo);
                                                                    return (
                                                                        <option key={d._id} value={d._id} disabled={busy}>
                                                                            {d.fullName} {busy ? '(Busy)' : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </td>

                                                        <td className="text-center">
                                                            <select
                                                                className={`form-select form-select-sm fw-bold shadow-none font-poppins mx-auto ${booking.status === 'Completed' ? 'border-success text-success' :
                                                                    booking.status === 'Queued' ? 'border-primary text-primary' :
                                                                        booking.status === 'Confirmed' ? 'border-info text-info' :
                                                                            booking.status === 'Cancelled' ? 'border-danger text-danger' :
                                                                                booking.status === 'In-progress' ? 'border-warning text-warning' :
                                                                                    booking.status === 'On the Way' ? 'border-warning text-warning' :
                                                                                        'border-warning text-warning'
                                                                    }`}
                                                                style={{
                                                                    maxWidth: '135px',
                                                                    fontSize: '0.8rem',
                                                                    borderRadius: '8px',
                                                                    cursor: booking.status === 'Completed' || booking.status === 'Cancelled' ? 'not-allowed' : 'pointer',
                                                                    backgroundColor: booking.status === 'Completed' ? 'rgba(25, 135, 84, 0.05)' :
                                                                        booking.status === 'Cancelled' ? 'rgba(220, 53, 69, 0.05)' : 'var(--theme-card-bg)',
                                                                    color: booking.status === 'On the Way' ? '#f97316' : undefined,
                                                                    borderColor: booking.status === 'On the Way' ? '#f97316' : undefined
                                                                }}
                                                                value={booking.status || 'Pending'}
                                                                disabled={booking.status === 'Completed' || booking.status === 'Cancelled'}
                                                                onChange={(e) => handleStatusChange(booking._id, e.target.value, booking.batchId)}
                                                            >
                                                                <option value="Pending" disabled={['Confirmed', 'Queued', 'On the Way', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🟡 Pending</option>
                                                                <option value="Confirmed" disabled={['Queued', 'On the Way', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🔵 Confirmed</option>
                                                                <option value="Queued" disabled={['Pending', 'On the Way', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🟣 Queued</option>

                                                                {/* Only show 'On the Way' for Home Service */}
                                                                {booking.serviceLocationType === 'Home Service' && (
                                                                    <option value="On the Way" disabled={['Pending', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🚗 On the Way</option>
                                                                )}

                                                                <option value="In-progress" disabled={['Pending', 'Completed', 'Cancelled'].includes(booking.status)}>🟠 In-progress</option>
                                                                <option value="Completed" disabled={['Pending', 'Queued', 'Cancelled'].includes(booking.status)}>🟢 Completed</option>
                                                                <option value="Cancelled" disabled={['In-progress', 'Completed'].includes(booking.status)}>🔴 Cancelled</option>
                                                            </select>
                                                        </td>
                                                        <td className="pe-3 text-end rounded-end align-middle">
                                                            <div className="d-flex flex-column align-items-end justify-content-center gap-2">
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--theme-content-text)' }}>₱{booking.totalPrice.toLocaleString()}</span>
                                                                <button className="btn btn-action btn-sm border-outline-primary brand-primary shadow-sm"
                                                                    style={{ background: 'var(--theme-card-bg)', border: '1px solid rgba(35,160,206,0.4)', color: '#23A0CE', borderRadius: '8px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                                    onClick={() => setSelectedBooking(booking)}>
                                                                    Open
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {filteredBookings.length > itemsPerPage && (
                                        <div className="d-flex justify-content-between align-items-center mt-3 px-2">
                                            <small className="text-muted font-poppins">
                                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
                                            </small>
                                            <nav>
                                                <ul className="pagination pagination-sm mb-0 gap-2">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={leftArrowIcon} style={{ width: '12px' }} alt="prev" />
                                                        </button>
                                                    </li>

                                                    {getPaginationRange(currentPage, Math.ceil(filteredBookings.length / itemsPerPage)).map((pg, idx) => (
                                                        <li key={idx} className={`page-item ${currentPage === pg ? 'active' : ''} ${pg === '...' ? 'disabled' : ''}`}>
                                                            <button
                                                                className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center ${currentPage === pg ? 'brand-primary text-white' : ''}`}
                                                                onClick={() => pg !== '...' && setCurrentPage(pg)}
                                                                style={{ width: '32px', height: '32px', background: currentPage === pg ? '#23A0CE' : 'transparent', color: currentPage === pg ? '#fff' : 'var(--theme-content-text)' }}
                                                            >
                                                                {pg}
                                                            </button>
                                                        </li>
                                                    ))}

                                                    <li className={`page-item ${currentPage === Math.ceil(filteredBookings.length / itemsPerPage) ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={rightArrowIcon} style={{ width: '12px' }} alt="next" />
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )
            }

            {/* MODALS */}
            {
                selectedBooking && (
                    <BookingModal
                        booking={selectedBooking}
                        showToast={showToast}
                        onSave={() => {
                            setSelectedBooking(null);
                            fetchBookings();
                        }}
                        onClose={() => setSelectedBooking(null)}
                        onPrint={(booking) => {
                            setReceiptBooking(booking);
                            setIsReceiptModalOpen(true);
                        }}
                        onSMC={handleShowSMC}
                        onSMCById={handleFetchSMCById}
                    />
                )
            }

            {
                isCreateModalOpen && (
                    <CreateBookingModal
                        onClose={() => setIsCreateModalOpen(false)}
                        onSave={() => {
                            setIsCreateModalOpen(false);
                            fetchBookings();
                        }}
                        showToast={showToast}
                    />
                )
            }

            {
                isReceiptModalOpen && receiptBooking && (
                    <ReceiptModal
                        booking={receiptBooking}
                        onClose={() => setIsReceiptModalOpen(false)}
                        isDark={isDark}
                    />
                )
            }

            {
                isSMCModalOpen && smcData && (
                    <SMCCardModal
                        data={smcData}
                        onClose={() => setIsSMCModalOpen(false)}
                    />
                )
            }

            {/* Fixed Create Button */}

        </div >
    );
};

export default BookingManagement;
