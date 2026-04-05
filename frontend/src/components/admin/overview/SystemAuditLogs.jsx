import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton } from '../../SkeletonLoaders';
import searchIcon from '../../../assets/icon/search.png';
import SharedSearchBar from '../shared/SharedSearchBar';
import { filterDataBySearch } from '../shared/searchUtils';
import timeIcon from '../../../assets/icon/time.png';
import userIcon from '../../../assets/icon/user.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';
import getPaginationRange from '../getPaginationRange';
import bookingsIcon from '../../../assets/icon/order.png';
import updateIcon from '../../../assets/icon/update.png';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import loginIcon from '../../../assets/icon/login.png';
import logoutIcon from '../../../assets/icon/logout.png';
import accountPayableIcon from '../../../assets/icon/account-payable.png';
import operationCostIcon from '../../../assets/icon/operation-cost.png';
import revenueIcon from '../../../assets/icon/revenue.png';
import netProfitIcon from '../../../assets/icon/net-profit.png';
import payrollIcon from '../../../assets/icon/emp-payroll.png';
import staffIcon from '../../../assets/icon/staff.png';
import commisionIcon from '../../../assets/icon/commission.png';
import employeeIcon from '../../../assets/icon/employee.png';
import refreshIcon from '../../../assets/icon/refresh.png';
import settingsIcon from '../../../assets/icon/setting.png';

const ACTION_META = {
    booking_created: { icon: bookingsIcon, color: '#23A0CE' },
    booking_status_changed: { icon: updateIcon, color: '#f59e0b' },
    booking_updated: { icon: editIcon, color: '#a855f7' },
    booking_deleted: { icon: deleteIcon, color: '#f43f5e' },
    staff_logged_in: { icon: loginIcon, color: '#22c55e' },
    staff_logged_out: { icon: logoutIcon, color: '#888' },
    payment_recorded: { icon: accountPayableIcon, color: '#23A0CE' },
    expense_created: { icon: operationCostIcon, color: '#ef4444' },
    expense_deleted: { icon: deleteIcon, color: '#f43f5e' },
    revenue_recorded: { icon: revenueIcon, color: '#22c55e' },
    revenue_deleted: { icon: deleteIcon, color: '#f43f5e' },
    income_auto_recorded: { icon: netProfitIcon, color: '#22c55e' },
    payout_processed: { icon: payrollIcon, color: '#23A0CE' },
    salary_paid: { icon: staffIcon, color: '#6366f1' },
    bulk_salary_paid: { icon: payrollIcon, color: '#6366f1' },
    bulk_commission_payout: { icon: commisionIcon, color: '#23A0CE' },
    employee_created: { icon: employeeIcon, color: '#22c55e' },
    employee_updated: { icon: updateIcon, color: '#f59e0b' },
    employee_deleted: { icon: deleteIcon, color: '#ef4444' },
    bill_created: { icon: accountPayableIcon, color: '#23A0CE' },
    bill_deleted: { icon: deleteIcon, color: '#f43f5e' },
    bill_updated: { icon: updateIcon, color: '#f59e0b' },
    bills_applied: { icon: refreshIcon, color: '#22c55e' },
    bill_category_created: { icon: accountPayableIcon, color: '#23A0CE' },
    bill_category_updated: { icon: updateIcon, color: '#f59e0b' },
    bill_category_deleted: { icon: deleteIcon, color: '#ef4444' },
    setting_updated: { icon: settingsIcon, color: '#64748b' },
};

const ActivityLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [allLogs, setAllLogs] = useState([]);
    const isAuditMounted = React.useRef(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/activity-logs`, { headers: authHeaders(), withCredentials: true });
            setLogs(res.data);
            setAllLogs(res.data);
            isAuditMounted.current = true;
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_activity_log', (log) => {
            setLogs(prev => [log, ...prev]);
            setAllLogs(prev => [log, ...prev]);
        });
        return () => socket.disconnect();
    }, []);

    // NOTE: Search is handled client-side by filterDataBySearch below.
    // No server fetch on searchTerm change — avoids double-fetch.

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

    const MODULE_FILTERS = [
        { key: 'all', label: 'All' },
        { key: 'BOOKING', label: 'Bookings' },
        { key: 'FINANCE', label: 'Finance' },
        { key: 'HRIS', label: 'HR & Payroll' },
        { key: 'INVENTORY', label: 'Inventory' },
        { key: 'VENDOR', label: 'Vendors' },
        { key: 'SETTINGS', label: 'Settings' },
    ];

    const [activeModule, setActiveModule] = useState('all');

    const baseFiltered = activeModule === 'all' ? logs : logs.filter(l => l.module === activeModule);
    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Proper client-side search with DATE support for immediate UI feedback
    const finalLogs = filterDataBySearch(baseFiltered, searchTerm, ['message', 'actorName'], ['createdAt']);

    // Pagination Logic (Now correctly using finalLogs for accurate page counts)
    const totalPages = Math.ceil(finalLogs.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = finalLogs.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to page 1 on search or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeModule]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

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
            <div className="d-flex mb-4 justify-content-between">
                <div className="d-flex flex-wrap gap-2">
                    {MODULE_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveModule(f.key)}
                            className={`btn btn-sm btn-save ${activeModule === f.key ? '  text-white border-0 shadow-sm' : 'border text-muted'}`}
                            style={{
                                fontSize: '0.78rem',
                                borderRadius: '20px',
                                px: '15px',
                                background: activeModule === f.key ? '#23A0CE' : '#fff'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <SharedSearchBar
                    searchTerm={searchTerm}
                    onDebouncedSearch={setSearchTerm}
                    placeholder="Search log..."
                    width="220px"
                />
            </div>

            {/* Log list */}
            <div className="rounded-4 shadow-sm overflow-hidden d-flex flex-column" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', minHeight: '745px' }}>
                {isLoading ? (
                    <div className="p-0"><TableSkeleton /></div>
                ) : currentItems.length === 0 ? (
                    <div className="p-5 text-center text-muted font-poppins">No activity records found matching your "<strong>{searchTerm}</strong>"</div>
                ) : (
                    <>
                        <div className="flex-grow-1">
                            {currentItems.map((log, idx) => {
                                const meta = ACTION_META[log.action] || { icon: '📌', color: '#888' };
                                return (
                                    <div
                                        key={log._id}
                                        className={`d-flex align-items-start gap-3 px-4 py-3 ${idx !== currentItems.length - 1 ? 'border-bottom' : ''} ${!log.isRead ? 'background-light-secondary' : ''}`}
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
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {finalLogs.length > 0 && (
                            <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center border-top mt-auto">
                                <small className="text-muted font-poppins">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, finalLogs.length)} of {finalLogs.length} entries
                                </small>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                        disabled={currentPage === 1}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        style={{ width: '32px', height: '32px', background: currentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={leftArrowIcon} alt="Left Arrow" style={{ width: '10px', height: '10px', opacity: currentPage === 1 ? 0.3 : 0.7 }} />
                                    </button>

                                    {getPaginationRange(currentPage, totalPages).map((p, idx) => (
                                        p === '...' ? (
                                            <span key={`dot-${idx}`} className="px-2 text-muted">...</span>
                                        ) : (
                                            <button
                                                key={`page-${p}`}
                                                onClick={() => handlePageChange(p)}
                                                className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center fw-bold ${currentPage === p ? 'brand-primary text-white shadow-sm' : 'text-dark-secondary'}`}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    fontSize: '0.75rem',
                                                    background: currentPage === p ? '#23A0CE' : 'transparent',
                                                    color: currentPage === p ? '#fff' : 'inherit'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}

                                    <button
                                        className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                        disabled={currentPage === totalPages}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        style={{ width: '32px', height: '32px', background: currentPage === totalPages ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={rightArrowIcon} alt="Right Arrow" style={{ width: '10px', height: '10px', opacity: currentPage === totalPages ? 0.3 : 0.7 }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivityLogPage;