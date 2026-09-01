import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import dashboardIcon from '../../assets/icon/dashboard.png';
import carService from '../../assets/icon/car.png';
import activityLogs from '../../assets/icon/activity-logs.png';
import settingsIcon from '../../assets/icon/setting.png'
import financeIcon from '../../assets/icon/finance.png'
import humanResourcIcon from '../../assets/icon/human-resource.png'
import inventoryIcon from '../../assets/icon/inventory.png'
import salesIcon from '../../assets/icon/sales.png'
import operationIcon from '../../assets/icon/operation.png'
import accountPayableIcon from '../../assets/icon/account-payable.png'
import promotionIcon from '../../assets/icon/promotions.png'
import { API_BASE, authHeaders } from '../../api/config';
import { PageSkeleton, ChartSkeleton, TableSkeleton } from '../../components/SkeletonLoaders';
import VendorPayables from './VendorPayables';
import AdminOverview from '../../components/admin/overview/DashboardOverview';
import ActivityLogPage from '../../components/admin/overview/SystemAuditLogs';
import FinancePage from '../../components/admin/finance/FinanceModule';
import HRISPage from '../../components/admin/hr/HRISModule';
import InventoryPage from '../../components/admin/inventory/InventoryManager';
import CRMPage from '../../components/admin/crm/CRMModule';
import PromotionsPage from '../../components/admin/crm/PromotionManager';
import MobileCustomersPage from '../../components/admin/crm/MobileCustomersModule';
import OperationsPage from '../../components/admin/operations/OperationsModule';
import ServiceSettingsPage from '../../components/admin/inventory/ServiceManager';
import UserManagementPage from '../../components/admin/overview/UserManagement';
import AccessDenied from '../../components/AccessDenied';
import { hasPermission } from '../../utils/permissions';
import adminLogoutIcon from '../../assets/icon/employee-logout.png'
import collapseIcon from '../../assets/icon/collapse.png'
import logoIcon from '../../assets/logo/logo.png'
import darkTheme from '../../assets/icon/dark-theme.png'
import lightTheme from '../../assets/icon/light-theme.png'
import mobileIcon from '../../assets/icon/mobile.png'
import userManagement from '../../assets/icon/user-management.png'

const ERP_ITEMS = ['finance', 'hris', 'inventory', 'crm', 'promotions', 'operations', 'accounts-payable', 'mobile-customers'];

