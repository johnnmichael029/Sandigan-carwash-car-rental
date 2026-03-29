import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import dashboardIcon from '../../assets/icon/dashboard.png';
import carService from '../../assets/icon/car.png';
import notifIcon from '../../assets/icon/notif.png';
import bookingsIcon from '../../assets/icon/order.png';
import bookingsPending from '../../assets/icon/order-pending.png';
import activityLogs from '../../assets/icon/activity-logs.png';
import timeIcon from '../../assets/icon/time.png';
import userIcon from '../../assets/icon/user.png';
import updateIcon from '../../assets/icon/update.png';
import logoutIcon from '../../assets/icon/logout.png';
import loginIcon from '../../assets/icon/login.png';
import deleteIcon from '../../assets/icon/delete.png';
import editIcon from '../../assets/icon/edit.png';
import settingsIcon from '../../assets/icon/setting.png'
import financeIcon from '../../assets/icon/finance.png'
import humanResourcIcon from '../../assets/icon/human-resource.png'
import inventoryIcon from '../../assets/icon/inventory.png'
import salesIcon from '../../assets/icon/sales.png'
import operationIcon from '../../assets/icon/operation.png'
import { API_BASE, authHeaders } from '../../api/config';
import { io } from 'socket.io-client';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

/* ─────────────────────────────────────────────
   TOP HEADER — Activity Log Bell (Admin Only)
───────────────────────────────────────────── */
const ACTION_META = {
    booking_created: { icon: '📋', color: '#23A0CE' },
    booking_status_changed: { icon: updateIcon, color: '#f59e0b' },
    booking_updated: { icon: '✏️', color: '#a855f7' },
    booking_deleted: { icon: '🗑️', color: '#f43f5e' },
    staff_logged_in: { icon: loginIcon, color: '#22c55e' },
    staff_logged_out: { icon: logoutIcon, color: '#888' },
};

