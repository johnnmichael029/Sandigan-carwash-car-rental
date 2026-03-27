import { useState, useEffect, useMemo } from 'react';
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
import { API_BASE, authHeaders } from '../../api/config';
import { calculateTotal, getAvailableServices } from '../../utils/priceList';
import { io } from 'socket.io-client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

/* ─────────────────────────────────────────────
   REUSABLE HEADER COMPONENT WITH NOTIFICATIONS
───────────────────────────────────────────── */
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

        // If employee data is missing or has no role, force re-login
        if (!stored) {
            localStorage.removeItem('employee');
            navigate('/login', { replace: true });
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            if (!parsed.role) {
                // Stale data from before the role fix — force re-login
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

    /* ── Render correct content panel ── */
    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard':
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} />;
            case 'bookings':
                return <BookingManagement employee={employee} />;
            case 'car-rent':
                return <CarRentManagement employee={employee} />;
            default:
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} />;
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
const DashboardOverview = ({ employee, onNavigate }) => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartFilter, setChartFilter] = useState('daily');

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
    }, []);

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
        { label: "Today's Revenue", value: `₱${metrics.todayRevenue.toLocaleString()}`, icon: <h4 className="m-0" style={{ color: '#a855f7' }}>₱</h4>, color: '#a855f7' },
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

            {/* ─── CHARTS SECTION ─── */}
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
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(35,160,206,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [`₱${value.toLocaleString()}`, 'Revenue']}
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

