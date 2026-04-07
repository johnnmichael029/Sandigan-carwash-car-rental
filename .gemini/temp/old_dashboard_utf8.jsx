import { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import carService from '../../assets/icon/car.png';
import dashboard from '../../assets/icon/dashboard.png';
import bookingsIcon from '../../assets/icon/order.png';
import bookingsCompleted from '../../assets/icon/order-completed.png';
import bookingsPending from '../../assets/icon/order-pending.png';
import carRent from '../../assets/icon/car-rent.png';
import notifIcon from '../../assets/icon/notif.png';
import pendingBooking from '../../assets/icon/pending-booking-brand.png';
import confirmedBooking from '../../assets/icon/confirmed-booking-brand.png';
import queuedBooking from '../../assets/icon/queued-booking-brand.png';
import completedBooking from '../../assets/icon/completed-booking-brand.png';
import editBooking from '../../assets/icon/edit-book.png';
import bookDuration from '../../assets/icon/duration.png';
import inProgressBooking from '../../assets/icon/in-progress.png';
import inventoryIcon from '../../assets/icon/inventory.png';
import searchIcon from '../../assets/icon/search.png';
import rightArrowIcon from '../../assets/icon/right-arrow.png'
import leftArrowIcon from '../../assets/icon/left-arrow.png'
import { API_BASE, authHeaders } from '../../api/config';
import { io } from 'socket.io-client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { TableSkeleton } from '../../components/SkeletonLoaders';

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   REUSABLE HEADER COMPONENT WITH NOTIFICATIONS
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const TopHeader = ({ employee, title, subtitle, onNavigate }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE}/notifications`, { headers: authHeaders(), withCredentials: true });
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch (err) { console.error('Error fetching notifs:', err); }
    };

    useEffect(() => {
        fetchNotifications();
        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_notification', (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });
        return () => socket.disconnect();
    }, []);

    const markAllRead = async () => {
        try {
            await axios.patch(`${API_BASE}/notifications/mark-read`, {}, { headers: authHeaders(), withCredentials: true });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            setIsOpen(false);
        } catch (err) { console.error(err); }
    };

    const deleteAll = async () => {
        try {
            await axios.delete(`${API_BASE}/notifications/delete-all`, { headers: authHeaders(), withCredentials: true });
            setNotifications([]);
            setUnreadCount(0);
            setIsOpen(false);
        } catch (err) { console.error(err); }
    };

    const handleNotifClick = async (notif) => {
        try {
            if (!notif.isRead) {
                await axios.patch(`${API_BASE}/notifications/${notif._id}/read`, {}, { headers: authHeaders(), withCredentials: true });
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            if (onNavigate) {
                onNavigate('bookings');
                setIsOpen(false);
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
                <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>{title}</h4>
                <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>{subtitle}</p>
            </div>
            <div className="d-flex align-items-center gap-4">
                <div className="text-end">
                    <span className="font-poppins text-dark-gray400 d-block" style={{ fontSize: '0.85rem' }}>
                        Welcome, <strong className="text-dark-secondary">{employee?.fullName ?? 'Employee'}</strong>
                    </span>
                </div>
                <div className="position-relative" style={{ cursor: 'pointer' }}>
                    <div onClick={() => setIsOpen(!isOpen)} className="position-relative d-inline-block p-1">
                        <img src={notifIcon} alt="Notification Icon" style={{ width: '24px' }} />
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {isOpen && (
                        <div className="position-absolute dropdown-menu show shadow-lg rounded-3 mt-2" style={{ right: 0, width: '320px', left: 'auto', zIndex: 1050 }}>
                            <div className="p-3 border-bottom bg-light">
                                <h6 className="mb-0 fw-bold text-dark-secondary">Notifications</h6>
                            </div>
                            <div className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-muted"><small>No new notifications</small></div>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n._id}
                                            className={`notification p-3 border-bottom ${!n.isRead ? 'background-light-secondary' : 'background-light-primary'}`}
                                            onClick={() => handleNotifClick(n)}
                                            style={{ cursor: 'pointer' }}>
                                            <p className="mb-1 text-sm font-poppins text-dark" style={{ fontSize: '0.85rem' }}>{n.message}</p>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(n.createdAt).toLocaleString()}</small>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 border-top d-flex justify-content-between bg-light">
                                <button onClick={markAllRead} className="btn btn-sm btn-link brand-primary text-decoration-none" style={{ fontSize: '0.8rem' }}>Mark all read</button>
                                <button onClick={deleteAll} className="btn btn-sm btn-link text-danger text-decoration-none" style={{ fontSize: '0.8rem' }}>Delete all</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-tabs that belong under the "Services" dropdown
const SERVICE_ITEMS = ['bookings', 'car-rent', 'retail', 'membership'];

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   MAIN COMPONENT
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const EmployeeDashboard = () => {
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toggleActive, setToggleActive] = useState('dashboard');

    // Dropdown stays open when a child tab is already active
    const [isServicesOpen, setIsServicesOpen] = useState(
        SERVICE_ITEMS.includes('dashboard') // false on init; opens when child selected
    );

    // SMCCard Global Management
    const [isSMCModalOpen, setIsSMCModalOpen] = useState(false);
    const [smcData, setSMCData] = useState(null);

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

    /* ΓöÇΓöÇ Rehydrate employee from localStorage on mount ΓöÇΓöÇ */
    useEffect(() => {
        const stored = localStorage.getItem('employee');

        // If employee data is missing or has no role, force re-login
        if (!stored) {
            localStorage.removeItem('employee');
            navigate('/login', { replace: true });
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            if (!parsed.role) {
                // Stale data from before the role fix ΓÇö force re-login
                localStorage.removeItem('employee');
                navigate('/login', { replace: true });
                return;
            }
            setEmployee(parsed);
        } catch {
            localStorage.removeItem('employee');
            navigate('/login', { replace: true });
        }

        setIsLoading(false);
    }, [navigate]);

    /* ΓöÇΓöÇ Auto-open dropdown when a service child tab is active ΓöÇΓöÇ */
    useEffect(() => {
        if (SERVICE_ITEMS.includes(toggleActive)) {
            setIsServicesOpen(true);
        }
    }, [toggleActive]);

    /* ΓöÇΓöÇ Logout with SweetAlert2 confirmation ΓöÇΓöÇ */
    const handleLogout = (isAuto = false) => {
        if (isAuto === true) {
            Swal.fire({
                title: 'Session Expired',
                text: 'You have been logged out due to 15 minutes of inactivity.',
                icon: 'info',
                confirmButtonColor: '#23A0CE',
                confirmButtonText: 'OK',
            }).then(async () => {
                // Clear the httpOnly auth cookie via the backend logout endpoint
                await fetch(`${API_BASE}/employees/logout`, {
                    method: 'POST',
                    headers: authHeaders(),
                    credentials: 'include',
                }).catch(() => { });
                localStorage.removeItem('employee');
                navigate('/login');
            });
            return;
        }

        Swal.fire({
            title: 'Log out?',
            text: 'You will be returned to the login page.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#23A0CE',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, log out',
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Clear the httpOnly auth cookie via the backend logout endpoint
                await fetch(`${API_BASE}/employees/logout`, {
                    method: 'POST',
                    headers: authHeaders(),
                    credentials: 'include',
                }).catch(() => { });
                localStorage.removeItem('employee');
                navigate('/login');
            }
        });
    };

    /* ΓöÇΓöÇ Idle Timeout (15 minutes) ΓöÇΓöÇ */
    useEffect(() => {
        let timeoutId;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            // 15 minutes = 15 * 60 * 1000 = 900000 ms
            timeoutId = setTimeout(() => {
                handleLogout(true);
            }, 900000);
        };

        const events = ['mousemove', 'keydown', 'wheel', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer(); // Initialize on mount

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, []);

    /* ΓöÇΓöÇ Render correct content panel ΓöÇΓöÇ */
    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard':
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} />;
            case 'bookings':
                return <BookingManagement employee={employee} onShowSMC={handleShowSMC} />;
            case 'car-rent':
                return <CarRentManagement employee={employee} />;
            case 'retail':
                return <RetailManagement employee={employee} onSMCRequest={handleFetchSMCById} />;
            case 'membership':
                return <MembershipManagement employee={employee} onSMCRequest={handleFetchSMCById} />;
            default:
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} />;
        }
    };

    /* ΓöÇΓöÇ Loading guard ΓöÇΓöÇ */
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

                {/* ΓöÇΓöÇΓöÇ SIDEBAR ΓöÇΓöÇΓöÇ */}
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

                        {/* Services sub-menu ΓÇö valid HTML: li > ul > li */}
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
                                    <li className="nav-item w-100">
                                        <button
                                            id="nav-retail"
                                            className={`nav-link ps-5 w-100 d-flex align-items-center gap-2 ${toggleActive === 'retail' ? 'active' : ''}`}
                                            onClick={() => setToggleActive('retail')}
                                        >
                                            Retail Store
                                        </button>
                                    </li>
                                    <li className="nav-item w-100">
                                        <button
                                            id="nav-membership"
                                            className={`nav-link ps-5 w-100 d-flex align-items-center gap-2 ${toggleActive === 'membership' ? 'active' : ''}`}
                                            onClick={() => setToggleActive('membership')}
                                        >
                                            Membership
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
                                    color: '#00e8e9', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0,
                                }}
                            >
                                {employee?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p className="mb-0 text-secondary font-poppins" style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.fullName ?? 'Employee'}
                                </p>
                                <p className="mb-0 text-light-gray300 font-poppins" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.role === 'employee' ? 'Staff' : 'Admin'}
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

                {/* ΓöÇΓöÇΓöÇ MAIN CONTENT ΓöÇΓöÇΓöÇ */}
                <main className="right-content-container flex-grow-1 pt-4 px-4 overflow-hidden" style={{ minHeight: '100vh', background: 'var(--background-light-primary)', minWidth: 0 }}>
                    {renderContent()}
                </main>

                {/* Shared Membership Modal */}
                {isSMCModalOpen && smcData && (
                    <SMCCardModal
                        data={smcData}
                        onClose={() => {
                            setIsSMCModalOpen(false);
                            setSMCData(null);
                        }}
                    />
                )}

            </div>
        </div>
    );
};

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   DASHBOARD OVERVIEW ΓÇö KPI Cards
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const DashboardOverview = ({ employee, onNavigate }) => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartFilter, setChartFilter] = useState('daily');

    // Attendance State
    const [attendanceStatus, setAttendanceStatus] = useState('Not Clocked In');
    const [clockInTime, setClockInTime] = useState(null);
    const [clockOutTime, setClockOutTime] = useState(null);
    const [isClocking, setIsClocking] = useState(false);

    // Fetch all bookings for analytics
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await axios.get(`${API_BASE}/booking`, { headers: authHeaders(), withCredentials: true });
                setBookings(response.data);
            } catch (err) {
                console.error("Failed to fetch dashboard analytics data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();

        const fetchAttendance = async () => {
            try {
                const res = await axios.get(`${API_BASE}/attendance/today`, { headers: authHeaders(), withCredentials: true });
                setAttendanceStatus(res.data.status);
                if (res.data.status === 'Clocked In') {
                    setClockInTime(res.data.time);
                } else if (res.data.status === 'Clocked Out') {
                    setClockInTime(res.data.inTime);
                    setClockOutTime(res.data.outTime);
                }
            } catch (err) { console.error('Error fetching attendance', err); }
        };
        fetchAttendance();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', (newBooking) => {
            setBookings(prev => [newBooking, ...prev]);
        });
        socket.on('update_booking', (updatedBooking) => {
            setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        });

        return () => {
            socket.off('new_booking');
            socket.off('update_booking');
            socket.disconnect();
        };
    }, []);

    const handleClockToggle = async () => {
        setIsClocking(true);
        try {
            const res = await axios.post(`${API_BASE}/attendance/clock`, {}, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                title: res.data.message,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });

            setAttendanceStatus(res.data.status);
            if (res.data.status === 'Clocked In') {
                setClockInTime(res.data.record.clockInTime);
            } else if (res.data.status === 'Clocked Out') {
                setClockOutTime(res.data.record.clockOutTime);
            }
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to clock time.', 'error');
        } finally {
            setIsClocking(false);
        }
    };

    // Calculate Real-Time Metrics
    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBookings = bookings.filter(b => {
            const d = new Date(b.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        const activePending = bookings.filter(b => b.status === 'Pending' || b.status === 'Processing').length;
        const completedToday = todayBookings.filter(b => b.status === 'Completed').length;
        const todayRevenue = todayBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        return {
            todayCount: todayBookings.length,
            completedToday,
            activePending,
            todayRevenue
        };
    }, [bookings]);

    // Data Transformers for Charts
    const chartData = useMemo(() => {
        if (!bookings.length) return { historical: [], services: [] };

        const historicalMap = {};
        const now = new Date();

        if (chartFilter === 'daily') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                historicalMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
            });
        } else if (chartFilter === 'weekly') {
            for (let i = 3; i >= 0; i--) {
                const sd = new Date(now.getTime() - ((i + 1) * 7 * 86400000));
                const ed = new Date(now.getTime() - (i * 7 * 86400000));
                historicalMap[`Wk ${4 - i}`] = { revenue: 0, count: 0, startTs: sd.getTime(), endTs: ed.getTime() };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const bTime = new Date(b.createdAt).getTime();
                Object.keys(historicalMap).forEach(key => {
                    const w = historicalMap[key];
                    if (bTime >= w.startTs && bTime < w.endTs) {
                        w.revenue += (b.totalPrice || 0);
                        w.count++;
                    }
                });
            });
        } else if (chartFilter === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                historicalMap[d.toLocaleDateString('en-US', { month: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short' });
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
            });
        } else if (chartFilter === 'yearly') {
            for (let i = 4; i >= 0; i--) {
                const d = new Date();
                d.setFullYear(d.getFullYear() - i);
                historicalMap[d.getFullYear().toString()] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).getFullYear().toString();
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
            });
        }

        const historical = Object.keys(historicalMap).map(key => ({
            name: key,
            revenue: historicalMap[key].revenue || 0,
            volume: historicalMap[key].count || 0
        }));

        /* 2. Service Popularity */
        const serviceCounts = { Wash: 0, Wax: 0, Engine: 0, Armor: 0 };
        bookings.forEach(b => {
            if (Array.isArray(b.serviceType)) {
                b.serviceType.forEach(s => {
                    const trimmed = s.trim();
                    if (serviceCounts[trimmed] !== undefined) serviceCounts[trimmed]++;
                });
            } else if (b.serviceType) {
                const trimmed = b.serviceType.trim();
                if (serviceCounts[trimmed] !== undefined) serviceCounts[trimmed]++;
            }
        });

        const services = Object.keys(serviceCounts).map(key => ({
            name: key, value: serviceCounts[key]
        })).filter(s => s.value > 0);

        return { historical, services };
    }, [bookings, chartFilter]);

    const PIE_COLORS = ['#23A0CE', '#f59e0b', '#22c55e', '#f43f5e'];

    const stats = [
        { label: 'Bookings Today', value: metrics.todayCount, icon: <img src={bookingsIcon} alt="Bookings Icon" />, color: '#23A0CE' },
        { label: 'Completed Today', value: metrics.completedToday, icon: <img src={bookingsCompleted} alt="Bookings Completed" />, color: '#22c55e' },
        { label: 'Pending / Action Req.', value: metrics.activePending, icon: <img src={bookingsPending} alt="Bookings Pending" />, color: '#f59e0b' },
        { label: "Today's Revenue", value: `Γé▒${metrics.todayRevenue.toLocaleString()}`, icon: <h4 className="m-0" style={{ color: '#a855f7' }}>Γé▒</h4>, color: '#a855f7' },
    ];

    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Header */}
            <TopHeader
                employee={employee}
                title="System Overview"
                subtitle={todayDate}
                onNavigate={onNavigate}
            />

            {/* ATTENDANCE WIDGET */}
            <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #0d1b1b, #153232)' }}>
                <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', background: 'rgba(35,160,206,0.15)', color: '#23A0CE' }}>
                            {employee?.fullName?.charAt(0)?.toUpperCase() ?? 'J'}
                        </div>
                        <div>
                            <h5 className="mb-1 text-white fw-bold">Daily Attendance</h5>
                            <p className="mb-0 text-white-50" style={{ fontSize: '0.9rem' }}>
                                Status: <strong style={{ color: attendanceStatus === 'Clocked In' ? '#22c55e' : attendanceStatus === 'Not Clocked In' ? '#f59e0b' : '#9ca3af' }}>{attendanceStatus}</strong>
                                {clockInTime && ` ΓÇó In: ${new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                {clockOutTime && ` ΓÇó Out: ${new Date(clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                        </div>
                    </div>
                    <div>
                        <button
                            className="btn rounded-pill px-4 fw-bold"
                            style={{
                                background: attendanceStatus === 'Not Clocked In' ? '#22c55e' : attendanceStatus === 'Clocked In' ? '#ef4444' : '#374151',
                                color: '#fff',
                                boxShadow: attendanceStatus === 'Clocked Out' ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                            onClick={handleClockToggle}
                            disabled={isClocking || attendanceStatus === 'Clocked Out'}
                        >
                            {isClocking ? <span className="spinner-border spinner-border-sm" /> : attendanceStatus === 'Not Clocked In' ? 'Clock In' : attendanceStatus === 'Clocked In' ? 'Clock Out' : 'Shift Completed'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {stats.map((stat) => (
                    <div className="col-sm-6 col-xl-3" key={stat.label}>
                        <div
                            className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden"
                            style={{
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.07)',
                                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s',
                            }}
                        >
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: stat.color, filter: 'blur(30px)', opacity: 0.15 }}></div>

                            <div className="d-flex justify-content-between align-items-start mb-3 position-relative z-1">
                                <span style={{ fontSize: '1.6rem' }}>{stat.icon}</span>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: stat.color, display: 'inline-block', marginTop: 6 }} />
                            </div>
                            <div className="position-relative z-1">
                                <p className="mb-1 text-dark-gray400 font-poppins" style={{ fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {stat.label}
                                </p>
                                <h3 className="mb-0 text-dark-secondary font-poppins" style={{ fontWeight: 700, color: stat.color }}>
                                    {isLoading ? '...' : stat.value}
                                </h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ΓöÇΓöÇΓöÇ CHARTS SECTION ΓöÇΓöÇΓöÇ */}
            <div className="row g-4 mb-4">
                {/* 1. Bar Chart: Revenue */}
                <div className="col-12 col-xl-8">
                    <div className="p-4 rounded-4 h-100 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
                            <div>
                                <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Historical Revenue</h6>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Tracks combined car wash earnings</p>
                            </div>
                            <div className="btn-group shadow-sm">
                                {['daily', 'weekly', 'monthly', 'yearly'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setChartFilter(filter)}
                                        className={`btn btn-sm ${chartFilter === filter ? 'btn-primary text-white' : 'btn-light border'} text-capitalize`}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(value) => `Γé▒${value}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(35,160,206,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [`Γé▒${value.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#23A0CE" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Pie Chart: Service Popularity */}
                <div className="col-12 col-xl-4">
                    <div className="p-4 rounded-4 h-100 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-2">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Service Popularity</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Lifetime distribution</p>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : chartData.services.length === 0 ? (
                            <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250, fontSize: '0.9rem' }}>No service data yet</div>
                        ) : (
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData.services}
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {chartData.services.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '0.8rem' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Line Chart: Booking Volume */}
                <div className="col-12">
                    <div className="p-4 rounded-4 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-4">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Booking Volume</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Tracks number of completed car wash bookings</p>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [value, 'Cars Washed']}
                                        />
                                        <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   BOOKING MODAL (View / Edit)
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const BookingModal = ({ booking, onClose, showToast, onSave, onPrint, onSMC }) => {
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
        assignedTo: booking.assignedTo || '',
        smcId: booking.smcId || '',
        promoCode: booking.promoCode || '',
        discountAmount: booking.discountAmount || 0,
        purchasedProducts: booking.purchasedProducts || [],
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
                if (!silent) showToast(`Promo Applied! Saved Γé▒${discount.toLocaleString()}`);
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

    // Fetch detailers once on mount
    useEffect(() => {
        axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true })
            .then(res => setDetailers(res.data.filter(e => e.role === 'detailer')))
            .catch(err => console.error('Failed to fetch detailers', err));
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
                detailer: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.detailer
            };
            await axios.patch(`${API_BASE}/booking/${booking._id}`, payload, { headers: authHeaders(), withCredentials: true });
            showToast('Booking details updated successfully.');
            onSave(); // Re-fetch data and close
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
        if (booking.promoCode && !promoInfo.error) {
            // No need to verify promo on every open as it recalculates, but we could if we wanted.
            // But let's just use the stored discount for now unless edited.
        }
    }, [booking.smcId, booking.promoCode]);

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
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content rounded-4 shadow border-0 bg-white">
                    <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-start flex-wrap gap-2">
                        <div>
                            <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>
                                Booking Details <span className="fw-normal text-dark-secondary" style={{ fontSize: '0.75rem' }}>#{booking.batchId || booking._id.substring(0, 8)}</span>
                            </h5>
                            <div className="mt-1">
                                <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    Total: Γé▒{(editMode ? liveTotalPrice : storedTotalPrice).toLocaleString()}
                                    {editMode && liveTotalPrice !== storedTotalPrice && storedTotalPrice > 0 && (
                                        <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.75rem' }}>(was Γé▒{storedTotalPrice.toLocaleString()})</span>
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
                                        <div className="d-flex gap-2">
                                            <input type="text" name="smcId" className="form-control form-control-sm shadow-none font-monospace text-uppercase" placeholder="Scan SMC ID" value={formData.smcId} onChange={handleChange} disabled={!editMode} />
                                            {editMode && (
                                                <button type="button" className="btn btn-sm btn-outline-primary shadow-none px-2" onClick={() => handleSMCVerification()} disabled={isVerifyingSMC || !formData.smcId}>
                                                    {isVerifyingSMC ? '...' : 'Verify'}
                                                </button>
                                            )}
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
                                        {promoInfo.isValid && <small className="text-success d-block mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>Promo Active: -Γé▒{promoInfo.discount.toLocaleString()}</small>}
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
                                                                    {isSelected && <span className="me-1">Γ£ô</span>} {service.name}
                                                                    {editMode && <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>Γé▒{service.price}</span>}
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
                                                                        {isSelected && <span className="me-1">Γ£ô</span>} {addon.name}
                                                                        {editMode && <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>Γé▒{addon.price}</span>}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {/* Purchased Retail Products ΓÇö always visible */}
                                    <div className="col-12">
                                        <label className="form-label brand-primary mb-1 mt-1" style={{ fontSize: '0.8rem' }}>Retail / Products Bought</label>
                                        <div className="d-flex flex-column gap-2">
                                            {formData.purchasedProducts.length === 0 && !editMode && (
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>None</span>
                                            )}
                                            {formData.purchasedProducts.map((p, idx) => (
                                                <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="badge bg-secondary text-truncate" style={{ maxWidth: '130px' }}>{p.productName}</span>
                                                        <span className="text-dark" style={{ fontSize: '0.75rem', fontWeight: 500 }}>x{p.quantity} (Γé▒{(p.price * p.quantity).toLocaleString()})</span>
                                                    </div>
                                                    {editMode && <button type="button" className="btn btn-sm text-danger p-0 border-0 shadow-none" onClick={() => removeRetailProduct(idx)}>Γ£û</button>}
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
                                                                    {prod.name} (Γé▒{prod.basePrice}){stock !== null ? ` ΓÇö Stock: ${stock}` : ''}{outOfStock ? ' [Out of Stock]' : ''}
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
                                            <option value="">ΓÇö- Unassigned -ΓÇö</option>
                                            {detailers.map(d => (
                                                <option key={d._id} value={d._id}>{d.fullName}</option>
                                            ))}
                                        </select>
                                        {!editMode && !formData.assignedTo && (
                                            <small className="text-warning d-block mt-1" style={{ fontSize: '0.72rem' }}>ΓÜá No detailer assigned</small>
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
                                                    <div className="position-absolute d-flex align-items-center justify-content-center bg-white"
                                                        style={{ width: '34px', height: '34px', borderRadius: '50%', border: log.status === 'Cancelled' ? '2px solid #dc3545' : '2px solid #23A0CE', left: '-18px', top: '-4px', zIndex: 1 }}>
                                                        {iconSrc ? (
                                                            <img src={iconSrc} alt={log.status} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ color: log.status === 'Cancelled' ? '#dc3545' : '#23A0CE', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>
                                                                {log.status === 'Cancelled' ? '├ù' : 'ΓÇó'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Text Block */}
                                                    <div className="fw-bold font-poppins text-dark" style={{ fontSize: '0.95rem', color: log.status === 'Cancelled' ? '#dc3545' : '#262626', paddingTop: '2px' }}>
                                                        {log.status}
                                                    </div>
                                                    <div className="text-dark-gray300 font-poppins" style={{ fontSize: '0.78rem', marginTop: '0' }}>
                                                        {new Date(log.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {durationText && (
                                    <div className="mt-2 p-3 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#166534', fontSize: '0.85rem', fontWeight: 500 }}>
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
            </div>
        </div>
    );
};

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   CREATE BOOKING MODAL
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
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
                showToast(`Promo Applied! Saved Γé▒${discount.toLocaleString()}`);
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
            axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true })
        ])
            .then(([availRes, pricingRes, empRes, prodRes, invRes]) => {
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
                detailer: (!formData.assignedTo || formData.assignedTo === '') ? null : formData.detailer
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
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content rounded-4 shadow border-0 bg-white">
                    <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex align-items-center flex-wrap gap-2">
                        <div className="me-auto">
                            <h5 className="modal-title font-poppins text-dark-secondary fw-bold mb-0" style={{ fontSize: '1.25rem' }}>Create New Booking</h5>
                            <div className="mt-1">
                                <span className="badge rounded-pill px-3 py-2 font-poppins" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.3)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    Estimated Total: Γé▒{liveTotalPrice.toLocaleString()}
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
                                ΓÜí Quick Walk-in
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
                                            <input type="text" name="phoneNumber" className="form-control form-control-sm shadow-none" value={formData.phoneNumber} onChange={handleChange} placeholder="e.g. 9123456789" />
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
                                        {smcDiscountInfo.isValid && <small className="text-success d-block mt-1 fw-medium" style={{ fontSize: '0.75rem' }}>Valid SMC ΓÇö {smcDiscountInfo.percentage}% Discount Applied</small>}
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
                                        {promoInfo.isValid && <small className="text-success d-block mt-1 fw-bold" style={{ fontSize: '0.7rem' }}>Promo Active: -Γé▒{promoInfo.discount.toLocaleString()}</small>}
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
                                            <option value="">ΓÇö- Unassigned -ΓÇö</option>
                                            {detailers.map(d => (
                                                <option key={d._id} value={d._id}>{d.fullName}</option>
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
                                                        <button type="button" onClick={() => toggleService(service.name)} className={`btn rounded-pill px-3 w-100 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`} style={{ fontSize: '0.8rem' }}>
                                                            {isSelected && <span className="me-1">Γ£ô</span>} {service.name}
                                                            <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>Γé▒{service.price}</span>
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
                                                            <button type="button" onClick={() => toggleService(addon.name)} className={`btn rounded-pill px-3 w-100 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-dark-secondary'}`} style={{ fontSize: '0.8rem' }}>
                                                                {isSelected && <span className="me-1">Γ£ô</span>} {addon.name}
                                                                <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>Γé▒{addon.price}</span>
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
                                                <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="badge" style={{ background: '#23A0CE' }}>{p.productName}</span>
                                                        <span className="text-dark" style={{ fontSize: '0.75rem', fontWeight: 500 }}>x{p.quantity} (Γé▒{(p.price * p.quantity).toLocaleString()})</span>
                                                    </div>
                                                    <button type="button" className="btn btn-sm text-danger p-0 border-0 shadow-none" onClick={() => removeRetailProduct(idx)}>Γ£û</button>
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
                                                                    {prod.name} (Γé▒{prod.basePrice}){stock !== null ? ` ΓÇö Stock: ${stock}` : ''}{outOfStock ? ' [Out of Stock]' : ''}
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
            </div>
        </div>
    );
};


/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   RECEIPT MODAL  
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const ReceiptModal = ({ booking, onClose }) => {
    const receiptRef = useRef();
    const [dynamicPricingData, setDynamicPricingData] = useState([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Fetch dynamic pricing data
    useEffect(() => {
        axios.get(`${API_BASE}/pricing`)
            .then(res => {
                if (res.data && res.data.dynamicPricing) {
                    setDynamicPricingData(res.data.dynamicPricing);
                }
            })
            .catch(err => console.error("Failed to fetch receipt pricing", err));
    }, []);

    const getServicePrice = (label) => {
        const activeVehicleData = dynamicPricingData.find(v => v.vehicleType === booking.vehicleType);
        if (!activeVehicleData) return null;
        const serv = activeVehicleData.services?.find(s => s.name === label);
        const add = activeVehicleData.addons?.find(a => a.name === label);
        if (serv) return serv.price;
        if (add) return add.price;
        return null;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!receiptRef.current) return;
        setIsGeneratingPdf(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 3, // Higher scale for crisp text on small prints
                logging: false,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL('image/png');

            // Set for 80mm thermal paper width
            const widthMm = 80;
            const heightMm = (canvas.height * widthMm) / canvas.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [widthMm, heightMm]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
            pdf.save(`Sandigan-Receipt-${booking.batchId || booking._id.substring(0, 8)}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            Swal.fire('Error', 'Could not generate PDF.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const qrLink = "https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net";

    return (
        <div className="modal show d-block no-print-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered no-print-dialog" style={{ maxWidth: '400px' }}>
                <div className="modal-content rounded-4 shadow border-0 overflow-hidden bg-white">
                    <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center no-print">
                        <h5 className="modal-title font-poppins fw-bold text-dark-secondary">Receipt Preview</h5>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-0 pt-3">
                        {/* THE ACTUAL RECEIPT CONTAINER */}
                        <div id="receipt-content" ref={receiptRef} className="receipt-paper mx-auto p-4 bg-white" style={{ fontFamily: 'monospace', color: '#333' }}>
                            <div className="text-center mb-4">
                                <img src={sandiganLogo} alt="Logo" style={{ width: '80px', marginBottom: '10px', filter: 'grayscale(1)' }} />
                                <p className="mb-0 fw-bold" style={{ fontSize: '0.9rem' }}>Carwash & Car Rental</p>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.65rem' }}>68 Ruhale st. Calzada Tipas Taguig City</p>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.65rem' }}>+63 912 345 6789</p>
                            </div>

                            <div className="d-flex justify-content-between mb-2" style={{ borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.75rem' }}>RECEIPT #: {booking.batchId}</span>
                                <span style={{ fontSize: '0.75rem' }}>{new Date().toLocaleDateString()}</span>
                            </div>

                            <div className="mb-3" style={{ borderBottom: '1px dashed #ccc', paddingBottom: '10px' }}>
                                <p className="mb-1" style={{ fontSize: '0.8rem' }}><strong>Customer:</strong> {booking.firstName} {booking.lastName}</p>
                                <p className="mb-1" style={{ fontSize: '0.8rem' }}><strong>Vehicle:</strong> {booking.vehicleType}</p>
                                <p className="mb-0" style={{ fontSize: '0.8rem' }}><strong>Detailer:</strong> {booking.detailer || 'Management'}</p>

                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between fw-bold border-bottom pb-1 mb-2" style={{ fontSize: '0.8rem' }}>
                                    <span>SERVICE</span>
                                    <span>PRICE</span>
                                </div>
                                {booking.serviceType?.map((service, idx) => {
                                    const price = getServicePrice(service);
                                    return (
                                        <div key={idx} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                                            <span>{service}</span>
                                            <span>Γé▒{price !== null ? price.toLocaleString() : '---'}</span>
                                        </div>
                                    );
                                })}
                                {booking.purchasedProducts && booking.purchasedProducts.length > 0 && (
                                    <>
                                        <div className="d-flex justify-content-between fw-bold border-bottom pb-1 mt-2 mb-2" style={{ fontSize: '0.8rem' }}>
                                            <span>RETAIL ITEMS</span>

                                        </div>
                                        {booking.purchasedProducts.map((prod, idx) => (
                                            <div key={idx} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                                                <span>{prod.productName} x{prod.quantity}</span>
                                                <span>Γé▒{(prod.price * prod.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            <div className="pt-2 border-top" style={{ borderTop: '2px solid #333 !important' }}>
                                {booking.discountAmount > 0 && (
                                    <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                        <span>SMC DISCOUNT</span>
                                        <span>-Γé▒{booking.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {booking.promoDiscount > 0 && (
                                    <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                        <span>PROMO DISCOUNT</span>
                                        <span>-Γé▒{booking.promoDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between fw-bold" style={{ fontSize: '1.1rem' }}>
                                    <span>TOTAL</span>
                                    <span>Γé▒{booking.totalPrice?.toLocaleString()}</span>
                                </div>
                                <p className="text-center mt-2 text-uppercase fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '4px', opacity: 0.8 }}>*** PAID ***</p>
                            </div>

                            <div className="text-center mt-4">
                                <div className="d-flex justify-content-center mb-2">
                                    <QRCodeCanvas
                                        value={qrLink}
                                        size={90}
                                        level={"H"}
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="mb-1" style={{ fontSize: '0.7rem', fontWeight: 600 }}>SCAN TO VISIT US</p>
                                <p className="mb-0" style={{ fontSize: '0.6rem' }}>sandigan-carwash.com</p>
                            </div>

                            <div className="text-center mt-4 pt-3" style={{ borderTop: '1px dashed #ccc' }}>
                                <p className="mb-0" style={{ fontSize: '0.7rem' }}>THANK YOU FOR YOUR BUSINESS!</p>
                                <p className="mb-0" style={{ fontSize: '0.6rem', color: '#888' }}>Please come again soon</p>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-top-0 p-4 pt-2 no-print flex-column gap-2">
                        <button className="btn brand-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handlePrint}>
                            <span className="me-2"></span> Print Receipt
                        </button>
                        <button className="btn btn-outline-success rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                            <span className="me-2"></span> {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
                        </button>
                        <button className="btn btn-light rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>

            {/* Print-only CSS injection */}
            <style>
                {`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body * {
                        display: none !important;
                    }
                    .no-print-backdrop, .no-print-backdrop div, #receipt-content, #receipt-content * {
                        display: block !important;
                        visibility: visible !important;
                    }
                    .no-print-backdrop {
                        background: none !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                    }
                    .modal-dialog {
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                    }
                    .modal-content {
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #receipt-content {
                        width: 100% !important;
                        max-width: 80mm !important; /* Standard thermal receipt width */
                        margin: 0 auto !important;
                        padding: 10mm !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
                `}
            </style>
        </div>
    );
};


/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   SMC CARD MODAL  
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const SMCCardModal = ({ data, onClose }) => {
    const cardRef = useRef();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [config, setConfig] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get(`${API_BASE}/crm/config/smc`, {
                    headers: authHeaders(),
                    withCredentials: true
                });
                setConfig(res.data);
            } catch (err) {
                console.error("Failed to fetch SMC config", err);
                // Fallback to standard design to prevent infinite loading
                setConfig({
                    cardName: 'Sandigan Membership',
                    cardColor: '#0f172a',
                    abbreviation: 'SMC',
                    validityMonths: 12
                });
            }
        };
        fetchConfig();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!config || !cardRef.current) {
            Swal.fire('Wait', 'Card design is still loading. Please try again in a moment.', 'info');
            return;
        }

        setIsGeneratingPdf(true);
        try {
            // Give a tiny moment for QR & Fonts to settle
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: null,
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
            pdf.save(`Sandigan_SMC_${data.smcId}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed", error);
            Swal.fire('Error', 'Could not generate card PDF. Please try printing instead or refresh the page.', 'error');
        }
        setIsGeneratingPdf(false);
    };

    const qrLink = `https://sandigan-carwash.com/validate/${data.smcId}`;

    return (
        <div className="modal show d-block no-print-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content rounded-4 shadow border-0 overflow-hidden bg-white">
                    <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center no-print">
                        <h5 className="modal-title font-poppins fw-bold text-dark-secondary">Membership Card Preview</h5>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body py-4">
                        {!config ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                                <p className="small text-muted mt-2">Loading card design...</p>
                            </div>
                        ) : (
                            <div id="smc-card-content" ref={cardRef} className="mx-auto" style={{
                                width: '400px',
                                height: '240px',
                                borderRadius: '16px',
                                background: `linear-gradient(135deg, ${config.cardColor || '#0f172a'} 0%, #1e3a8a 100%)`,
                                color: 'white',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                fontFamily: 'Poppins, sans-serif'
                            }}>
                                {/* Decorative Patterns */}
                                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '75px', background: 'rgba(255,255,255,0.03)' }}></div>

                                <div className="p-4 h-100 d-flex flex-column justify-content-between">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="d-flex align-items-center gap-2">
                                            <img src={sandiganLogo} alt="Logo" style={{ height: '35px' }} />
                                            <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px' }}>{config.cardName?.toUpperCase() || 'SANDIGAN'}</span>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-end mt-2">
                                        <div>
                                            <p className="mb-0 font-monospace fw-bold" style={{ fontSize: '1.3rem', letterSpacing: '4px' }}>{data.smcId}</p>
                                            <p className="mb-0 opacity-75 mt-1" style={{ fontSize: '0.65rem', fontWeight: 500, letterSpacing: '1px' }}>
                                                {data.smcExpiryDate || data.expiryDate ?
                                                    `VALID UNTIL: ${new Date(data.smcExpiryDate || data.expiryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`
                                                    : 'LIFETIME ACCESS'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-1 rounded-3 shadow-sm">
                                            <QRCodeCanvas value={qrLink} size={60} level={"H"} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-top-0 p-4 pt-2 no-print flex-column gap-2">
                        <button className="btn brand-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handlePrint} disabled={!config}>
                            Print Membership Card
                        </button>
                        <button className="btn btn-outline-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handleDownloadPdf} disabled={isGeneratingPdf || !config}>
                            {isGeneratingPdf ? 'Generating...' : 'Download for Customer'}
                        </button>
                        <button className="btn btn-light rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>

            <style>
                {`
                @media print {
                    body * { display: none !important; }
                    .no-print-backdrop, #smc-card-content, #smc-card-content * {
                        display: block !important;
                        visibility: visible !important;
                    }
                    .no-print-backdrop {
                        background: none !important;
                        position: absolute !important;
                        top: 0; left: 0;
                    }
                    #smc-card-content {
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        margin: 20px auto !important;
                    }
                }
                `}
            </style>
        </div>
    );
};


/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   BOOKING MANAGEMENT
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const BookingManagement = ({ employee, onShowSMC }) => {
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


    return (
        <div className="position-relative">
            {/* ΓöÇΓöÇΓöÇ TOAST CONTAINER ΓöÇΓöÇΓöÇ */}
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
                title="Manage Bookings"
                subtitle="View and update all carwash bookings"
            />

            {/* 4. Display Loading State or Table */}
            <div className="rounded-4 p-4 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="mt-2 text-dark-gray400">Loading bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-5 text-dark-gray400">
                        No bookings found.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Customer Name</th>
                                    <th>Service</th>
                                    <th>Total Price</th>
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
                                        <td>Γé▒{booking.totalPrice.toLocaleString()}</td>
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
                                                <option value="Pending" disabled={['Confirmed', 'Queued', 'Completed', 'In-progress'].includes(booking.status)}>≡ƒƒí Pending</option>
                                                <option value="Confirmed" disabled={['Queued', 'Completed', 'In-progress'].includes(booking.status)}>≡ƒö╡ Confirmed</option>
                                                <option value="Queued" disabled={['Pending', 'Completed', 'In-progress'].includes(booking.status)}>≡ƒƒú Queued</option>
                                                <option value="In-progress" disabled={['Pending', 'Completed'].includes(booking.status)}>≡ƒƒá In-progress</option>
                                                <option value="Completed" >≡ƒƒó Completed</option>
                                                <option value="Cancelled" disabled={['In-progress']}>≡ƒö┤ Cancelled</option>
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
                )}
            </div>
            {selectedBooking && (
                <BookingModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    showToast={showToast}
                    onPrint={(b) => {
                        setReceiptBooking(b);
                        setIsReceiptModalOpen(true);
                    }}
                    onSMC={(bookingId) => handleShowSMC(bookingId)}
                    onSave={() => {
                        setSelectedBooking(null);
                        fetchBookings(); // Refresh data to get newly saved logs
                    }}
                />
            )}

            {isReceiptModalOpen && receiptBooking && (
                <ReceiptModal
                    booking={receiptBooking}
                    onClose={() => {
                        setIsReceiptModalOpen(false);
                        setReceiptBooking(null);
                    }}
                />
            )}

            {isSMCModalOpen && smcData && (
                <SMCCardModal
                    data={smcData}
                    onClose={() => {
                        setIsSMCModalOpen(false);
                        setSMCData(null);
                    }}
                />
            )}

            {isCreateModalOpen && (
                <CreateBookingModal
                    onClose={() => setIsCreateModalOpen(false)}
                    showToast={showToast}
                    onSave={() => {
                        setIsCreateModalOpen(false);
                        fetchBookings();
                    }}
                />
            )}




            {/* ΓöÇΓöÇΓöÇ FLOATING ACTION BUTTON ΓöÇΓöÇΓöÇ */}
            <button
                className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center p-0"
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '40px',
                    right: '40px',
                    width: '60px',
                    height: '60px',
                    zIndex: 1000,
                    transition: 'transform 0.2s',
                    background: 'linear-gradient(135deg, #23A0CE 0%, #1a88b1 100%)',
                    border: '3px solid #fff'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Create New Booking"
            >
                <span style={{ fontSize: '2rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>+</span>            </button>
        </div>
    );
};

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   CAR RENT MANAGEMENT
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   RETAIL MANAGEMENT (POS)
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const RetailManagement = ({ employee, onSMCRequest }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localQuantities, setLocalQuantities] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 18;

    const fetchData = async () => {
        try {
            const [prodRes, saleRes] = await Promise.all([
                axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/retail`, { headers: authHeaders(), withCredentials: true })
            ]);
            setProducts(prodRes.data);
            setSales(saleRes.data);

            // Initialize local quantities
            const initialQtys = {};
            prodRes.data.forEach(p => {
                initialQtys[p._id] = p.stock > 0 ? 1 : 0;
            });
            setLocalQuantities(initialQtys);

            setIsLoading(false);
        } catch (err) {
            console.error('POS fetch error:', err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLocalQtyChange = (id, val, stock) => {
        const num = Math.max(1, Math.min(stock, parseInt(val) || 1));
        setLocalQuantities(prev => ({ ...prev, [id]: num }));
    };

    const addToCart = (product) => {
        const requestedQty = localQuantities[product._id] || 1;
        const currentInCart = cart.find(item => item._id === product._id)?.qty || 0;
        const totalAfterAdding = currentInCart + requestedQty;

        if (totalAfterAdding > product.stock) {
            Swal.fire({
                title: 'Stock Limit Reached',
                text: `Only ${product.stock} units available. You already have ${currentInCart} in your cart.`,
                icon: 'warning',
                confirmButtonColor: '#23A0CE'
            });
            return;
        }

        setCart(prev => {
            const exists = prev.find(item => item._id === product._id);
            if (exists) {
                return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + requestedQty } : item);
            }
            return [...prev, { ...product, qty: requestedQty }];
        });

        // Reset local qty to 1 (if stock permits)
        setLocalQuantities(prev => ({ ...prev, [product._id]: product.stock > 0 ? 1 : 0 }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i._id !== id));

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            // Process each item in cart as a sale
            for (const item of cart) {
                await axios.post(`${API_BASE}/retail/buy`, {
                    productId: item._id,
                    quantity: item.qty
                }, { headers: authHeaders(), withCredentials: true });
            }

            Swal.fire({ title: 'Purchase Successful!', text: 'Stock and revenue have been updated.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });

            setCart([]);
            fetchData();
        } catch (err) {
            Swal.fire('Checkout Failed', err.response?.data?.error || 'Error processing sale.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.basePrice * item.qty), 0);

    const filteredSales = sales.filter(s =>
        s.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.smcId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Reset to page 1 on search or fetch
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sales.length]);

    return (
        <div>
            <TopHeader
                employee={employee}
                title="Retail Store"
                subtitle="Direct product sales and membership issuance"
            />

            <div className="row g-4">
                {/* Product Catalog */}
                <div className="col-lg-8">
                    <div className="rounded-4 p-4 shadow-sm h-100 overflow-y-auto" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', maxHeight: '550px' }}>
                        <h6 className="fw-bold mb-4 font-poppins text-dark-secondary">PRODUCT CATALOG</h6>
                        {isLoading ? (
                            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
                                {products.map(p => (
                                    <div className="col" key={p._id}>
                                        <div className="p-3 border rounded-3 h-100 d-flex flex-column justify-content-between hover-shadow transition-all position-relative" style={{ minHeight: '220px' }}>
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div className="d-flex flex-column gap-1">
                                                        <span className="badge bg-light text-dark border align-self-start" style={{ fontSize: '0.6rem' }}>{p.category}</span>
                                                        <span className={`fw-bold ${p.stock > 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.7rem' }}>
                                                            {p.stock > 0 ? `Stock: ${p.stock}` : 'Out of Stock'}
                                                        </span>
                                                    </div>
                                                    <span className="fw-bold brand-primary" style={{ fontSize: '0.9rem' }}>Γé▒{p.basePrice}</span>
                                                </div>
                                                <h6 className="mb-1 fw-bold text-dark-secondary" style={{ fontSize: '0.9rem' }}>{p.name}</h6>
                                                <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{p.description || 'No description'}</p>
                                            </div>

                                            <div>
                                                {p.stock > 0 && (
                                                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                                        <small className="text-muted font-poppins" style={{ fontSize: '0.7rem' }}>Qty:</small>
                                                        <div className="input-group input-group-sm flex-nowrap" style={{ width: '90px' }}>
                                                            <button className="btn btn-outline-secondary py-0" onClick={() => handleLocalQtyChange(p._id, (localQuantities[p._id] || 1) - 1, p.stock)}>-</button>
                                                            <input
                                                                type="text"
                                                                className="form-control text-center py-0 shadow-none border-secondary-subtle"
                                                                value={localQuantities[p._id] || 0}
                                                                onChange={(e) => handleLocalQtyChange(p._id, e.target.value, p.stock)}
                                                                style={{ fontSize: '0.75rem' }}
                                                            />
                                                            <button className="btn btn-outline-secondary py-0" onClick={() => handleLocalQtyChange(p._id, (localQuantities[p._id] || 1) + 1, p.stock)}>+</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-primary w-100 rounded-pill shadow-none fw-bold"
                                                    style={{ fontSize: '0.75rem' }}
                                                    disabled={p.stock === 0}
                                                    onClick={() => addToCart(p)}
                                                >
                                                    {p.stock === 0 ? 'Unavailable' : 'Add to Cart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Shopping Cart */}
                <div className="col-lg-4">
                    <div className="rounded-4 p-4 shadow-sm sticky-top" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', top: '100px', maxHeight: '550px' }}>
                        <h6 className="fw-bold mb-4 font-poppins text-dark-secondary">CURRENT ORDER</h6>
                        <div className="mb-4 overflow-y-auto" style={{ maxHeight: '320px', minHeight: '320px' }}>
                            {cart.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <p style={{ fontSize: '0.85rem' }}>Your cart is empty</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {cart.map(item => (
                                        <div key={item._id} className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border">
                                            <div style={{ flex: 1 }}>
                                                <p className="mb-0 fw-bold text-dark-secondary" style={{ fontSize: '0.8rem' }}>{item.name}</p>
                                                <small className="text-muted">Γé▒{item.basePrice} x {item.qty}</small>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold brand-primary" style={{ fontSize: '0.8rem' }}>Γé▒{(item.basePrice * item.qty).toLocaleString()}</span>
                                                <button className="btn btn-sm text-danger p-0 border-0" onClick={() => removeFromCart(item._id)}>Γ£û</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-top pt-3 sticky-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted font-poppins">Total Amount</span>
                                <h4 className="mb-0 fw-bold text-dark-secondary">Γé▒{cartTotal.toLocaleString()}</h4>
                            </div>
                            <button
                                className="btn btn-save w-100 py-3 rounded-4 fw-bold shadow-sm"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                            >
                                {isProcessing ? 'Processing...' : 'Complete Payment'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="col-12 mt-4">
                    <div className="rounded-4 p-4 shadow-sm d-flex flex-column" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', minHeight: '970px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h6 className="fw-bold mb-0 font-poppins text-dark-secondary">RECENT POS TRANSACTIONS</h6>
                            <div className="d-flex align-items-center shadow-none border rounded-3 overflow-hidden">
                                <span className="input-group-text bg-transparent border-0"><img src={searchIcon} alt="Search Icon" style={{ width: '16px' }} /></span>
                                <input
                                    type="text"
                                    className="form-control border-0 bg-transparent shadow-none font-poppins ps-0"
                                    placeholder="Search entries..."
                                    style={{ fontSize: '0.8rem' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr style={{ fontSize: '0.85rem' }}>
                                        <th>Transaction ID</th>
                                        <th>Product</th>
                                        <th>Qty</th>
                                        <th>Total</th>
                                        <th>Ref</th>
                                        <th>Date & Time</th>
                                        <th>SMC Linked</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSales.length > 0 ? currentSales.map(s => (
                                        <tr key={s._id} style={{ fontSize: '0.85rem' }}>
                                            <td className="font-monospace text-uppercase fw-bold text-dark-secondary">{s.transactionId}</td>
                                            <td>{s.productName}</td>
                                            <td>{s.quantity}</td>
                                            <td className="fw-bold text-dark">Γé▒{s.totalPrice.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge rounded-pill ${s.customerId ? 'bg-info-subtle text-info border border-info' : 'bg-light text-muted border'}`} style={{ fontSize: '0.65rem' }}>
                                                    {s.customerId ? 'CRM' : 'POS'}
                                                </span>
                                            </td>
                                            <td className="text-muted">{new Date(s.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td>
                                                {s.smcId ? (
                                                    <span className="badge rounded-pill bg-success-subtle text-success px-3 border border-success" style={{ fontFamily: 'monospace' }}>{s.smcId}</span>
                                                ) : <span className="text-muted">ΓÇö</span>}
                                            </td>
                                            <td className="text-end">
                                                {(s.smcId || s.productName?.toLowerCase().includes('smc')) && (
                                                    <button
                                                        className="btn btn-sm btn-smc-card rounded-pill px-3 py-1 fw-bold"
                                                        onClick={() => onSMCRequest(s.smcId || s.transactionId)}
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        Print Card
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-5 text-muted">No transactions recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="card-footer bg-white border-0 py-3 px-0 d-flex justify-content-between align-items-center">
                                <small className="text-muted font-poppins">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSales.length)} of {filteredSales.length} transactions
                                </small>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0 gap-2">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                style={{ width: '32px', height: '32px' }}
                                            >
                                                <img src={leftArrowIcon} style={{ width: '12px' }} alt="Left arrow icon" />
                                            </button>
                                        </li>

                                        {[...Array(totalPages)].map((_, i) => {
                                            const pg = i + 1;
                                            if (totalPages > 5 && (pg > 1 && pg < totalPages && Math.abs(pg - currentPage) > 1)) {
                                                if (pg === 2 || pg === totalPages - 1) return <li key={pg} className="page-item disabled"><span className="page-link border-0">...</span></li>;
                                                return null;
                                            }
                                            return (
                                                <li key={pg} className={`page-item ${currentPage === pg ? 'active' : ''}`}>
                                                    <button
                                                        className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center ${currentPage === pg ? 'brand-primary text-white' : 'text-dark-secondary'}`}
                                                        onClick={() => handlePageChange(pg)}
                                                        style={{ width: '32px', height: '32px', background: currentPage === pg ? '#23A0CE' : 'transparent' }}
                                                    >
                                                        {pg}
                                                    </button>
                                                </li>
                                            );
                                        })}

                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                style={{ width: '32px', height: '32px' }}
                                            >
                                                <img src={rightArrowIcon} style={{ width: '12px' }} alt="Right arrow icon" />
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CarRentManagement = ({ employee }) => (
    <div>
        <TopHeader
            employee={employee}
            title="Manage Car Rentals"
            subtitle="Track and manage all active car rentals"
        />
        {/* Car rental table goes here */}
        <div
            className="rounded-4 p-4 d-flex align-items-center justify-content-center"
            style={{ minHeight: 300, background: '#fff', border: '1px dashed rgba(0,0,0,0.15)', color: '#A3A3A3', fontSize: '0.9rem' }}
        >
            ≡ƒÜù Car rentals table coming soon
        </div>
    </div>
);


/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
   MEMBERSHIP MANAGEMENT (Audit & Renewal)
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const MembershipManagement = ({ employee, onSMCRequest }) => {
    const [memberships, setMemberships] = useState([]);
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 13;

    // Renewal State
    const [lookupId, setLookupId] = useState('');
    const [foundCard, setFoundCard] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [renewalForm, setRenewalForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [memRes, confRes] = await Promise.all([
                axios.get(`${API_BASE}/crm/memberships/all`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/crm/config/smc`, { headers: authHeaders(), withCredentials: true })
            ]);
            setMemberships(memRes.data);
            setConfig(confRes.data);
        } catch (err) {
            console.error('Failed to fetch membership data', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleLookup = async () => {
        if (!lookupId) return;
        setIsSearching(true);
        setFoundCard(null);
        try {
            const res = await axios.get(`${API_BASE}/crm/card/${lookupId.trim().toUpperCase()}`, { headers: authHeaders(), withCredentials: true });
            setFoundCard(res.data);
            // Pre-fill if already assigned
            if (res.data.firstName || res.data.lastName) {
                setRenewalForm({
                    firstName: res.data.firstName || '',
                    lastName: res.data.lastName || '',
                    phone: res.data.phone || '',
                    email: res.data.email || ''
                });
            }
        } catch (err) {
            Swal.fire('Not Found', 'This Membership ID does not exist.', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRenew = async () => {
        if (!foundCard) return;
        if (isRegistering && (!renewalForm.firstName || !renewalForm.lastName)) {
            return Swal.fire('Required', 'Please provide Name and Last Name for personalization.', 'warning');
        }

        const confirm = await Swal.fire({
            title: 'Confirm Renewal?',
            text: `This will renew ${foundCard.smcId} and charge ${config?.renewalPrice || 0}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Process!'
        });

        if (!confirm.isConfirmed) return;

        setIsRenewing(true);
        try {
            await axios.post(`${API_BASE}/crm/renew/${foundCard.smcId}`, {
                ...renewalForm,
                isRegistering
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({ title: 'Renewed!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setFoundCard(null);
            setLookupId('');
            setRenewalForm({ firstName: '', lastName: '', phone: '', email: '' });
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Renewal failed.', 'error');
        } finally {
            setIsRenewing(false);
        }
    };

    const filteredMembers = memberships.filter(m =>
        m.cardId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to page 1 on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="animate-fade-in p-1">
            <TopHeader employee={employee} title="Membership Console" subtitle="Track card usage and process renewals" />

            <div className="row g-4">
                {/* 1. Renewal Panel */}
                <div className="col-12 col-xl-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <h6 className="fw-bold mb-3 brand-primary d-flex align-items-center gap-2">
                            <i className="bi bi-arrow-repeat"></i> SMC RENEWAL CONSOLE
                        </h6>

                        <div className="mb-4">
                            <label className="form-label text-muted small fw-bold">SCAN OR ENTER SMC ID</label>
                            <div className="d-flex gap-2">
                                <input
                                    type="text"
                                    className="form-control rounded-pill px-3 font-monospace text-uppercase"
                                    placeholder="SMC-XXXXXX"
                                    value={lookupId}
                                    onChange={e => setLookupId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                />
                                <button className="btn brand-primary rounded-pill px-3" onClick={handleLookup} disabled={isSearching || !lookupId}>
                                    {isSearching ? '...' : 'Lookup'}
                                </button>
                            </div>
                        </div>

                        {foundCard && (
                            <div className="animate-fade-in">
                                <div className="p-3 rounded-4 mb-4" style={{ background: 'rgba(35,160,206,0.05)', border: '1px solid rgba(35,160,206,0.1)' }}>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="mb-0 fw-bold">{foundCard.firstName} {foundCard.lastName}</h5>
                                        <span className={`badge rounded-pill ${new Date(foundCard.smcExpiryDate) > new Date() ? 'bg-success' : 'bg-danger'}`}>
                                            {new Date(foundCard.smcExpiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                                        </span>
                                    </div>
                                    <p className="small text-muted font-monospace mb-0">{foundCard.smcId}</p>
                                    <small className="d-block mt-2">Expires: <b>{new Date(foundCard.smcExpiryDate).toLocaleDateString()}</b></small>
                                </div>

                                <div className="bg-light p-3 rounded-4 mb-4 border">
                                    <div className="form-check form-switch d-flex align-items-center gap-2 mb-3">
                                        <input
                                            className="form-check-input mt-0"
                                            type="checkbox"
                                            role="switch"
                                            id="personalizeSwitch"
                                            checked={isRegistering}
                                            onChange={e => setIsRegistering(e.target.checked)}
                                        />
                                        <label className="form-check-label fw-bold small text-dark-secondary" htmlFor="personalizeSwitch" style={{ cursor: 'pointer' }}>
                                            Personalize / Linking Customer?
                                        </label>
                                    </div>

                                    {isRegistering && (
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <label className="small text-muted fw-bold mb-1">First Name</label>
                                                <input type="text" className="form-control form-control-sm" value={renewalForm.firstName} onChange={e => setRenewalForm({ ...renewalForm, firstName: e.target.value })} />
                                            </div>
                                            <div className="col-6">
                                                <label className="small text-muted fw-bold mb-1">Last Name</label>
                                                <input type="text" className="form-control form-control-sm" value={renewalForm.lastName} onChange={e => setRenewalForm({ ...renewalForm, lastName: e.target.value })} />
                                            </div>
                                            <div className="col-12 mt-2">
                                                <label className="small text-muted fw-bold mb-1">Phone (Optional)</label>
                                                <input type="text" className="form-control form-control-sm" value={renewalForm.phone} onChange={e => setRenewalForm({ ...renewalForm, phone: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button className="btn brand-primary border-0 w-100 py-3 rounded-pill fw-bold shadow-sm" onClick={handleRenew} disabled={isRenewing}>
                                    {isRenewing ? 'Processing...' : `Renew Card ΓÇö Γé▒${config?.renewalPrice || 0}`}
                                </button>
                                <small className="text-center d-block mt-2 text-muted">Adds {config?.validityMonths || 12} months to the validity</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Audit Logs Table */}
                <div className="col-12 col-xl-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden d-flex flex-column" style={{ minHeight: '808px' }}>
                        <div className="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold mb-0 text-dark-secondary">SMC MEMBERSHIP AUDIT LOG</h6>
                            <div className="d-flex align-items-center shadow-none border rounded-3 overflow-hidden">
                                <span className="input-group-text bg-transparent border-0"><img src={searchIcon} alt="Search Icon" style={{ width: '16px' }} /></span>
                                <input
                                    type="text"
                                    className="form-control border-0 bg-transparent shadow-none font-poppins ps-0"
                                    placeholder="Search card or name..."
                                    style={{ fontSize: '0.8rem' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="card-body p-0 d-flex flex-column flex-grow-1">
                            {isLoading ? <TableSkeleton /> : (
                                <>
                                    <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
                                        <table className="table table-hover align-middle mb-0 ">
                                            <thead className="table-light sticky-top">
                                                <tr style={{ fontSize: '0.8rem' }}>
                                                    <th className="ps-4">Card ID</th>
                                                    <th>Member Name</th>
                                                    <th>Expiry Date</th>
                                                    <th>Status</th>
                                                    <th className="text-end pe-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentItems.length > 0 ? currentItems.map(m => {
                                                    const isExpired = new Date(m.expiryDate) < new Date();
                                                    return (
                                                        <tr key={m._id} style={{ fontSize: '0.85rem' }}>
                                                            <td className="ps-4 font-monospace fw-bold text-dark-secondary">{m.cardId}</td>
                                                            <td>{m.customerName || <span className="text-muted italic">No Profile Linked</span>}</td>
                                                            <td>{new Date(m.expiryDate).toLocaleDateString()}</td>
                                                            <td>
                                                                <span className={`badge rounded-pill ${isExpired ? 'bg-danger-subtle text-danger border border-danger' : 'bg-success-subtle text-success border border-success'}`}>
                                                                    {isExpired ? 'Expired' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="text-end pe-4">
                                                                <button className="btn btn-sm btn-smc-card rounded-pill px-3" onClick={() => onSMCRequest(m.cardId)}>
                                                                    Print Card
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5 text-muted">No matching records found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                            <small className="text-muted font-poppins">
                                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} entries
                                            </small>
                                            <nav>
                                                <ul className="pagination pagination-sm mb-0 gap-2">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={leftArrowIcon} style={{ width: '12px' }} alt="Left arrow icon" />
                                                        </button>
                                                    </li>

                                                    {/* Page Numbers */}
                                                    {[...Array(totalPages)].map((_, i) => {
                                                        const pg = i + 1;
                                                        // Show limited page numbers if totalPages is large
                                                        if (totalPages > 5 && (pg > 1 && pg < totalPages && Math.abs(pg - currentPage) > 1)) {
                                                            if (pg === 2 || pg === totalPages - 1) return <li key={pg} className="page-item disabled"><span className="page-link border-0">...</span></li>;
                                                            return null;
                                                        }

                                                        return (
                                                            <li key={pg} className={`page-item ${currentPage === pg ? 'active' : ''}`}>
                                                                <button
                                                                    className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center ${currentPage === pg ? 'brand-primary text-white' : 'text-dark-secondary'}`}
                                                                    onClick={() => handlePageChange(pg)}
                                                                    style={{ width: '32px', height: '32px', background: currentPage === pg ? '#23A0CE' : 'transparent' }}
                                                                >
                                                                    {pg}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}

                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={rightArrowIcon} style={{ width: '12px' }} alt="Right arrow icon" />
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