// Dept key → sidebar label mapping
const DEPT_TAB_MAP = {
    Finance: 'finance',
    Inventory: 'inventory',
    Workforce: 'hris',
    Clientele: 'crm',
    Operations: 'operations',
};

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    department_staff: 'Department Staff',
    employee: 'Employee',
    detailer: 'Detailer',
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('employee');
        if (stored) {
            try { return JSON.parse(stored); } catch { return null; }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [toggleActive, setToggleActive] = useState('dashboard');
    const [isERPOpen, setIsERPOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const displayCollapsed = isCollapsed && !isHovered;
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

    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
        } else if (!['super_admin', 'admin', 'department_staff'].includes(user.role)) {
            navigate('/employee', { replace: true });
        } else if (user.role === 'department_staff') {
            const deptToTab = {
                Finance: 'finance',
                Workforce: 'hris',
                Inventory: 'inventory',
                Clientele: 'crm',
                Operations: 'operations',
            };
            const firstDept = (user.departments || [])[0];
            const firstTab = deptToTab[firstDept];
            if (firstTab && toggleActive === 'dashboard') {
                setToggleActive(firstTab);
                setIsERPOpen(true);
            }
        }
    }, [user, navigate]);


    const [prevToggle, setPrevToggle] = useState(toggleActive);
    if (toggleActive !== prevToggle) {
        setPrevToggle(toggleActive);
        if (ERP_ITEMS.includes(toggleActive)) setIsERPOpen(true);
    }

    /* ── Logout ── */
    const handleLogout = (isAuto = false) => {
        if (isAuto === true) {
            Swal.fire({
                title: 'Session Expired',
                text: 'You have been logged out due to 15 minutes of inactivity.',
                icon: 'info',
                confirmButtonColor: '#23A0CE',
                confirmButtonText: 'OK',
                background: 'var(--theme-card-bg)',
                color: 'var(--theme-content-text)',
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
            color: 'var(--theme-content-text)',
            background: 'var(--theme-card-bg)',
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

    // Map tab key -> { department, label }
    const TAB_DEPT_MAP = {
        finance: { dept: 'Finance', label: 'Finance' },
        hris: { dept: 'Workforce', label: 'Workforce' },
        inventory: { dept: 'Inventory', label: 'Inventory' },
        crm: { dept: 'Clientele', label: 'Clientele' },
        operations: { dept: 'Operations', label: 'Operations' },
    };

    // Guard helper: returns AccessDenied if dept_staff lacks read permission
    const guardedRender = (tabKey, content) => {
        const tabInfo = TAB_DEPT_MAP[tabKey];
        if (tabInfo && user?.role === 'department_staff') {
            if (!hasPermission(user, tabInfo.dept, 'read')) {
                return <AccessDenied department={tabInfo.label} onGoBack={() => setToggleActive('dashboard')} />;
            }
        }
        return content;
    };

    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard': return <AdminOverview user={user} onNavigate={setToggleActive} isDark={isDark} />;
            case 'activity-log': return <ActivityLogPage isDark={isDark} />;
            case 'finance': return guardedRender('finance', <FinancePage user={user} onNavigate={setToggleActive} isDark={isDark} />);
            case 'hris': return guardedRender('hris', <HRISPage user={user} isDark={isDark} />);
            case 'inventory': return guardedRender('inventory', <InventoryPage user={user} isDark={isDark} />);
            case 'crm': return guardedRender('crm', <CRMPage user={user} isDark={isDark} />);
            case 'promotions': return <PromotionsPage user={user} isDark={isDark} />;
            case 'operations': return guardedRender('operations', <OperationsPage user={user} isDark={isDark} />);
            case 'accounts-payable': return <VendorPayables isDark={isDark} />;
            case 'mobile-customers': return <MobileCustomersPage isDark={isDark} />;
            case 'settings': return <ServiceSettingsPage user={user} isDark={isDark} />;
            case 'user-management': return <UserManagementPage user={user} isDark={isDark} />;
            default: return <AdminOverview user={user} onNavigate={setToggleActive} isDark={isDark} />;
        }
    };

    if (isLoading) {
        return (
            <div className="d-flex w-100 vh-100 overflow-hidden background-light-primary p-4">
                <PageSkeleton />
            </div>
        );
    }

    const sidebarWidth = displayCollapsed ? '85px' : '260px';

    return (
        <div className="container-fluid p-0 font-poppins background-light-primary" style={{ height: '100vh', overflow: 'hidden' }}>
            <div className="d-flex w-100 p-3 gap-3" style={{ height: '100vh', overflow: 'hidden' }}>

                {/* ─── FLOATING SIDEBAR ─── */}
                <nav
                    className="sidebar-container d-flex flex-column shadow-lg"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        width: sidebarWidth,
                        minWidth: sidebarWidth,
                        height: 'calc(100vh - 32px)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 1001,
                        overflow: 'visible',
                        position: 'relative',
                        flexShrink: 0,
                        borderRadius: '24px',
                        backgroundColor: '#002525' // Match theme
                    }}
                >

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
                                transition: 'all 0.3s ease',
                                transform: displayCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        />
                    </div>

                    {/* Logo Section */}
                    <div className="brand-container border-bottom border-secondary-subtle w-100 d-flex justify-content-center align-items-center px-2 py-4">
                        <img
                            className="sandigan-logo transition-all"
                            src={displayCollapsed ? logoIcon : sandiganLogo}
                            alt="Sandigan Logo"
                            style={{
                                width: displayCollapsed ? '32px' : '140px',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {/* Navigation Links */}
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
                                className={`nav-link w-100 d-flex align-items-center transition-all rounded-3 ${toggleActive === 'dashboard' ? 'active shadow-sm' : ''}`}
                                onClick={() => setToggleActive('dashboard')}
                                style={{
                                    padding: '12px 16px',
                                    justifyContent: displayCollapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <img src={dashboardIcon} style={{ width: 22, minWidth: 22 }} alt="Dashboard" />
                                {!displayCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Dashboard</span>}
                            </button>
                        </li>

                        {/* Activity Log */}
                        <li className="nav-item w-100 mb-2">
                            <button
                                className={`nav-link w-100 d-flex align-items-center transition-all rounded-3 ${toggleActive === 'activity-log' ? 'active shadow-sm' : ''}`}
                                onClick={() => setToggleActive('activity-log')}
                                style={{
                                    padding: '12px 16px',
                                    justifyContent: displayCollapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <img src={activityLogs} style={{ width: 22, minWidth: 22 }} alt="Logs" />
                                {!displayCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Activity Log</span>}
                            </button>
                        </li>

                        {/* Enterprise Management */}
                        <li className="nav-item w-100 mb-2">
                            <div
                                className={`nav-link d-flex justify-content-between align-items-center transition-all rounded-3 ${ERP_ITEMS.includes(toggleActive) ? 'active shadow-sm' : ''}`}
                                onClick={() => {
                                    if (displayCollapsed) setIsHovered(true);
                                    setIsERPOpen(prev => !prev);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    justifyContent: displayCollapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <img src={carService} style={{ width: 22, minWidth: 22 }} alt="ERP" />
                                    {!displayCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Enterprise Management</span>}
                                </div>
                                {!displayCollapsed && (
                                    <img
                                        src={isERPOpen ? upArrow : downArrow}
                                        alt="toggle"
                                        style={{ width: '10px', marginLeft: '8px', opacity: 0.6 }}
                                    />
                                )}
                            </div>
                        </li>

                        {/* Sub Menu */}
                        {isERPOpen && !displayCollapsed && (
                            <li className="w-100 animate-fade-in" >
                                <ul className="ps-3 w-100 list-unstyled border-start ms-4 border-secondary-subtle">
                                    {[
                                        { key: 'finance', dept: 'Finance', icon: <img src={financeIcon} style={{ width: '18px' }} alt="" />, label: 'Finance' },
                                        { key: 'accounts-payable', dept: null, icon: <img src={accountPayableIcon} style={{ width: '18px' }} alt="" />, label: 'Payables' },
                                        { key: 'hris', dept: 'Workforce', icon: <img src={humanResourcIcon} style={{ width: '18px' }} alt="" />, label: 'Workforce' },
                                        { key: 'inventory', dept: 'Inventory', icon: <img src={inventoryIcon} style={{ width: '18px' }} alt="" />, label: 'Inventory' },
                                        { key: 'crm', dept: 'Clientele', icon: <img src={salesIcon} style={{ width: '18px' }} alt="" />, label: 'Clientele' },
                                        { key: 'mobile-customers', dept: null, icon: <img src={mobileIcon} style={{ width: '18px' }} alt="" />, label: 'App Registry' },
                                        { key: 'promotions', dept: null, icon: <img src={promotionIcon} style={{ width: '18px' }} alt="" />, label: 'Promotions' },
                                        { key: 'operations', dept: 'Operations', icon: <img src={operationIcon} style={{ width: '18px' }} alt="" />, label: 'Operations' },
                                    ]
                                        // For department_staff: only show tabs matching their departments
                                        .filter(item => {
                                            if (user?.role === 'department_staff') {
                                                if (!item.dept) return false; // hide non-dept items
                                                return (user.departments || []).includes(item.dept);
                                            }
                                            return true; // admin + super_admin see all
                                        })
                                        .map(item => (
                                            <li key={item.key} className="mb-1">
                                                <button
                                                    className={`nav-link w-100 d-flex align-items-center gap-3 rounded-2 ${toggleActive === item.key ? 'active' : ''}`}
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

                        {/* Service Settings (admin + super_admin only) */}
                        {['admin', 'super_admin'].includes(user?.role) && (
                            <li className="nav-item w-100 mb-2">
                                <button
                                    className={`nav-link w-100 d-flex align-items-center transition-all rounded-3 ${toggleActive === 'settings' ? 'active shadow-sm' : ''}`}
                                    onClick={() => setToggleActive('settings')}
                                    style={{
                                        padding: '12px 16px',
                                        justifyContent: displayCollapsed ? 'center' : 'flex-start'
                                    }}
                                >
                                    <img src={settingsIcon} style={{ width: 22, minWidth: 22 }} alt="Settings" />
                                    {!displayCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">Service Settings</span>}
                                </button>
                            </li>
                        )}

                        {/* User Management — Super Admin only */}
                        {user?.role === 'super_admin' && (
                            <li className="nav-item w-100 mb-2">
                                <button
                                    className={`nav-link w-100 d-flex align-items-center transition-all rounded-3 ${toggleActive === 'user-management' ? 'active shadow-sm' : ''}`}
                                    onClick={() => setToggleActive('user-management')}
                                    style={{
                                        padding: '12px 16px',
                                        justifyContent: displayCollapsed ? 'center' : 'flex-start'
                                    }}
                                >
                                    <img src={userManagement} style={{ width: 22, minWidth: 22 }} alt="User Management" />
                                    {!displayCollapsed && <span className="ms-3 animate-fade-in text-nowrap fw-medium">User Management</span>}
                                </button>
                            </li>
                        )}

                    </ul>

                    {/* Footer Section - Profile Card */}
                    <div className="p-3 mt-auto border-top border-secondary-subtle">
                        <div className={`d-flex align-items-center p-2 rounded-4 ${displayCollapsed ? 'justify-content-center' : 'gap-3'}`} style={{ background: '#23a0ce10' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '12px',
                                background: 'linear-gradient(60deg, #23A0CE, #002525)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}>
                                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
                            </div>
                            {!displayCollapsed && (
                                <div style={{ overflow: 'hidden' }} className="animate-fade-in">
                                    <p className="mb-0 text-white text-nowrap" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                        {user?.fullName ?? 'Administrator'}
                                    </p>
                                    <p className="mb-0 text-info opacity-75" style={{ fontSize: '0.7rem' }}>{ROLE_LABELS[user?.role] || 'Staff'}</p>
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-link text-danger w-100 d-flex align-items-center justify-content-center gap-2 mt-3 text-decoration-none transition-all hover-scale"
                            onClick={handleLogout}
                            style={{ fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <img src={adminLogoutIcon} alt="" style={{ width: 16 }} />
                            {!displayCollapsed && <span>Log Out</span>}
                        </button>
                    </div>
                </nav>


                {/* ─── FLOATING MAIN CONTENT ─── */}
                <main className="right-content-container flex-grow-1 shadow-sm" style={{
                    height: 'calc(100vh - 32px)',
                    overflowY: 'auto',
                    borderRadius: '24px',
                    transition: 'all 0.3s ease',
                    position: 'relative'
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
                                transition: 'all 0.3s ease',
                                userSelect: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {/* Light option */}
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
                            {/* Dark option */}
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
                </main>

            </div>
        </div>
    );
};

export default AdminDashboard;
