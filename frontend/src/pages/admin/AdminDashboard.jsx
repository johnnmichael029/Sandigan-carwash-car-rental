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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                        { key: 'accounts-payable', icon: <img src={accountPayableIcon} style={{ width: '16px' }} alt="Account Payable Icon" />, label: 'Vendor Payables' },
                                        { key: 'hris', icon: <img src={humanResourcIcon} style={{ width: '16px' }} alt="HRIS Icon" />, label: 'HRIS' },
                                        { key: 'inventory', icon: <img src={inventoryIcon} style={{ width: '16px' }} alt="Inventory Icon" />, label: 'Inventory' },
                                        { key: 'crm', icon: <img src={salesIcon} style={{ width: '16px' }} alt="CRM Icon" />, label: 'CRM' },
                                        { key: 'promotions', icon: <img src={promotionIcon} style={{ width: '16px' }} alt="Promos Icon" />, label: 'Promotions' },
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


export default AdminDashboard;
