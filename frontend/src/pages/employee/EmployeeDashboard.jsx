import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import carService from '../../assets/icon/car.png';
import dashboard from '../../assets/icon/dashboard.png';

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

    /* ── Rehydrate employee from sessionStorage on mount ── */
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
            <div className="d-flex">

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
                                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
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
                                    background: 'var(--brand-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0,
                                }}
                            >
                                {employee?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p className="mb-0 text-dark-secondary font-poppins" style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.fullName ?? 'Employee'}
                                </p>
                                <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {employee?.role ?? 'Staff'}
                                </p>
                            </div>
                        </div>
                        <button
                            id="btn-logout"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={handleLogout}
                            style={{ fontSize: '0.8rem' }}
                        >
                            Log Out
                        </button>
                    </div>
                </nav>

                {/* ─── MAIN CONTENT ─── */}
                <main className="right-content-container col-md-10 pt-4 px-4" style={{ minHeight: '100vh', background: 'var(--background-light-primary)' }}>
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
        { label: 'Total Bookings Today', value: '—', icon: '📋', color: '#23A0CE' },
        { label: 'Completed', value: '—', icon: '✅', color: '#22c55e' },
        { label: 'Pending', value: '—', icon: '⏳', color: '#f59e0b' },
        { label: 'Active Car Rentals', value: '—', icon: '🚗', color: '#a855f7' },
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
const BookingManagement = ({ employee }) => (
    <div>
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
                <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>
                    Manage Bookings
                </h4>
                <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>
                    View and update all carwash bookings
                </p>
            </div>
            <span className="font-poppins text-dark-gray400" style={{ fontSize: '0.85rem' }}>
                Welcome, <strong className="text-dark-secondary">{employee?.fullName ?? 'Employee'}</strong>
            </span>
        </div>
        {/* Booking table goes here */}
        <div
            className="rounded-4 p-4 d-flex align-items-center justify-content-center"
            style={{ minHeight: 300, background: '#fff', border: '1px dashed rgba(0,0,0,0.15)', color: '#A3A3A3', fontSize: '0.9rem' }}
        >
            📋 Bookings table coming soon
        </div>
    </div>
);

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