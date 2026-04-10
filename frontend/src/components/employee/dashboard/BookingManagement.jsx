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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');

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

        return () => {
            socket.off('new_booking');
            socket.off('update_booking');
            socket.disconnect();
        };
    }, []); // The empty array [] means it runs ONLY ONCE when loaded

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

    // Filter Logic
    // Filter Logic
    const filteredBookings = bookings.filter(b => {
        const search = searchTerm.toLowerCase();
        const customerName = `${b.firstName} ${b.lastName}`.toLowerCase();
        const services = Array.isArray(b.serviceType) ? b.serviceType.join(', ').toLowerCase() : b.serviceType?.toLowerCase() || '';
        const bayName = b.bayId?.name?.toLowerCase() || 'none';
        const dateStr = new Date(b.createdAt).toLocaleDateString().toLowerCase();
        const id = b.batchId?.toLowerCase() || b._id.toLowerCase();

        return customerName.includes(search) ||
            services.includes(search) ||
            bayName.includes(search) ||
            dateStr.includes(search) ||
            id.includes(search);
    });

    // Reset to page 1 on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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
                title="Booking Management"
                subtitle="View and update all carwash bookings"
                onNavigate={onNavigate}
            />
            <div className="d-flex justify-content-end align-items-center mb-4">

                <SharedSearchBar
                    placeholder="Search customer or ID..."
                    onDebouncedSearch={(val) => setSearchTerm(val)}
                    debounceDelay={400}
                />
            </div>
            {/* 4. Display Loading State or Table */}
            <div className="rounded-4 p-3 shadow-sm overflow-hidden d-flex flex-column" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', minHeight: 670 }}>

                <div className="card-header bg-white py-2 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0" style={{ color: 'var(--theme-content-text)' }}>Active Bookings</h6>
                    <button className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600 }}
                        onClick={() => setIsCreateModalOpen(true)}>
                        + Add New Booking
                    </button>
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
                        <div className="table-responsive flex-grow-1">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Booking ID</th>
                                        <th>Customer Name</th>
                                        <th>Service</th>
                                        <th>Bay</th>
                                        <th>Total Price</th>
                                        <th>Date & Time</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Loop through sliced bookings */}
                                    {filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((booking) => (
                                        <tr key={booking._id}>
                                            <td>{booking.batchId || booking._id.substring(0, 8)}</td>
                                            <td>{booking.firstName} {booking.lastName}</td>
                                            <td>{Array.isArray(booking.serviceType) ? booking.serviceType.join(', ') : booking.serviceType}</td>
                                            <td>
                                                {booking.bayId?.name ? (
                                                    <span className="badge bg-light border text-dark-secondary px-2 py-1" style={{ fontSize: '0.75rem' }}>
                                                        {booking.bayId.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">None</span>
                                                )}
                                            </td>
                                            <td>₱{booking.totalPrice.toLocaleString()}</td>
                                            <td>{formatTo12Hour(booking.bookingTime)} {new Date(booking.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <select
                                                    className={`form-select form-select-sm fw-medium shadow-none ${booking.status === 'Completed' ? 'border-success text-success' :
                                                        booking.status === 'Queued' ? 'border-primary text-queued' :
                                                            booking.status === 'Confirmed' ? 'border-info text-info' :
                                                                booking.status === 'Cancelled' ? 'border-danger text-danger' :
                                                                    booking.status === 'In-progress' ? 'border-warning text-in-progress' :
                                                                        'border-warning text-warning'
                                                        }`}
                                                    style={{ minWidth: '120px', cursor: booking.status === 'Completed' || booking.status === 'Cancelled' ? 'not-allowed' : 'pointer' }}
                                                    value={booking.status || 'Pending'}
                                                    disabled={booking.status === 'Completed' || booking.status === 'Cancelled'}
                                                    onChange={(e) => handleStatusChange(booking._id, e.target.value, booking.batchId)}
                                                >
                                                    <option value="Pending" disabled={['Confirmed', 'Queued', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🟡 Pending</option>
                                                    <option value="Confirmed" disabled={['Queued', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🔵 Confirmed</option>
                                                    <option value="Queued" disabled={['Pending', 'Completed', 'In-progress', 'Cancelled'].includes(booking.status)}>🟣 Queued</option>
                                                    <option value="In-progress" disabled={['Pending', 'Completed', 'Cancelled'].includes(booking.status)}>🟠 In-progress</option>
                                                    <option value="Completed" disabled={['Pending', 'Queued', 'Cancelled'].includes(booking.status)}>🟢 Completed</option>
                                                    <option value="Cancelled" disabled={['In-progress', 'Completed'].includes(booking.status)}>🔴 Cancelled</option>
                                                </select>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2 justify-content-center">
                                                    <button className="btn btn-action btn-sm border-outline-primary brand-primary" onClick={() => setSelectedBooking(booking)}>View / Edit</button>
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

            {/* MODALS */}
            {selectedBooking && (
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
            )}

            {isCreateModalOpen && (
                <CreateBookingModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={() => {
                        setIsCreateModalOpen(false);
                        fetchBookings();
                    }}
                    showToast={showToast}
                />
            )}

            {isReceiptModalOpen && receiptBooking && (
                <ReceiptModal
                    booking={receiptBooking}
                    onClose={() => setIsReceiptModalOpen(false)}
                    isDark={isDark}
                />
            )}

            {isSMCModalOpen && smcData && (
                <SMCCardModal
                    data={smcData}
                    onClose={() => setIsSMCModalOpen(false)}
                />
            )}

            {/* Fixed Create Button */}

        </div>
    );
};

export default BookingManagement;
