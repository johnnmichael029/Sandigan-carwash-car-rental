import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// Assets
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import carService from '../../assets/icon/car.png';
import dashboard from '../../assets/icon/dashboard.png';
import collapseIcon from '../../assets/icon/collapse.png';
import logoIcon from '../../assets/logo/logo.png';
import adminLogoutIcon from '../../assets/icon/employee-logout.png';
import bookingIcon from '../../assets/icon/order.png';
import carRentalIcon from '../../assets/icon/car-rental.png';
import retailIcon from '../../assets/icon/retail.png';
import membershipIcon from '../../assets/icon/membership.png';
import darkTheme from '../../assets/icon/dark-theme.png';
import lightTheme from '../../assets/icon/light-theme.png';

// Components
import DashboardOverview from '../../components/employee/dashboard/DashboardOverview';
import BookingManagement from '../../components/employee/dashboard/BookingManagement';
import CarRentManagement from '../../components/employee/dashboard/CarRentManagement';
import RetailManagement from '../../components/employee/dashboard/RetailManagement';
import MembershipManagement from '../../components/employee/dashboard/MembershipManagement';
import SMCCardModal from '../../components/employee/dashboard/SMCCardModal';

// Config
import { API_BASE, authHeaders } from '../../api/config';

// Sub-tabs that belong under the "Services" dropdown
const SERVICE_ITEMS = ['bookings', 'car-rent', 'retail', 'membership'];

