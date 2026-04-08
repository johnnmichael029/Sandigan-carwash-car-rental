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
import OperationsPage from '../../components/admin/operations/OperationsModule';
import ServiceSettingsPage from '../../components/admin/inventory/ServiceManager';
import adminLogoutIcon from '../../assets/icon/employee-logout.png'
import collapseIcon from '../../assets/icon/collapse.png'
import logoIcon from '../../assets/logo/logo.png'

const ERP_ITEMS = ['finance', 'hris', 'inventory', 'crm', 'promotions', 'operations', 'accounts-payable'];

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
    const [isCollapsed, setIsCollapsed] = useState(false);

    /* ── Rehydrate + role guard ── */
    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
        } else if (user.role !== 'admin') {
            navigate('/employee', { replace: true });
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

    const renderContent = () => {
        switch (toggleActive) {
            case 'dashboard': return <AdminOverview user={user} onNavigate={setToggleActive} />;
            case 'activity-log': return <ActivityLogPage />;
            case 'finance': return <FinancePage user={user} onNavigate={setToggleActive} />;
            case 'hris': return <HRISPage user={user} />;
            case 'inventory': return <InventoryPage user={user} />;
            case 'crm': return <CRMPage user={user} />;
            case 'promotions': return <PromotionsPage user={user} />;
            case 'operations': return <OperationsPage user={user} />;
            case 'accounts-payable': return <VendorPayables />;
            case 'settings': return <ServiceSettingsPage user={user} />;
            default: return <AdminOverview user={user} onNavigate={setToggleActive} />;
        }
    };

    if (isLoading) {
        return (
            <div className="d-flex w-100 vh-100 overflow-hidden background-light-primary p-4">
                <PageSkeleton />
            </div>
        );
    }

    const sidebarWidth = isCollapsed ? '85px' : '260px';

    return (
        <div className="container-fluid p-0 font-poppins" style={{ height: '100vh', overflow: 'hidden' }}>
            <div className="d-flex w-100" style={{ height: '100vh', overflow: 'hidden' }}>

                {/* ─── SIDEBAR ─── */}
                <nav className="sidebar-container d-flex flex-column shadow" style={{
                    width: sidebarWidth,
                    minWidth: sidebarWidth,
                    height: '100vh',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1001,
                    overflow: 'visible',
                    position: 'relative',
                    flexShrink: 0
                }}>

                    {/* Floating Collapse Button */}
                    <div
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="shadow d-flex align-items-center justify-content-center"
                        style={{
                            position: 'absolute',
                            right: '-15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#002525',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: '1px solid #23A0CE',
                            zIndex: 1002,
                            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                    >
                        <img
                            src={collapseIcon}
                            alt="Toggle"
                            style={{
                                width: '18px',
                                opacity: 0.8,
                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        />
                    </div>

                    {/* Logo Section */}
                    <div className="brand-container border-bottom w-100 d-flex justify-content-center align-items-center px-2">
                        <img
                            className="sandigan-logo transition-all"
                            src={isCollapsed ? logoIcon : sandiganLogo}
                            alt="Sandigan Logo"
                            style={{
                                width: isCollapsed ? '35px' : '50%',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {/* Navigation Links */}
                    <ul className="nav flex-column w-100 flex-grow-1 pt-3 overflow-x-hidden pt-2 custom-sidebar-scroll" style={{
                        listStyleType: 'none',
                        padding: 0,
                        margin: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}>

                        {/* Dashboard */}
                        <li className="nav-item w-100 mb-1">
                            <button
                                className={`nav-link w-100 d-flex align-items-center transition-all ${toggleActive === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setToggleActive('dashboard')}
                                style={{ paddingLeft: isCollapsed ? '32px' : '24px' }}
                            >
                                <img src={dashboardIcon} style={{ width: 20, minWidth: 20 }} alt="Dashboard" />
                                {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap">Dashboard</span>}
                            </button>
                        </li>

                        {/* Activity Log */}
                        <li className="nav-item w-100 mb-1">
                            <button
                                className={`nav-link w-100 d-flex align-items-center transition-all ${toggleActive === 'activity-log' ? 'active' : ''}`}
                                onClick={() => setToggleActive('activity-log')}
                                style={{ paddingLeft: isCollapsed ? '32px' : '24px' }}
                            >
                                <img src={activityLogs} style={{ width: 20, minWidth: 20 }} alt="Logs" />
                                {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap">Activity Log</span>}
                            </button>
                        </li>

                        {/* Enterprise Management */}
                        <li className="nav-item w-100 mb-1">
                            <div
                                className={`nav-link d-flex justify-content-between align-items-center transition-all ${ERP_ITEMS.includes(toggleActive) ? 'active' : ''}`}
                                onClick={() => {
                                    if (isCollapsed) setIsCollapsed(false);
                                    setIsERPOpen(prev => !prev);
                                }}
                                style={{ cursor: 'pointer', paddingLeft: isCollapsed ? '32px' : '24px' }}
                            >
                                <div className="d-flex align-items-center">
                                    <img src={carService} style={{ width: 20, minWidth: 20 }} alt="ERP" />
                                    {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap">Enterprise Management</span>}
                                </div>
                                {!isCollapsed && (
                                    <img
                                        src={isERPOpen ? upArrow : downArrow}
                                        alt="toggle"
                                        style={{ width: '10px', marginRight: '8px', opacity: 0.6 }}
                                    />
                                )}
                            </div>
                        </li>

                        {/* Sub Menu */}
                        {isERPOpen && !isCollapsed && (
                            <li className="w-100 animate-fade-in" >
                                <ul className="ps-0 w-100">
                                    {[
                                        { key: 'finance', icon: <img src={financeIcon} style={{ width: '16px' }} alt="" />, label: 'Finance' },
                                        { key: 'accounts-payable', icon: <img src={accountPayableIcon} style={{ width: '16px' }} alt="" />, label: 'Payables' },
                                        { key: 'hris', icon: <img src={humanResourcIcon} style={{ width: '16px' }} alt="" />, label: 'HRIS' },
                                        { key: 'inventory', icon: <img src={inventoryIcon} style={{ width: '16px' }} alt="" />, label: 'Inventory' },
                                        { key: 'crm', icon: <img src={salesIcon} style={{ width: '16px' }} alt="" />, label: 'CRM' },
                                        { key: 'promotions', icon: <img src={promotionIcon} style={{ width: '16px' }} alt="" />, label: 'Promotions' },
                                        { key: 'operations', icon: <img src={operationIcon} style={{ width: '16px' }} alt="" />, label: 'Operations' },
                                    ].map(item => (
                                        <li key={item.key}>
                                            <button
                                                className={`nav-link ps-5 w-100 d-flex align-items-center gap-2 ${toggleActive === item.key ? 'active' : ''}`}
                                                onClick={() => setToggleActive(item.key)}
                                                style={{ fontSize: '0.8rem', height: '40px' }}
                                            >
                                                {item.icon} {item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )}

                        {/* Service Settings */}
                        <li className="nav-item w-100 mb-1">
                            <button
                                className={`nav-link w-100 d-flex align-items-center transition-all ${toggleActive === 'settings' ? 'active' : ''}`}
                                onClick={() => setToggleActive('settings')}
                                style={{ paddingLeft: isCollapsed ? '32px' : '24px' }}
                            >
                                <img src={settingsIcon} style={{ width: 20, minWidth: 20 }} alt="Settings" />
                                {!isCollapsed && <span className="ms-3 animate-fade-in text-nowrap">Service Settings</span>}
                            </button>
                        </li>

                    </ul>

                    {/* Footer Section */}
                    <div className="border-top p-3 transition-all mt-auto" style={{ background: 'rgba(0,0,0,0.1)', flexShrink: 0 }}>
                        <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center' : 'gap-3'} mb-3`}>
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: 'rgba(0, 232, 233, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#00e8e9', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0,
                                border: '1px solid rgba(0, 232, 233, 0.2)'
                            }}>
                                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
                            </div>
                            {!isCollapsed && (
                                <div style={{ overflow: 'hidden' }} className="animate-fade-in">
                                    <p className="mb-0 text-white opacity-90 text-nowrap" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                        {user?.fullName ?? 'Administrator'}
                                    </p>
                                    <p className="mb-0 text-light-gray300" style={{ fontSize: '0.65rem' }}>Full Admin Control</p>
                                </div>
                            )}
                        </div>
                        <button
                            className={`btn btn-outline-danger btn-sm w-100 d-flex align-items-center ${isCollapsed ? 'justify-content-center' : 'justify-content-center'} gap-2`}
                            onClick={handleLogout}
                            style={{
                                fontSize: '0.8rem',
                                border: isCollapsed ? 'none' : '1px solid var(--border-outline-color)',
                                padding: isCollapsed ? '8px 0' : '8px 12px'
                            }}
                            title={isCollapsed ? 'Log Out' : ''}
                        >
                            <img src={adminLogoutIcon} alt="" style={{ width: 16 }} />
                            {!isCollapsed && <span className="animate-fade-in">Log Out</span>}
                        </button>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="right-content-container flex-grow-1 pt-4 px-4" style={{
                    height: '100vh',
                    overflowY: 'auto',
                    background: 'var(--background-light-primary)',
                    transition: 'all 0.3s ease'
                }}>
                    {renderContent()}
                </main>

            </div>
        </div>
    );
};

export default AdminDashboard;