const TopHeader = ({ user, title, subtitle, onNavigate }) => {
    const [logs, setLogs] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/activity-logs`, { headers: authHeaders(), withCredentials: true });
            setLogs(res.data);
            setUnreadCount(res.data.filter(l => !l.isRead).length);
        } catch (err) { console.error('Error fetching activity logs:', err); }
    };

    useEffect(() => {
        fetchLogs();
        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_activity_log', (log) => {
            setLogs(prev => [log, ...prev]);
            setUnreadCount(prev => prev + 1);
        });
        return () => socket.disconnect();
    }, []);

    const markAllRead = async () => {
        try {
            await axios.patch(`${API_BASE}/activity-logs/mark-read`, {}, { headers: authHeaders(), withCredentials: true });
            setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
            setUnreadCount(0);
            setIsOpen(false);
        } catch (err) { console.error(err); }
    };

    const handleViewAll = () => {
        setIsOpen(false);
        if (onNavigate) onNavigate('activity-log');
    };

    const previewLogs = logs.slice(0, 8);

    const handleNotifClick = async (notif) => {
        try {
            if (!notif.isRead) {
                await axios.patch(`${API_BASE}/activity-logs/${notif._id}/read`, {}, { headers: authHeaders(), withCredentials: true });
                setLogs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            if (onNavigate) {
                onNavigate('activity-log');
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
                        Welcome, <strong className="text-dark-secondary">{user?.fullName ?? 'Administrator'}</strong>
                    </span>
                    <span className="font-poppins d-block" style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 600 }}>
                        Administrator
                    </span>
                </div>
                <div className="position-relative" style={{ cursor: 'pointer' }}>
                    <div onClick={() => setIsOpen(!isOpen)} className="position-relative d-inline-block p-1">
                        <img src={notifIcon} alt="Activity Log" style={{ width: '24px' }} />
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>
                    {isOpen && (
                        <div className="position-absolute dropdown-menu show shadow-lg rounded-3 mt-2" style={{ right: 0, width: '340px', left: 'auto', zIndex: 1050 }}>
                            <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 fw-bold text-dark-secondary">Activity Log</h6>
                                <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.12)', color: '#23A0CE', fontSize: '0.7rem' }}>Live</span>
                            </div>
                            <div className="p-0" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {previewLogs.length === 0 ? (
                                    <div className="p-4 text-center text-muted"><small>No activity yet</small></div>
                                ) : (
                                    previewLogs.map((log) => {
                                        const meta = ACTION_META[log.action] || { icon: '📌', color: '#888' };
                                        return (
                                            <div
                                                key={log._id}
                                                className={`p-3 border-bottom d-flex gap-2 align-items-start ${!log.isRead ? 'background-light-secondary' : 'background-light-primary'}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleNotifClick(log)}
                                            >
                                                <div style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {typeof meta.icon === 'string' && meta.icon.length <= 2 ? (
                                                        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
                                                    ) : (
                                                        <img src={meta.icon} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p className="mb-0 font-poppins text-dark" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>{log.message}</p>
                                                    <small className="text-muted" style={{ fontSize: '0.68rem' }}>
                                                        {new Date(log.createdAt).toLocaleString('en-PH')}
                                                    </small>
                                                </div>
                                                {!log.isRead && (
                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 6 }} />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="p-2 border-top d-flex justify-content-between bg-light">
                                <button onClick={markAllRead} className="btn btn-sm btn-link brand-primary text-decoration-none" style={{ fontSize: '0.8rem' }}>Mark all read</button>
                                <button onClick={handleViewAll} className="btn btn-sm btn-link text-decoration-none" style={{ fontSize: '0.8rem', color: '#23A0CE' }}>View All Activity →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   ERP sub-nav items
───────────────────────────────────────────── */
const ERP_ITEMS = ['finance', 'hris', 'inventory', 'crm', 'operations'];
const ALL_SUBNAV_ITEMS = [...ERP_ITEMS, 'activity-log'];

/* ─────────────────────────────────────────────
   MAIN ADMIN DASHBOARD
───────────────────────────────────────────── */
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toggleActive, setToggleActive] = useState('dashboard');
    const [isERPOpen, setIsERPOpen] = useState(false);

    /* ── Rehydrate + role guard ── */
    useEffect(() => {
        const stored = localStorage.getItem('employee');
        if (!stored) { navigate('/login', { replace: true }); return; }
        try {
            const parsed = JSON.parse(stored);
            if (parsed.role !== 'admin') { navigate('/employee', { replace: true }); return; }
            setUser(parsed);
        } catch {
            navigate('/login', { replace: true });
        }
        setIsLoading(false);
    }, [navigate]);

    useEffect(() => {
        if (ERP_ITEMS.includes(toggleActive)) setIsERPOpen(true);
    }, [toggleActive]);

    /* ── Logout ── */
    const handleLogout = (isAuto = false) => {
        if (isAuto === true) {
            Swal.fire({
                title: 'Session Expired',
                text: 'You have been logged out due to 15 minutes of inactivity.',
                icon: 'info',
                confirmButtonColor: '#23A0CE',
                confirmButtonText: 'OK',
            }).then(async () => {
                await fetch(`${API_BASE}/employees/logout`, {
                    method: 'POST', headers: authHeaders(), credentials: 'include',
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
                await fetch(`${API_BASE}/employees/logout`, {
                    method: 'POST', headers: authHeaders(), credentials: 'include',
                }).catch(() => { });
                localStorage.removeItem('employee');
                navigate('/login');
            }
        });
    };

    /* ── Idle Timeout (15 minutes) ── */
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

    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard': return <AdminOverview user={user} onNavigate={setToggleActive} />;
            case 'activity-log': return <ActivityLogPage />;
            case 'finance': return <FinancePage user={user} />;
            case 'hris': return <ModulePlaceholder title="Human Resource Information Systems" icon="👥" description="Manage employee records, schedules, and attendance." />;
            case 'inventory': return <InventoryPage user={user} />;
            case 'crm': return <ModulePlaceholder title="Sales, CRM & Customer Data" icon="🤝" description="Track customer relationships, leads, and sales pipeline." />;
            case 'operations': return <ModulePlaceholder title="Project & Operations Management" icon="⚙️" description="Manage tasks, workflows, and operational efficiency." />;
            case 'settings': return <ServiceSettingsPage user={user} />;
            default: return <AdminOverview user={user} onNavigate={setToggleActive} />;
        }
    };

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 background-light-primary">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" />
                    <p className="text-dark-gray400 font-poppins">Loading Admin Panel...</p>
                </div>
            </div>
        );
    }

    const isERPActive = ERP_ITEMS.includes(toggleActive);

    return (
        <div className="container-fluid p-0">
            <div className="d-flex w-100">

                {/* ─── SIDEBAR ─── */}
                <nav className="sidebar-container sidebar vh-100 d-flex flex-column" style={{ position: 'sticky', top: 0 }}>

                    {/* Logo */}
                    <div className="brand-container border-bottom w-100 d-flex justify-content-center align-items-center">
                        <img className="sandigan-logo" src={sandiganLogo} alt="Sandigan Logo" style={{ width: '65%', objectFit: 'contain' }} />
                    </div>

                    {/* Nav links */}
                    <ul className="nav flex-column w-100 flex-grow-1 pt-2" style={{ listStyleType: 'none', padding: 0, margin: 0 }}>

                        {/* Dashboard */}
                        <li className="nav-item w-100">
                            <button
                                id="admin-nav-dashboard"
                                className={`nav-link ps-4 w-100 d-flex align-items-center ${toggleActive === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setToggleActive('dashboard')}
                            >
                                <img className="pe-2" src={dashboardIcon} alt="Dashboard Icon" />
                                Dashboard
                            </button>
                        </li>

                        {/* Activity Log nav item — standalone, before ERP */}
                        <li className="nav-item w-100">
                            <button
                                id="admin-nav-activity-log"
                                className={`nav-link ps-4 w-100 d-flex align-items-center ${toggleActive === 'activity-log' ? 'active' : ''}`}
                                onClick={() => setToggleActive('activity-log')}
                            >
                                <img className="pe-2" src={activityLogs} alt="Activity Log Icon" />
                                Activity Log
                            </button>
                        </li>

                        {/* Enterprise Management (ERP parent) */}
                        <li className="nav-item w-100">
                            <div
                                id="admin-nav-erp"
                                className={`nav-link ps-4 d-flex justify-content-between align-items-center ${ERP_ITEMS.includes(toggleActive) ? 'active' : ''}`}
                                onClick={() => setIsERPOpen(prev => !prev)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <img src={carService} alt="ERP Icon" />
                                    <span>Enterprise Management</span>
                                </div>
                                <img
                                    src={isERPOpen ? upArrow : downArrow}
                                    alt={isERPOpen ? 'Collapse' : 'Expand'}
                                    style={{ width: '12px', marginRight: '12px' }}
                                />
                            </div>
                        </li>

                        {/* ERP Sub-menu */}
                        {isERPOpen && (
                            <li className="nav-item w-100 animate-fade-in" style={{ height: 'auto' }}>
                                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, width: '100%' }}>
                                    {[
                                        { key: 'finance', icon: <img src={financeIcon} style={{ width: '16px' }} alt="Finance Icon" />, label: 'Finance' },
                                        { key: 'hris', icon: <img src={humanResourcIcon} style={{ width: '16px' }} alt="HRIS Icon" />, label: 'HRIS' },
                                        { key: 'inventory', icon: <img src={inventoryIcon} style={{ width: '16px' }} alt="Inventory Icon" />, label: 'Inventory' },
                                        { key: 'crm', icon: <img src={salesIcon} style={{ width: '16px' }} alt="CRM Icon" />, label: 'CRM' },
                                        { key: 'operations', icon: <img src={operationIcon} style={{ width: '16px' }} alt="Operations Icon" />, label: 'Operations' },
                                    ].map(item => (
                                        <li className="nav-item w-100" key={item.key}>
                                            <button
                                                id={`admin-nav-${item.key}`}
                                                className={`nav-link ps-5 w-100 d-flex align-items-center gap-2 ${toggleActive === item.key ? 'active' : ''}`}
                                                onClick={() => setToggleActive(item.key)}
                                            >
                                                {item.icon} {item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )}

                        {/* Service Settings */}
                        <li className="nav-item w-100">
                            <button
                                id="admin-nav-settings"
                                className={`nav-link ps-4 w-100 d-flex align-items-center ${toggleActive === 'settings' ? 'active' : ''}`}
                                onClick={() => setToggleActive('settings')}
                            >
                                <img className="pe-2" style={{ width: '24px' }} src={settingsIcon} alt="Settings Icon" />
                                Service Settings
                            </button>
                        </li>

                    </ul>

                    {/* Footer: user info + logout */}
                    <div className="border-top p-3">
                        <div className="d-flex align-items-center gap-2 mb-2 ps-1">
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(0, 232, 233, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#00e8e9', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0,
                            }}>
                                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p className="mb-0 text-secondary font-poppins" style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.fullName ?? 'Administrator'}
                                </p>
                                <p className="mb-0 font-poppins text-light-gray300" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Admin
                                </p>
                            </div>
                        </div>
                        <button
                            id="admin-btn-logout"
                            className="btn btn-outline-danger btn-sm w-100"
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
   ADMIN OVERVIEW — KPI Cards + Full Analytics
───────────────────────────────────────────── */
const AdminOverview = ({ user, onNavigate }) => {
    const [bookings, setBookings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartFilter, setChartFilter] = useState('daily');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bookingsRes, employeesRes] = await Promise.all([
                    axios.get(`${API_BASE}/booking`, { headers: authHeaders(), withCredentials: true }),
                    axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true }),
                ]);
                setBookings(bookingsRes.data);
                setEmployees(employeesRes.data);
            } catch (err) {
                console.error('Failed to fetch admin overview data', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', (newBooking) => setBookings(prev => [newBooking, ...prev]));
        socket.on('update_booking', (updated) => setBookings(prev => prev.map(b => b._id === updated._id ? updated : b)));
        return () => socket.disconnect();
    }, []);

    /* ── KPI Metrics ── */
    const metrics = useMemo(() => {
        const completed = bookings.filter(b => b.status === 'Completed');
        const allTimeRevenue = completed.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayBookings = bookings.filter(b => {
            const d = new Date(b.createdAt); d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });
        const todayRevenue = todayBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const activeStaff = employees.filter(e => e.role === 'employee').length;

        return {
            todayRevenue,
            allTimeRevenue,
            totalBookings: bookings.length,
            activeStaff,
        };
    }, [bookings, employees]);

    /* ── Chart Data ── */
    const chartData = useMemo(() => {
        if (!bookings.length) return { historical: [], services: [], statusBreakdown: [] };

        const historicalMap = {};
        const now = new Date();

        if (chartFilter === 'daily') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                historicalMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
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
                    if (bTime >= w.startTs && bTime < w.endTs) { w.revenue += (b.totalPrice || 0); w.count++; }
                });
            });
        } else if (chartFilter === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                historicalMap[d.toLocaleDateString('en-US', { month: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short' });
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
            });
        } else if (chartFilter === 'yearly') {
            for (let i = 4; i >= 0; i--) {
                const d = new Date(); d.setFullYear(d.getFullYear() - i);
                historicalMap[d.getFullYear().toString()] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).getFullYear().toString();
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
            });
        }

        const historical = Object.keys(historicalMap).map(key => ({
            name: key,
            revenue: historicalMap[key].revenue || 0,
            volume: historicalMap[key].count || 0,
        }));

        /* Service Popularity */
        const serviceCounts = { Wash: 0, Wax: 0, Engine: 0, Armor: 0 };
        bookings.forEach(b => {
            if (Array.isArray(b.serviceType)) {
                b.serviceType.forEach(s => { const t = s.trim(); if (serviceCounts[t] !== undefined) serviceCounts[t]++; });
            } else if (b.serviceType) {
                const t = b.serviceType.trim(); if (serviceCounts[t] !== undefined) serviceCounts[t]++;
            }
        });
        const services = Object.keys(serviceCounts).map(k => ({ name: k, value: serviceCounts[k] })).filter(s => s.value > 0);

        /* Booking Status Breakdown */
        const statusMap = {};
        bookings.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
        const statusBreakdown = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

        return { historical, services, statusBreakdown };
    }, [bookings, chartFilter]);

    const PIE_COLORS = ['#23A0CE', '#f59e0b', '#22c55e', '#f43f5e'];
    const STATUS_COLORS = { 'Pending': '#f59e0b', 'Confirmed': '#23A0CE', 'Queued': '#a855f7', 'In-progress': '#f97316', 'Completed': '#22c55e', 'Cancelled': '#f43f5e' };

    const stats = [
        {
            label: "Today's Revenue",
            value: `₱${metrics.todayRevenue.toLocaleString()}`,
            desc: "Revenue earned today",
            icon: <h4 className="m-0" style={{ color: '#a855f7' }}>₱</h4>,
            color: '#a855f7',
            dot: '#a855f7',
            bg: 'linear-gradient(135deg,#a855f715,#a855f705)',
        },
        {
            label: 'All-Time Revenue',
            value: `₱${metrics.allTimeRevenue.toLocaleString()}`,
            desc: "Total from all completed bookings",
            icon: <h4 className="m-0" style={{ color: '#22c55e' }}>₱</h4>,
            color: '#22c55e',
            dot: '#22c55e',
            bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)',
        },
        {
            label: 'Total Bookings',
            value: metrics.totalBookings,
            desc: "All bookings recorded",
            icon: <img src={bookingsIcon} alt="Bookings" />,
            color: '#23A0CE',
            dot: '#23A0CE',
            bg: 'linear-gradient(135deg,#23A0CE15,#23A0CE05)',
        },
        {
            label: 'Active Staff',
            value: metrics.activeStaff,
            desc: "Staff with active accounts",
            icon: <img src={bookingsPending} alt="Staff" />,
            color: '#f59e0b',
            dot: '#f59e0b',
            bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)',
        },
    ];

    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Header */}
            <TopHeader user={user} title="Admin Portal" subtitle={todayDate} onNavigate={onNavigate} />

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {stats.map((stat) => (
                    <div className="col-sm-6 col-xl-3" key={stat.label}>
                        <div
                            className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden"
                            style={{ background: '#fff', transition: 'transform 0.2s' }}
                        >
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: stat.color, filter: 'blur(30px)', opacity: 0.15 }} />
                            <div className="p-3 position-relative">
                                {/* Dot indicator */}
                                <div className="position-absolute top-0 end-0 p-3">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                                </div>
                                {/* Icon */}
                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                    style={{ width: '40px', height: '40px', background: stat.bg, color: stat.color, fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {stat.icon}
                                </div>
                                {/* Label */}
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                    {stat.label}
                                </p>
                                {/* Value */}
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: stat.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                    {isLoading ? '...' : stat.value}
                                </h3>
                                {/* Description */}
                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{stat.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── CHARTS SECTION ─── */}
            <div className="row g-4 mb-4">

                {/* 1. Revenue Bar Chart */}
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
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(35,160,206,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(v) => [`₱${v.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#23A0CE" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Service Popularity Pie Chart */}
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
                                        <Pie data={chartData.services} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {chartData.services.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Booking Volume Line Chart */}
                <div className="col-12 col-xl-8">
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
                                            formatter={(v) => [v, 'Jobs Completed']}
                                        />
                                        <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Booking Status Breakdown Pie */}
                <div className="col-12 col-xl-4">
                    <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-2">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Booking Status Breakdown</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Distribution across all statuses</p>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : chartData.statusBreakdown.length === 0 ? (
                            <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250 }}>No data yet</div>
                        ) : (
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartData.statusBreakdown} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                                            {chartData.statusBreakdown.map((entry, i) => (
                                                <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                                    </PieChart>
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
   ERP MODULE PLACEHOLDER — Coming Soon panel
───────────────────────────────────────────── */
const ModulePlaceholder = ({ title, icon, description }) => (
    <div>
        <div className="border-bottom pb-3 mb-4">
            <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>{title}</h4>
            <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Enterprise Management Module</p>
        </div>
        <div
            className="rounded-4 p-5 text-center d-flex flex-column align-items-center justify-content-center"
            style={{
                minHeight: '400px',
                background: '#fff',
                border: '2px dashed rgba(35,160,206,0.3)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            }}
        >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
            <h5 className="fw-bold text-dark-secondary font-poppins mb-2">{title}</h5>
            <p className="text-muted font-poppins mb-4" style={{ maxWidth: '400px' }}>{description}</p>
            <span
                className="badge rounded-pill px-4 py-2 font-poppins"
                style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.85rem', fontWeight: 600 }}
            >
                Phase 2 — In Development
            </span>
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   ACTIVITY LOG PAGE — Full Audit Trail
───────────────────────────────────────────── */
const ActivityLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get(`${API_BASE}/activity-logs`, { headers: authHeaders(), withCredentials: true });
                setLogs(res.data);
            } catch (err) {
                console.error('Error fetching activity logs:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_activity_log', (log) => setLogs(prev => [log, ...prev]));
        return () => socket.disconnect();
    }, []);

    const markAllRead = async () => {
        try {
            await axios.patch(`${API_BASE}/activity-logs/mark-read`, {}, { headers: authHeaders(), withCredentials: true });
            setLogs(prev => prev.map(l => ({ ...l, isRead: true })));
        } catch (err) { console.error(err); }
    };

    const deleteAll = async () => {
        Swal.fire({
            title: 'Clear all activity logs?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, clear all',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE}/activity-logs/delete-all`, { headers: authHeaders(), withCredentials: true });
                    setLogs([]);
                } catch (err) { console.error(err); }
            }
        });
    };

    const ACTION_FILTERS = [
        { key: 'all', label: 'All' },
        { key: 'booking_created', label: '📋 New Booking' },
        { key: 'booking_status_changed', label: '🔄 Status Change' },
        { key: 'booking_updated', label: '✏️ Updated' },
        { key: 'booking_deleted', label: '🗑️ Deleted' },
        { key: 'staff_logged_in', label: '🔐 Login' },
        { key: 'staff_logged_out', label: '🚪 Logout' },
    ];

    const filteredLogs = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);
    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Page header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Activity Log</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>{todayDate} — Full Audit Trail</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={markAllRead} className="btn btn-sm btn-outline-secondary" style={{ fontSize: '0.8rem' }}>Mark all read</button>
                    <button onClick={deleteAll} className="btn btn-sm btn-outline-danger" style={{ fontSize: '0.8rem' }}>Clear all</button>
                </div>
            </div>

            {/* Filter pills */}
            <div className="d-flex flex-wrap gap-2 mb-4">
                {ACTION_FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilterAction(f.key)}
                        className={`btn btn-sm ${filterAction === f.key ? 'btn-primary text-primary' : 'btn-light border'}`}
                        style={{ fontSize: '0.78rem', borderRadius: '20px' }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Log list */}
            <div className="rounded-4 shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                {isLoading ? (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border text-primary" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-5 text-center text-muted font-poppins">No activity records found.</div>
                ) : (
                    filteredLogs.map((log, idx) => {
                        const meta = ACTION_META[log.action] || { icon: '📌', color: '#888' };
                        return (
                            <div
                                key={log._id}
                                className={`d-flex align-items-start gap-3 px-4 py-3 ${idx !== filteredLogs.length - 1 ? 'border-bottom' : ''} ${!log.isRead ? 'background-light-secondary' : ''}`}
                                style={{ transition: 'background 0.2s' }}
                            >
                                {/* Icon bubble */}
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    background: `${meta.color}1a`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginTop: 2
                                }}>
                                    {typeof meta.icon === 'string' && meta.icon.length <= 2 ? (
                                        <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
                                    ) : (
                                        <img src={meta.icon} alt="icon" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="mb-0 font-poppins text-dark" style={{ fontSize: '0.87rem', lineHeight: 1.5 }}>
                                        {log.message}
                                    </p>
                                    <div className="d-flex gap-3 mt-1 flex-wrap">
                                        <small className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                                            <img src={timeIcon} alt="Time Icon" style={{ width: '12px' }} />
                                            {new Date(log.createdAt).toLocaleString('en-PH')}
                                        </small>
                                        {log.actorName && (
                                            <small className="d-flex align-items-center gap-1" style={{ fontSize: '0.72rem', color: meta.color, fontWeight: 500 }}>
                                                <img src={userIcon} alt="User Icon" style={{ width: '12px' }} />
                                                {log.actorName} ({log.actorRole})
                                            </small>
                                        )}
                                        {log.meta?.fromStatus && (
                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                {log.meta.fromStatus} → {log.meta.toStatus}
                                            </small>
                                        )}
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!log.isRead && (
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 8 }} />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   FINANCE & ACCOUNTING — Professional ERP Module
───────────────────────────────────────────── */
const FinancePage = ({ user }) => {
    const [summary, setSummary] = useState({ totalRevenue: 0, totalCommissionOwed: 0, totalExpenses: 0, netProfit: 0 });
    const [expenses, setExpenses] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'settings'
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ title: '', category: 'Supplies', amount: '', description: '' });

    const [commissionRate, setCommissionRate] = useState(0.30);
    const [isSavingRate, setIsSavingRate] = useState(false);

    // Recurring bills state
    const [recurringBills, setRecurringBills] = useState([]);
    const [pendingBills, setPendingBills] = useState([]);
    const [newBill, setNewBill] = useState({ name: '', amount: '', category: 'Utilities', frequency: 'Monthly' });
    const [isApplying, setIsApplying] = useState(false);
    const [showBillForm, setShowBillForm] = useState(false);

    const fetchData = async () => {
        try {
            const [recipesRes] = await Promise.all([
                axios.get(`${API_BASE}/service-recipes`, { headers: authHeaders(), withCredentials: true }),
            ]);
            setRecipes(recipesRes.data);
        } catch (err) { console.error("Error fetching recipe data:", err); }
    };

    useEffect(() => { fetchData(); }, []);


    const fetchFinanceData = async () => {
        try {
            const [sumRes, expRes, settingsRes] = await Promise.all([
                axios.get(`${API_BASE}/finance/summary`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/finance/expenses`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/finance/settings`, { headers: authHeaders(), withCredentials: true })
            ]);
            setSummary(sumRes.data);
            setExpenses(expRes.data);

            const rateSetting = settingsRes.data.find(s => s.key === 'commission_rate');
            if (rateSetting) setCommissionRate(rateSetting.value);
        } catch (err) { console.error('Error fetching finance data:', err); }
        finally { setIsLoading(false); }
    };

    const handleUpdateRate = async () => {
        setIsSavingRate(true);
        try {
            await axios.post(`${API_BASE}/finance/settings`, { key: 'commission_rate', value: parseFloat(commissionRate) }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Commission Rate Updated Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            fetchFinanceData();
        } catch (err) { Swal.fire('Error', 'Failed to update rate', 'error'); }
        finally { setIsSavingRate(false); }
    };

    const fetchRecurringBills = async () => {
        try {
            const res = await axios.get(`${API_BASE}/recurring-bills`, { headers: authHeaders(), withCredentials: true });
            setRecurringBills(res.data);
            setPendingBills(res.data.filter(b => b.isPending));
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchFinanceData();
        fetchRecurringBills();
    }, []);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/finance/expenses`, newExpense, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Expense Added Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setShowExpenseModal(false);
            setNewExpense({ title: '', category: 'Supplies', amount: '', description: '' });
            fetchFinanceData();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed to add expense', 'error'); }
    };

    const deleteExpense = async (id) => {
        const result = await Swal.fire({
            title: 'Delete expense?',
            text: 'This will remove the record permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/finance/expenses/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchFinanceData();
            } catch (err) { console.error(err); }
        }
    };

    const handleAddBill = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/recurring-bills`, newBill, { headers: authHeaders(), withCredentials: true });
            setNewBill({ name: '', amount: '', category: 'Utilities', frequency: 'Monthly' });
            setShowBillForm(false);
            fetchRecurringBills();
            Swal.fire({
                title: 'Bill Added Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
        } catch (err) { Swal.fire('Error', 'Could not save bill.', 'error'); }
    };

    const handleDeleteBill = async (id) => {
        const result = await Swal.fire({ title: 'Remove this bill?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            await axios.delete(`${API_BASE}/recurring-bills/${id}`, { headers: authHeaders(), withCredentials: true });
            fetchRecurringBills();
        }
    };

    const handleApplyPending = async () => {
        setIsApplying(true);
        try {
            const res = await axios.post(`${API_BASE}/recurring-bills/apply`, {}, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Bill Applied Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            fetchRecurringBills();
            fetchFinanceData();
        } catch (err) { Swal.fire('Error', 'Could not apply bills.', 'error'); }
        finally { setIsApplying(false); }
    };

    // Inline edit state for recurring bills
    const [editingBill, setEditingBill] = useState(null); // holds {_id, name, amount, category, frequency}

    const handleSaveBillEdit = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/recurring-bills/${editingBill._id}`, editingBill, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Bill Updated Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setEditingBill(null);
            fetchRecurringBills();
        } catch (err) { Swal.fire('Error', 'Could not update bill.', 'error'); }
    };

    if (isLoading) return <div className="text-center p-5"><div className="spinner-border text-primary" /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Finance & Accounting</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Track Revenue, Commission Payouts, and Business Expenses</p>
                </div>
                <div className="d-flex gap-2">
                    {/* Pending bills badge on Settings button */}
                    <div className="btn-group bg-light p-1 rounded-3">
                        <button onClick={() => setActiveTab('overview')} className={`btn btn-sm px-3 border-0 ${activeTab === 'overview' ? 'btn-white shadow-sm' : 'text-muted'}`}>📊 Overview</button>
                        <button onClick={() => setActiveTab('settings')} className={`btn btn-sm px-3 border-0 position-relative ${activeTab === 'settings' ? 'btn-white shadow-sm' : 'text-muted'}`}>
                            ⚙️ Settings
                            {pendingBills.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                    {pendingBills.length}
                                </span>
                            )}
                        </button>
                    </div>
                    {activeTab === 'overview' && (
                        <button onClick={() => setShowExpenseModal(true)} className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3">
                            + Record Expense
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'settings' ? (
                <div className="row g-4">
                    {/* Left: Commission Rate */}
                    <div className="col-md-5">
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h6 className="fw-bold text-dark-secondary mb-4">Commission Rate</h6>
                            <div className="mb-4">
                                <label className="form-label text-muted small fw-bold mb-2">Detailer Commission Rate</label>
                                <div className="input-group" style={{ maxWidth: '200px' }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control rounded-start-3"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(e.target.value)}
                                    />
                                    <span className="input-group-text bg-light">
                                        ({(commissionRate * 100).toFixed(0)}%)
                                    </span>
                                </div>
                                <small className="text-muted d-block mt-2" style={{ fontSize: '0.72rem' }}>
                                    Note: 0.30 = 30%. This rate will be applied to all <b>newly completed</b> bookings.
                                </small>
                            </div>
                            <button
                                onClick={handleUpdateRate}
                                className="btn btn-save btn-primary px-4 py-2 rounded-3 shadow-sm"
                                disabled={isSavingRate}
                            >
                                {isSavingRate ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Recurring Bills */}
                    <div className="col-md-7">
                        {/* Pending Alert Banner */}
                        {pendingBills.length > 0 && (
                            <div className="alert border-0 rounded-4 p-3 mb-3 d-flex justify-content-between align-items-center"
                                style={{ background: '#fffbeb', border: '1px solid #fbbf24 !important', borderLeft: '5px solid #f59e0b' }}>
                                <div>
                                    <p className="mb-0 fw-bold" style={{ fontSize: '0.85rem' }}>🔔 {pendingBills.length} Bill{pendingBills.length > 1 ? 's' : ''} Pending This Period</p>
                                    <small className="text-muted">{pendingBills.map(b => b.name).join(', ')}</small>
                                </div>
                                <button onClick={handleApplyPending} disabled={isApplying} className="btn btn-warning btn-sm px-3 rounded-pill fw-bold shadow-sm" style={{ whiteSpace: 'nowrap' }}>
                                    {isApplying ? 'Applying...' : '✅ Apply All Now'}
                                </button>
                            </div>
                        )}

                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-0 fw-bold text-dark-secondary">🗓 Recurring Bills</h6>
                                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>Fixed monthly/weekly costs (Internet, Water, Electricity)</small>
                                </div>
                                <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-save btn-sm rounded-pill px-3">+ Add Bill</button>
                            </div>

                            {/* Add Bill Form */}
                            {showBillForm && (
                                <form onSubmit={handleAddBill} className="p-3 border-bottom bg-light">
                                    <div className="row g-2 align-items-end">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold text-muted mb-1">Bill Name</label>
                                            <input type="text" className="form-control form-control-sm rounded-3" required placeholder="e.g. Electricity" value={newBill.name} onChange={e => setNewBill({ ...newBill, name: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted mb-1">Amount (₱)</label>
                                            <input type="number" className="form-control form-control-sm rounded-3" required placeholder="2000" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted mb-1">Frequency</label>
                                            <select className="form-select form-select-sm rounded-3" value={newBill.frequency} onChange={e => setNewBill({ ...newBill, frequency: e.target.value })}>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Weekly">Weekly</option>
                                            </select>
                                        </div>
                                        <div className="col-md-2 d-flex gap-2 justify-content-center ">
                                            <button type="submit" className="btn btn-save btn-primary btn-sm w-100 rounded-3">Save</button>
                                            <button type="button" className="btn btn-danger btn-sm w-100 rounded-3" onClick={() => setShowBillForm(!showBillForm)}>Cancel</button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            <div className="card-body p-0">
                                {recurringBills.length === 0 ? (
                                    <div className="p-4 text-center text-muted small">No recurring bills yet. Add Internet, Water, or Electricity bills here.</div>
                                ) : (
                                    recurringBills.map(bill => {
                                        const isEditing = editingBill?._id === bill._id;
                                        return (
                                            <div key={bill._id} className={`px-4 py-3 border-bottom ${isEditing ? 'bg-light' : ''}`}>
                                                {isEditing ? (
                                                    /* ── Inline Edit Row ── */
                                                    <form onSubmit={handleSaveBillEdit}>
                                                        <div className="row g-2 align-items-center">
                                                            <div className="col-md-3">
                                                                <input type="text" className="form-control form-control-sm rounded-3" required value={editingBill.name} onChange={e => setEditingBill({ ...editingBill, name: e.target.value })} />
                                                            </div>
                                                            <div className="col-md-2">
                                                                <div className="input-group input-group-sm">
                                                                    <span className="input-group-text bg-white">₱</span>
                                                                    <input type="number" className="form-control rounded-end-3" required value={editingBill.amount} onChange={e => setEditingBill({ ...editingBill, amount: e.target.value })} />
                                                                </div>
                                                            </div>
                                                            <div className="col-md-3">
                                                                <select className="form-select form-select-sm rounded-3" value={editingBill.category} onChange={e => setEditingBill({ ...editingBill, category: e.target.value })}>
                                                                    {['Utilities', 'Rent', 'Subscriptions', 'Maintenance', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="col-md-2">
                                                                <select className="form-select form-select-sm rounded-3" value={editingBill.frequency} onChange={e => setEditingBill({ ...editingBill, frequency: e.target.value })}>
                                                                    <option value="Monthly">Monthly</option>
                                                                    <option value="Weekly">Weekly</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-md-2 d-flex gap-2">
                                                                <button type="submit" className="btn brand-primary btn-save btn-sm rounded-3 flex-fill">Save</button>
                                                                <button type="button" onClick={() => setEditingBill(null)} className="btn btn-danger btn-sm rounded-3 flex-fill">Cancel</button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    /* ── Read-only Row ── */
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <p className="mb-0 fw-bold text-dark-secondary" style={{ fontSize: '0.9rem' }}>{bill.name}</p>
                                                            <small className="text-muted">{bill.category} · {bill.frequency}</small>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="text-end">
                                                                <p className="mb-0 fw-bold text-danger" style={{ fontSize: '0.9rem' }}>- ₱{Number(bill.amount).toLocaleString()}</p>
                                                                {bill.isPending ? (
                                                                    <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '0.6rem' }}>Pending</span>
                                                                ) : (
                                                                    <span className="badge bg-success text-white rounded-pill" style={{ fontSize: '0.6rem' }}>Applied {new Date(bill.lastApplied).toLocaleDateString()}</span>
                                                                )}
                                                            </div>
                                                            <div className="d-flex gap-1">
                                                                <button onClick={() => setEditingBill({ _id: bill._id, name: bill.name, amount: bill.amount, category: bill.category, frequency: bill.frequency })} className="btn btn-sm border-0 bg-transparent p-1">
                                                                    <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} />
                                                                </button>
                                                                <button onClick={() => handleDeleteBill(bill._id)} className="btn btn-sm border-0 bg-transparent p-1">
                                                                    <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Financial Summary Cards */}
                    <div className="row g-3 mb-4">
                        {[
                            { title: "Gross Revenue", value: summary.totalRevenue, icon: "₱", color: "#a855f7", bg: "linear-gradient(135deg,#a855f715,#a855f705)", dot: "#a855f7", desc: "Total from completed bookings" },
                            { title: "Staff Commissions", value: summary.totalCommissionOwed, icon: "₱", color: "#22c55e", bg: "linear-gradient(135deg,#22c55e15,#22c55e05)", dot: "#22c55e", desc: `${(commissionRate * 100).toFixed(0)}% detailer cut (owed)` },
                            { title: "Operation Costs", value: summary.totalExpenses, icon: "📦", color: "#23A0CE", bg: "linear-gradient(135deg,#23A0CE15,#23A0CE05)", dot: "#23A0CE", desc: "Supplies, Rent, Utilities" },
                            { title: "Net Profit", value: summary.netProfit, icon: "💰", color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)", dot: "#f59e0b", desc: "Take-home after all costs" },
                        ].map((card, idx) => (
                            <div className="col-md-3" key={idx}>
                                <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: '#fff' }}>

                                    {/* Decorative soft glow */}
                                    <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                                    <div className="p-3 position-relative">
                                        {/* Dot indicator */}
                                        <div className="position-absolute top-0 end-0 p-3">
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                        </div>
                                        {/* Icon */}
                                        <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                            style={{ width: '40px', height: '40px', background: card.bg, color: card.color, fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            {card.icon}
                                        </div>
                                        {/* Label */}
                                        <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                            {card.title}
                                        </p>
                                        {/* Value */}
                                        <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                            ₱{card.value.toLocaleString()}
                                        </h3>
                                        {/* Description */}
                                        <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="row g-4">
                        {/* Expense table */}
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold text-dark-secondary">Business Expenses</h6>
                                    <span className="badge rounded-pill bg-light text-dark-secondary" style={{ fontSize: '0.7rem' }}>Last {expenses.length} Records</span>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                            <thead className="bg-light text-dark-gray400 font-poppins">
                                                <tr>
                                                    <th className="ps-4 py-3">Expense Details</th>
                                                    <th>Category</th>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th className="pe-4 text-end">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenses.length === 0 ? (
                                                    <tr><td colSpan="5" className="p-4 text-center text-muted">No expenses recorded yet</td></tr>
                                                ) : (
                                                    expenses.map((exp) => (
                                                        <tr key={exp._id}>
                                                            <td className="ps-4">
                                                                <div className="fw-bold text-dark-secondary">{exp.title}</div>

                                                                <div className="d-flex flex-wrap gap-2 mt-1">
                                                                    {exp.ingredients && exp.ingredients.map((ing, i) => (
                                                                        <span key={i} className="badge bg-light text-dark-gray100 border rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                            {ing.inventoryItem?.name ?? '–'}: {ing.quantityUsed} {ing.inventoryItem?.unit}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-dark-gray200" style={{ fontSize: '0.7rem' }}>{exp.description}</span>
                                                            </td>
                                                            <td>
                                                                <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.7rem' }}>{exp.category}</span>
                                                            </td>
                                                            <td className="text-dark-gray200">{new Date(exp.date).toLocaleDateString()}</td>
                                                            <td className="fw-bold text-danger">- ₱{exp.amount.toLocaleString()}</td>
                                                            <td className="pe-4 text-end">
                                                                <button onClick={() => deleteExpense(exp._id)} className="btn btn-sm text-danger-hover p-0 border-0 bg-transparent">
                                                                    <img src={deleteIcon} alt="Delete" style={{ width: '20px', height: '20px' }} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Insight */}
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm rounded-4 p-4">
                                <h6 className="fw-bold text-dark-secondary mb-3">Profitability Profile</h6>
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between mb-1">
                                        <small className="text-muted">Direct Costs (Commissions)</small>
                                        <small className="fw-bold">{(commissionRate * 100).toFixed(0)}%</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div className="progress-bar bg-warning" style={{ width: `${commissionRate * 100}%` }} />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between mb-1">
                                        <small className="text-muted">Company Gross Share</small>
                                        <small className="fw-bold">{(100 - (commissionRate * 100)).toFixed(0)}%</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div className="progress-bar bg-success" style={{ width: `${100 - (commissionRate * 100)}%` }} />
                                    </div>
                                </div>
                                <div className="p-3 rounded-3" style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
                                    <p className="mb-1 text-dark-secondary fw-bold" style={{ fontSize: '0.8rem' }}>Admin Tip:</p>
                                    <small className="text-muted d-block" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                        Track all water and electricity bills under "Utilities" to get an accurate view of your net profit per wash.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Record Expense Modal */}
            {showExpenseModal && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <form onSubmit={handleAddExpense}>
                                <div className="modal-header border-0 pb-0">
                                    <h5 className="modal-title fw-bold text-dark-secondary font-poppins">Record Business Expense</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowExpenseModal(false)} />
                                </div>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Title / Item Name</label>
                                        <input type="text" className="form-control rounded-3" required value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="e.g. Concentrated Car Shampoo" />
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Category</label>
                                            <select className="form-select rounded-3" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
                                                {['Supplies', 'Utilities', 'Rent', 'Marketing', 'Maintenance', 'Salaries', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Amount (₱)</label>
                                            <input type="number" className="form-control rounded-3" required value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label text-muted small fw-bold mb-1">Description (Optional)</label>
                                        <textarea className="form-control rounded-3" rows="2" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Add any details..." />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0 pb-4 justify-content-center">
                                    <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save btn-primary px-4 rounded-3">Save Expense Record</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   INVENTORY & SUPPLY CHAIN — ERP Module
   Manages Stocks, Supplies and Usage
───────────────────────────────────────────── */
const InventoryPage = ({ user }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', category: 'Chemicals', currentStock: '', unit: 'ml', reorderPoint: '', costPerUnit: '' });
    const [activeTab, setActiveTab] = useState('stocks');
    const [editingItem, setEditingItem] = useState(null); // holds item being edited inline

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true });
            setItems(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchInventory(); }, []);

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/inventory`, newItem, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Item Added Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setShowAddModal(false);
            setNewItem({ name: '', category: 'Chemicals', currentStock: '', unit: 'ml', reorderPoint: '', costPerUnit: '' });
            fetchInventory();
        } catch (err) { Swal.fire('Error', 'Failed to add item', 'error'); }
    };

    const deleteItem = async (id) => {
        const result = await Swal.fire({
            title: 'Remove item?',
            text: 'This will delete the supply record permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/inventory/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchInventory();
            } catch (err) { console.error(err); }
        }
    };

    const handleSaveItemEdit = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/inventory/${editingItem._id}`, editingItem, { headers: authHeaders(), withCredentials: true });
            Swal.fire('Success', 'Item updated successfully', 'success');
            setEditingItem(null);
            fetchInventory();
        } catch (err) { Swal.fire('Error', 'Could not update item.', 'error'); }
    };

    const lowStockItems = items.filter(i => i.currentStock <= i.reorderPoint);

    if (isLoading) return <div className="text-center p-5"><div className="spinner-border text-primary" /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Inventory & Supply Chain</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Track Warehouse Stock levels and soap usage</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="btn-group bg-light p-1 rounded-3">
                        <button onClick={() => setActiveTab('stocks')} className={`btn btn-sm px-3 border-0 ${activeTab === 'stocks' ? 'btn-white shadow-sm' : 'text-muted'}`}>📊 Stock Levels</button>
                        <button onClick={() => setActiveTab('config')} className={`btn btn-sm px-3 border-0 ${activeTab === 'config' ? 'btn-white shadow-sm' : 'text-muted'}`}>🧪 Usage Settings</button>
                    </div>
                </div>
            </div>

            {activeTab === 'stocks' ? (
                <>
                    {/* Low Stock Alerts */}
                    {lowStockItems.length > 0 && (
                        <div className="alert alert-warning border-0 shadow-sm rounded-4 p-4 mb-4 animate-shake" style={{ background: '#fff9e6', borderLeft: '5px solid #ffcc00' }}>
                            <div className="d-flex align-items-center">
                                <span className="fs-3 me-3">⚠️</span>
                                <div>
                                    <h6 className="mb-1 fw-bold text-dark">Stock Attention Required</h6>
                                    <p className="mb-0 small text-muted">
                                        {lowStockItems.length} items are running below reorder points: <b>{lowStockItems.map(i => i.name).join(', ')}</b>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="row g-4">
                        <div className="col-lg-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold text-dark-secondary">Supply Inventory List</h6>
                                    <button onClick={() => setShowAddModal(true)} className="btn btn-register-item btn-primary btn-sm px-3 rounded-pill shadow-sm">+ New Item</button>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                                            <thead className="bg-light font-poppins text-muted small">
                                                <tr className="border-bottom">
                                                    <th className="ps-4 py-3" style={{ width: '28%' }}>Item Details</th>
                                                    <th className="py-3" style={{ width: '15%' }}>Category</th>
                                                    <th className="py-3" style={{ width: '22%' }}>Stock Level</th>
                                                    <th className="py-3" style={{ width: '15%' }}>Unit Cost</th>
                                                    <th className="py-3">Last Restocked</th>
                                                    <th className="pe-4 py-3 text-end" style={{ width: '10%' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.length === 0 ? (
                                                    <tr><td colSpan="6" className="p-5 text-center text-muted">No items in inventory. Add your soaps and chemicals to get started.</td></tr>
                                                ) : (
                                                    items.map(item => {
                                                        const isEditing = editingItem?._id === item._id;
                                                        return isEditing ? (
                                                            /* ── Inline Edit Row (Aligned) ── */
                                                            <tr key={item._id} className="bg-light shadow-sm">
                                                                <td className="ps-4">
                                                                    <input type="text" className="form-control form-control-sm rounded-3 shadow-none border-primary" style={{ fontWeight: 600 }} required value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
                                                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Edit Details</small>
                                                                </td>
                                                                <td>
                                                                    <select className="form-select form-select-sm rounded-3 shadow-none" value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}>
                                                                        {['Chemicals', 'Supplies', 'Tools', 'Equipment', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                                                    </select>
                                                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Edit Category</small>
                                                                </td>
                                                                <td>
                                                                    <div className="input-group input-group-sm">
                                                                        <input type="number" className="form-control shadow-none rounded-start-3" value={editingItem.currentStock} onChange={e => setEditingItem({ ...editingItem, currentStock: e.target.value })} />
                                                                        <span className="input-group-text bg-white text-muted" style={{ fontSize: '0.7rem' }}>{editingItem.unit}</span>
                                                                    </div>
                                                                    <div className="d-flex align-items-center mt-1">
                                                                        <small className="text-muted me-1" style={{ fontSize: '0.65rem' }}>Reorder at:</small>
                                                                        <input type="number" className="form-control form-control-xs p-0 px-1 border-0 border-bottom rounded-0" style={{ width: '40px', fontSize: '0.65rem' }} value={editingItem.reorderPoint} onChange={e => setEditingItem({ ...editingItem, reorderPoint: e.target.value })} />
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="input-group input-group-sm">
                                                                        <span className="input-group-text bg-white px-1">₱</span>
                                                                        <input type="number" step="0.001" className="form-control shadow-none rounded-end-3" value={editingItem.costPerUnit} onChange={e => setEditingItem({ ...editingItem, costPerUnit: e.target.value })} />
                                                                    </div>
                                                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>Per {editingItem.unit}</small>
                                                                </td>
                                                                <td className="text-muted small">
                                                                    Editing...
                                                                </td>
                                                                <td className="pe-4 text-end">
                                                                    <div className="d-flex gap-1 justify-content-end">
                                                                        <button onClick={handleSaveItemEdit} className="btn btn-save btn-sm px-3 rounded-pill fw-bold">Save</button>
                                                                        <button onClick={() => setEditingItem(null)} className="btn btn-danger btn-sm px-2 rounded-pill shadow-none">Cancel</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            /* ── Read-only Row ── */
                                                            <tr key={item._id}>
                                                                <td className="ps-4">
                                                                    <div className="fw-bold text-dark-secondary">{item.name}</div>
                                                                    <small className="text-muted small">{item.supplier || "Standard Supply"}</small>
                                                                </td>
                                                                <td><span className="badge rounded-pill border px-2" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.7rem' }}>{item.category}</span></td>
                                                                <td>
                                                                    <div className="d-flex align-items-center">
                                                                        <div className={`me-2 fw-bold ${item.currentStock <= item.reorderPoint ? 'text-danger' : 'text-success'}`}>
                                                                            {item.currentStock.toLocaleString()} {item.unit}
                                                                        </div>
                                                                        {item.currentStock <= item.reorderPoint && <span className="badge bg-danger text-white rounded-pill" style={{ fontSize: '0.6rem' }}>LOW STOCK</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="text-dark-secondary fw-semibold">₱{item.costPerUnit}/{item.unit}</td>
                                                                <td className="text-muted small">{new Date(item.lastRestocked).toLocaleDateString()}</td>
                                                                <td className="pe-4 text-end">
                                                                    <button onClick={() => setEditingItem({ ...item })} className="btn btn-sm border-0 bg-transparent me-1">
                                                                        <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} />
                                                                    </button>
                                                                    <button onClick={() => deleteItem(item._id)} className="btn btn-sm text-danger-hover border-0 bg-transparent">
                                                                        <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <RecipeBuilder inventoryItems={items} />
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <form onSubmit={handleAddItem}>
                                <div className="modal-header border-0 pb-0">
                                    <h5 className="modal-title fw-bold text-dark-secondary font-poppins">Register Supply Item</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
                                </div>
                                <div className="modal-body p-4 text-start">
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">Item Name / Chemical Name</label>
                                        <input type="text" className="form-control rounded-3" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Pink Concentrated Soap" />
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Category</label>
                                            <select className="form-select rounded-3" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                                {['Chemicals', 'Supplies', 'Tools', 'Equipment', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Unit</label>
                                            <select className="form-select rounded-3" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                                {['ml', 'L', 'pcs', 'kg', 'set'].map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Current Stock</label>
                                            <input type="number" className="form-control rounded-3" required value={newItem.currentStock} onChange={e => setNewItem({ ...newItem, currentStock: e.target.value })} placeholder="1000" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Reorder Alarm Level</label>
                                            <input type="number" className="form-control rounded-3" required value={newItem.reorderPoint} onChange={e => setNewItem({ ...newItem, reorderPoint: e.target.value })} placeholder="500" />
                                        </div>
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label text-muted small fw-bold">Estimated Cost per {newItem.unit} (₱)</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">₱</span>
                                            <input type="number" step="0.001" className="form-control rounded-3 border-start-0" required value={newItem.costPerUnit} onChange={e => setNewItem({ ...newItem, costPerUnit: e.target.value })} placeholder="0.05" />
                                        </div>
                                        <small className="text-muted mt-1 d-block" style={{ fontSize: '0.7rem' }}>Formula: (Total Price of Bottle / Total Volume)</small>
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0 pb-4 justify-content-between">
                                    <button type="button" className="btn btn-danger px-4 rounded-3" onClick={() => setShowAddModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save px-4 rounded-3 shadow-sm">Save to Warehouse</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   RECIPE BUILDER — Service → Ingredient Linker
───────────────────────────────────────────── */

const RecipeBuilder = ({ inventoryItems }) => {
    const [recipes, setRecipes] = useState([]);
    const [dynamicPricing, setDynamicPricing] = useState([]);
    const [serviceType, setServiceType] = useState('Wash');
    const [vehicleType, setVehicleType] = useState('All');
    const [ingredients, setIngredients] = useState([{ inventoryItem: '', quantityUsed: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const fetchData = async () => {
        try {
            const [recipesRes, pricingRes] = await Promise.all([
                axios.get(`${API_BASE}/service-recipes`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/pricing`, { headers: authHeaders(), withCredentials: true })
            ]);
            setRecipes(recipesRes.data);
            setDynamicPricing(pricingRes.data.dynamicPricing || []);
        } catch (err) { console.error("Error fetching recipe data:", err); }
    };

    useEffect(() => { fetchData(); }, []);

    const dynamicServiceTypes = useMemo(() => {
        const all = new Set();
        dynamicPricing.forEach(v => {
            v.services?.forEach(s => all.add(s.name));
            v.addons?.forEach(a => all.add(a.name));
        });
        if (all.size === 0) return ['Wash', 'Wax', 'Engine', 'Armor'];
        return Array.from(all).sort();
    }, [dynamicPricing]);

    const dynamicVehicleTypes = useMemo(() => {
        const all = new Set(dynamicPricing.map(p => p.vehicleType));
        if (all.size === 0) return ['All', 'Sedan', 'SUV', 'Motorcycle', 'Pickup', 'Van'];
        return ['All', ...Array.from(all).sort()];
    }, [dynamicPricing]);

    useEffect(() => {
        // Wait until dynamic data is loaded to set defaults, only if not editing
        if (!editingId && dynamicServiceTypes.length > 0 && !dynamicServiceTypes.includes(serviceType)) {
            setServiceType(dynamicServiceTypes[0]);
        }
    }, [dynamicServiceTypes, serviceType, editingId]);

    const addIngredientRow = () => setIngredients([...ingredients, { inventoryItem: '', quantityUsed: '' }]);

    const removeIngredientRow = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i));

    const updateIngredient = (i, field, val) => {
        const updated = [...ingredients];
        updated[i] = { ...updated[i], [field]: val };
        setIngredients(updated);
    };

    const estimatedCost = ingredients.reduce((sum, ing) => {
        const item = inventoryItems.find(it => it._id === ing.inventoryItem);
        if (!item || !ing.quantityUsed) return sum;
        return sum + (item.costPerUnit * parseFloat(ing.quantityUsed));
    }, 0);

    const handleSaveRecipe = async (e) => {
        e.preventDefault();
        const validIngredients = ingredients.filter(i => i.inventoryItem && i.quantityUsed);
        if (validIngredients.length === 0) {
            Swal.fire('Missing Ingredients', 'Please add at least one ingredient to the recipe.', 'warning');
            return;
        }
        setIsSaving(true);
        try {
            if (editingId) {
                // UPDATE existing
                await axios.patch(`${API_BASE}/service-recipes/${editingId}`, { serviceType, vehicleType, ingredients: validIngredients }, { headers: authHeaders(), withCredentials: true });
                Swal.fire({
                    title: 'Recipe Updated Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            } else {
                // CREATE new (upsert)
                await axios.post(`${API_BASE}/service-recipes`, { serviceType, vehicleType, ingredients: validIngredients }, { headers: authHeaders(), withCredentials: true });
                Swal.fire({
                    title: 'Recipe Saved Successfully!',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: '#002525',
                    color: '#FAFAFA'
                });
            }

            // Reset form
            setEditingId(null);
            setIngredients([{ inventoryItem: '', quantityUsed: '' }]);
            fetchData();
        } catch (err) {
            Swal.fire('Error', 'Could not save recipe.', 'error');
        }
        setIsSaving(false);
    };

    const handleEditRecipe = (recipe) => {
        setEditingId(recipe._id);
        setServiceType(recipe.serviceType);
        setVehicleType(recipe.vehicleType);
        // Map ingredients to form state (ensure we only take what's needed for the update)
        setIngredients(recipe.ingredients.map(ing => ({
            inventoryItem: ing.inventoryItem?._id || ing.inventoryItem,
            quantityUsed: ing.quantityUsed
        })));
        // Scroll to form
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIngredients([{ inventoryItem: '', quantityUsed: '' }]);
    };

    const deleteRecipe = async (id) => {
        const result = await Swal.fire({ title: 'Delete Recipe?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            await axios.delete(`${API_BASE}/service-recipes/${id}`, { headers: authHeaders(), withCredentials: true });
            fetchData();
        }
    };

    return (
        <div className="row g-4">
            {/* Builder Panel */}
            <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom py-3">
                        <h6 className="mb-0 fw-bold text-dark-secondary">Build a Service Recipe</h6>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Define which soaps/chemicals are used per service</small>
                    </div>
                    <form onSubmit={handleSaveRecipe}>
                        <div className="card-body p-4">
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-muted">Service or Add-on</label>
                                    <select className="form-select rounded-3" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                                        {dynamicServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-muted">Vehicle Type</label>
                                    <select className="form-select rounded-3" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                                        {dynamicVehicleTypes.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            <p className="small fw-bold text-muted mb-3">Ingredients (Chemicals / Supplies Used)</p>

                            {ingredients.map((ing, i) => {
                                const selectedItem = inventoryItems.find(it => it._id === ing.inventoryItem);
                                return (
                                    <div key={i} className="d-flex gap-2 align-items-center mb-2">
                                        <select
                                            className="form-select form-select-sm rounded-3"
                                            value={ing.inventoryItem}
                                            onChange={e => updateIngredient(i, 'inventoryItem', e.target.value)}
                                            required
                                        >
                                            <option value="">— Pick item —</option>
                                            {inventoryItems.map(it => <option key={it._id} value={it._id}>{it.name} ({it.unit})</option>)}
                                        </select>
                                        <div className="input-group input-group-sm" style={{ maxWidth: '110px' }}>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                className="form-control rounded-start-3 border-end-0"
                                                placeholder="qty"
                                                value={ing.quantityUsed}
                                                onChange={e => updateIngredient(i, 'quantityUsed', e.target.value)}
                                            />
                                            <span className="input-group-text bg-light border-start-0 text-muted" style={{ fontSize: '0.7rem' }}>
                                                {selectedItem?.unit ?? '—'}
                                            </span>
                                        </div>
                                        {ingredients.length > 1 && (
                                            <button type="button" onClick={() => removeIngredientRow(i)} className="btn btn-sm border-0 text-danger p-0">✕</button>
                                        )}
                                    </div>
                                );
                            })}

                            <button type="button" onClick={addIngredientRow} className="btn btn-sm btn-link brand-primary text-decoration-none mt-1 p-0">+ Add ingredient</button>

                            {/* Estimated Cost Preview */}
                            {estimatedCost > 0 && (
                                <div className="mt-3 p-3 rounded-3" style={{ background: '#f0fdf4', border: '1px dashed #22c55e' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-success fw-bold">Est. Supply Cost per Service:</small>
                                        <span className="fw-bold text-success">₱{estimatedCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {inventoryItems.length === 0 && (
                                <div className="alert alert-warning rounded-3 mt-3 py-2 mb-0">
                                    <small>⚠️ No inventory items yet. Add soaps/chemicals in the <strong>Stock Levels</strong> tab first.</small>
                                </div>
                            )}
                        </div>
                        <div className="card-footer bg-white border-top text-end py-3 d-flex justify-content-between align-items-center">
                            {editingId ? (
                                <button type="button" onClick={cancelEdit} className="btn btn-danger px-4 rounded-3">Cancel</button>
                            ) : <div />}
                            <button type="submit" disabled={isSaving || inventoryItems.length === 0} className="btn btn-save px-4 rounded-3 shadow-sm">
                                {isSaving ? 'Saving...' : (editingId ? 'Update Recipe' : 'Save Recipe')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Saved Recipes Panel */}
            <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom py-3">
                        <h6 className="mb-0 fw-bold text-dark-secondary">📋 Active Service Recipes</h6>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Auto-deducted when a booking is marked Completed</small>
                    </div>
                    <div className="card-body p-0">
                        {recipes.length === 0 ? (
                            <div className="p-5 text-center text-muted">
                                <p className="mb-1">No recipes yet.</p>
                                <small>Create your first recipe to enable automatic stock deductions.</small>
                            </div>
                        ) : (
                            recipes.map(recipe => {
                                const totalCost = recipe.ingredients.reduce((sum, ing) => {
                                    return sum + ((ing.inventoryItem?.costPerUnit || 0) * ing.quantityUsed);
                                }, 0);
                                return (
                                    <div key={recipe._id} className="p-4 border-bottom">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="badge rounded-pill me-2" style={{ background: '#a855f715', color: '#a855f7', fontSize: '0.7rem' }}>{recipe.serviceType}</span>
                                                <span className="badge rounded-pill" style={{ background: '#23A0CE15', color: '#23A0CE', fontSize: '0.7rem' }}>{recipe.vehicleType}</span>
                                                <p className="mb-0 mt-1 fw-bold text-success small">₱{totalCost.toFixed(2)} / service</p>
                                            </div>
                                            <div className="d-flex gap-1">
                                                <button onClick={() => handleEditRecipe(recipe)} className="btn btn-sm border-0 bg-transparent text-primary">
                                                    <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                <button onClick={() => deleteRecipe(recipe._id)} className="btn btn-sm border-0 bg-transparent text-danger">
                                                    <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                            {recipe.ingredients.map((ing, i) => (
                                                <span key={i} className="badge bg-light text-dark-secondary border rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                    {ing.inventoryItem?.name ?? '–'}: {ing.quantityUsed} {ing.inventoryItem?.unit}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
/* ─────────────────────────────────────────────
   SERVICE & PRICING SETTINGS (CRUD)
───────────────────────────────────────────── */
const ServiceSettingsPage = ({ user }) => {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE}/pricing`, { headers: authHeaders(), withCredentials: true });
            setVehicles(res.data.dynamicPricing || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to load pricing data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectVehicle = (v) => {
        setSelectedVehicle(v);
        // Deep copy so we can edit without affecting the list until saved
        setEditingDoc(JSON.parse(JSON.stringify(v)));
    };

    const handleCreateVehicle = async () => {
        const { value: name } = await Swal.fire({
            title: 'New Vehicle Type',
            input: 'text',
            inputPlaceholder: 'e.g., Luxury SUV',
            showCancelButton: true,
            confirmButtonColor: '#23A0CE'
        });
        if (!name) return;

        try {
            const res = await axios.post(`${API_BASE}/pricing`, {
                vehicleType: name,
                services: [],
                addons: []
            }, { headers: authHeaders(), withCredentials: true });
            setVehicles([...vehicles, res.data]);
            Swal.fire('Success', 'Vehicle added. Select it to add services.', 'success');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create', 'error');
        }
    };

    const handleDeleteVehicle = async (id, name) => {
        const result = await Swal.fire({
            title: `Delete ${name}?`,
            text: "This will remove all its pricing data permanently.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e'
        });
        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE}/pricing/${id}`, { headers: authHeaders(), withCredentials: true });
            setVehicles(vehicles.filter(v => v._id !== id));
            if (selectedVehicle?._id === id) {
                setSelectedVehicle(null);
                setEditingDoc(null);
            }
            Swal.fire('Deleted!', '', 'success');
        } catch (err) {
            Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    const handleSaveDoc = async () => {
        if (!editingDoc || !editingDoc._id) return;

        // Validation Check
        const hasEmptyNames = [...editingDoc.services, ...editingDoc.addons].some(item => !item.name.trim());
        if (hasEmptyNames) {
            Swal.fire('Incomplete Data', 'All services and add-ons must have a name.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/pricing/${editingDoc._id}`, {
                vehicleType: editingDoc.vehicleType,
                services: editingDoc.services,
                addons: editingDoc.addons
            }, { headers: authHeaders(), withCredentials: true });

            if (res.data && res.data._id) {
                setVehicles(prev => prev.map(v => v._id === res.data._id ? res.data : v));
                setSelectedVehicle(res.data);
                setEditingDoc(JSON.parse(JSON.stringify(res.data))); // Refresh edit buffer
                Swal.fire({
                    title: 'Item Added Successfully!',
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

    const addServiceOrAddon = (type) => {
        const newItem = { name: '', price: 0 };
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
            arr[index] = { ...arr[index], [field]: field === 'price' ? Number(value) : value };
            return { ...prev, [type]: arr };
        });
    };

    if (isLoading) return <div className="text-center p-5"><div className="spinner-border text-primary" /></div>;

    return (
        <div>
            <div className="border-bottom pb-3 mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Service & Pricing Settings</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Dynamic pricing configuration for bookings.</p>
                </div>
                <button onClick={handleCreateVehicle} className="btn btn-save rounded-3 text-white fw-bold shadow-sm">
                    + Add Vehicle Type
                </button>
            </div>

            <div className="row g-4">
                {/* Left Col: Vehicle List */}
                <div className="col-12 col-md-4 col-lg-3">
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-bold text-dark-secondary">Select Vehicle</h6>
                        </div>
                        <ul className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {vehicles.map(v => (
                                <li
                                    key={v._id}
                                    className={`list-group-item service-settings d-flex justify-content-between align-items-center cursor-pointer p-3  ${selectedVehicle?._id === v._id ? 'service-settings-active text-white' : ''}`}
                                    onClick={() => handleSelectVehicle(v)}
                                    style={{ cursor: 'pointer', transition: '0.2s' }}
                                >
                                    <span className="fw-bold font-poppins" style={{ fontSize: '0.9rem' }}>{v.vehicleType}</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{v.services?.length + v.addons?.length || 0} items</span>
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
                                {/* Core Services */}
                                <div className="mb-5">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-bold text-dark-secondary mb-0">Core Services</h6>
                                        <button onClick={() => addServiceOrAddon('services')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Service</button>
                                    </div>
                                    {editingDoc.services.length === 0 ? <p className="text-muted small">No core services defined.</p> : (
                                        <div className="table-responsive">
                                            <table className="table table-borderless table-sm mb-0">
                                                <thead className="border-bottom text-muted small">
                                                    <tr>
                                                        <th>Service Name</th>
                                                        <th style={{ width: '200px' }}>Price (₱)</th>
                                                        <th style={{ width: '50px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {editingDoc.services.map((item, idx) => (
                                                        <tr key={idx} className="border-bottom">
                                                            <td className="py-2">
                                                                <input type="text" className="form-control form-control-sm" value={item.name} onChange={(e) => updateItem('services', idx, 'name', e.target.value)} placeholder="e.g. Wash" />
                                                            </td>
                                                            <td className="py-2">
                                                                <input type="number" className="form-control form-control-sm" value={item.price} onChange={(e) => updateItem('services', idx, 'price', e.target.value)} placeholder="0" min="0" />
                                                            </td>
                                                            <td className="py-2 text-end">
                                                                <button onClick={() => removeServiceOrAddon('services', idx)} className="btn btn-sm text-danger p-1">✕</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Addons */}
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-bold brand-primary mb-0">Add-ons & Extras</h6>
                                        <button onClick={() => addServiceOrAddon('addons')} className="btn btn-sm btn-save rounded-pill text-white shadow-sm">+ Add Item</button>
                                    </div>
                                    {editingDoc.addons.length === 0 ? <p className="text-muted small">No add-ons defined.</p> : (
                                        <div className="table-responsive">
                                            <table className="table table-borderless table-sm mb-0">
                                                <thead className="border-bottom text-muted small">
                                                    <tr>
                                                        <th>Addon Name</th>
                                                        <th style={{ width: '200px' }}>Price (₱)</th>
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
        </div>
    );
};

export default AdminDashboard;