const EmployeeDashboard = () => {
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toggleActive, setToggleActive] = useState('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDark, setIsDark] = useState(() => localStorage.getItem('sandigan-theme') === 'dark');

    /* ── Theme sync ── */
    useEffect(() => {
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('sandigan-theme', theme);
    }, [isDark]);

    /* ── Init theme on mount ── */
    useEffect(() => {
        const saved = localStorage.getItem('sandigan-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

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

    /* ── Rehydrate employee from localStorage on mount ── */
    useEffect(() => {
        const stored = localStorage.getItem('employee');

        if (!stored) {
            localStorage.removeItem('employee');
            navigate('/login', { replace: true });
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            if (!parsed.role) {
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
            color: 'var(--theme-content-text)',
            background: 'var(--theme-card-bg)',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, log out',
        }).then(async (result) => {
            if (result.isConfirmed) {
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

    /* ── Idle Timeout (15 minutes) ── */
    useEffect(() => {
        let timeoutId;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleLogout(true);
            }, 900000);
        };

        const events = ['mousemove', 'keydown', 'wheel', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, []);

    /* ── Render correct content panel ── */
    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard':
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} isDark={isDark} />;
            case 'bookings':
                return <BookingManagement employee={employee} onShowSMC={handleShowSMC} isDark={isDark} />;
            case 'car-rent':
                return <CarRentManagement employee={employee} isDark={isDark} />;
            case 'retail':
                return <RetailManagement employee={employee} onSMCRequest={handleFetchSMCById} isDark={isDark} />;
            case 'membership':
                return <MembershipManagement employee={employee} onSMCRequest={handleFetchSMCById} isDark={isDark} />;
            default:
                return <DashboardOverview employee={employee} onNavigate={setToggleActive} isDark={isDark} />;
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
    const sidebarWidth = isCollapsed ? '85px' : '260px';

    return (
        <div className="container-fluid p-0 font-poppins background-light-primary" style={{ height: '100vh', overflow: 'hidden' }}>
            <div className="d-flex w-100 p-3 gap-3" style={{ height: '100vh', overflow: 'hidden' }}>

                {/* ─── FLOATING SIDEBAR ─── */}
                <nav className="sidebar-container d-flex flex-column shadow-lg" style={{
                    width: sidebarWidth,
                    minWidth: sidebarWidth,
                    height: 'calc(100vh - 32px)',
                    transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1001,
                    overflow: 'visible',
                    position: 'relative',
                    flexShrink: 0,
                    borderRadius: '24px',
                    backgroundColor: '#002525'
                }}>

                    {/* Floating Collapse Button */}
                    <div
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="shadow d-flex align-items-center justify-content-center"
                        style={{
                            position: 'absolute',
                            right: '-20px',
                            top: '50px',
                            transform: 'translateY(0)',
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#002525',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            border: '1px solid rgba(35,160,206,0.3)',
                            zIndex: 1002,
                            transition: 'all 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#23A0CE';
                            e.currentTarget.style.borderColor = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#002525';
                            e.currentTarget.style.borderColor = 'rgba(35,160,206,0.3)';
                        }}
                    >
                        <img
                            src={collapseIcon}
                            alt="Toggle"
                            style={{
                                width: '14px',
                                opacity: 1,
                                filter: 'brightness(0) invert(1)',
                                transition: 'all 0.1s ease',
                                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        />
                    </div>

                    {/* Logo */}
                    <div className="brand-container border-bottom border-secondary-subtle w-100 d-flex justify-content-center align-items-center px-2 py-4">
                        <img
                            className="sandigan-logo"
                            src={isCollapsed ? logoIcon : sandiganLogo}
                            alt="Sandigan Logo"
                            style={{
                                width: isCollapsed ? '32px' : '140px',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {/* Nav links */}
                    <ul className="nav flex-column w-100 flex-grow-1 pt-3 custom-sidebar-scroll" style={{
                        listStyleType: 'none',
                        padding: '0 12px',
                        margin: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}>

                        {/* Dashboard */}
                        <li className="nav-item w-100 mb-2">
                            <button
                                id="nav-dashboard"
                                className={`nav-link w-100 d-flex align-items-center transition-all rounded-3 ${toggleActive === 'dashboard' ? 'active shadow-sm' : ''}`}
                                onClick={() => setToggleActive('dashboard')}
                                style={{
                                    padding: '12px 16px',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <img src={dashboard} style={{ width: 22, minWidth: 22 }} alt="Dashboard Icon" />
                                {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Dashboard</span>}
                            </button>
                        </li>

                        {/* Services (parent) */}
                        <li className="nav-item w-100 mb-2">
                            <div
                                id="nav-services"
                                className={`nav-link d-flex justify-content-between align-items-center transition-all rounded-3 ${isServiceActive ? 'active shadow-sm' : ''}`}
                                onClick={() => {
                                    if (isCollapsed) setIsCollapsed(false);
                                    setIsServicesOpen(prev => !prev);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <img src={carService} style={{ width: 22, minWidth: 22 }} alt="Car Service Icon" />
                                    {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Services</span>}
                                </div>
                                {!isCollapsed && (
                                    <img
                                        src={isServicesOpen ? upArrow : downArrow}
                                        alt={isServicesOpen ? 'Collapse' : 'Expand'}
                                        style={{ width: '10px', marginLeft: '8px', opacity: 0.6 }}
                                    />
                                )}
                            </div>
                        </li>

                        {/* Services sub-menu */}
                        {isServicesOpen && !isCollapsed && (
                            <li className="nav-item w-100 animate-fade-in" style={{ height: 'auto' }}>
                                <ul className="ps-3 w-100 list-unstyled border-start ms-4 border-secondary-subtle">
                                    {[
                                        { key: 'bookings', label: 'Bookings', icon: <img src={bookingIcon} style={{ width: 18 }} alt="Booking Icon" /> },
                                        { key: 'car-rent', label: 'Car Rent', icon: <img src={carRentalIcon} style={{ width: 18 }} alt="Car Rental Icon" /> },
                                        { key: 'retail', label: 'Retail Store', icon: <img src={retailIcon} style={{ width: 18 }} alt="Retail Icon" /> },
                                        { key: 'membership', label: 'Membership', icon: <img src={membershipIcon} style={{ width: 18 }} alt="Membership Icon" /> },
                                    ].map(item => (
                                        <li key={item.key} className="mb-1">
                                            <button
                                                id={`nav-${item.key}`}
                                                className={`nav-link w-100 d-flex align-items-center rounded-2 gap-3 ${toggleActive === item.key ? 'active' : ''}`}
                                                onClick={() => setToggleActive(item.key)}
                                                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                                            >
                                                {item.icon} <span className="text-nowrap">{item.label}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )}
                    </ul>

                    {/* Footer — Profile Card + Logout */}
                    <div className="p-3 mt-auto border-top border-secondary-subtle">
                        <div className={`d-flex align-items-center p-2 rounded-4 ${isCollapsed ? 'justify-content-center' : 'gap-3'}`} style={{ background: '#23a0ce10' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '12px',
                                background: 'linear-gradient(60deg, #23A0CE, #002525)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}>
                                {employee?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            {!isCollapsed && (
                                <div style={{ overflow: 'hidden' }} className="animate-fade-in">
                                    <p className="mb-0 text-white text-nowrap" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                        {employee?.fullName ?? 'Employee'}
                                    </p>
                                    <p className="mb-0 text-info opacity-75" style={{ fontSize: '0.7rem' }}>
                                        {employee?.role === 'employee' ? 'Staff' : 'Admin'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            id="btn-logout"
                            className="btn btn-link text-danger w-100 d-flex align-items-center justify-content-center gap-2 mt-3 text-decoration-none transition-all"
                            onClick={handleLogout}
                            style={{ fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <img src={adminLogoutIcon} alt="" style={{ width: 16 }} />
                            {!isCollapsed && <span>Log Out</span>}
                        </button>
                    </div>
                </nav>

                {/* ─── FLOATING MAIN CONTENT ─── */}
                <main className="right-content-container flex-grow-1 shadow-sm" style={{
                    height: 'calc(100vh - 32px)',
                    overflowY: 'auto',
                    borderRadius: '24px',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    minWidth: 0
                }}>
                    {/* ── Theme Toggle Button ── */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '10px 24px 0',
                        pointerEvents: 'none'
                    }}>
                        <div
                            onClick={() => setIsDark(prev => !prev)}
                            style={{
                                pointerEvents: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '4px',
                                borderRadius: '20px',
                                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease',
                                userSelect: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '16px',
                                background: !isDark ? '#23A0CE' : 'transparent',
                                transition: 'all 0.3s ease',
                            }}>
                                <img src={lightTheme} alt="Light" style={{ width: 16, filter: !isDark ? 'brightness(0) invert(1)' : (isDark ? 'brightness(0.7) invert(0.7)' : 'none') }} />
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '16px',
                                background: isDark ? '#23A0CE' : 'transparent',
                                transition: 'all 0.3s ease',
                            }}>
                                <img src={darkTheme} alt="Dark" style={{ width: 16, filter: isDark ? 'brightness(0) invert(1)' : 'opacity(0.5)' }} />
                            </div>
                        </div>
                    </div>

                    <div className="p-3">
                        {renderContent()}
                    </div>

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
                </main>

            </div>
        </div>
    );
};

export default EmployeeDashboard;
