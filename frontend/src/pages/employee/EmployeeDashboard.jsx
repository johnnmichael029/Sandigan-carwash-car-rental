import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import carService from '../../assets/icon/car.png';
import dashboard from '../../assets/icon/dashboard.png';
import bookingsIcon from '../../assets/icon/order.png'
import bookingsCompleted from '../../assets/icon/order-completed.png'
import bookingsPending from '../../assets/icon/order-pending.png'
import carRent from '../../assets/icon/car-rent.png'
import notifIcon from '../../assets/icon/notif.png'

// Sub-tabs that belong under the "Services" dropdown
const SERVICE_ITEMS = ['bookings', 'car-rent'];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const EmployeeDashboard = () => {
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toggleActive, setToggleActive] = useState('dashboard');

    // Dropdown stays open when a child tab is already active
    const [isServicesOpen, setIsServicesOpen] = useState(
        SERVICE_ITEMS.includes('dashboard') // false on init; opens when child selected
    );

    /* ── Rehydrate employee from localStorage on mount ── */
    useEffect(() => {
        const stored = localStorage.getItem('employee');
        if (stored) {
            setEmployee(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

    /* ── Auto-open dropdown when a service child tab is active ── */
    useEffect(() => {
        if (SERVICE_ITEMS.includes(toggleActive)) {
            setIsServicesOpen(true);
        }
    }, [toggleActive]);

    /* ── Logout with SweetAlert2 confirmation ── */
    const handleLogout = () => {
        Swal.fire({
            title: 'Log out?',
            text: 'You will be returned to the login page.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#23A0CE',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, log out',
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                navigate('/login');
            }
        });
    };

    /* ── Render correct content panel ── */
    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard':
                return <DashboardOverview />;
            case 'bookings':
                return <BookingManagement employee={employee} />;
            case 'car-rent':
                return <CarRentManagement />;
            default:
                return <DashboardOverview />;
        }
    };

    /* ── Loading guard ── */
    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 background-light-primary">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" />
                    <p className="text-dark-gray400 font-poppins">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const isServiceActive = SERVICE_ITEMS.includes(toggleActive);

    return (
        <div className="container-fluid p-0">
            <div className="d-flex w-100">

                {/* ─── SIDEBAR ─── */}
                <nav className="sidebar-container sidebar vh-100 d-flex flex-column" style={{ position: 'sticky', top: 0 }}>

                    {/* Logo */}
                    <div className="brand-container border-bottom w-100 d-flex justify-content-center align-items-center">
                        <img
                            className="sandigan-logo"
                            src={sandiganLogo}
                            alt="Sandigan Logo"
                            style={{ width: '65%', objectFit: 'contain' }}
                        />
                    </div>

                    {/* Nav links */}
                    <ul className="nav flex-column w-100 flex-grow-1 pt-2" style={{ listStyleType: 'none', padding: 0, margin: 0 }}>

                        {/* Dashboard */}
                        <li className="nav-item w-100">
                            <button
                                id="nav-dashboard"
                                className={`nav-link ps-4 w-100 d-flex align-items-center ${toggleActive === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setToggleActive('dashboard')}
                            >
                                <img className="pe-2" src={dashboard} alt="Dashboard Icon" />
                                Dashboard
                            </button>
                        </li>

                        {/* Services (parent) */}
                        <li className="nav-item w-100">
                            <div
                                id="nav-services"
                                className={`nav-link ps-4 d-flex justify-content-between align-items-center ${isServiceActive ? 'active' : ''}`}
                                onClick={() => setIsServicesOpen((prev) => !prev)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <img src={carService} alt="Car Service Icon" />
                                    <span>Services</span>
                                </div>
                                <img
                                    src={isServicesOpen ? upArrow : downArrow}
                                    alt={isServicesOpen ? 'Collapse' : 'Expand'}
                                    style={{ width: '12px', marginRight: '12px' }}
                                />
                            </div>
                        </li>

                        {/* Services sub-menu — valid HTML: li > ul > li */}
                        {isServicesOpen && (
                            <li className="nav-item w-100 animate-fade-in" style={{ height: 'auto' }}>
                                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, width: '100%' }}>
                                    <li className="nav-item w-100">
                                        <button
                                            id="nav-bookings"
                                            className={`nav-link ps-5 w-100 d-flex align-items-center ${toggleActive === 'bookings' ? 'active' : ''}`}
                                            onClick={() => setToggleActive('bookings')}
                                        >
                                            Bookings
                                        </button>
                                    </li>
                                    <li className="nav-item w-100">
                                        <button
                                            id="nav-car-rent"
                                            className={`nav-link ps-5 w-100 d-flex align-items-center ${toggleActive === 'car-rent' ? 'active' : ''}`}
                                            onClick={() => setToggleActive('car-rent')}
                                        >
                                            Car Rent
                                        </button>
                                    </li>
                                </ul>
                            </li>
                        )}
                    </ul>

                    {/* Logout button pinned to bottom */}
                    <div className="border-top p-3">
                        <div className="d-flex align-items-center gap-2 mb-2 ps-1">
                            <div
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'rgba(0, 232, 233, 0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0,
                                }}
                            >
                                {employee?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p className="mb-0 text-secondary font-poppins" style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.fullName ?? 'Employee'}
                                </p>
                                <p className="mb-0 text-light-gray300 font-poppins" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.role ?? 'Staff'}
                                </p>
                            </div>
                        </div>
                        <button
                            id="btn-logout"
                            className="btn btn-outline-danger btn-sm w-100 brand-primary"
                            onClick={handleLogout}
                            style={{ fontSize: '0.8rem', borderColor: 'var(--border-outline-color)' }}
                        >
                            Log Out
                        </button>
                    </div>
                </nav>

                {/* ─── MAIN CONTENT ─── */}
                <main className="right-content-container flex-grow-1 pt-4 px-4" style={{ minHeight: '100vh', background: 'var(--background-light-primary)' }}>
                    {renderContent()}
                </main>

            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   DASHBOARD OVERVIEW — KPI Cards
───────────────────────────────────────────── */
const DashboardOverview = () => {
    // Placeholder stats — wire these up to your /api/booking endpoint
    const stats = [
        { label: 'Total Bookings Today', value: '—', icon: <img src={bookingsIcon} alt="Bookings Icon" />, color: '#23A0CE' },
        { label: 'Completed', value: '—', icon: <img src={bookingsCompleted} alt="Bookings Completed" />, color: '#22c55e' },
        { label: 'Pending', value: '—', icon: <img src={bookingsPending} alt="Bookings Pending" />, color: '#f59e0b' },
        { label: 'Active Car Rentals', value: '—', icon: <img src={carRent} alt="Car Rent" />, color: '#a855f7' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>
                        System Overview
                    </h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>
                        {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {stats.map((stat) => (
                    <div className="col-sm-6 col-xl-3" key={stat.label}>
                        <div
                            className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                            style={{
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.07)',
                                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                                transition: 'box-shadow 0.2s',
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <span style={{ fontSize: '1.6rem' }}>{stat.icon}</span>
                                <span
                                    style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: stat.color, display: 'inline-block', marginTop: 6,
                                    }}
                                />
                            </div>
                            <div>
                                <p className="mb-1 text-dark-gray400 font-poppins" style={{ fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {stat.label}
                                </p>
                                <h3 className="mb-0 text-dark-secondary font-poppins" style={{ fontWeight: 700, color: stat.color }}>
                                    {stat.value}
                                </h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Placeholder for upcoming table/chart */}
            <div
                className="rounded-4 p-4 d-flex align-items-center justify-content-center"
                style={{
                    minHeight: 220, background: '#fff',
                    border: '1px dashed rgba(0,0,0,0.15)',
                    color: '#A3A3A3', fontSize: '0.9rem',
                }}
            >
                📊 Charts & recent activity coming soon
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   BOOKING MANAGEMENT
───────────────────────────────────────────── */
const BookingManagement = ({ employee }) => {
    // 1. Create state to store all bookings and loading status
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState([]);

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

    // Define the URL
    const BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:4000/api/booking'
        : 'https://sandigan-backend-api-gzdvgkcphtbbcngq.japaneast-01.azurewebsites.net/api/booking';

    // 2. Use useEffect to trigger the fetch when the component mounts
    useEffect(() => {
        fetchBookings();
    }, []); // The empty array [] means it runs ONLY ONCE when loaded

    // 3. Create the fetch function
    const fetchBookings = async () => {
        try {
            const response = await axios.get(BASE_URL, {
                headers: { 'Content-Type': 'application/json' },
            });

            // The backend sends the array in response.data
            setBookings(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching bookings:", error);
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

    // 4. Handle status button clicks
    const handleStatusClick = async (bookingId, currentStatus, batchId) => {
        // Define our cycle sequence
        const statusFlow = ['Pending', 'Confirmed', 'Queued', 'Completed'];
        const currentIndex = statusFlow.indexOf(currentStatus || 'Pending');

        // Prevent it from changing if it's already Completed
        if (currentIndex === statusFlow.length - 1) return;

        const nextStatus = statusFlow[currentIndex + 1];

        // 1. Instantly update the UI so it feels responsive
        setBookings((prevBookings) =>
            prevBookings.map(b => b._id === bookingId ? { ...b, status: nextStatus } : b)
        );

        // 2. Patch the backend database
        try {
            await axios.patch(`${BASE_URL}/${bookingId}`, {
                status: nextStatus
            });
            showToast(`Booking ${batchId || bookingId.substring(0, 8)}  status updated to ${nextStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            // If the server fails, revert back to the old status
            setBookings((prevBookings) =>
                prevBookings.map(b => b._id === bookingId ? { ...b, status: currentStatus } : b)
            );
            Swal.fire('Error', 'Failed to update booking status', 'error');
        }
    };


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

            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>
                        Manage Bookings
                    </h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>
                        View and update all carwash bookings
                    </p>
                </div>
                <div>
                    <div>
                        <span className="font-poppins text-dark-gray400" style={{ fontSize: '0.85rem' }}>
                            Welcome, <strong className="text-dark-secondary">{employee?.fullName ?? 'Employee'}</strong>
                        </span>
                    </div>
                    <div className='d-flex justify-content-end'>
                        <img src={notifIcon} alt="Notification Icon" />
                    </div>
                </div>
            </div>

            {/* 4. Display Loading State or Table */}
            <div className="rounded-4 p-4 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="mt-2 text-dark-gray400">Loading bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-5 text-dark-gray400">
                        📋 No bookings found.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Customer Name</th>
                                    <th>Service</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Loop through our state variable */}
                                {bookings.map((booking) => (
                                    <tr key={booking._id}>
                                        <td>{booking.batchId || booking._id.substring(0, 8)}</td>
                                        <td>{booking.firstName} {booking.lastName}</td>
                                        <td>{Array.isArray(booking.serviceType) ? booking.serviceType.join(', ') : booking.serviceType}</td>
                                        <td>{formatTo12Hour(booking.bookingTime)} {new Date(booking.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${booking.status === 'Completed' ? 'btn-success text-white' :
                                                    booking.status === 'Queued' ? 'btn-primary text-white' :
                                                        booking.status === 'Confirmed' ? 'btn-info text-white' :
                                                            'btn-warning text-dark-gray100'
                                                    }`}
                                                style={{ minWidth: '95px', fontWeight: '500' }}
                                                onClick={() => handleStatusClick(booking._id, booking.status, booking.batchId)}
                                                disabled={booking.status === 'Completed'}
                                            >
                                                {booking.status || 'Pending'}
                                            </button>
                                        </td>
                                        <td>
                                            <button className="btn btn-action btn-sm border-outline-primary brand-primary">View / Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


/* ─────────────────────────────────────────────
   CAR RENT MANAGEMENT
───────────────────────────────────────────── */
const CarRentManagement = () => (
    <div>
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
                <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>
                    Manage Car Rentals
                </h4>
                <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>
                    Track and manage all active car rentals
                </p>
            </div>
        </div>
        {/* Car rental table goes here */}
        <div
            className="rounded-4 p-4 d-flex align-items-center justify-content-center"
            style={{ minHeight: 300, background: '#fff', border: '1px dashed rgba(0,0,0,0.15)', color: '#A3A3A3', fontSize: '0.9rem' }}
        >
            🚗 Car rentals table coming soon
        </div>
    </div>
);

export default EmployeeDashboard;