/* ─────────────────────────────────────────────
   BOOKING MODAL (View / Edit)
───────────────────────────────────────────── */
const BookingModal = ({ booking, onClose, onSave, showToast }) => {
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        phoneNumber: booking.phoneNumber || '',
        emailAddress: booking.emailAddress || '',
        vehicleType: booking.vehicleType || '',
        serviceType: Array.isArray(booking.serviceType) ? booking.serviceType : (booking.serviceType ? booking.serviceType.split(',').map(s => s.trim()) : []),
        bookingTime: booking.bookingTime || '',
        detailer: booking.detailer || '',
    });

    const [availability, setAvailability] = useState({});
    const [priceListDict, setPriceListDict] = useState(null);
    const [armorPrice, setArmorPrice] = useState(100);

    // Fetch availability and pricing when edit mode opens
    useEffect(() => {
        if (editMode) {
            Promise.all([
                axios.get(`${API_BASE}/booking/availability`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/pricing`)
            ])
                .then(([availRes, pricingRes]) => {
                    setAvailability(availRes.data);
                    if (pricingRes.data && pricingRes.data.priceList) {
                        setPriceListDict(pricingRes.data.priceList);
                        setArmorPrice(pricingRes.data.armorPrice);
                    }
                })
                .catch(err => console.error("Failed to fetch edit mode data", err));
        }
    }, [editMode]);

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.patch(`${API_BASE}/booking/${booking._id}`, formData, { headers: authHeaders(), withCredentials: true });
            showToast('Booking details updated successfully.');
            onSave(); // Re-fetch data and close
        } catch (err) {
            Swal.fire('Error', 'Failed to update booking details.', 'error');
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

    // Compute live price based on current formData (updates as employee edits)
    const liveTotalPrice = calculateTotal(
        formData.vehicleType,
        formData.serviceType,
        priceListDict,
        armorPrice
    );

    // Original stored price for reference
    const storedTotalPrice = booking.totalPrice || 0;

    const availableServices = formData.vehicleType ? getAvailableServices(formData.vehicleType, priceListDict) : [];

    // Constant UI array matches your Book.jsx options
    const SERVICE_OPTIONS = ['Wash', 'Armor', 'Wax', 'Engine'];

    const getServicePrice = (label) => {
        if (!priceListDict || !formData.vehicleType) return null;
        const vehiclePrices = priceListDict[formData.vehicleType];
        if (!vehiclePrices) return null;

        if (label === 'Armor') return vehiclePrices.Armor ? armorPrice : null;
        const price = vehiclePrices[label];
        return typeof price === 'number' ? price : null;
    };

    let durationText = null;
    if (logsToDisplay.length > 0) {
        const queuedLog = logsToDisplay.find(l => l.status === 'Queued');
        const completedLog = logsToDisplay.find(l => l.status === 'Completed');
        if (queuedLog && completedLog) {
            const diffMs = new Date(completedLog.timestamp) - new Date(queuedLog.timestamp);
            const diffMins = Math.round(diffMs / 60000);
            durationText = `It took ${diffMins} mins from Queued to Completed.`;
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
                                        {editMode && priceListDict ? (
                                            <select name="vehicleType" className="form-select form-select-sm shadow-none" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value, serviceType: [] })}>
                                                <option value="" disabled>-- Select Vehicle --</option>
                                                {Object.keys(priceListDict).map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input type="text" name="vehicleType" className="form-control form-control-sm shadow-none" value={formData.vehicleType} onChange={handleChange} disabled={!editMode} />
                                        )}
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.8rem' }}>Services Requested</label>
                                        <div className="row row-cols-2 row-cols-lg-4 g-2">
                                            {SERVICE_OPTIONS.map(service => {
                                                const isSelected = formData.serviceType.includes(service);
                                                const isAvailable = editMode && availableServices.includes(service) || !editMode;
                                                const price = getServicePrice(service);

                                                return (
                                                    <div className="col">
                                                        <button
                                                            key={service}
                                                            type="button"
                                                            onClick={() => isAvailable && toggleService(service)}
                                                            disabled={!editMode || !isAvailable}
                                                            className={`btn rounded-pill px-3 w-100 ${isSelected ? 'btn-primary' : 'btn-outline-secondary'
                                                                }`}
                                                            style={{
                                                                opacity: isSelected || (editMode && isAvailable) ? 1 : 0.5,
                                                                fontSize: '0.8rem'
                                                            }}>

                                                            {isSelected && <span className="me-1">✓</span>} {service}
                                                            {price !== null && editMode && (
                                                                <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8 }}>
                                                                    ₱{service === 'Armor' ? '+' : ''}{price}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
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
                                            name="detailer"
                                            className="form-select form-select-sm shadow-none"
                                            value={formData.detailer}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                        >
                                            <option value="">Unassigned</option>
                                            {/* Currently empty pending future Detailer employee registry build */}
                                            {formData.detailer && formData.detailer !== '' && (
                                                <option value={formData.detailer}>{formData.detailer}</option>
                                            )}
                                        </select>
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

                                            return (
                                                <li key={i} className="position-relative pb-4" style={{ borderLeft: isLast ? '2px solid transparent' : '2px solid #23A0CE', paddingLeft: '28px' }}>
                                                    {/* Central Circle with Icon */}
                                                    <div className="position-absolute d-flex align-items-center justify-content-center bg-white"
                                                        style={{ width: '34px', height: '34px', borderRadius: '50%', border: log.status === 'Cancelled' ? '2px solid #dc3545' : '2px solid #23A0CE', left: '-18px', top: '-4px', zIndex: 1 }}>
                                                        {iconSrc ? (
                                                            <img src={iconSrc} alt={log.status} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ color: log.status === 'Cancelled' ? '#dc3545' : '#23A0CE', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>
                                                                {log.status === 'Cancelled' ? '×' : '•'}
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
                    </div>
                </div>
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
    const [selectedBooking, setSelectedBooking] = useState(null);

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

    // 2. Use useEffect to trigger the fetch when the component mounts
    useEffect(() => {
        fetchBookings();
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
                                        <td>₱{booking.totalPrice.toLocaleString()}</td>
                                        <td>{formatTo12Hour(booking.bookingTime)} {new Date(booking.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <select
                                                className={`form-select form-select-sm fw-medium shadow-none ${booking.status === 'Completed' ? 'border-success text-success' :
                                                    booking.status === 'Queued' ? 'border-primary text-queued' :
                                                        booking.status === 'Confirmed' ? 'border-info text-info' :
                                                            booking.status === 'Cancelled' ? 'border-danger text-danger' :
                                                                'border-warning text-warning'
                                                    }`}
                                                style={{ minWidth: '120px', cursor: booking.status === 'Completed' || booking.status === 'Cancelled' ? 'not-allowed' : 'pointer' }}
                                                value={booking.status || 'Pending'}
                                                disabled={booking.status === 'Completed' || booking.status === 'Cancelled'}
                                                onChange={(e) => handleStatusChange(booking._id, e.target.value, booking.batchId)}
                                            >
                                                <option value="Pending" disabled={['Confirmed', 'Queued', 'Completed'].includes(booking.status)}>🟡 Pending</option>
                                                <option value="Confirmed" disabled={['Queued', 'Completed'].includes(booking.status)}>🔵 Confirmed</option>
                                                <option value="Queued" disabled={['Pending', 'Completed'].includes(booking.status)}>🟣 Queued</option>
                                                <option value="Completed" disabled={['Pending', 'Confirmed'].includes(booking.status)}>🟢 Completed</option>
                                                <option value="Cancelled">🔴 Cancelled</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button className="btn btn-action btn-sm border-outline-primary brand-primary" onClick={() => setSelectedBooking(booking)}>View / Edit</button>
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
                    onSave={() => {
                        setSelectedBooking(null);
                        fetchBookings(); // Refresh data to get newly saved logs
                    }}
                />
            )}
        </div>
    );
};


/* ─────────────────────────────────────────────
   CAR RENT MANAGEMENT
───────────────────────────────────────────── */
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
            🚗 Car rentals table coming soon
        </div>
    </div>
);

export default EmployeeDashboard;