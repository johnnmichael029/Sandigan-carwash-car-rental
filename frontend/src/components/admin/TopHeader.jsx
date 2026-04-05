import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../api/config';

import bookingsIcon from '../../assets/icon/order.png';
import updateIcon from '../../assets/icon/update.png';
import editIcon from '../../assets/icon/edit.png';
import deleteIcon from '../../assets/icon/delete.png';
import loginIcon from '../../assets/icon/login.png';
import logoutIcon from '../../assets/icon/logout.png';
import accountPayableIcon from '../../assets/icon/account-payable.png';
import operationCostIcon from '../../assets/icon/operation-cost.png';
import revenueIcon from '../../assets/icon/revenue.png';
import netProfitIcon from '../../assets/icon/net-profit.png';
import payrollIcon from '../../assets/icon/payroll.png';
import staffIcon from '../../assets/icon/staff.png';
import commisionIcon from '../../assets/icon/commission.png';
import employeeIcon from '../../assets/icon/employee.png';
import refreshIcon from '../../assets/icon/refresh.png';
import settingsIcon from '../../assets/icon/setting.png';
import notifIcon from '../../assets/icon/notif.png';

const ACTION_META = {
    booking_created: { icon: bookingsIcon, color: '#23A0CE' },
    booking_status_changed: { icon: updateIcon, color: '#f59e0b' },
    booking_updated: { icon: editIcon, color: '#a855f7' },
    booking_deleted: { icon: deleteIcon, color: '#f43f5e' },
    staff_logged_in: { icon: loginIcon, color: '#22c55e' },
    staff_logged_out: { icon: logoutIcon, color: '#888' },
    payment_recorded: { icon: accountPayableIcon, color: '#23A0CE' },

    // Finance
    expense_created: { icon: operationCostIcon, color: '#ef4444' },
    expense_deleted: { icon: deleteIcon, color: '#f43f5e' },
    revenue_recorded: { icon: revenueIcon, color: '#22c55e' },
    revenue_deleted: { icon: deleteIcon, color: '#f43f5e' },
    income_auto_recorded: { icon: netProfitIcon, color: '#22c55e' },

    // HRIS
    payout_processed: { icon: payrollIcon, color: '#23A0CE' },
    salary_paid: { icon: staffIcon, color: '#6366f1' },
    bulk_salary_paid: { icon: payrollIcon, color: '#6366f1' },
    bulk_commission_payout: { icon: commisionIcon, color: '#23A0CE' },
    employee_created: { icon: employeeIcon, color: '#22c55e' },
    employee_updated: { icon: updateIcon, color: '#f59e0b' },
    employee_deleted: { icon: deleteIcon, color: '#ef4444' },

    // Finance/Bills
    bill_created: { icon: accountPayableIcon, color: '#23A0CE' },
    bill_deleted: { icon: deleteIcon, color: '#f43f5e' },
    bill_updated: { icon: updateIcon, color: '#f59e0b' },
    bills_applied: { icon: refreshIcon, color: '#22c55e' },
    bill_category_created: { icon: accountPayableIcon, color: '#23A0CE' },
    bill_category_updated: { icon: updateIcon, color: '#f59e0b' },
    bill_category_deleted: { icon: deleteIcon, color: '#ef4444' },

    // Settings
    setting_updated: { icon: settingsIcon, color: '#64748b' },
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

export default TopHeader;
