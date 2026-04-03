import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import downArrow from '../../assets/icon/down.png';
import upArrow from '../../assets/icon/up.png';
import dashboardIcon from '../../assets/icon/dashboard.png';
import carService from '../../assets/icon/car.png';
import notifIcon from '../../assets/icon/notif.png';
import bookingsIcon from '../../assets/icon/order.png';
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
import revenueIcon from '../../assets/icon/revenue.png'
import allTimeRevenueIcon from '../../assets/icon/all-time-revenue.png'
import topPerformerIcon from '../../assets/icon/top-performer.png'
import grossRevenueIcon from '../../assets/icon/gross-revenue.png'
import netProfitIcon from '../../assets/icon/net-profit.png'
import operationCostIcon from '../../assets/icon/operation-cost.png'
import commisionIcon from '../../assets/icon/commission.png'
import overviewIcon from '../../assets/icon/overview.png'
import accountPayableIcon from '../../assets/icon/account-payable.png'
import staffIcon from '../../assets/icon/staff.png'
import detailerIcon from '../../assets/icon/detailers.png'
import employeeIcon from '../../assets/icon/employee.png'
import adminIcon from '../../assets/icon/admin.png'
import payrollIcon from '../../assets/icon/payroll.png'
import directoryIcon from '../../assets/icon/directory.png'
import analyticsIcon from '../../assets/icon/analytics.png'
import stocksIcon from '../../assets/icon/stocks.png'
import recipeIcon from '../../assets/icon/recipe.png'
import attendanceIcon from '../../assets/icon/attendance.png'
import promotionIcon from '../../assets/icon/promotions.png'
import detailerHistoryIcon from '../../assets/icon/detailer-history.png'
import searchIcon from '../../assets/icon/search.png'
import refreshIcon from '../../assets/icon/refresh.png'
import rightArrowIcon from '../../assets/icon/right-arrow.png'
import leftArrowIcon from '../../assets/icon/left-arrow.png'
import { API_BASE, authHeaders } from '../../api/config';
import { PageSkeleton, ChartSkeleton, TableSkeleton } from '../../components/SkeletonLoaders';
import { io } from 'socket.io-client';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import VendorPayables from './VendorPayables';

/* ─────────────────────────────────────────────
   GLOBAL HELPERS — Reusable UI Logic
───────────────────────────────────────────── */
// Helper for truncated pagination (e.g. 1 2 ... 10)
const getPaginationRange = (currentPage, totalPages) => {
    const delta = 1; // siblings to show
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i);
        }
    }

    const rangeWithDots = [];
    let l;
    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
};

/* ─────────────────────────────────────────────
   TOP HEADER — Activity Log Bell (Admin Only) ICONS
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   ERP sub-nav items
───────────────────────────────────────────── */
const ERP_ITEMS = ['finance', 'hris', 'inventory', 'crm', 'promotions', 'operations', 'accounts-payable'];
const ALL_SUBNAV_ITEMS = [...ERP_ITEMS, 'activity-log'];

/* ─────────────────────────────────────────────
   HRIS — Human Resource & Payroll Module
───────────────────────────────────────────── */
const ROLE_COLORS = {
    admin: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', label: 'Admin' },
    employee: { bg: 'rgba(35,160,206,0.12)', color: '#23A0CE', label: 'Employee' },
    detailer: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Detailer' },
};

const HRISPage = ({ user }) => {
    const getEmpName = (emp) => emp?.fullName || emp?.fullname || 'Unknown Staff';

    const getDailyPay = (log) => {
        const emp = log.employee;
        if (!emp || !emp.baseSalary) return 0;

        let divisor = 26;
        if (emp?.salaryFrequency === 'Weekly') divisor = 6;
        else if (emp?.salaryFrequency === 'Bi-Weekly') divisor = 13;
        else if (emp?.salaryFrequency === 'Daily') divisor = 1;

        const baseVal = Number(emp.baseSalary);
        const dailyRate = (emp?.salaryFrequency === 'Daily') ? baseVal : (baseVal / divisor);
        const hourlyRate = dailyRate / 8;

        const clockIn = new Date(log.clockInTime);
        const clockOut = log.clockOutTime ? new Date(log.clockOutTime) : null;
        if (!clockOut) return 0;

        let regMins = 0;
        let otMins = 0;

        let shiftEndMarker = new Date(clockIn);
        if (emp.shiftType === 'Morning') shiftEndMarker.setHours(17, 0, 0, 0);
        else if (emp.shiftType === 'Night') {
            shiftEndMarker.setHours(5, 0, 0, 0); // 5 AM End
            if (shiftEndMarker < clockIn) shiftEndMarker.setDate(shiftEndMarker.getDate() + 1);
        }

        if (emp.shiftType === 'Morning' || emp.shiftType === 'Night') {
            if (clockIn < shiftEndMarker) {
                const regEnd = clockOut < shiftEndMarker ? clockOut : shiftEndMarker;
                regMins = Math.floor((regEnd - clockIn) / 60000);
            }
            if (log.isOTApproved && clockOut > shiftEndMarker) {
                const otStart = clockIn > shiftEndMarker ? clockIn : shiftEndMarker;
                otMins = Math.floor((clockOut - otStart) / 60000);
            }
        } else {
            const duration = log.durationMinutes || 0;
            regMins = Math.min(duration, 480);
            if (log.isOTApproved) otMins = Math.max(0, duration - 480);
        }

        // Apply Smart Break logic
        if (emp.shiftType === 'Morning') {
            const noon = new Date(clockIn); noon.setHours(12, 0, 0, 0);
            const onePM = new Date(clockIn); onePM.setHours(13, 0, 0, 0);
            if (clockIn < noon && clockOut > onePM) regMins = Math.max(0, regMins - 60);
        } else if (emp.shiftType === 'Night') {
            const midnight = new Date(clockIn);
            midnight.setHours(24, 0, 0, 0);
            const oneAM = new Date(clockIn);
            oneAM.setHours(25, 0, 0, 0);
            if (clockIn < midnight && clockOut > oneAM) regMins = Math.max(0, regMins - 60);
        }

        // Night Differential (10 PM to 6 AM window)
        const getOverlap = (s1, e1, s2, e2) => {
            const start = s1 > s2 ? s1 : s2;
            const end = e1 < e2 ? e1 : e2;
            const d = Math.floor((end - start) / 60000);
            return d > 0 ? d : 0;
        };
        let ndMins = 0;
        let dayBase = new Date(clockIn); dayBase.setHours(0, 0, 0, 0);
        for (let i = 0; i < 2; i++) {
            const d = new Date(dayBase); d.setDate(d.getDate() + i);
            const w1S = new Date(d); w1S.setHours(22, 0, 0, 0);
            const w1E = new Date(d); w1E.setHours(24, 0, 0, 0);
            const w2S = new Date(d); w2S.setHours(0, 0, 0, 0);
            const w2E = new Date(d); w2E.setHours(6, 0, 0, 0);
            ndMins += getOverlap(clockIn, clockOut, w1S, w1E);
            ndMins += getOverlap(clockIn, clockOut, w2S, w2E);
        }

        let total = (regMins / 60) * hourlyRate;
        if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
            if (log.holidayType === 'Regular') total += ((regMins / 60) * hourlyRate);
            else if (log.holidayType === 'Special') total += ((regMins / 60) * hourlyRate * 0.30);
        }
        if (otMins > 0) total += (otMins / 60) * (hourlyRate * 1.30);
        if (ndMins > 0) total += (ndMins / 60) * (hourlyRate * 0.10);
        return total;
    };

    const [hrTab, setHrTab] = useState('directory');
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Attendance state
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [attendanceSearch, setAttendanceSearch] = useState('');
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const filteredAttendance = useMemo(() => {
        return attendanceLogs.filter(log => {
            const name = getEmpName(log.employee).toLowerCase();
            const search = attendanceSearch.toLowerCase();
            return name.includes(search) || (log.holidayType || '').toLowerCase().includes(search);
        });
    }, [attendanceLogs, attendanceSearch]);
    const [holidayLogs, setHolidayLogs] = useState([]);
    const [isHolidayLoading, setIsHolidayLoading] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [newHoliday, setNewHoliday] = useState({ dateStr: '', name: '', type: 'Regular' });

    // Directory modal state
    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null); // null = new
    const [empForm, setEmpForm] = useState({
        fullName: '', email: '', password: '', role: 'employee',
        age: '', address: '', phone: '', baseSalary: '',
        salaryFrequency: 'Monthly', status: 'Active',
        hasAccount: true, shiftType: 'None', shiftStartTime: '',
        hiredDate: new Date().toISOString().split('T')[0],
        sssNo: '', tinNo: '', philhealthNo: '', pagibigNo: '',
        nonTaxableAllowance: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Payroll state
    const [payrollPeriod, setPayrollPeriod] = useState('month');
    const [payrollData, setPayrollData] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [isPayrollLoading, setIsPayrollLoading] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(null); // detailerId being processed
    const [pendingFixed, setPendingFixed] = useState([]);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [selectedPayoutStaff, setSelectedPayoutStaff] = useState(null);
    const [payoutAdjustments, setPayoutAdjustments] = useState({ bonus: 0, deductions: 0, remarks: '' });

    // Payroll UI Refinements (Pagination & Search)
    const [payrollSubTab, setPayrollSubTab] = useState('review'); // 'review' | 'history'
    const [reviewViewMode, setReviewViewMode] = useState('grid'); // 'grid' | 'list'
    const [detCurrentPage, setDetCurrentPage] = useState(1);
    const [staffCurrentPage, setStaffCurrentPage] = useState(1);
    const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [detSearch, setDetSearch] = useState('');
    const cardsPerPage = 10;
    const ledgerPerPage = 10;

    const filteredDetPayroll = useMemo(() => {
        if (!detSearch.trim()) return payrollData;
        const term = detSearch.toLowerCase();
        return payrollData.filter(d => getEmpName(d.detailer).toLowerCase().includes(term));
    }, [payrollData, detSearch]);

    const filteredStaffPayroll = useMemo(() => {
        if (!staffSearch.trim()) return pendingFixed;
        const term = staffSearch.toLowerCase();
        return pendingFixed.filter(p => p.fullName.toLowerCase().includes(term));
    }, [pendingFixed, staffSearch]);

    const filteredLedger = useMemo(() => {
        if (!ledgerSearch.trim()) return payoutHistory;
        const lowTerm = ledgerSearch.toLowerCase();
        return payoutHistory.filter(hist => {
            const staffName = (hist.recipient?.fullName || hist.detailer?.fullName || '').toLowerCase();
            const dateStr = new Date(hist.createdAt).toLocaleDateString().toLowerCase();
            const authorizer = (hist.paidBy?.fullName || 'system').toLowerCase();
            const type = (hist.itemsCount > 0 ? 'commission' : 'salary').toLowerCase();
            return staffName.includes(lowTerm) || dateStr.includes(lowTerm) || authorizer.includes(lowTerm) || type.includes(lowTerm);
        });
    }, [payoutHistory, ledgerSearch]);

    // Reset pages on search
    useEffect(() => { setLedgerCurrentPage(1); }, [ledgerSearch]);
    useEffect(() => { setStaffCurrentPage(1); }, [staffSearch]);
    useEffect(() => { setDetCurrentPage(1); }, [detSearch]);

    // Performance History state
    const [showHistory, setShowHistory] = useState(false);
    const [historyEmp, setHistoryEmp] = useState(null);
    const [historyData, setHistoryData] = useState({ summary: {}, history: [] });
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isClocking, setIsClocking] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true });
            setEmployees(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const fetchPayroll = async () => {
        setIsPayrollLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/payroll/summary?period=${payrollPeriod}`, { headers: authHeaders(), withCredentials: true });
            setPayrollData(res.data.summaries || []);

            const pendRes = await axios.get(`${API_BASE}/payroll/pending-fixed`, { headers: authHeaders(), withCredentials: true });
            setPendingFixed(pendRes.data || []);

            const histRes = await axios.get(`${API_BASE}/payroll/history?limit=100`, { headers: authHeaders(), withCredentials: true });
            setPayoutHistory(histRes.data.history || []);
        } catch (err) { console.error(err); }
        finally { setIsPayrollLoading(false); }
    };

    const fetchAttendance = async () => {
        setIsAttendanceLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/attendance/all`, { headers: authHeaders(), withCredentials: true });
            setAttendanceLogs(res.data || []);
        } catch (err) { console.error(err); }
        finally { setIsAttendanceLoading(false); }
    };

    const fetchHolidays = async () => {
        setIsHolidayLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/holidays`, { headers: authHeaders(), withCredentials: true });
            setHolidayLogs(res.data || []);
        } catch (err) { console.error(err); }
        finally { setIsHolidayLoading(false); }
    };

    const handleApproveOT = async (attendanceId, approved) => {
        try {
            const res = await axios.post(`${API_BASE}/attendance/approve-ot`, { attendanceId, approved }, { headers: authHeaders(), withCredentials: true });
            fetchAttendance();
            Swal.fire('Success', res.data.message, 'success');
        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.response?.data?.error || 'Failed to update OT status.', 'error');
        }
    };

    const handleAdminClock = async (empId) => {
        setIsClocking(empId);
        try {
            const res = await axios.post(`${API_BASE}/attendance/admin-clock`, { employeeId: empId }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Attendance Updated',
                text: res.data.message,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            fetchAttendance();
        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.response?.data?.error || 'Failed to toggle clock status.', 'error');
        } finally {
            setIsClocking(null);
        }
    };

    const getShiftDuration = (start) => {
        const diffMs = currentTime.getTime() - new Date(start).getTime();
        const mins = Math.floor(diffMs / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return { h, m, totalMins: mins };
    };

    const handleCreateHoliday = async (e) => {
        e.preventDefault();
        try {
            if (editingHoliday) {
                // UPDATE
                await axios.patch(`${API_BASE}/holidays/${editingHoliday._id}`, newHoliday, { headers: authHeaders(), withCredentials: true });
                setEditingHoliday(null);
                Swal.fire('Updated', 'Holiday updated successfully.', 'success');
            } else {
                // CREATE
                await axios.post(`${API_BASE}/holidays`, newHoliday, { headers: authHeaders(), withCredentials: true });
                Swal.fire('Success', 'Holiday added successfully.', 'success');
            }
            setNewHoliday({ dateStr: '', name: '', type: 'Regular' });
            fetchHolidays();
        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.response?.data?.error || 'Operation failed.', 'error');
        }
    };

    const handleUpdateAttendance = async (logId, updates) => {
        try {
            await axios.patch(`${API_BASE}/attendance/${logId}`, updates, { headers: authHeaders(), withCredentials: true });
            fetchAttendance();
            Swal.fire({ title: 'Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to update attendance.', 'error');
        }
    };

    const handleDeleteHoliday = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This holiday will no longer affect automated payroll calculations.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/holidays/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchHolidays();
                Swal.fire('Deleted!', 'Holiday has been removed.', 'success');
            } catch (err) { console.error(err); }
        }
    };

    const fetchEmployeeHistory = async (emp) => {
        setIsHistoryLoading(true);
        setHistoryEmp(emp);
        setShowHistory(true);
        try {
            if (emp.role === 'detailer') {
                const res = await axios.get(`${API_BASE}/booking/employee-history/${emp._id}`, { headers: authHeaders(), withCredentials: true });
                setHistoryData(res.data);
            } else {
                const logs = await fetchAttendanceHistory(emp._id);
                const totalMins = logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
                const totalHours = (totalMins / 60).toFixed(1);

                const totalPay = logs.reduce((acc, l) => acc + (l.clockOutTime ? getDailyPay(l) : 0), 0);

                setHistoryData({
                    summary: {
                        bookingCount: logs.filter(l => l.clockOutTime).length, // Complete Shifts
                        totalRevenue: Number(totalHours), // Hours worked
                        totalEarnings: totalPay
                    },
                    history: logs.map(l => ({
                        _id: l._id,
                        createdAt: l.dateStr,
                        bookingId: l._id.slice(-8).toUpperCase(),
                        customerName: l.holidayType !== 'None' ? l.holidayName : 'Regular Shift',
                        vehicleType: l.clockOutTime ? `${Math.floor(l.durationMinutes / 60)}h ${l.durationMinutes % 60}m` : 'In Progress',
                        commission: l.clockOutTime ? getDailyPay(l) : 0,
                        isAttendance: true
                    }))
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to fetch work history.', 'error');
            setShowHistory(false);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);
    useEffect(() => { if (hrTab === 'payroll' || hrTab === 'analytics') fetchPayroll(); }, [hrTab, payrollPeriod]);
    useEffect(() => { if (hrTab === 'attendance' || hrTab === 'directory') { fetchAttendance(); } if (hrTab === 'attendance') fetchHolidays(); }, [hrTab]);

    const openAdd = () => {
        setEditingEmp(null);
        setEmpForm({
            fullName: '', email: '', password: '', role: 'employee',
            age: '', address: '', phone: '', baseSalary: '',
            salaryFrequency: 'Monthly', status: 'Active',
            hasAccount: true, shiftType: 'None', shiftStartTime: '',
            hiredDate: new Date().toISOString().split('T')[0],
            sssNo: '', tinNo: '', philhealthNo: '', pagibigNo: '',
            nonTaxableAllowance: ''
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditingEmp(emp);

        // Clean pre-existing phone numbers (e.g. 09xx.. or 639xx..)
        let cleanPhone = (emp.contactNumber || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('63')) cleanPhone = cleanPhone.slice(2);
        else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
        cleanPhone = cleanPhone.slice(0, 10);

        setEmpForm({
            fullName: getEmpName(emp),
            email: emp.email?.includes('@sandigan.local') ? '' : emp.email,
            password: '',
            role: emp.role,
            age: emp.age || '',
            address: emp.address || '',
            phone: cleanPhone,
            baseSalary: emp.baseSalary || '',
            salaryFrequency: emp.salaryFrequency || 'Monthly',
            status: emp.status || 'Active',
            hasAccount: emp.hasAccount !== undefined ? emp.hasAccount : true,
            shiftType: emp.shiftType || 'None',
            shiftStartTime: emp.shiftStartTime || '',
            hiredDate: emp.hiredDate ? new Date(emp.hiredDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            sssNo: emp.sssNo || '',
            tinNo: emp.tinNo || '',
            philhealthNo: emp.philhealthNo || '',
            pagibigNo: emp.pagibigNo || '',
            nonTaxableAllowance: emp.nonTaxableAllowance || ''
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...empForm };

            // Logic for system accounts vs directory only
            if (!payload.hasAccount || payload.role === 'detailer') {
                // If it's a detailer or no account, password is NOT used
                delete payload.password;
                if (payload.role === 'detailer') payload.hasAccount = false;

                // Email is optional for directory only. If empty, the backend will generate a unique fallback.
                if (!payload.email) payload.email = '';
            } else {
                // Account required
                if (!payload.email) return Swal.fire('Error', 'Email is required for system accounts.', 'error');
                if (!editingEmp && !payload.password) return Swal.fire('Error', 'Password is required for new accounts.', 'error');
                if (payload.password && payload.password.length < 8) return Swal.fire('Error', 'Password must be at least 8 characters.', 'error');
            }

            // Global empty email cleanup: Ensure it's an empty string if blank so the backend triggers unique generation
            if (!payload.email || payload.email.trim() === '') payload.email = '';

            if (editingEmp) {
                // UPDATE — only send password if filled in
                if (!payload.password) delete payload.password;
                await axios.patch(`${API_BASE}/employees/${editingEmp._id}`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Employee Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } else {
                // CREATE
                await axios.post(`${API_BASE}/employees/signup`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Employee Added!', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || err.response?.data?.error || 'Failed to save.', 'error');
        } finally { setIsSaving(false); }
    };

    const handleDeleteEmployee = async (emp) => {
        if (emp.role === 'admin') return Swal.fire('Action Blocked', 'You cannot delete any admin account!.', 'warning');
        const result = await Swal.fire({
            title: `Remove ${getEmpName(emp)}?`,
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, remove'
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/employees/${emp._id}`, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Removed!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            fetchEmployees();
        } catch (err) { Swal.fire('Error', 'Failed to remove employee.', 'error'); }
    };

    const handleMarkPaid = async (detailerId, detailerName) => {
        setIsMarkingPaid(detailerId);
        try {
            const res = await axios.post(`${API_BASE}/payroll/mark-paid`, { detailerId, period: payrollPeriod }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: `Paid ${detailerName}`,
                html: `<p style="color:#9ca3af">Marked <b style="color:#FAFAFA">${res.data.bookingCount}</b> booking(s) as Paid.<br>Total: <b style="color:#22c55e">₱${res.data.totalPaid.toLocaleString()}</b></p>`,
                icon: 'success',
                confirmButtonColor: '#23A0CE',
                background: '#0d1b1b',
                color: '#FAFAFA'
            });
            fetchPayroll();
        } catch (err) {
            Swal.fire('Notice', err.response?.data?.error || 'Failed to mark as paid.', 'info');
        } finally { setIsMarkingPaid(null); }
    };

    const handlePaySalary = (p) => {
        setSelectedPayoutStaff(p);
        setPayoutAdjustments({ bonus: 0, deductions: 0, remarks: '' });
        setShowPayoutModal(true);
    };

    const handleConfirmPayout = async () => {
        if (!selectedPayoutStaff) return;

        setIsMarkingPaid(selectedPayoutStaff._id);
        setShowPayoutModal(false); // Close before processing to avoid double click

        try {
            const res = await axios.post(`${API_BASE}/payroll/pay-salary`, {
                employeeId: selectedPayoutStaff._id,
                bonus: payoutAdjustments.bonus,
                deductions: payoutAdjustments.deductions,
                adjustmentRemarks: payoutAdjustments.remarks
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                title: 'Payout Recorded!',
                html: `<p class="text-muted">Successfully logged payment of <b class="text-success">₱${res.data.amount.toLocaleString()}</b> for ${selectedPayoutStaff.fullName}</p>`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
                background: '#0d1b1b',
                color: '#FAFAFA'
            });
            fetchPayroll();
            fetchEmployees();
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: err.response?.data?.error || 'Failed to process payout.',
                icon: 'error',
                background: '#0d1b1b',
                color: '#FAFAFA'
            });
        } finally { setIsMarkingPaid(null); }
    };

    const handleBulkMarkPaid = async () => {
        const targetIds = filteredDetPayroll.filter(d => d.unpaidCommission > 0).map(d => d.detailer._id);
        if (targetIds.length === 0) return Swal.fire('Info', 'No pending commissions to pay.', 'info');

        const result = await Swal.fire({
            title: 'Bulk Pay Commissions?',
            text: `Confirm payment for ${targetIds.length} detailers in the current period (${payrollPeriod}).`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Pay All',
            confirmButtonColor: '#22c55e'
        });

        if (!result.isConfirmed) return;
        setIsMarkingPaid('bulk');
        try {
            const res = await axios.post(`${API_BASE}/payroll/bulk-mark-paid`, { detailerIds: targetIds, period: payrollPeriod }, { headers: authHeaders(), withCredentials: true });
            Swal.fire('Success', res.data.message, 'success');
            fetchPayroll();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Bulk payout failed.', 'error');
        } finally { setIsMarkingPaid(null); }
    };

    const handleBulkPaySalaries = async () => {
        const targetIds = filteredStaffPayroll.map(p => p._id);
        if (targetIds.length === 0) return Swal.fire('Info', 'No staff records to process.', 'info');

        const result = await Swal.fire({
            title: 'Bulk Finalize Salaries?',
            text: `Confirm standard payout for ${targetIds.length} staff members. No additional bonuses/deductions will be applied in bulk mode.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Finalize All',
            confirmButtonColor: '#23A0CE'
        });

        if (!result.isConfirmed) return;
        setIsMarkingPaid('bulk-salary');
        try {
            const res = await axios.post(`${API_BASE}/payroll/bulk-pay-salary`, { employeeIds: targetIds }, { headers: authHeaders(), withCredentials: true });
            Swal.fire('Success', res.data.message, 'success');
            fetchPayroll();
            fetchEmployees();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Bulk payout failed.', 'error');
        } finally { setIsMarkingPaid(null); }
    };

    const downloadPayoutReceipt = (hist) => {
        const doc = new jsPDF();
        const date = new Date(hist.createdAt).toLocaleDateString();
        const time = new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const emp = hist.recipient || {};
        const recipientName = emp.fullName || 'Staff Member';
        const adminName = hist.paidBy?.fullName || 'System';
        const isDetailer = emp.role === 'detailer';

        // --- Header Design (Premium Header) ---
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text("SANDIGAN CARWASH", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Official Payroll Pay Advice & Payout Receipt", 105, 28, { align: "center" });
        doc.text("68 Ruhale st. Calzda Tipas Taguig City", 105, 34, { align: "center" });

        // --- Employee Info Block ---
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("EMPLOYEE INFORMATION", 15, 55);
        doc.line(15, 57, 195, 57);

        doc.setFont("helvetica", "normal");
        doc.text(`Name: ${recipientName.toUpperCase()}`, 15, 63);
        doc.text(`Employee ID: ${emp._id?.slice(-8).toUpperCase() || 'N/A'}`, 15, 68);
        doc.text(`Position: ${emp.role?.toUpperCase() || 'STAFF'}`, 15, 73);

        doc.text(`Pay Date: ${date} ${time}`, 130, 63);
        doc.text(`Period: ${hist.period || 'Regular Cycle'}`, 130, 68);
        doc.text(`Ref No: PAY-${hist._id?.slice(-8).toUpperCase()}`, 130, 73);

        // --- ID Numbers (Tiny Sub-header) ---
        if (!isDetailer) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(`SSS: ${emp.sssNo || '---'} | TIN: ${emp.tinNo || '---'} | PH: ${emp.philhealthNo || '---'} | HDMF: ${emp.pagibigNo || '---'}`, 15, 78);
            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);
        }

        if (isDetailer) {
            // --- SIMPLIFIED DETAILER LAYOUT ---
            doc.setFillColor(248, 250, 252);
            doc.rect(15, 85, 180, 50, 'F');
            doc.setFont("helvetica", "bold");
            doc.text("COMMISSION PAYOUT DETAILS", 20, 95);
            doc.line(20, 97, 185, 97);

            doc.setFont("helvetica", "normal");
            doc.text(`Total Vehicles Completed:`, 25, 105);
            doc.text(`${hist.itemsCount} Cars`, 180, 105, { align: 'right' });

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("NET TAKE-HOME PAY:", 25, 120);
            doc.setTextColor(34, 197, 94);
            doc.text(`PHP ${hist.netAmount?.toLocaleString()}`, 180, 120, { align: 'right' });
        } else {
            // --- FULL TWO-COLUMN PAYSLIP LAYOUT (Tenex Style) ---

            // Earnings Column (Left)
            doc.setFont("helvetica", "bold");
            doc.text("EARNINGS", 15, 95);
            doc.line(15, 97, 100, 97);

            doc.setFont("helvetica", "normal");
            doc.text("Basic Salary", 20, 105);
            doc.text(`₱${(hist.basicPay || 0).toLocaleString()}`, 95, 105, { align: 'right' });

            doc.text(`Overtime (${(hist.overtimeHours || 0).toFixed(1)} hrs)`, 20, 111);
            doc.text(`₱${(hist.overtimePay || 0).toLocaleString()}`, 95, 111, { align: 'right' });

            doc.text(`Night Diff (${(hist.nightDiffHours || 0).toFixed(1)} hrs)`, 20, 117);
            doc.text(`₱${(hist.nightDiffPay || 0).toLocaleString()}`, 95, 117, { align: 'right' });

            doc.text("Holiday Pay", 20, 123);
            doc.text(`₱${(hist.holidayPay || 0).toLocaleString()}`, 95, 123, { align: 'right' });

            doc.text("Bonuses / Adjustments", 20, 129);
            doc.text(`₱${(hist.bonuses || 0).toLocaleString()}`, 95, 129, { align: 'right' });

            doc.text("Non-Taxable Allowance", 20, 135);
            doc.text(`₱${(hist.allowances || 0).toLocaleString()}`, 95, 135, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.text("TOTAL GROSS EARNINGS", 20, 145);
            doc.text(`₱${(hist.grossPay || 0).toLocaleString()}`, 95, 145, { align: 'right' });

            // Deductions Column (Right)
            doc.setFont("helvetica", "bold");
            doc.text("DEDUCTIONS", 110, 95);
            doc.line(110, 97, 195, 97);

            doc.setFont("helvetica", "normal");
            doc.text("SSS Contribution (EE)", 115, 105);
            doc.text(`₱${(hist.sssEE || 0).toLocaleString()}`, 190, 105, { align: 'right' });

            doc.text("PhilHealth (EE)", 115, 111);
            doc.text(`₱${(hist.philhealthEE || 0).toLocaleString()}`, 190, 111, { align: 'right' });

            doc.text("Pag-IBIG / HDMF (EE)", 115, 117);
            doc.text(`₱${(hist.hdmfEE || 0).toLocaleString()}`, 190, 117, { align: 'right' });

            doc.text("Withholding Tax", 115, 123);
            doc.text(`₱${(hist.withholdingTax || 0).toLocaleString()}`, 190, 123, { align: 'right' });

            doc.text("Lates / Absents", 115, 129);
            doc.text(`₱${(hist.totalDeductions - (hist.sssEE + hist.philhealthEE + hist.hdmfEE + hist.withholdingTax) || 0).toLocaleString()}`, 190, 129, { align: 'right' });

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("Taxable Income Base for Gov Deductions", 115, 138);
            doc.text(`₱${((hist.grossPay || 0) - (hist.allowances || 0) - (hist.bonuses || 0)).toLocaleString()}`, 190, 138, { align: 'right' });
            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);

            doc.setFont("helvetica", "bold");
            doc.text("TOTAL DEDUCTIONS", 115, 145);
            doc.text(`₱${(hist.totalDeductions || 0).toLocaleString()}`, 190, 145, { align: 'right' });

            // Take Home Pay Box
            doc.setFillColor(241, 245, 249);
            doc.rect(15, 155, 180, 20, 'F');
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text("NET TAKE-HOME PAY:", 25, 168);
            doc.setTextColor(34, 197, 94); // Success Green
            doc.text(`PHP ${(hist.netAmount || 0).toLocaleString()}`, 180, 168, { align: 'right' });

            // Employer's Share Section
            doc.setTextColor(120, 120, 120);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("EMPLOYER'S GOV'T CONTRIBUTIONS (Informational)", 15, 185);
            doc.line(15, 187, 195, 187);
            doc.setFont("helvetica", "normal");
            doc.text(`SSS ER: ₱${hist.sssER || 0} | PhilHealth ER: ₱${hist.philhealthER || 0} | HDMF ER: ₱${hist.hdmfER || 0}`, 15, 193);
        }

        // --- Footer & Acknowledgment ---
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("This is a system-generated document. No signature required unless preferred by company policy.", 105, 215, { align: "center" });

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("I acknowledge receipt of the amount stated herein as full payment of my services rendered.", 15, 235);
        doc.line(15, 260, 85, 260);
        doc.text("Employee's Signature & Date", 15, 265);

        doc.line(125, 260, 195, 260);
        doc.text(`Authorized by: ${adminName.toUpperCase()}`, 125, 265);

        doc.save(`Payslip_${recipientName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);
    };

    const fetchAttendanceHistory = async (empId) => {
        try {
            const res = await axios.get(`${API_BASE}/attendance/all`, { headers: authHeaders(), withCredentials: true });
            const logs = (res.data || []).filter(l => l.employee?._id === empId);
            return logs;
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    const totalDetailers = employees.filter(e => e.role === 'detailer').length;
    const totalEmployees = employees.filter(e => e.role === 'employee').length;
    const totalAdmins = employees.filter(e => e.role === 'admin').length;

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4 flex-wrap gap-3">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Human Resources</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Manage staff accounts and detailer payroll</p>
                </div>

                <div className="d-flex gap-2">
                    {/* Pending bills badge on Settings button */}
                    <div className="btn-group bg-light p-1 rounded-3">
                        <button onClick={() => setHrTab('directory')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'directory' ? 'btn-white shadow-sm' : 'text-muted'}`}>
                            <img src={directoryIcon} alt="Directory Icon" style={{ width: '16px' }} />Directory</button>
                        <button onClick={() => setHrTab('payroll')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'payroll' ? 'btn-white shadow-sm' : 'text-muted'}`}>
                            <img src={payrollIcon} alt="Payroll Icon" style={{ width: '16px' }} />Payroll</button>
                        <button onClick={() => setHrTab('analytics')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'analytics' ? 'btn-white shadow-sm' : 'text-muted'}`}>
                            <img src={analyticsIcon} alt="Analytics Icon" style={{ width: '16px' }} />Analytics</button>
                        <button onClick={() => setHrTab('attendance')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'attendance' ? 'btn-white shadow-sm' : 'text-muted'}`}>
                            <img src={attendanceIcon} alt="Attendance Icon" style={{ width: '16px' }} />Attendance History</button>
                    </div>
                    {hrTab === 'directory' && (
                        <button onClick={() => openAdd()} className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3">
                            + Add Employee
                        </button>
                    )}
                </div>
            </div>

            {/* Human Resource cards */}
            <div className="row g-3 mb-4">
                {[
                    { title: "Total Staff", value: employees.length, icon: <img src={staffIcon} alt="Staff Icon" style={{ width: '24px' }} />, color: "#a855f7", bg: "linear-gradient(135deg,#a855f715,#a855f705)", dot: "#a855f7", desc: "All registered personnel" },
                    { title: "Detailers", value: totalDetailers, icon: <img src={detailerIcon} alt="Detailer Icon" style={{ width: '24px' }} />, color: "#22c55e", bg: "linear-gradient(135deg,#22c55e15,#22c55e05)", dot: "#22c55e", desc: "Assigned for vehicles" },
                    { title: "Employees", value: totalEmployees, icon: <img src={employeeIcon} alt="Employee Icon" style={{ width: '24px' }} />, color: "#23A0CE", bg: "linear-gradient(135deg,#23A0CE15,#23A0CE05)", dot: "#23A0CE", desc: "Dashboard access only" },
                    { title: "Admins", value: totalAdmins, icon: <img src={adminIcon} alt="Admin Icon" style={{ width: '24px' }} />, color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)", dot: "#f59e0b", desc: "Full ERP privileges" },
                ].map((card, idx) => (
                    <div className="col-6 col-md-3" key={idx}>
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
                                    style={{ width: '40px', height: '40px', background: card.bg, color: card.color, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {card.icon}
                                </div>
                                {/* Label */}
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                    {card.title}
                                </p>
                                {/* Value */}
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                    {card.value.toLocaleString()}
                                </h3>
                                {/* Description */}
                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── DIRECTORY TAB ── */}
            {hrTab === 'directory' && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom py-3 px-4">
                        <h6 className="mb-0 fw-bold text-dark-secondary">Employee Directory</h6>
                    </div>
                    <div className="card-body p-0">
                        {isLoading ? (
                            <div className="p-0"><TableSkeleton /></div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                    <thead className="bg-light text-dark-gray400">
                                        <tr>
                                            <th className="ps-4 py-3">Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Acc Status</th>
                                            <th>Shift Status</th>
                                            <th>Hired</th>
                                            <th className="pe-4 text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center p-4 text-muted">No employees found.</td></tr>
                                        ) : employees.map(emp => {
                                            const roleStyle = ROLE_COLORS[emp.role] || ROLE_COLORS.employee;
                                            const isSelf = emp._id === user?.id;
                                            return (
                                                <tr key={emp._id} onClick={() => fetchEmployeeHistory(emp)} style={{ cursor: 'pointer' }} className="hover-shadow-sm transition-all">
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="position-relative">
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 38, height: 38, background: roleStyle.bg, color: roleStyle.color, fontSize: '0.9rem', flexShrink: 0 }}>
                                                                    {getEmpName(emp).charAt(0).toUpperCase()}
                                                                </div>
                                                                {(() => {
                                                                    const isActive = attendanceLogs.some(log => log.employee?._id === emp._id && !log.clockOutTime);
                                                                    if (isActive) return (
                                                                        <span className="position-absolute bottom-0 end-0 p-1 bg-success rounded-circle border border-2 border-white shadow-sm animate-pulse"
                                                                            style={{ width: 12, height: 12 }}
                                                                            title="Currently Working"
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div>
                                                                <div className="fw-bold text-dark-secondary">{getEmpName(emp)}</div>
                                                                {isSelf && <small className="text-muted" style={{ fontSize: '0.65rem' }}>Administrator account</small>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{emp.email}</td>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <span className="badge rounded-pill px-3 py-1 mb-1" style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: '0.7rem', fontWeight: 600, border: `1px solid ${roleStyle.color}20`, width: 'fit-content' }}>
                                                                {roleStyle.label}
                                                            </span>
                                                            {emp.role !== 'admin' && (
                                                                <small className="text-muted fw-semibold" style={{ fontSize: '0.62rem' }}>
                                                                    {emp.shiftType && emp.shiftType !== 'None' ? `${emp.shiftType} (${emp.shiftStartTime || 'No Time'})` : 'No Fixed Sched'}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge rounded-pill px-3 py-1"
                                                            style={{
                                                                background: emp.status === 'Active' ? 'rgba(34,197,94,0.1)' : emp.status === 'On Leave' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                                                color: emp.status === 'Active' ? '#22c55e' : emp.status === 'On Leave' ? '#f59e0b' : '#ef4444',
                                                                fontSize: '0.65rem'
                                                            }}
                                                        >
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                                                            {emp.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {emp.role === 'detailer' ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="text-muted" style={{ fontSize: '0.72rem' }}>₱ Based</span>
                                                                <span className="badge rounded-pill bg-light text-muted border px-2 py-1" style={{ fontSize: '0.6rem' }}>Commission</span>
                                                            </div>
                                                        ) : (() => {
                                                            // Filter for this specific employee's logs, sorted by most recent
                                                            const empLogs = attendanceLogs.filter(log => log.employee?._id === emp._id);
                                                            const activeShift = empLogs.find(log => !log.clockOutTime);
                                                            const todayDateStr = new Date().toLocaleDateString('en-CA');
                                                            const isCompletedToday = empLogs.find(log => log.clockOutTime && log.dateStr === todayDateStr);

                                                            if (activeShift) {
                                                                const dur = getShiftDuration(activeShift.clockInTime);
                                                                return (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className={`fw-bold ${dur.totalMins > 480 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '0.8rem' }}>
                                                                                {dur.h}h {dur.m}m
                                                                            </span>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleAdminClock(emp._id); }}
                                                                                disabled={isClocking === emp._id}
                                                                                className="btn btn-xs btn-outline-danger px-2 py-0 rounded-pill shadow-none"
                                                                                style={{ fontSize: '0.62rem' }}
                                                                            >
                                                                                Clock Out
                                                                            </button>
                                                                        </div>
                                                                        <small className="text-muted" style={{ fontSize: '0.62rem' }}>Since {new Date(activeShift.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                                    </div>
                                                                );
                                                            }

                                                            if (isCompletedToday) {
                                                                return (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <span className="badge rounded-pill bg-light text-muted border px-3 py-1" style={{ fontSize: '0.63rem', width: 'fit-content' }}>
                                                                            Shift Done
                                                                        </span>
                                                                        <small className="text-muted" style={{ fontSize: '0.62rem' }}>Total: {Math.floor(isCompletedToday.durationMinutes / 60)}h {isCompletedToday.durationMinutes % 60}m</small>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAdminClock(emp._id); }}
                                                                    disabled={isClocking === emp._id}
                                                                    className="btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center gap-2"
                                                                    style={{ fontSize: '0.68rem', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                                                                >
                                                                    {isClocking === emp._id ? (
                                                                        <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} />
                                                                    ) : (
                                                                        <div className="bg-white rounded-circle opacity-75" style={{ width: 6, height: 6 }} />
                                                                    )}
                                                                    Clock In
                                                                </button>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="text-muted">{new Date(emp.createdAt).toLocaleDateString()}</td>
                                                    <td className="pe-4 text-end">
                                                        <button onClick={(e) => { e.stopPropagation(); fetchEmployeeHistory(emp); }} className="btn btn-sm border-0 bg-transparent p-1 me-2" title="Detailed History">
                                                            <img src={detailerHistoryIcon} alt="History" style={{ width: 18 }} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); openEdit(emp); }} className="btn btn-sm border-0 bg-transparent p-1 me-1" title="Edit">
                                                            <img src={editIcon} alt="Edit" style={{ width: 18 }} />
                                                        </button>
                                                        {!isSelf && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp); }} className="btn btn-sm border-0 bg-transparent p-1" title="Remove">
                                                                <img src={deleteIcon} alt="Delete" style={{ width: 18 }} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── PAYROLL TAB ── */}
            {hrTab === 'payroll' && (
                <div>
                    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                        <div className="btn-group shadow-sm bg-white p-1 rounded-pill">
                            <button onClick={() => setPayrollSubTab('review')} className={`btn btn-sm px-4 rounded-pill border-0 ${payrollSubTab === 'review' ? 'btn-save shadow-sm' : 'text-muted'}`}>Payroll Review</button>
                            <button onClick={() => setPayrollSubTab('history')} className={`btn btn-sm px-4 rounded-pill border-0 ${payrollSubTab === 'history' ? 'btn-save shadow-sm' : 'text-muted'}`}>Recent Payout Ledger</button>
                        </div>
                        {payrollSubTab === 'review' && (
                            <div className="btn-group shadow-sm">
                                {['today', 'week', 'month'].map(p => (
                                    <button key={p} onClick={() => setPayrollPeriod(p)} className={`btn btn-sm ${payrollPeriod === p ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}>{p}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isPayrollLoading ? (
                        <div className="p-0"><TableSkeleton /></div>
                    ) : (
                        <>
                            {payrollSubTab === 'review' ? (
                                <div className="animate-fade-in">
                                    {/* DETAILER COMMISSION SECTION */}
                                    <div className="mb-5">
                                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <h6 className="fw-bold text-dark-secondary mb-0"><i className="bi bi-star text-success me-2"></i>Detailer Commissions</h6>
                                                <div className="btn-group btn-group-sm bg-light p-1 rounded-pill shadow-none border">
                                                    <button onClick={() => setReviewViewMode('grid')} className={`btn btn-sm px-3 rounded-pill border-0 ${reviewViewMode === 'grid' ? 'btn-save text-white shadow-sm' : 'text-muted'}`}>Grid</button>
                                                    <button onClick={() => setReviewViewMode('list')} className={`btn btn-sm px-3 rounded-pill border-0 ${reviewViewMode === 'list' ? 'btn-save text-white shadow-sm' : 'text-muted'}`}>List</button>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                                <div className="position-relative">
                                                    <img src={searchIcon} style={{ width: '13px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} alt="search" />
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm ps-5 rounded-pill border-light"
                                                        placeholder="Search detailers..."
                                                        style={{ width: '200px', fontSize: '0.8rem', background: '#f8fafc' }}
                                                        value={detSearch}
                                                        onChange={(e) => setDetSearch(e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleBulkMarkPaid}
                                                    disabled={isMarkingPaid === 'bulk' || filteredDetPayroll.filter(d => d.unpaidCommission > 0).length === 0}
                                                    className="btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center gap-2"
                                                    style={{ fontSize: '0.75rem', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                                                >
                                                    <i className="bi bi-check2-all"></i> Mark All Paid
                                                </button>
                                            </div>
                                        </div>

                                        {filteredDetPayroll.length === 0 ? (
                                            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                                                <p className="text-muted mb-1" style={{ fontSize: '2rem' }}>🧼</p>
                                                <p className="text-muted mb-0">No detailers found matching your search.</p>
                                            </div>
                                        ) : reviewViewMode === 'list' ? (
                                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                                        <thead className="bg-light text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                            <tr>
                                                                <th className="ps-4">Detailer</th>
                                                                <th>Bookings</th>
                                                                <th>Total Revenue</th>
                                                                <th>Total Earned</th>
                                                                <th>Unpaid</th>
                                                                <th className="pe-4 text-end">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredDetPayroll.map(({ detailer, bookingCount, totalRevenue, totalCommission, unpaidCommission }) => (
                                                                <tr key={detailer._id}>
                                                                    <td className="ps-4 border-0">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-success" style={{ width: 28, height: 28, background: 'rgba(34,197,94,0.1)', fontSize: '0.75rem' }}>
                                                                                {getEmpName(detailer).charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <span className="fw-bold text-dark-secondary">{getEmpName(detailer)}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="border-0"><span className="badge bg-light text-dark border px-2">{bookingCount}</span></td>
                                                                    <td className="border-0">₱{totalRevenue.toLocaleString()}</td>
                                                                    <td className="border-0 text-success fw-bold">₱{totalCommission.toLocaleString()}</td>
                                                                    <td className="border-0">
                                                                        <span className={unpaidCommission > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                                                                            {unpaidCommission > 0 ? `₱${unpaidCommission.toLocaleString()}` : 'Settled'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="pe-4 text-end border-0">
                                                                        <button
                                                                            onClick={() => handleMarkPaid(detailer._id, getEmpName(detailer))}
                                                                            disabled={unpaidCommission === 0 || isMarkingPaid === detailer._id}
                                                                            className={`btn btn-xs rounded-pill px-3 fw-bold ${unpaidCommission > 0 ? 'btn-success shadow-none' : 'btn-light text-muted'}`}
                                                                            style={{ fontSize: '0.65rem' }}
                                                                        >
                                                                            {isMarkingPaid === detailer._id ? '...' : unpaidCommission > 0 ? 'Pay' : 'Paid'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="row g-4">
                                                    {filteredDetPayroll.slice((detCurrentPage - 1) * cardsPerPage, detCurrentPage * cardsPerPage).map(({ detailer, bookingCount, totalRevenue, totalCommission, unpaidCommission }, idx) => (
                                                        <div className="col-md-6 col-xl-4" key={detailer._id}>
                                                            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                                                                <div className="p-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(35,160,206,0.05))' }}>
                                                                    <div className="d-flex align-items-center gap-3 mb-3">
                                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 44, height: 44, background: '#fff', color: '#22c55e', fontSize: '1.2rem', flexShrink: 0 }}>
                                                                            {getEmpName(detailer).charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{getEmpName(detailer)}</div>
                                                                            <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: '0.68rem' }}>Detailer</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="row g-2">
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(35,160,206,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Bookings</div>
                                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '1.1rem' }}>{bookingCount}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(34,197,94,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Revenue</div>
                                                                                <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#22c55e' }}>₱{totalRevenue.toLocaleString()}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: '#fff8f0' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Total Earned</div>
                                                                                <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#f59e0b' }}>₱{totalCommission.toLocaleString()}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: unpaidCommission > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Unpaid</div>
                                                                                <div className="fw-bold" style={{ fontSize: '1.1rem', color: unpaidCommission > 0 ? '#ef4444' : '#22c55e' }}>
                                                                                    {unpaidCommission > 0 ? `₱${unpaidCommission.toLocaleString()}` : 'Settled'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 pt-2 border-top">
                                                                    <button onClick={() => handleMarkPaid(detailer._id, getEmpName(detailer))} disabled={unpaidCommission === 0 || isMarkingPaid === detailer._id} className="btn w-100 rounded-pill fw-bold shadow-sm" style={{ background: unpaidCommission > 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#f8fafc', color: unpaidCommission > 0 ? '#fff' : '#94a3b8', fontSize: '0.85rem', border: 'none', padding: '10px' }}>
                                                                        {isMarkingPaid === detailer._id ? <span className="spinner-border spinner-border-sm me-2" /> : unpaidCommission > 0 ? `Mark as Paid — ₱${unpaidCommission.toLocaleString()}` : 'All Commissions Settled'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {filteredDetPayroll.length > cardsPerPage && (
                                                    <div className="d-flex justify-content-center mt-4">
                                                        <div className="btn-group gap-1">
                                                            <button onClick={() => setDetCurrentPage(p => Math.max(1, p - 1))} disabled={detCurrentPage === 1} className="btn btn-sm btn-light rounded-circle shadow-sm" style={{ width: 32, height: 32 }}>&lt;</button>
                                                            <button onClick={() => setDetCurrentPage(p => p + 1)} disabled={detCurrentPage * cardsPerPage >= filteredDetPayroll.length} className="btn btn-sm btn-light rounded-circle shadow-sm" style={{ width: 32, height: 32 }}>&gt;</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* STAFF DYNAMIC PAYROLL SECTION */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <h6 className="fw-bold text-dark-secondary mb-0"><i className="bi bi-person-badge text-primary me-2"></i>Staff Dynamic Payroll Review</h6>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                                <div className="position-relative">
                                                    <img src={searchIcon} style={{ width: '13px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} alt="search" />
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm ps-5 rounded-pill border-light"
                                                        placeholder="Search staff..."
                                                        style={{ width: '200px', fontSize: '0.8rem', background: '#f8fafc' }}
                                                        value={staffSearch}
                                                        onChange={(e) => setStaffSearch(e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleBulkPaySalaries}
                                                    disabled={isMarkingPaid === 'bulk-salary' || filteredStaffPayroll.length === 0}
                                                    className="btn btn-sm btn-record-expenses shadow-none rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <i className="bi bi-lightning-charge-fill"></i> Bulk Finalize
                                                </button>
                                            </div>
                                        </div>

                                        {filteredStaffPayroll.length === 0 ? (
                                            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                                                <div className="text-muted mb-3" style={{ fontSize: '2.5rem' }}>📋</div>
                                                <h6 className="text-dark-secondary fw-bold">No Staff Records Found</h6>
                                                <p className="text-muted small mb-0">No attendance data or matches for the current filters.</p>
                                            </div>
                                        ) : reviewViewMode === 'list' ? (
                                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                                        <thead className="bg-light text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                            <tr>
                                                                <th className="ps-4">Staff Member</th>
                                                                <th>Frequency</th>
                                                                <th>Stats (OT/Holiday)</th>
                                                                <th>Mandatory Deductions</th>
                                                                <th>Net Take Home</th>
                                                                <th className="pe-4 text-end">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredStaffPayroll.map((p) => (
                                                                <tr key={p._id}>
                                                                    <td className="ps-4 border-0">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold brand-primary" style={{ width: 28, height: 28, background: 'rgba(35,160,206,0.1)', fontSize: '0.75rem' }}>
                                                                                {p.fullName.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="fw-bold text-dark-secondary">{p.fullName}</div>
                                                                                <small className="text-muted" style={{ fontSize: '0.65rem' }}>{p.role}</small>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="border-0"><span className="badge bg-light text-dark-secondary border px-2">{p.frequency}</span></td>
                                                                    <td className="border-0">
                                                                        <div style={{ fontSize: '0.75rem' }}>
                                                                            <span className="text-success">+{p.stats.otHours}h OT</span> |
                                                                            <span className="text-purple-600 ms-1" style={{ color: '#9333ea' }}>+{p.stats.ndHours || 0}h ND</span> |
                                                                            <span className="text-info ms-1">₱{p.stats.holidayPay.toLocaleString()} Holiday</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="border-0 text-danger">₱{p.stats.totalDeductions.toLocaleString()}</td>
                                                                    <td className="border-0 fw-bold text-dark-secondary">₱{p.netAmount.toLocaleString()}</td>
                                                                    <td className="pe-4 text-end border-0">
                                                                        <button
                                                                            onClick={() => handlePaySalary(p)}
                                                                            disabled={isMarkingPaid === p._id}
                                                                            className="btn btn-xs btn-record-expenses shadow-none rounded-pill px-3 fw-bold"
                                                                            style={{ fontSize: '0.65rem' }}
                                                                        >
                                                                            {isMarkingPaid === p._id ? '...' : 'Process'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="row g-4">
                                                    {filteredStaffPayroll.slice((staffCurrentPage - 1) * cardsPerPage, staffCurrentPage * cardsPerPage).map((p, idx) => (
                                                        <div className="col-md-6 col-xl-4" key={p._id}>
                                                            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden position-relative">
                                                                <div className="p-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(35,160,206,0.08), rgba(35,130,206,0.05))' }}>
                                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                                        <div className="d-flex align-items-center gap-3">
                                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 44, height: 44, background: '#fff', color: '#23A0CE', fontSize: '1.2rem', flexShrink: 0 }}>
                                                                                {p.fullName.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{p.fullName}</div>
                                                                                <div className="d-flex gap-1 align-items-center">
                                                                                    <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.12)', color: '#23A0CE', fontSize: '0.62rem' }}>{p.role}</span>
                                                                                    <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.62rem' }}>{p.frequency}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-end">
                                                                            <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Net Pay</div>
                                                                            <div className="fw-bold text-dark-secondary" style={{ fontSize: '1.2rem' }}>₱{p.netAmount.toLocaleString()}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-4 mt-2">
                                                                        <div className="d-flex justify-content-between align-items-end mb-1">
                                                                            <span className="text-muted fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Cycle Hours: 104h</span>
                                                                            <span className="text-dark-secondary fw-bold" style={{ fontSize: '0.72rem' }}>{p.stats.totalHours}h / 104h</span>
                                                                        </div>
                                                                        <div className="progress rounded-pill shadow-none" style={{ height: '6px', background: 'rgba(35,160,206,0.1)' }}>
                                                                            <div
                                                                                className="progress-bar rounded-pill shadow-none"
                                                                                role="progressbar"
                                                                                style={{
                                                                                    width: `${Math.min(100, (p.stats.totalHours / 104) * 100)}%`,
                                                                                    background: 'linear-gradient(90deg, #23A0CE, #38BDF8)',
                                                                                    transition: 'width 1s ease-in-out'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="d-flex justify-content-between mt-1">
                                                                            <small className="text-muted" style={{ fontSize: '0.62rem' }}>{Math.round((p.stats.totalHours / 104) * 100)}% Complete</small>
                                                                            <small className="text-dark-secondary fw-bold" style={{ fontSize: '0.62rem' }}>{Math.max(0, 104 - p.stats.totalHours).toFixed(1)}h Remaining</small>
                                                                        </div>
                                                                    </div>

                                                                    <div className="row g-2">
                                                                        <div className="col-4">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(35,160,206,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>Hours/OT</div>
                                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.85rem' }}>
                                                                                    {p.stats.totalHours}h <span className="text-success" style={{ fontSize: '0.65rem' }}>+{p.stats.otHours}h</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-4">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(147, 51, 234, 0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>Night Diff</div>
                                                                                <div className="fw-bold text-purple-600" style={{ fontSize: '0.85rem', color: '#9333ea' }}>
                                                                                    {p.stats.ndHours || 0}h <span className="opacity-75" style={{ fontSize: '0.65rem' }}>₱{(p.stats.ndPay || 0).toLocaleString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-4">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(56,189,248,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>Holiday Pay</div>
                                                                                <div className="fw-bold text-info" style={{ fontSize: '0.85rem' }}>₱{p.stats.holidayPay.toLocaleString()}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(239,68,68,0.06)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>Gov Deduct</div>
                                                                                <div className="fw-bold text-danger" style={{ fontSize: '0.95rem' }}>₱{(p.stats.totalDeductions || 0).toLocaleString()}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: (p.stats.lateCount > 0 || p.stats.absentCount > 0) ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>Lates/Absents</div>
                                                                                <div className="fw-bold" style={{ fontSize: '0.95rem', color: (p.stats.lateCount > 0 || p.stats.absentCount > 0) ? '#ef4444' : '#22c55e' }}>
                                                                                    {p.stats.lateCount}L {p.stats.absentCount}A
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="p-3 pt-2 border-top bg-white">
                                                                    <button onClick={() => handlePaySalary(p)} disabled={isMarkingPaid === p._id} className="btn w-100 btn-record-expenses shadow-sm rounded-pill fw-bold py-2" style={{ fontSize: '0.85rem' }}>
                                                                        {isMarkingPaid === p._id ? <span className="spinner-border spinner-border-sm me-2" /> : 'Process Payout'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {filteredStaffPayroll.length > cardsPerPage && (
                                                    <div className="d-flex justify-content-center mt-4">
                                                        <div className="btn-group gap-1">
                                                            <button onClick={() => setStaffCurrentPage(p => Math.max(1, p - 1))} disabled={staffCurrentPage === 1} className="btn btn-sm btn-light rounded-circle shadow-sm" style={{ width: 32, height: 32 }}>&lt;</button>
                                                            <button onClick={() => setStaffCurrentPage(p => p + 1)} disabled={staffCurrentPage * cardsPerPage >= filteredStaffPayroll.length} className="btn btn-sm btn-light rounded-circle shadow-sm" style={{ width: 32, height: 32 }}>&gt;</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-3">
                                                <h6 className="fw-bold text-dark-secondary mb-0"><i className="bi bi-clock-history me-2"></i>Staff Payout Ledger</h6>
                                                <span className="badge bg-light text-muted fw-normal" style={{ fontSize: '0.72rem', border: '1px solid #e9ecef' }}>
                                                    Total Records: {payoutHistory.length}
                                                </span>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                                <div className="position-relative">
                                                    <img src={searchIcon} style={{ width: '14px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} alt="search" />
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm ps-5 rounded-pill border-light shadow-none"
                                                        placeholder="Search records..."
                                                        style={{ width: '220px', fontSize: '0.8rem', background: '#f8fafc' }}
                                                        value={ledgerSearch}
                                                        onChange={(e) => setLedgerSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead className="bg-light text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <tr>
                                                        <th className="ps-4 py-3 border-0">Date & Time</th>
                                                        <th className="py-3 border-0">Staff Member</th>
                                                        <th className="py-3 border-0">Type</th>
                                                        <th className="py-3 border-0">Period</th>
                                                        <th className="py-3 border-0">Authorized By</th>
                                                        <th className="py-3 border-0">Net Amount</th>
                                                        <th className="pe-4 py-3 border-0 text-end">Receipt</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="border-top-0">
                                                    {filteredLedger.length === 0 ? (
                                                        <tr><td colSpan="7" className="text-center p-5 text-muted">No payout recordings found matching your search.</td></tr>
                                                    ) : (
                                                        filteredLedger.slice((ledgerCurrentPage - 1) * ledgerPerPage, ledgerCurrentPage * ledgerPerPage).map((hist) => (
                                                            <tr key={hist._id}>
                                                                <td className="ps-4">
                                                                    <div className="fw-semibold text-dark-secondary">{new Date(hist.createdAt).toLocaleDateString()}</div>
                                                                    <small className="text-muted">{new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                                </td>
                                                                <td><div className="fw-bold text-dark-secondary">{hist.recipient?.fullName || hist.detailer?.fullName || 'Unknown Staff'}</div></td>
                                                                <td><span className={`badge ${hist.itemsCount > 0 ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'} px-2 py-1 rounded-3`}>{hist.itemsCount > 0 ? 'Commission' : 'Salary'}</span></td>
                                                                <td className="text-capitalize text-muted">{hist.period}</td>
                                                                <td className="text-muted">{hist.paidBy ? `${hist.paidBy.fullName}` : 'System'}</td>
                                                                <td className="fw-bold" style={{ color: '#22c55e', fontSize: '0.95rem' }}>₱{(hist.netAmount || hist.amount || 0).toLocaleString()}</td>
                                                                <td className="pe-4 text-end">
                                                                    <button onClick={() => downloadPayoutReceipt(hist)} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-1 shadow-none" title="Download Receipt">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                                            <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293z" />
                                                                            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                                                                        </svg>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {filteredLedger.length > ledgerPerPage && (
                                            <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
                                                <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
                                                    Showing {(ledgerCurrentPage - 1) * ledgerPerPage + 1} to {Math.min(ledgerCurrentPage * ledgerPerPage, filteredLedger.length)} of {filteredLedger.length} entries
                                                </div>
                                                <div className="d-flex align-items-center gap-1">
                                                    <button
                                                        className="btn btn-sm p-0 rounded-circle border-0"
                                                        disabled={ledgerCurrentPage === 1}
                                                        onClick={() => setLedgerCurrentPage(ledgerCurrentPage - 1)}
                                                        style={{ width: '32px', height: '32px', background: ledgerCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                    >
                                                        <img src={leftArrowIcon} style={{ width: '12px', opacity: ledgerCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                                    </button>
                                                    {getPaginationRange(ledgerCurrentPage, Math.ceil(filteredLedger.length / ledgerPerPage)).map((p, idx) => (
                                                        p === '...' ? (
                                                            <span key={`dot-ledger-${idx}`} className="px-2 text-muted">...</span>
                                                        ) : (
                                                            <button
                                                                key={`page-ledger-${p}`}
                                                                onClick={() => setLedgerCurrentPage(p)}
                                                                className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${ledgerCurrentPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                                style={{ width: '32px', height: '32px', fontSize: '0.8rem', background: ledgerCurrentPage === p ? '#23A0CE' : 'transparent' }}
                                                            >
                                                                {p}
                                                            </button>
                                                        )
                                                    ))}
                                                    <button
                                                        className="btn btn-sm p-0 rounded-circle border-0"
                                                        disabled={ledgerCurrentPage * ledgerPerPage >= filteredLedger.length}
                                                        onClick={() => setLedgerCurrentPage(ledgerCurrentPage + 1)}
                                                        style={{ width: '32px', height: '32px', background: ledgerCurrentPage * ledgerPerPage >= filteredLedger.length ? '#f1f5f9' : 'transparent' }}
                                                    >
                                                        <img src={rightArrowIcon} style={{ width: '12px', opacity: ledgerCurrentPage * ledgerPerPage >= filteredLedger.length ? 0.3 : 0.7 }} alt="next" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {hrTab === 'analytics' && (
                <div>
                    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                        <h6 className="fw-bold text-dark-secondary mb-0">Staff Performance Analytics</h6>
                        <div className="btn-group shadow-sm">
                            {['today', 'week', 'month'].map(p => (
                                <button key={p} onClick={() => setPayrollPeriod(p)} className={`btn btn-sm ${payrollPeriod === p ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    {isPayrollLoading ? (
                        <div className="p-0"><TableSkeleton /></div>
                    ) : payrollData.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                            <p className="text-muted mb-1" style={{ fontSize: '2rem' }}>📊</p>
                            <p className="text-muted mb-0">No performance data available for this period.</p>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {/* Top Performer Highlights */}
                            <div className="col-12 mb-2">
                                <h6 className="fw-bold text-dark-secondary mb-3"><i className="bi bi-trophy text-warning me-2"></i>Top Performer ({payrollPeriod})</h6>
                                {(() => {
                                    const sortedDetailers = [...payrollData].sort((a, b) => b.bookingCount - a.bookingCount);
                                    const top = sortedDetailers[0];
                                    if (!top || top.bookingCount === 0) return <p className="text-muted small">No vehicles washed yet.</p>;
                                    return (
                                        <div className="card shadow-sm border-0 rounded-4 overflow-hidden position-relative" style={{ background: 'linear-gradient(135deg, #f59e0b10, #f59e0b05)' }}>
                                            <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '120px', height: '120px', background: '#f59e0b', filter: 'blur(45px)', opacity: 0.15 }} />
                                            <div className="p-4 d-flex align-items-center gap-4 flex-wrap">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 65, height: 65, background: '#f59f0b3a', color: '#fff', fontSize: '1.8rem', flexShrink: 0 }}>
                                                    <img src={topPerformerIcon} alt="Top Performer Icon" style={{ width: '24px' }} />
                                                </div>
                                                <div>
                                                    <h4 className="fw-bold text-dark-secondary mb-1">{getEmpName(top.detailer)}</h4>
                                                    <span className="badge rounded-pill bg-white text-dark shadow-sm border" style={{ fontSize: '0.75rem' }}>#1 Detailer</span>
                                                </div>
                                                <div className="ms-auto d-flex gap-4">
                                                    <div className="text-center">
                                                        <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicles Washed</div>
                                                        <div className="fw-bold fs-3 text-dark-secondary lh-1">{top.bookingCount}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue Gen.</div>
                                                        <div className="fw-bold fs-3 lh-1" style={{ color: '#22c55e' }}>₱{top.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Full Leaderboard */}
                            <div className="col-12">
                                <h6 className="fw-bold text-dark-secondary mb-3">Service Leaderboard</h6>
                                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                                            <thead className="bg-light text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <tr>
                                                    <th className="ps-4 py-3 border-0">Rank</th>
                                                    <th className="py-3 border-0">Detailer Name</th>
                                                    <th className="py-3 border-0 text-center">Vehicles Completed</th>
                                                    <th className="py-3 border-0 text-end">Generated Revenue</th>
                                                    <th className="pe-4 py-3 border-0 text-end">Take-home Comm.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="border-top-0">
                                                {[...payrollData]
                                                    .sort((a, b) => b.bookingCount - a.bookingCount)
                                                    .map((row, idx) => (
                                                        <tr key={row.detailer._id}>
                                                            <td className="ps-4 py-3">
                                                                {idx === 0 ? <span className="fs-5">1</span> : idx === 1 ? <span className="fs-5">2</span> : idx === 2 ? <span className="fs-5">3</span> : <span className="text-muted fw-bold ps-2">#{idx + 1}</span>}
                                                            </td>
                                                            <td className="fw-bold text-dark-secondary">{getEmpName(row.detailer)}</td>
                                                            <td className="text-center">
                                                                <span className="badge bg-light text-dark px-3 py-2 rounded-pill fs-6">{row.bookingCount}</span>
                                                            </td>
                                                            <td className="text-end fw-semibold text-dark-secondary">₱{row.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            <td className="pe-4 text-end fw-bold" style={{ color: '#22c55e' }}>₱{row.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── ATTENDANCE HISTORY TAB ── */}
            {hrTab === 'attendance' && (
                <div className="animate-fade-in">
                    {/* ── SECTION 1: SHIFT MANAGEMENT (ACTIVE & RECENT) ── */}
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                        <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <h6 className="mb-0 fw-bold text-dark-secondary">Live Shift Management</h6>
                                <p className="text-muted small mb-0">Adjust holiday status and approve overtime for recent sessions</p>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                <div className="position-relative">
                                    <img src={searchIcon} alt="" className="position-absolute translate-middle-y ms-3" style={{ top: '50%', width: 14 }} />
                                    <input
                                        type="text"
                                        placeholder="Search staff..."
                                        className="form-control form-control-sm ps-5 rounded-pill border-light"
                                        style={{ width: 180, fontSize: '0.8rem' }}
                                        value={attendanceSearch}
                                        onChange={(e) => setAttendanceSearch(e.target.value)}
                                    />
                                </div>
                                <button onClick={() => setShowHolidayModal(true)} className="btn btn-sm btn-outline-secondary px-3 rounded-pill shadow-sm category-tags">
                                    Manage Holidays
                                </button>
                                <button onClick={fetchAttendance} className="btn btn-sm btn-light shadow-sm px-3 rounded-pill text-muted d-flex align-items-center justify-content-center">
                                    <img src={refreshIcon} alt="Refresh" style={{ width: 14 }} />
                                </button>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {isAttendanceLoading ? (
                                <div className="p-0"><TableSkeleton /></div>
                            ) : filteredAttendance.length === 0 ? (
                                <div className="p-5 text-center text-muted">No attendance activity found.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light text-dark-gray400" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Date</th>
                                                <th className="py-3 border-0">Staff Member</th>
                                                <th className="py-3 border-0" style={{ width: '180px' }}>Holiday Admin</th>
                                                <th className="py-3 border-0">OT Approval</th>
                                                <th className="pe-4 py-3 border-0 text-end">Work Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-top-0">
                                            {filteredAttendance.map((log) => {
                                                const isActive = !log.clockOutTime;
                                                const emp = log.employee || {};

                                                // Calculate real-time OT
                                                let displayOT = log.overtimeMinutes || 0;

                                                // Re-calculate based on shift end BASIS
                                                const endPoint = isActive ? currentTime : (log.clockOutTime ? new Date(log.clockOutTime) : null);

                                                if (endPoint && log.clockInTime) {
                                                    if (emp.shiftType === 'Morning') {
                                                        const shiftEnd = new Date(log.clockInTime);
                                                        shiftEnd.setHours(17, 0, 0, 0);
                                                        if (endPoint > shiftEnd) displayOT = Math.floor((endPoint - shiftEnd) / 60000);
                                                    } else if (emp.shiftType === 'Night') {
                                                        const shiftEnd = new Date(log.clockInTime);
                                                        shiftEnd.setHours(5, 0, 0, 0);
                                                        if (shiftEnd < new Date(log.clockInTime)) shiftEnd.setDate(shiftEnd.getDate() + 1);
                                                        if (endPoint > shiftEnd) displayOT = Math.floor((endPoint - shiftEnd) / 60000);
                                                    }
                                                }

                                                return (
                                                    <tr key={log._id}>
                                                        <td className="ps-4">
                                                            <span className="fw-semibold text-dark-secondary">{new Date(log.dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm" style={{ width: 32, height: 32, background: isActive ? '#002525' : '#6b7280', fontSize: '0.8rem', flexShrink: 0 }}>
                                                                    {getEmpName(log.employee).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="fw-bold text-dark-secondary text-truncate" style={{ maxWidth: '120px' }}>{getEmpName(log.employee)}</div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex flex-column gap-1">
                                                                <select
                                                                    className="form-select form-select-sm border-0 bg-light-subtle small fw-bold shadow-none"
                                                                    value={log.holidayName ? `${log.holidayType}|${log.holidayName}` : 'None'}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === 'None') {
                                                                            handleUpdateAttendance(log._id, { holidayType: 'None', holidayName: '' });
                                                                        } else {
                                                                            const [type, name] = val.split('|');
                                                                            handleUpdateAttendance(log._id, { holidayType: type, holidayName: name });
                                                                        }
                                                                    }}
                                                                    style={{ fontSize: '0.7rem' }}
                                                                >
                                                                    <option value="None">Standard Day</option>
                                                                    {holidayLogs.filter(h => h.dateStr === log.dateStr).map(h => (
                                                                        <option key={h._id} value={`${h.type}|${h.name}`}>{h.name}</option>
                                                                    ))}
                                                                </select>
                                                                {log.holidayType !== 'None' && (
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            style={{ width: 12, height: 12 }}
                                                                            checked={log.wasPresentYesterday}
                                                                            onChange={(e) => handleUpdateAttendance(log._id, { wasPresentYesterday: e.target.checked })}
                                                                        />
                                                                        <span className="text-muted" style={{ fontSize: '0.6rem' }}>Pay Eligible</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {displayOT > 0 ? (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className={`badge rounded-pill ${log.isOTApproved ? 'bg-success' : 'bg-warning'} text-white`} style={{ fontSize: '0.65rem' }}>
                                                                        {Math.floor(displayOT / 60)}h {displayOT % 60}m {log.isOTApproved ? 'Approved' : 'Pending'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleApproveOT(log._id, !log.isOTApproved)}
                                                                        className={`btn btn-xs ${log.isOTApproved ? 'btn-outline-danger' : 'btn-outline-success'} rounded-circle border-0 shadow-sm`}
                                                                        style={{ fontSize: '0.65rem' }}
                                                                        title={log.isOTApproved ? 'Cancel OT' : 'Approve OT'}
                                                                    >
                                                                        {log.isOTApproved ? 'X' : '✓'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted small">0m</span>
                                                            )}
                                                        </td>
                                                        <td className="pe-4 text-end">
                                                            {isActive ? (
                                                                <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Currently Working</span>
                                                            ) : (
                                                                <span className="badge rounded-pill bg-light text-muted border">Completed Shift</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SECTION 2: ATTENDANCE AUDIT HISTORY (READ ONLY) ── */}
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-dark-secondary">Attendance Audit History</h6>
                            <p className="text-muted small mb-0">Read-only historical view of all completed shifts</p>
                        </div>
                        <div className="card-body p-0">
                            {isAttendanceLoading ? (
                                <div className="p-0"><TableSkeleton /></div>
                            ) : filteredAttendance.filter(l => l.clockOutTime).length === 0 ? (
                                <div className="p-5 text-center text-muted">No completed shift history available.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light text-dark-gray400" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Date</th>
                                                <th className="py-3 border-0">Staff Name</th>
                                                <th className="py-3 border-0">Holiday Status</th>
                                                <th className="py-3 border-0">Work Duration</th>
                                                <th className="py-3 border-0">Timesheet</th>
                                                <th className="pe-4 py-3 border-0 text-end">Total Daily Pay</th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-top-0">
                                            {filteredAttendance.filter(l => l.clockOutTime).map((log) => (
                                                <tr key={log._id}>
                                                    <td className="ps-4">
                                                        <span className="fw-semibold text-dark-secondary">{new Date(log.dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark-secondary">{getEmpName(log.employee)}</div>
                                                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>{log.employee?.role || 'Staff'}</small>
                                                    </td>
                                                    <td>
                                                        {log.holidayType && log.holidayType !== 'None' ? (
                                                            <div className="d-flex align-items-center gap-1">
                                                                <span className={`badge rounded-pill ${log.holidayType === 'Regular' ? 'bg-danger' : 'bg-warning text-dark'}`} style={{ fontSize: '0.6rem' }}>
                                                                    {log.holidayType}
                                                                </span>
                                                                <span className="fw-bold text-dark-secondary" style={{ fontSize: '0.75rem' }}>
                                                                    {(log.holidayName || log.holidayType || '').replace('Christmast', 'Christmas')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.65rem' }}>Standard Day</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold text-dark-secondary">
                                                            {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                                                        </div>
                                                        {(() => {
                                                            const emp = log.employee || {};
                                                            let displayOT = log.overtimeMinutes || 0;
                                                            const clockOut = log.clockOutTime ? new Date(log.clockOutTime) : null;
                                                            if (clockOut && log.clockInTime) {
                                                                if (emp.shiftType === 'Morning') {
                                                                    const shiftEnd = new Date(log.clockInTime);
                                                                    shiftEnd.setHours(17, 0, 0, 0);
                                                                    if (clockOut > shiftEnd) displayOT = Math.floor((clockOut - shiftEnd) / 60000);
                                                                } else if (emp.shiftType === 'Night') {
                                                                    const shiftEnd = new Date(log.clockInTime);
                                                                    shiftEnd.setHours(5, 0, 0, 0);
                                                                    if (shiftEnd < new Date(log.clockInTime)) shiftEnd.setDate(shiftEnd.getDate() + 1);
                                                                    if (clockOut > shiftEnd) displayOT = Math.floor((clockOut - shiftEnd) / 60000);
                                                                }
                                                            }
                                                            return displayOT > 0 && log.isOTApproved ? (
                                                                <small className="text-success" style={{ fontSize: '0.65rem' }}>+ {Math.floor(displayOT / 60)}h {displayOT % 60}m OT</small>
                                                            ) : null;
                                                        })()}
                                                    </td>
                                                    <td>
                                                        <div className="text-dark-secondary small">
                                                            In: {new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-dark-secondary small">
                                                            Out: {new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="pe-4 text-end">
                                                        <div className="text-dark-secondary fw-bold fs-6" style={{ color: '#059669' }}>₱{getDailyPay(log).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        <small className="text-muted" style={{ fontSize: '0.6rem' }}>Daily Net Pay</small>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD / EDIT EMPLOYEE MODAL ── */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-0 pb-0 pt-4 px-4">
                                <h5 className="modal-title fw-bold text-dark-secondary">{editingEmp ? 'Edit Employee' : 'Add New Employee'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                            </div>
                            <form onSubmit={handleSaveEmployee}>
                                <div className="modal-body px-4 py-3">
                                    {/* Personal Info */}
                                    <h6 className="fw-bold mb-3 text-primary" style={{ fontSize: '0.9rem' }}>Personal Information</h6>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Full Name</label>
                                        <input type="text" className="form-control rounded-3" value={empForm.fullName} onChange={e => setEmpForm({ ...empForm, fullName: e.target.value })} required placeholder="e.g. Maria Santos" />
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-4">
                                            <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Age <span className="text-muted fw-normal">(Opt)</span></label>
                                            <input type="number" className="form-control rounded-3" value={empForm.age} onChange={e => setEmpForm({ ...empForm, age: e.target.value })} placeholder="e.g. 28" min={18} max={99} />
                                        </div>
                                        <div className="col-8">
                                            <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Contact No. <span className="text-muted fw-normal">(Opt)</span></label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3 text-dark" style={{ fontSize: '0.85rem' }}>+63</span>
                                                <input
                                                    type="tel"
                                                    className="form-control border-start-0 rounded-end-3 px-1"
                                                    value={empForm.phone}
                                                    onChange={e => {
                                                        const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setEmpForm({ ...empForm, phone: cleanVal });
                                                    }}
                                                    placeholder="948 XXX XXXX"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Email Address {!empForm.hasAccount && <span className="text-muted fw-normal">(Opt)</span>}</label>
                                        <input type="email" className="form-control rounded-3" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} required={empForm.hasAccount} placeholder="staff@sandigan.com" />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Address <span className="text-muted fw-normal">(Opt)</span></label>
                                        <input type="text" className="form-control rounded-3" value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} placeholder="Full address" />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Start of Works / Hired Date</label>
                                        <input type="date" className="form-control rounded-3" value={empForm.hiredDate} onChange={e => setEmpForm({ ...empForm, hiredDate: e.target.value })} required />
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>This date marks the beginning of their first pay cycle.</small>
                                    </div>

                                    <hr className="my-4 text-muted opacity-25" />

                                    {/* Role & Access Info */}
                                    <h6 className="fw-bold mb-3 text-dark-secondary" style={{ fontSize: '0.9rem' }}>Role & System Access</h6>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Role</label>
                                        <select className="form-select rounded-3" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}>
                                            <option value="employee">Employee (Staff Dashboard access)</option>
                                            <option value="detailer">Detailer (No account - Payroll tracking only)</option>
                                            <option value="admin">Admin (Full ERP access)</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Staff Status</label>
                                        <select className="form-select rounded-3" value={empForm.status} onChange={e => setEmpForm({ ...empForm, status: e.target.value })}>
                                            <option value="Active">Active / Working</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Sick">Sick / Medical</option>
                                        </select>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Shift Schedule</label>
                                            <select className="form-select rounded-3" value={empForm.shiftType} onChange={e => setEmpForm({ ...empForm, shiftType: e.target.value })}>
                                                <option value="None">No Regular Shift</option>
                                                <option value="Morning">Morning Shift (8H)</option>
                                                <option value="Night">Night Shift (8H)</option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Shift Start Time</label>
                                            <input
                                                type={empForm.shiftType === 'None' ? 'text' : 'time'}
                                                className="form-control rounded-3"
                                                value={empForm.shiftStartTime}
                                                disabled={empForm.shiftType === 'None'}
                                                onChange={e => setEmpForm({ ...empForm, shiftStartTime: e.target.value })}
                                                placeholder="Set Time"
                                            />
                                        </div>
                                    </div>

                                    {empForm.role !== 'detailer' && (
                                        <div className="d-flex align-items-center gap-2 mb-3 p-2 bg-light-subtle rounded-3 border">
                                            <div className="form-check form-switch pt-1">
                                                <input
                                                    className="form-check-input shadow-none"
                                                    type="checkbox"
                                                    id="hasAccountToggle"
                                                    checked={empForm.hasAccount}
                                                    onChange={e => setEmpForm({ ...empForm, hasAccount: e.target.checked })}
                                                />
                                            </div>
                                            <label className="form-check-label fw-bold text-dark-secondary mb-0" htmlFor="hasAccountToggle" style={{ fontSize: '0.8rem' }}>
                                                Create Login Account For This Employee
                                            </label>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <small className="text-muted mt-2 d-block" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                            {!empForm.hasAccount && 'This employee will not be able to log in. They are tracked for payroll and attendance only.'}
                                            {empForm.hasAccount && empForm.role === 'admin' && 'Admins have full access to all ERP modules. Requires secure login.'}
                                            {empForm.hasAccount && empForm.role === 'employee' && 'Employees access the staff dashboard to process bookings. Requires secure login.'}
                                            {empForm.role === 'detailer' && 'Detailers appear in the booking assignment and payroll. No login required.'}
                                        </small>
                                    </div>

                                    {empForm.role !== 'detailer' && empForm.hasAccount && (
                                        <div className="p-3 bg-light rounded-3 mt-3 border">
                                            <div className="mb-2">
                                                <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>{editingEmp ? 'New Password' : 'Password'}</label>
                                                <div className="input-group">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        className="form-control rounded-start-3"
                                                        value={empForm.password}
                                                        onChange={e => setEmpForm({ ...empForm, password: e.target.value })}
                                                        required={!editingEmp && empForm.hasAccount}
                                                        placeholder={editingEmp ? '••••••••' : 'Min. 8 characters'}
                                                        minLength={editingEmp ? 0 : 8}
                                                    />
                                                    <button
                                                        className="btn btn-outline-secondary rounded-end-3"
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {empForm.role !== 'detailer' && (
                                        <div className="p-3 bg-light rounded-3 mt-3 border">
                                            <h6 className="fw-bold mb-3 text-dark-secondary" style={{ fontSize: '0.8rem' }}>Salary & Payroll Information</h6>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Base Salary (₱) <span className="text-muted fw-normal">(Opt)</span></label>
                                                    <input type="number" className="form-control rounded-3" value={empForm.baseSalary} onChange={e => setEmpForm({ ...empForm, baseSalary: e.target.value })} placeholder="0" min="0" />
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Payment Frequency</label>
                                                    <select className="form-select rounded-3" value={empForm.salaryFrequency} onChange={e => setEmpForm({ ...empForm, salaryFrequency: e.target.value })}>
                                                        <option value="Daily">Daily</option>
                                                        <option value="Weekly">Weekly</option>
                                                        <option value="Bi-Weekly">Bi-Weekly</option>
                                                        <option value="Monthly">Monthly</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Non-Taxable Allowance (₱/Cycle) <span className="text-muted fw-normal">(e.g. Load, Transpo)</span></label>
                                                <input type="number" className="form-control rounded-3" value={empForm.nonTaxableAllowance} onChange={e => setEmpForm({ ...empForm, nonTaxableAllowance: e.target.value })} placeholder="0" min="0" />
                                            </div>

                                            <div className="mt-4 pt-2 border-top">
                                                <h6 className="fw-bold mb-3 text-dark-secondary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Government IDs (For Payslips)</h6>
                                                <div className="row g-2 mb-2">
                                                    <div className="col-6">
                                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.72rem' }}>SSS Number</label>
                                                        <input type="text" className="form-control form-control-sm rounded-3" value={empForm.sssNo} onChange={e => setEmpForm({ ...empForm, sssNo: e.target.value })} placeholder="XX-XXXXXXXX-X" />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.72rem' }}>TIN Number</label>
                                                        <input type="text" className="form-control form-control-sm rounded-3" value={empForm.tinNo} onChange={e => setEmpForm({ ...empForm, tinNo: e.target.value })} placeholder="XXX-XXX-XXX" />
                                                    </div>
                                                </div>
                                                <div className="row g-2">
                                                    <div className="col-6">
                                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.72rem' }}>PhilHealth No.</label>
                                                        <input type="text" className="form-control form-control-sm rounded-3" value={empForm.philhealthNo} onChange={e => setEmpForm({ ...empForm, philhealthNo: e.target.value })} placeholder="XX-XXXXXXXXX-X" />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="form-label text-muted mb-1" style={{ fontSize: '0.72rem' }}>Pag-IBIG ID</label>
                                                        <input type="text" className="form-control form-control-sm rounded-3" value={empForm.pagibigNo} onChange={e => setEmpForm({ ...empForm, pagibigNo: e.target.value })} placeholder="XXXX-XXXX-XXXX" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-0 px-4 pb-4 pt-0">
                                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save rounded-pill px-4" disabled={isSaving}>
                                        {isSaving ? 'Saving...' : editingEmp ? 'Save Changes' : 'Add Employee'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PERFORMANCE HISTORY MODAL (UNIFIED) ── */}
            {showHistory && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden" style={{ minHeight: '600px' }}>
                            <div className="modal-header border-0 pt-4 px-4 pb-0 d-flex flex-column align-items-start">
                                <div className="d-flex justify-content-between w-100 align-items-start">
                                    <div>
                                        <h4 className="modal-title fw-bold text-dark-secondary mb-1">Detailed Performance History</h4>
                                        <p className="text-muted small">Performance summary for <span className="fw-bold text-primary">{getEmpName(historyEmp)}</span></p>
                                    </div>
                                    <button type="button" className="btn-close shadow-none" onClick={() => setShowHistory(false)} />
                                </div>
                            </div>

                            <div className="modal-body px-4 py-3">
                                {isHistoryLoading ? (
                                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                                        <div className="spinner-border text-primary mb-3" />
                                        <p className="text-muted">Loading history details...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* KPI Cards */}
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-4">
                                                <div className="p-4 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(35,160,206,0.04))', border: '1px solid rgba(34,197,94,0.1)' }}>
                                                    <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.65rem' }}>
                                                        {historyEmp?.role === 'detailer' ? 'Total Bookings Completed' : 'Total Completed Shifts'}
                                                    </small>
                                                    <div className="d-flex align-items-baseline gap-2">
                                                        <h2 className="fw-bold text-success mb-0">{historyData.summary.bookingCount || 0}</h2>
                                                        <span className="text-muted small">{historyEmp?.role === 'detailer' ? 'Cars Wash' : 'Processed'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-md-4">
                                                <div className="p-4 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(35,160,206,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(35,160,206,0.1)' }}>
                                                    <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.65rem' }}>
                                                        {historyEmp?.role === 'detailer' ? 'Gross Revenue Generated' : 'Accumulated Work Hours'}
                                                    </small>
                                                    <div className="d-flex align-items-baseline gap-2">
                                                        <h2 className={historyEmp?.role === 'detailer' ? "fw-bold text-success mb-0" : "fw-bold mb-0"} style={{ color: historyEmp?.role === 'detailer' ? '' : '#2563eb' }}>
                                                            {historyEmp?.role === 'detailer' ? `₱${(historyData.summary.totalRevenue || 0).toLocaleString()}` : `${historyData.summary.totalRevenue || 0}h`}
                                                        </h2>
                                                        <span className="text-muted small">{historyEmp?.role === 'detailer' ? 'Gross' : 'Worked'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-md-4">
                                                <div className="p-4 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.03))', border: '1px solid rgba(245,158,11,0.15)' }}>
                                                    <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.65rem' }}>
                                                        {historyEmp?.role === 'detailer' ? 'Total Commission Earned' : 'Total Amount Earned'}
                                                    </small>
                                                    <div className="d-flex align-items-baseline gap-2">
                                                        <h2 className="fw-bold mb-0" style={{ color: '#f59e0b' }}>
                                                            ₱{(historyData.summary.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                        </h2>
                                                        <span className="text-muted small">Gain</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* History Table */}
                                        <div className="card rounded-4 border overflow-hidden">
                                            <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                    <thead className="bg-light text-muted sticky-top shadow-sm" style={{ zIndex: 1, fontSize: '0.73rem', textTransform: 'uppercase' }}>
                                                        <tr>
                                                            <th className="ps-4 py-3 border-0">Date</th>
                                                            <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'BookID' : 'RefID'}</th>
                                                            <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'Customer' : 'Event'}</th>
                                                            <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'Vehicle' : 'Duration'}</th>
                                                            <th className="pe-4 py-3 border-0 text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="border-top-0">
                                                        {historyData.history && historyData.history.length > 0 ? (
                                                            historyData.history.map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="ps-4 py-3">
                                                                        <span className="fw-semibold text-dark-secondary">{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                    </td>
                                                                    <td className="text-muted fw-bold">#{item.bookingId}</td>
                                                                    <td>
                                                                        <div className={`${item.isAttendance ? 'text-muted fw-bold' : 'text-dark-secondary fw-semibold'}`}>{item.customerName}</div>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`badge bg-light text-dark-secondary border px-2 py-1 rounded-3 ${item.isAttendance ? 'fw-bold' : ''}`} style={{ fontSize: '0.73rem' }}>{item.vehicleType}</span>
                                                                    </td>
                                                                    <td className="pe-4 text-end fw-bold text-dark-secondary">
                                                                        ₱{(item.commission || item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr><td colSpan="5" className="text-center py-5 text-muted">No historical data available.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer border-0 p-4 pt-2">
                                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowHistory(false)}>Close Summary</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PAYOUT REVIEW MODAL ── */}
            {showPayoutModal && selectedPayoutStaff && (
                <div className="modal show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100 }}>
                    <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div className="modal-header border-0 bg-white pt-4 px-4 pb-2">
                                <div>
                                    <h4 className="fw-bold text-dark-secondary mb-1">Finalize Payout Review</h4>
                                    <p className="text-muted mb-0 small">Performance summary for <b className="brand-primary">{selectedPayoutStaff.fullName}</b> — {selectedPayoutStaff.frequency} Cycle</p>
                                </div>
                                <button onClick={() => setShowPayoutModal(false)} className="btn-close shadow-none" />
                            </div>

                            <div className="modal-body p-4 pt-2">
                                {/* KPI CARDS - Modern, premium design matching the screenshot */}
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-3">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">Cycle Work Hours</div>
                                            <div className="d-flex align-items-baseline gap-2">
                                                <h3 className="fw-bold text-dark-secondary mb-0">{selectedPayoutStaff.stats.totalHours}</h3>
                                                <span className="text-muted">/ {selectedPayoutStaff.stats.targetHours}h</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">OT Premiums</div>
                                            <h3 className="fw-bold brand-primary mb-0">₱{Math.round(selectedPayoutStaff.stats.otPay).toLocaleString()}</h3>
                                            <small className="text-muted">{selectedPayoutStaff.stats.otHours}h Approved</small>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">Holiday Pay</div>
                                            <h3 className="fw-bold text-danger mb-0">₱{Math.round(selectedPayoutStaff.stats.holidayPay).toLocaleString()}</h3>
                                            <small className="text-muted">Addtl. Premium Pay</small>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: 'rgba(34,197,94,0.07)', border: '1px dashed rgba(34,197,94,0.3)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">Current Accrued</div>
                                            <h3 className="fw-bold text-success mb-0">₱{Math.round(selectedPayoutStaff.netAmount).toLocaleString()}</h3>
                                            <small className="text-muted">Initial Net Payout</small>
                                        </div>
                                    </div>
                                </div>

                                {/* ATTENDANCE HISTORY LOGS */}
                                <div className="card border rounded-4 overflow-hidden mb-4 shadow-sm">
                                    <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center">
                                        <h6 className="fw-bold text-dark-secondary mb-0">Cycle Timesheet Summary</h6>
                                        {selectedPayoutStaff.stats.absentCount > 0 && <span className="badge bg-danger rounded-pill px-3">{selectedPayoutStaff.stats.absentCount} missed days detected</span>}
                                    </div>
                                    <div className="table-responsive" style={{ maxHeight: '280px' }}>
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="small text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                <tr>
                                                    <th className="ps-4">Work Date</th>
                                                    <th>Clock In</th>
                                                    <th>Clock Out</th>
                                                    <th>Duration</th>
                                                    <th>Holiday</th>
                                                    <th className="pe-4 text-end">Est. Unit Pay</th>
                                                </tr>
                                            </thead>
                                            <tbody className="small">
                                                {(() => {
                                                    let divisor = 26;
                                                    if (selectedPayoutStaff.frequency === 'Bi-Weekly') divisor = 13;
                                                    else if (selectedPayoutStaff.frequency === 'Weekly') divisor = 6;
                                                    else if (selectedPayoutStaff.frequency === 'Daily') divisor = 1;

                                                    return selectedPayoutStaff.logs?.map(log => (
                                                        <tr key={log._id}>
                                                            <td className="ps-4 fw-bold text-dark-secondary">
                                                                {new Date(log.dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                                                            </td>
                                                            <td>{new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td>{log.clockOutTime ? new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                                            <td>{Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m</td>
                                                            <td>
                                                                {log.holidayType !== 'None' && <span className="badge bg-danger-subtle text-danger border border-danger me-1" style={{ fontSize: '0.65rem' }}>{log.holidayType}</span>}
                                                                {log.otMinutes > 0 && log.isOTApproved && (
                                                                    <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.65rem' }}>
                                                                        +OT ({Math.floor(log.otMinutes / 60)}h {log.otMinutes % 60}m)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="pe-4 text-end">
                                                                ₱{Math.round(((log.regMinutes / 60) * ((selectedPayoutStaff.baseSalary / divisor) / 8)) + ((log.otMinutes / 60) * ((selectedPayoutStaff.baseSalary / divisor) / 8) * 1.30)).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                                {(!selectedPayoutStaff.logs || selectedPayoutStaff.logs.length === 0) && (
                                                    <tr><td colSpan="6" className="p-4 text-center text-muted">No attendance activity found for this cycle.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* MANUAL ADJUSTMENTS FORM */}
                                <div className="card border-0 bg-light-secondary rounded-4 p-4 mb-4">
                                    <h6 className="fw-bold text-dark-secondary mb-3">Admin Manual Adjustments</h6>
                                    <div className="row g-3">
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold text-muted">Additional Bonus (+)</label>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-white border-end-0 text-dark">₱</span>
                                                <input
                                                    type="number"
                                                    className="form-control border-start-0"
                                                    value={payoutAdjustments.bonus}
                                                    onChange={e => setPayoutAdjustments({ ...payoutAdjustments, bonus: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-bold text-muted">Manual Deductions (-)</label>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-white border-end-0 text-dark">₱</span>
                                                <input
                                                    type="number"
                                                    className="form-control border-start-0"
                                                    value={payoutAdjustments.deductions}
                                                    onChange={e => setPayoutAdjustments({ ...payoutAdjustments, deductions: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label small fw-bold text-muted">Adjustment Remarks / Memo</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. Performance bonus, Loan deduction..."
                                                value={payoutAdjustments.remarks}
                                                onChange={e => setPayoutAdjustments({ ...payoutAdjustments, remarks: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* FINAL CALCULATION FOOTER */}
                                <div className="p-4 rounded-4 shadow-sm" style={{ background: '#002525' }}>
                                    <div className="row align-items-center">
                                        <div className="col-md-7">
                                            <div className="d-flex align-items-center gap-3">
                                                <span className="badge rounded-pill bg-white text-dark shadow-sm" style={{ fontSize: '0.75rem' }}>FINAL PAYOUT</span>
                                                <p className="text-white-50 mb-0 small">This marks all current attendance logs as Settled and records a liquidation expense.</p>
                                            </div>
                                        </div>
                                        <div className="col-md-5 text-end">
                                            <div className="text-white-50 small mb-1">Total Net Liquidation</div>
                                            <h2 className="fw-bold text-white mb-0 lh-1">
                                                ₱{(selectedPayoutStaff.netAmount + payoutAdjustments.bonus - payoutAdjustments.deductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer border-0 p-4 pt-0">
                                <button onClick={() => setShowPayoutModal(false)} className="btn btn-light rounded-pill px-4 shadow-sm" disabled={isMarkingPaid === selectedPayoutStaff._id}>Cancel Review</button>
                                <button onClick={handleConfirmPayout} disabled={isMarkingPaid === selectedPayoutStaff._id} className="btn btn-save rounded-pill px-5 shadow">
                                    {isMarkingPaid === selectedPayoutStaff._id ? <span className="spinner-border spinner-border-sm me-2" /> : 'Confirm & Finalize Payout'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HOLIDAY MANAGEMENT MODAL ── */}
            {showHolidayModal && (
                <div className="modal show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden" >
                            <div className="modal-header border-0 text-light p-4" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                <div>
                                    <h5 className="modal-title fw-bold font-poppins mb-1">Company Holiday Calendar</h5>
                                    <p className="mb-0 small opacity-75">Used for automated payroll premium calculations</p>
                                </div>
                                <button type="button" className="btn-close shadow-none btn-close-white" onClick={() => setShowHolidayModal(false)} />
                            </div>

                            <div className="modal-body p-4">
                                <div className="row g-4">
                                    {/* Left: Add Holiday Form */}
                                    <div className="col-md-5 border-end">
                                        <h6 className="fw-bold text-dark-secondary mb-3">{editingHoliday ? 'Edit Holiday' : 'Add Custom Holiday'}</h6>
                                        <form onSubmit={handleCreateHoliday}>
                                            <div className="mb-3">
                                                <label className="form-label small fw-bold text-muted ">Date</label>
                                                <input type="date" className="form-control" required value={newHoliday.dateStr} onChange={e => setNewHoliday({ ...newHoliday, dateStr: e.target.value })} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label small fw-bold text-muted ">Holiday Name</label>
                                                <input type="text" className="form-control" placeholder="e.g. Christmas Day" required value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                                            </div>
                                            <div className="mb-4">
                                                <label className="form-label small fw-bold text-muted ">Type</label>
                                                <select className="form-select" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}>
                                                    <option value="Regular">Regular (Double Pay)</option>
                                                    <option value="Special">Special (30% Premium)</option>
                                                </select>
                                            </div>
                                            <button type="submit" className="btn btn-save w-100 fw-semibold rounded-pill shadow-sm">{editingHoliday ? 'Update Holiday' : 'Save Holiday'}</button>
                                            {editingHoliday && (
                                                <button type="button" onClick={() => { setEditingHoliday(null); setNewHoliday({ dateStr: '', name: '', type: 'Regular' }); }} className="btn btn-link btn-sm w-100 mt-2 text-decoration-none text-muted">Cancel Edit</button>
                                            )}
                                        </form>
                                    </div>

                                    {/* Right: Holiday List */}
                                    <div className="col-md-7">
                                        <h6 className="fw-bold text-dark-secondary mb-3">Saved Holidays</h6>
                                        <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="pe-2">
                                            {isHolidayLoading ? (
                                                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-warning" /></div>
                                            ) : holidayLogs.length === 0 ? (
                                                <p className="text-muted small text-center py-4">No holidays defined yet.</p>
                                            ) : (
                                                <div className="list-group list-group-flush border rounded-3">
                                                    {holidayLogs.map(h => (
                                                        <div key={h._id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                                                            <div>
                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.85rem' }}>{h.name}</div>
                                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                    {new Date(h.dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    <span className={`ms-2 badge ${h.type === 'Regular' ? 'bg-danger' : 'bg-warning text-dark'}`} style={{ fontSize: '0.6rem' }}>{h.type}</span>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex gap-1">
                                                                <button
                                                                    onClick={() => { setEditingHoliday(h); setNewHoliday({ dateStr: h.dateStr, name: h.name, type: h.type }); }}
                                                                    className="btn btn-sm btn-outline-primary border-0 p-1"
                                                                >
                                                                    <img src={editIcon} alt="Edit" style={{ width: 14 }} />
                                                                </button>
                                                                <button onClick={() => handleDeleteHoliday(h._id)} className="btn btn-sm btn-outline-danger border-0 p-1">
                                                                    <img src={deleteIcon} alt="Delete" style={{ width: 14 }} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 bg-light p-3">
                                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowHolidayModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   CRM & CLIENT MANAGEMENT — ERP Module
───────────────────────────────────────────── */
const CRMPage = ({ user }) => {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('All');
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientStats, setClientStats] = useState(null); // Fetch detailed history when viewing 360
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesText, setNotesText] = useState('');

    // Add Client State
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [newClientData, setNewClientData] = useState({ firstName: '', lastName: '', email: '', phone: '', vehicles: '', notes: '' });

    // Edit Client State
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [isUpdatingClient, setIsUpdatingClient] = useState(false);
    const [editClientData, setEditClientData] = useState(null);

    // Tag Manager State (saved on change)
    const [availableTags, setAvailableTags] = useState([]);
    const [clientTags, setClientTags] = useState([]);
    const [isSavingTags, setIsSavingTags] = useState(false);
    // Tag Library CRUD
    const [showTagManager, setShowTagManager] = useState(false);
    const [newTagData, setNewTagData] = useState({ name: '', color: '#6b7280', textColor: '#ffffff', description: '' });
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [editingTag, setEditingTag] = useState(null); // { _id, name, color, textColor, description }
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);

    // SMC Config and Print State
    const [showSMCConfig, setShowSMCConfig] = useState(false);
    const [smcConfig, setSmcConfig] = useState({
        cardName: 'Sandigan Membership Card',
        abbreviation: 'SMC',
        price: 500,
        discountPercentage: 10,
        validityMonths: 0,
        cardColor: '#0f172a'
    });
    const [isSavingSMC, setIsSavingSMC] = useState(false);
    const [showSMCPrint, setShowSMCPrint] = useState(false);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/crm`, { headers: authHeaders(), withCredentials: true });
            setCustomers(res.data);
        } catch (err) { console.error('Error fetching CRM data:', err); }
        finally { setIsLoading(false); }
    };

    const fetchTags = async () => {
        try {
            const res = await axios.get(`${API_BASE}/crm/tags/all`, { headers: authHeaders(), withCredentials: true });
            setAvailableTags(res.data);
        } catch (err) { console.error('Error fetching CRM tags:', err); }
    };

    const fetchSMCConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/finance/settings`, { headers: authHeaders(), withCredentials: true });
            const setting = res.data.find(s => s.key === 'smc_config');
            if (setting && setting.value) setSmcConfig(setting.value);
        } catch (err) { console.error('Error fetching SMC config:', err); }
    };

    useEffect(() => { fetchCustomers(); fetchTags(); fetchSMCConfig(); }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await axios.post(`${API_BASE}/crm/sync`, {}, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Data Synced Successfully!',
                text: res.data.message,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            fetchCustomers();
        } catch (err) { Swal.fire('Error', 'Failed to synchronize bookings.', 'error'); }
        finally { setIsSyncing(false); }
    };

    const handleOpen360 = async (client) => {
        setSelectedClient(client);
        setNotesText(client.notes || '');
        setClientTags(client.tags || []);  // seed base tags from DB
        setClientStats(null);
        try {
            const res = await axios.get(`${API_BASE}/crm/${client._id}`, { headers: authHeaders(), withCredentials: true });
            setClientStats(res.data);
        } catch (err) { console.error("Could not fetch client detailed stats", err); }
    };

    const handleOpenEdit = () => {
        setEditClientData({
            firstName: selectedClient.firstName,
            lastName: selectedClient.lastName,
            email: selectedClient.email,
            phone: selectedClient.phone || '',
            vehicles: (selectedClient.vehicles || []).join(', '),
            notes: selectedClient.notes || '',
        });
        setShowEditClientModal(true);
    };

    const handleUpdateClientSubmit = async (e) => {
        e.preventDefault();
        setIsUpdatingClient(true);
        try {
            const payload = {
                ...editClientData,
                vehicles: editClientData.vehicles ? editClientData.vehicles.split(',').map(v => v.trim()).filter(Boolean) : [],
            };
            const res = await axios.put(`${API_BASE}/crm/${selectedClient._id}`, payload, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Profile Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setSelectedClient(prev => ({ ...prev, ...res.data }));
            setShowEditClientModal(false);
            fetchCustomers();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update profile.', 'error');
        } finally {
            setIsUpdatingClient(false);
        }
    };

    const handleDeleteClient = async () => {
        const result = await Swal.fire({
            title: 'Delete Client Profile?',
            text: `This will permanently remove ${selectedClient.firstName} ${selectedClient.lastName} from the CRM. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete',
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/crm/${selectedClient._id}`, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setSelectedClient(null);
            fetchCustomers();
        } catch (err) {
            Swal.fire('Error', 'Failed to delete this client.', 'error');
        }
    };

    const handleToggleTag = (tag) => {
        setClientTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSaveTags = async () => {
        setIsSavingTags(true);
        try {
            await axios.put(`${API_BASE}/crm/${selectedClient._id}`, { tags: clientTags }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Tags Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setSelectedClient(prev => ({ ...prev, tags: clientTags }));
            fetchCustomers();
        } catch (err) {
            Swal.fire('Error', 'Failed to save tags.', 'error');
        } finally {
            setIsSavingTags(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await axios.put(`${API_BASE}/crm/${selectedClient._id}`, { notes: notesText }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Notes Added Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setSelectedClient(prev => ({ ...prev, notes: notesText }));
            fetchCustomers(); // refresh table
        } catch (err) {
            Swal.fire('Error', 'Failed to save notes.', 'error');
        } finally {
            setIsSavingNotes(false);
        }
    };

    // ── SMC Config & Issue ────────────────────────────────────────────
    const handleSaveSMCConfig = async (e) => {
        e.preventDefault();
        setIsSavingSMC(true);
        try {
            await axios.post(`${API_BASE}/finance/settings`, { key: 'smc_config', value: smcConfig }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'SMC Set!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setShowSMCConfig(false);
        } catch (err) {
            Swal.fire('Error', 'Failed to save SMC config.', 'error');
        } finally { setIsSavingSMC(false); }
    };

    const handleIssueSMC = async () => {
        const result = await Swal.fire({
            title: 'Issue Membership Card?',
            text: `This will assign a unique SMC to ${selectedClient.firstName} ${selectedClient.lastName}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'Yes, Issue Card'
        });
        if (!result.isConfirmed) return;
        try {
            const res = await axios.post(`${API_BASE}/crm/${selectedClient._id}/smc`, {}, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Card Issued!', text: `Card ID ${res.data.customer.smcId}`, icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setSelectedClient(prev => ({ ...prev, ...res.data.customer }));
            fetchCustomers();
            setShowSMCPrint(true);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to issue SMC.', 'error');
        }
    };

    const exportSMCAsPDF = async () => {
        const element = document.getElementById('smc-card-preview');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] }); // Standard CR80 Card Size
            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
            pdf.save(`SMC_${selectedClient.firstName}_${selectedClient.smcId}.pdf`);
        } catch (error) {
            Swal.fire('Export Error', 'Could not generate PDF', 'error');
        }
    };

    // ── Tag Library CRUD ──────────────────────────────────────────────
    const handleCreateTag = async (e) => {
        e.preventDefault();
        setIsCreatingTag(true);
        try {
            await axios.post(`${API_BASE}/crm/tags`, newTagData, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Tag Created!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setNewTagData({ name: '', color: '#6b7280', textColor: '#ffffff', description: '' });
            fetchTags();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create tag.', 'error');
        } finally { setIsCreatingTag(false); }
    };

    const handleUpdateTag = async (e) => {
        e.preventDefault();
        setIsUpdatingTag(true);
        try {
            await axios.put(`${API_BASE}/crm/tags/${editingTag._id}`, editingTag, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Tag Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setEditingTag(null);
            fetchTags();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update tag.', 'error');
        } finally { setIsUpdatingTag(false); }
    };

    const handleDeleteTag = async (tag) => {
        const result = await Swal.fire({
            title: `Delete "${tag.name}"?`,
            text: tag.isSystem ? 'System tags cannot be deleted.' : 'This tag will be removed from the library.',
            icon: tag.isSystem ? 'info' : 'warning',
            showCancelButton: !tag.isSystem,
            confirmButtonColor: tag.isSystem ? '#3b82f6' : '#ef4444',
            confirmButtonText: tag.isSystem ? 'OK' : 'Yes, Delete',
        });
        if (!result.isConfirmed || tag.isSystem) return;
        try {
            await axios.delete(`${API_BASE}/crm/tags/${tag._id}`, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Tag Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            fetchTags();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Could not delete tag.', 'error');
        }
    };

    const handleAddClientSubmit = async (e) => {
        e.preventDefault();
        setIsAddingClient(true);
        try {
            await axios.post(`${API_BASE}/crm`, newClientData, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Client Added Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setShowAddClientModal(false);
            setNewClientData({ firstName: '', lastName: '', email: '', phone: '', vehicles: '', notes: '' });
            fetchCustomers();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to add client.', 'error');
        } finally {
            setIsAddingClient(false);
        }
    };

    const totalClients = customers.length;
    const vipCount = customers.filter(c => c.activeTags?.includes('VIP')).length;
    const churnRiskCount = customers.filter(c => c.activeTags?.includes('Churn Risk')).length;
    const avgLtv = totalClients > 0 ? customers.reduce((sum, c) => sum + (c.lifetimeSpend || 0), 0) / totalClients : 0;
    const smcMembersCount = customers.filter(c => c.activeTags?.includes('SMC')).length;

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (filterTab === 'All') return true;
        if (filterTab === 'VIP') return c.activeTags?.includes('VIP');
        if (filterTab === 'SMC') return c.activeTags?.includes('SMC');
        if (filterTab === 'Churn Risk') return c.activeTags?.includes('Churn Risk');
        if (filterTab === 'New Arrivals') return c.activeTags?.includes('New Customer');
        return true;
    });

    if (isLoading) return <div className="p-0"><TableSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Client Relations (CRM)</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Track client loyalty, lifetime value, and retention</p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        onClick={handleSync}
                        className="btn btn-sm btn-outline-secondary px-3 rounded-pill d-flex align-items-center gap-2 shadow-sm"
                        disabled={isSyncing}
                    >
                        {isSyncing ? 'Syncing...' : '↻ Backfill from Bookings'}
                    </button>
                    <button
                        className="btn btn-sm btn-smc-card px-3 rounded-pill shadow-sm text-primary fw-bold"
                        onClick={() => setShowSMCConfig(true)}
                        title="Configure Membership Program (SMC) Pricing & Discounts"
                    >
                        <i className="bi bi-star-fill text-warning me-1"></i> Membership Config
                    </button>
                    <button
                        className="btn btn-sm btn-outline-secondary px-3 rounded-pill shadow-sm category-tags"
                        onClick={() => setShowTagManager(true)}
                        title="Manage segment tag library"
                    >
                        Tag Library
                    </button>
                    <button
                        className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3"
                        onClick={() => setShowAddClientModal(true)}
                    >
                        + Add Client manually
                    </button>
                </div>
            </div>

            {/* CRM KPI Cards */}
            <div className="row g-3 mb-4">
                {[
                    { title: "Total Client Base", value: totalClients.toLocaleString(), icon: "👥", color: "#3b82f6", bg: "linear-gradient(135deg,#3b82f615,#3b82f605)", dot: "#3b82f6", desc: "All tracked customers" },
                    { title: "Average LTV", value: `₱${avgLtv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: "📈", color: "#22c55e", bg: "linear-gradient(135deg,#22c55e15,#22c55e05)", dot: "#22c55e", desc: "Lifetime Value per client" },
                    { title: "VIP Members", value: vipCount.toLocaleString(), icon: "⭐", color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)", dot: "#f59e0b", desc: "Top 10% spenders" },
                    { title: "SMC Members", value: smcMembersCount.toLocaleString(), icon: "", color: "#f43f5e", bg: "linear-gradient(135deg,#f43f5e15,#f43f5e05)", dot: "#f43f5e", desc: "Active SMC Members" },
                ].map((card, idx) => (
                    <div className="col-6 col-md-3" key={idx}>
                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: '#fff' }}>
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                            <div className="p-3 position-relative">
                                <div className="position-absolute top-0 end-0 p-3">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                </div>
                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3 text-dark"
                                    style={{ width: '40px', height: '40px', background: card.bg, fontSize: '1.2rem' }}>
                                    {card.icon}
                                </div>
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>{card.title}</p>
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>{card.value}</h3>
                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Pills */}
            <div className="d-flex flex-wrap gap-2 mb-4">
                {['All', 'VIP', 'SMC', 'Churn Risk', 'New Arrivals'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`btn btn-sm px-4 rounded-pill ${filterTab === tab ? 'btn-primary shadow-sm text-white' : 'btn-light text-muted border'}`}
                        style={{ fontSize: '0.8rem', fontWeight: filterTab === tab ? '600' : '400' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Client Directory */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark-secondary">Customer Directory</h6>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-pill px-3 bg-light border-0 w-100"
                        placeholder="Search by name, email..."
                        style={{ maxWidth: '280px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead className="bg-light font-poppins text-muted small">
                                <tr>
                                    <th className="ps-4 py-3">Client Profile</th>
                                    <th>Total Spend</th>
                                    <th>Visits</th>
                                    <th>Segment Tags</th>
                                    <th className="pe-4 text-end">Last Visit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-5 text-center text-muted">
                                            No clients found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map(client => (
                                        <tr key={client._id} style={{ cursor: 'pointer' }} onClick={() => handleOpen360(client)} className="hover-shadow-sm">
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" style={{ width: 40, height: 40, background: 'var(--brand-dark)', fontSize: '0.9rem' }}>
                                                        {client.firstName.charAt(0).toUpperCase()}{client.lastName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.9rem' }}>{client.firstName} {client.lastName}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{client.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="fw-bold text-success">₱{client.lifetimeSpend.toLocaleString()}</span></td>
                                            <td className="text-dark-gray200">{client.totalVisits} record{client.totalVisits !== 1 ? 's' : ''}</td>
                                            <td>
                                                <div className="d-flex gap-1 flex-wrap">
                                                    {client.activeTags?.map(tagName => {
                                                        const tagDef = availableTags.find(t => t.name === tagName);
                                                        const badgeStyle = tagDef
                                                            ? { backgroundColor: tagDef.color, color: tagDef.textColor }
                                                            : { backgroundColor: '#f1f5f9', color: '#64748b' };

                                                        return (
                                                            <span key={tagName} className="badge rounded-pill border-0" style={{ ...badgeStyle, fontSize: '0.65rem' }}>
                                                                {tagName}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="pe-4 text-end text-muted" style={{ fontSize: '0.8rem' }}>
                                                {client.lastVisitDate ? new Date(client.lastVisitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Client 360 Slide-out Modal */}
            {selectedClient && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                            {/* Modal Header Profile */}
                            <div className="modal-header border-0 pb-4 pt-5 px-5 position-relative" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                <button type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-3" onClick={() => setSelectedClient(null)} />
                                <div className="d-flex align-items-center gap-4 w-100 text-white">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center brand-accent fw-bold shadow-lg" style={{ width: 80, height: 80, fontSize: '2rem', background: 'var(--brand-active)' }}>
                                        {selectedClient.firstName.charAt(0).toUpperCase()}{selectedClient.lastName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-grow-1">
                                        <h3 className="mb-1 fw-bold font-poppins">{selectedClient.firstName} {selectedClient.lastName}</h3>
                                        <p className="mb-2 text-light opacity-75 d-flex gap-3" style={{ fontSize: '0.85rem' }}>
                                            <span>Email: {selectedClient.email}</span>
                                            <span>Phone: {selectedClient.phone || 'N/A'}</span>
                                        </p>
                                        {/* Edit & Delete action row - Hidden for Walk-in profile */}
                                        {selectedClient.email !== 'walkin@example.com' && (
                                            <div className="d-flex gap-2">
                                                <button onClick={handleOpenEdit} className="btn border-0 bg-transparent px-3 d-flex justify-content-center align-items-center">
                                                    <img src={editIcon} style={{ width: '16px' }} alt="Edit Icon" /></button>
                                                <button onClick={handleDeleteClient} className="btn border-0 bg-transparent px-3 d-flex justify-content-center align-items-center">
                                                    <img src={deleteIcon} style={{ width: '16px' }} alt="Delete Icon" /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-end pe-2">
                                        <p className="mb-1 text-light opacity-75 small text-uppercase">Lifetime Value</p>
                                        <h3 className="mb-0 text-success fw-bold">₱{selectedClient.lifetimeSpend.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body p-0">
                                <div className="row g-0">
                                    {/* Left Column */}
                                    <div className="col-md-5 p-4 border-end bg-light" style={{ minHeight: '420px' }}>
                                        <h6 className="fw-bold text-dark-secondary mb-3">Quick Actions</h6>
                                        <div className="d-flex gap-2 mb-4">
                                            {selectedClient.email === 'walkin@example.com' ? (
                                                <>
                                                    <button disabled className="btn btn-sm btn-outline-secondary flex-fill rounded-3 opacity-50" style={{ cursor: 'not-allowed' }}>No Email</button>
                                                    <button disabled className="btn btn-sm btn-outline-secondary flex-fill rounded-3 opacity-50" style={{ cursor: 'not-allowed' }}>No Phone</button>
                                                </>
                                            ) : (
                                                <>
                                                    <a href={`mailto:${selectedClient.email}`} className="btn btn-save btn-sm flex-fill rounded-3 shadow-sm text-decoration-none">Send Email</a>
                                                    <a href={`tel:${selectedClient.phone}`} className="btn btn-call btn-sm flex-fill rounded-3 text-decoration-none">Call</a>
                                                </>
                                            )}
                                        </div>

                                        {/* SMC Membership Area */}
                                        <h6 className="fw-bold text-dark-secondary mb-2">Membership</h6>
                                        <div className="mb-4">
                                            {selectedClient.hasSMC ? (
                                                <div className="d-flex align-items-center gap-2 p-2 px-3 border rounded-3 bg-white" style={{ borderColor: '#22c55e', borderLeft: '4px solid #22c55e' }}>
                                                    <div className="flex-grow-1">
                                                        <div className="fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', color: '#d97706' }}>SMC Active</div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{selectedClient.smcId}</div>
                                                    </div>
                                                    {/* Disable Print for shared Walk-in profile cards as they are unique assets issued per transaction */}
                                                    {selectedClient.email !== 'walkin@example.com' && (
                                                        <button onClick={() => setShowSMCPrint(true)} className="btn btn-sm btn-outline-success px-3 py-1 rounded-3 fw-bold shadow-sm">
                                                            Print
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button onClick={handleIssueSMC} className="btn w-100 rounded-3 text-white shadow-sm d-flex justify-content-center align-items-center gap-2 border-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontSize: '0.85rem', fontWeight: 600, padding: '10px' }}>
                                                    Issue Membership Card
                                                </button>
                                            )}
                                        </div>

                                        {/* Tag Manager — DB driven */}
                                        <h6 className="fw-bold text-dark-secondary mb-2">Segment Tags</h6>
                                        <p className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>Click to toggle. Save when done.</p>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            {availableTags.map(tag => {
                                                const isActive = clientTags.includes(tag.name);
                                                return (
                                                    <button
                                                        key={tag._id}
                                                        onClick={() => handleToggleTag(tag.name)}
                                                        className="badge rounded-pill border-0"
                                                        style={{
                                                            fontSize: '0.72rem', cursor: 'pointer', padding: '6px 12px', fontWeight: 600,
                                                            background: isActive ? tag.color : '#f1f5f9',
                                                            color: isActive ? tag.textColor : '#64748b',
                                                            border: `1.5px solid ${isActive ? tag.color : '#e2e8f0'}`,
                                                            opacity: isActive ? 1 : 0.75,
                                                        }}
                                                        title={tag.description || ''}
                                                    >
                                                        {isActive ? '✓ ' : ''}{tag.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={handleSaveTags}
                                            className="btn btn-save btn-sm w-100 rounded-3 mb-4"
                                            disabled={isSavingTags || selectedClient.email === 'walkin@example.com'}
                                        >
                                            {isSavingTags ? 'Saving...' : 'Save Tags'}
                                        </button>


                                        <h6 className="fw-bold text-dark-secondary mb-2">Staff Notes</h6>
                                        <textarea
                                            className="form-control rounded-3 border-0 shadow-sm mb-3"
                                            rows="4"
                                            placeholder="Add instructions or preferences..."
                                            value={notesText}
                                            onChange={(e) => setNotesText(e.target.value)}
                                            style={{ fontSize: '0.85rem', resize: 'none' }}
                                        />
                                        <button
                                            onClick={handleSaveNotes}
                                            className="btn btn-save btn-success btn-sm w-100 rounded-3"
                                            disabled={isSavingNotes || notesText === selectedClient.notes || selectedClient.email === 'walkin@example.com'}
                                        >
                                            {isSavingNotes ? 'Saving...' : 'Save CRM Notes'}
                                        </button>

                                        {selectedClient.vehicles?.length > 0 && (
                                            <div className="mt-4">
                                                <h6 className="fw-bold text-dark-secondary mb-2">Known Vehicles</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {selectedClient.vehicles.map(v => (
                                                        <span key={v} className="badge bg-white text-dark border rounded-pill px-3 py-2 shadow-sm" style={{ fontSize: '0.75rem' }}>{v}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column (Transaction History) */}
                                    <div className="col-md-7 p-4 bg-white">
                                        <h6 className="fw-bold text-dark-secondary mb-3">Transaction Timeline</h6>
                                        {!clientStats ? (
                                            <div className="text-center p-4"><div className="spinner-border text-primary spinner-border-sm" /> Loading history...</div>
                                        ) : clientStats.history?.length === 0 ? (
                                            <p className="text-muted small">No past transactions found.</p>
                                        ) : (
                                            <div style={{ maxHeight: '680px', overflowY: 'auto' }} className="pe-2 custom-scrollbar">
                                                {clientStats.history.map((booking, idx) => (
                                                    <div key={booking._id} className="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom border-light">
                                                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center text-muted" style={{ width: 32, height: 32, flexShrink: 0, fontSize: '0.8rem' }}>
                                                            {clientStats.history.length - idx}
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between mb-1">
                                                                <span className="fw-bold text-dark-secondary" style={{ fontSize: '0.85rem' }}>{Array.isArray(booking.serviceType) ? booking.serviceType.join(', ') : booking.serviceType}</span>
                                                                <span className="fw-bold text-success" style={{ fontSize: '0.85rem' }}>₱{booking.totalPrice?.toLocaleString()}</span>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <small className="text-muted">{new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                                                                <div className="d-flex gap-1 align-items-center overflow-hidden" style={{ maxWidth: '60%' }}>
                                                                    {booking.purchasedProducts?.length > 0 && booking.purchasedProducts.map((p, pIdx) => (
                                                                        <span key={pIdx} className="badge bg-white text-dark-gray400 border rounded-pill px-2" style={{ fontSize: '0.6rem', fontWeight: 500 }}>
                                                                            {p.productName} x{p.quantity}
                                                                        </span>
                                                                    ))}
                                                                    <span className="badge bg-light text-dark rounded-pill ms-1" style={{ fontSize: '0.65rem' }}>{booking.vehicleType}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {showEditClientModal && editClientData && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <form onSubmit={handleUpdateClientSubmit}>
                                <div className="modal-header border-0 pb-0 pt-4 px-4">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark-secondary font-poppins mb-1">Edit Client Profile</h5>
                                        <p className="text-muted small mb-0">Update {selectedClient.firstName}'s CRM record.</p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowEditClientModal(false)} />
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">First Name</label>
                                            <input type="text" className="form-control rounded-3" required value={editClientData.firstName} onChange={e => setEditClientData({ ...editClientData, firstName: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Last Name</label>
                                            <input type="text" className="form-control rounded-3" required value={editClientData.lastName} onChange={e => setEditClientData({ ...editClientData, lastName: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Email Address</label>
                                            <input type="email" className="form-control rounded-3" required value={editClientData.email} onChange={e => setEditClientData({ ...editClientData, email: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="form-control rounded-3"
                                                required
                                                value={editClientData.phone}
                                                maxLength="11"
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                    setEditClientData({ ...editClientData, phone: val });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Vehicles (Comma-separated)</label>
                                        <input type="text" className="form-control rounded-3" value={editClientData.vehicles} onChange={e => setEditClientData({ ...editClientData, vehicles: e.target.value })} placeholder="e.g. Honda Civic, Toyota Fortuner" />
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label text-muted small fw-bold mb-1">CRM Notes</label>
                                        <textarea className="form-control rounded-3" rows="3" value={editClientData.notes} onChange={e => setEditClientData({ ...editClientData, notes: e.target.value })} style={{ resize: 'none' }} />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0 pb-4 justify-content-center">
                                    <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowEditClientModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save btn-primary px-4 rounded-3" disabled={isUpdatingClient}>
                                        {isUpdatingClient ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* SMC Config Modal */}
            {showSMCConfig && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <form onSubmit={handleSaveSMCConfig}>
                                <div className="modal-header border-0 pb-0 pt-4 px-4">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark-secondary font-poppins mb-1">SMC Configuration</h5>
                                        <p className="text-muted small mb-0">Set the default price and discount percentage.</p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowSMCConfig(false)} />
                                </div>
                                <div className="modal-body p-4 row g-3">
                                    <div className="col-md-9 mb-1">
                                        <label className="form-label text-muted small fw-bold mb-1">Card Program Name</label>
                                        <input type="text" className="form-control rounded-3 fw-bold" value={smcConfig.cardName || ''} onChange={e => setSmcConfig({ ...smcConfig, cardName: e.target.value })} required />
                                    </div>
                                    <div className="col-md-3 mb-1">
                                        <label className="form-label text-muted small fw-bold mb-1">Base Color</label>
                                        <div className="d-flex w-100 p-0 border rounded-3 overflow-hidden" style={{ height: '38px', borderColor: '#e2e8f0' }}>
                                            <input type="color" className="border-0 w-100 h-100 p-0 m-0" style={{ cursor: 'pointer' }} value={smcConfig.cardColor || '#0f172a'} onChange={e => setSmcConfig({ ...smcConfig, cardColor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="form-label text-muted small fw-bold mb-1">ID Abbreviation Prefix</label>
                                        <input type="text" className="form-control rounded-3 text-uppercase font-monospace" placeholder="e.g. VIP" value={smcConfig.abbreviation || ''} onChange={e => setSmcConfig({ ...smcConfig, abbreviation: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) })} required />
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Validity Period</label>
                                        <select className="form-select rounded-3 fw-semibold text-dark-secondary" value={smcConfig.validityMonths || 0} onChange={e => setSmcConfig({ ...smcConfig, validityMonths: Number(e.target.value) })}>
                                            <option value={0}>Lifetime / No Expiry</option>
                                            <option value={6}>6 Months</option>
                                            <option value={12}>1 Year</option>
                                            <option value={24}>2 Years</option>
                                            <option value={36}>3 Years</option>
                                            <option value={60}>5 Years</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Purchase Price</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted fw-bold">₱</span>
                                            <input type="number" className="form-control" value={smcConfig.price || 0} onChange={e => setSmcConfig({ ...smcConfig, price: Number(e.target.value) })} required min="0" />
                                        </div>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Global POS Discount</label>
                                        <div className="input-group">
                                            <input type="number" className="form-control" value={smcConfig.discountPercentage || 0} onChange={e => setSmcConfig({ ...smcConfig, discountPercentage: Number(e.target.value) })} required min="0" max="100" />
                                            <span className="input-group-text bg-light text-muted fw-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Renewal Price</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted fw-bold">₱</span>
                                            <input type="number" className="form-control" value={smcConfig.renewalPrice || 0} onChange={e => setSmcConfig({ ...smcConfig, renewalPrice: Number(e.target.value) })} required min="0" />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0 pb-4 justify-content-center">
                                    <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowSMCConfig(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save btn-primary px-4 rounded-3" disabled={isSavingSMC}>
                                        {isSavingSMC ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* SMC Print Modal — Now Dynamic & Branding Aware */}
            {showSMCPrint && selectedClient && (
                <div className="modal show d-block animate-fade-in no-print-backdrop" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1065 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden bg-white">
                            <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center no-print">
                                <h5 className="modal-title font-poppins fw-bold text-dark-secondary">Membership Card Preview</h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowSMCPrint(false)}></button>
                            </div>

                            <div className="modal-body py-4">
                                <div id="smc-card-preview" className="mx-auto position-relative" style={{
                                    width: '400px',
                                    height: '240px',
                                    borderRadius: '16px',
                                    background: `linear-gradient(135deg, ${smcConfig.cardColor || '#0f172a'} 0%, #1e3a8a 100%)`,
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
                                                <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px' }}>{smcConfig.cardName?.toUpperCase() || 'SANDIGAN'}</span>
                                            </div>
                                            <div className="text-end">
                                                <span className="badge bg-warning text-dark border-0 rounded-pill px-3" style={{ fontSize: '0.65rem', fontWeight: 800 }}>{smcConfig.abbreviation || 'SMC'} MEMBER</span>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-start">
                                            <h4 className="mb-0 fw-bold" style={{ fontSize: '1.4rem' }}>{selectedClient.firstName?.toUpperCase()} {selectedClient.lastName?.toUpperCase()}</h4>
                                            <p className="mb-0 opacity-75" style={{ fontSize: '0.7rem', fontWeight: 300, spacing: '2px' }}>MEMBERSHIP STATUS: ACTIVE</p>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-end mt-2">
                                            <div className="text-start">
                                                <p className="mb-0 font-monospace" style={{ fontSize: '1.1rem', letterSpacing: '3px' }}>{selectedClient.smcId}</p>
                                                <p className="mb-0 opacity-75 mt-1" style={{ fontSize: '0.65rem', fontWeight: 500 }}>
                                                    {selectedClient.smcExpiryDate ? `VALID UNTIL: ${new Date(selectedClient.smcExpiryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}` : 'LIFETIME ACCESS'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-1 rounded-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                                                <QRCodeCanvas value={`https://sandigan-carwash.com/validate/${selectedClient.smcId}`} size={54} level={"H"} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer border-top-0 p-4 pt-2 no-print flex-column gap-2">
                                <button className="btn btn-save w-100 rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={() => window.print()}>
                                    Print Membership Card
                                </button>
                                <button className="btn btn-outline-primary w-100 rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={exportSMCAsPDF}>
                                    Download for Customer
                                </button>
                                <button className="btn btn-light w-100 rounded-pill px-4 shadow-sm font-poppins" style={{ fontSize: '0.85rem' }} onClick={() => setShowSMCPrint(false)}>Close</button>
                            </div>

                            <style>
                                {`
                                @media print {
                                    body * { display: none !important; }
                                    .no-print-backdrop, #smc-card-preview, #smc-card-preview * {
                                        display: block !important;
                                        visibility: visible !important;
                                    }
                                    .no-print-backdrop {
                                        background: none !important;
                                        position: absolute !important;
                                        top: 0; left: 0;
                                    }
                                    #smc-card-preview {
                                        border-radius: 0 !important;
                                        box-shadow: none !important;
                                        margin: 20px auto !important;
                                    }
                                }
                                `}
                            </style>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {showAddClientModal && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <form onSubmit={handleAddClientSubmit}>
                                <div className="modal-header border-0 pb-0 pt-4 px-4">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark-secondary font-poppins mb-1">Add New Client</h5>
                                        <p className="text-muted small mb-0">Manually add a customer to your CRM database.</p>
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowAddClientModal(false)} />
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">First Name</label>
                                            <input type="text" className="form-control rounded-3" required value={newClientData.firstName} onChange={e => setNewClientData({ ...newClientData, firstName: e.target.value })} placeholder="Juan" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Last Name</label>
                                            <input type="text" className="form-control rounded-3" required value={newClientData.lastName} onChange={e => setNewClientData({ ...newClientData, lastName: e.target.value })} placeholder="Dela Cruz" />
                                        </div>
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Email Address</label>
                                            <input type="email" className="form-control rounded-3" required value={newClientData.email} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} placeholder="juan@example.com" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="form-control rounded-3"
                                                required
                                                value={newClientData.phone}
                                                maxLength="11"
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                    setNewClientData({ ...newClientData, phone: val });
                                                }}
                                                placeholder="0912..."
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Vehicles (Comma-separated)</label>
                                        <input type="text" className="form-control rounded-3" required value={newClientData.vehicles} onChange={e => setNewClientData({ ...newClientData, vehicles: e.target.value })} placeholder="e.g. Honda Civic, Toyota Fortuner" />
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label text-muted small fw-bold mb-1">Initial CRM Notes</label>
                                        <textarea className="form-control rounded-3" rows="3" value={newClientData.notes} onChange={e => setNewClientData({ ...newClientData, notes: e.target.value })} placeholder="Any special preferences?" style={{ resize: 'none' }} />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0 pb-4 justify-content-center">
                                    <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowAddClientModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save btn-primary px-4 rounded-3" disabled={isAddingClient}>
                                        {isAddingClient ? 'Saving...' : 'Save Client Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Tag Library Manager Modal */}
            {showTagManager && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                            <div className="modal-header border-0 py-4 px-4" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                <div className="text-white">
                                    <h5 className="modal-title fw-bold font-poppins mb-1">Tag Library Manager</h5>
                                    <p className="mb-0 opacity-75 small">Create and manage custom client segment tags</p>
                                </div>
                                <button type="button" className="btn-close btn-close-white" onClick={() => { setShowTagManager(false); setEditingTag(null); }} />
                            </div>
                            <div className="modal-body p-0">
                                <div className="row g-0">
                                    {/* Left — Create / Edit form */}
                                    <div className="col-md-5 p-4 border-end bg-light">
                                        <h6 className="fw-bold text-dark-secondary mb-3">{editingTag ? 'Edit Tag' : 'Create New Tag'}</h6>
                                        <form onSubmit={editingTag ? handleUpdateTag : handleCreateTag}>
                                            <div className="mb-3">
                                                <label className="form-label text-muted small fw-bold mb-1">Tag Name</label>
                                                <input type="text" className="form-control rounded-3" required placeholder="e.g. Loyalty Member"
                                                    value={editingTag ? editingTag.name : newTagData.name}
                                                    onChange={e => editingTag ? setEditingTag({ ...editingTag, name: e.target.value }) : setNewTagData({ ...newTagData, name: e.target.value })} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted small fw-bold mb-1">Description <span className="text-muted fw-normal">(optional)</span></label>
                                                <input type="text" className="form-control rounded-3" placeholder="e.g. Premium loyalty program members"
                                                    value={editingTag ? editingTag.description : newTagData.description}
                                                    onChange={e => editingTag ? setEditingTag({ ...editingTag, description: e.target.value }) : setNewTagData({ ...newTagData, description: e.target.value })} />
                                            </div>
                                            <div className="row g-3 mb-3">
                                                <div className="col-6">
                                                    <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                                    <input type="color" className="form-control form-control-color w-100 rounded-3 border-0" style={{ height: '38px' }}
                                                        value={editingTag ? editingTag.color : newTagData.color}
                                                        onChange={e => editingTag ? setEditingTag({ ...editingTag, color: e.target.value }) : setNewTagData({ ...newTagData, color: e.target.value })} />
                                                </div>
                                                <div className="col-6">
                                                    <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                                    <input type="color" className="form-control form-control-color w-100 rounded-3 border-0" style={{ height: '38px' }}
                                                        value={editingTag ? editingTag.textColor : newTagData.textColor}
                                                        onChange={e => editingTag ? setEditingTag({ ...editingTag, textColor: e.target.value }) : setNewTagData({ ...newTagData, textColor: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="form-label text-muted small fw-bold mb-1">Preview</label>
                                                <div className="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-center h-100">
                                                    <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: editingTag ? editingTag.color : newTagData.color, color: editingTag ? editingTag.textColor : newTagData.textColor, fontSize: '0.75rem' }}>
                                                        {(editingTag ? editingTag.name : newTagData.name) || 'Preview'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                {editingTag && (
                                                    <button type="button" className="btn btn-light btn-sm flex-fill rounded-3" onClick={() => setEditingTag(null)}>Cancel Edit</button>
                                                )}
                                                <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3" disabled={isCreatingTag || isUpdatingTag}>
                                                    {editingTag ? (isUpdatingTag ? 'Saving...' : 'Save Changes') : (isCreatingTag ? 'Creating...' : '+ Create Tag')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Right — Tag list */}
                                    <div className="col-md-7 p-4 bg-white" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                                        <h6 className="fw-bold text-dark-secondary mb-3">All Tags ({availableTags.length})</h6>
                                        {availableTags.map(tag => (
                                            <div key={tag._id} className="d-flex align-items-center justify-content-between py-2 px-3 mb-2 rounded-3 border bg-light">
                                                <div className="d-flex align-items-center gap-3">
                                                    <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: tag.color, color: tag.textColor, fontSize: '0.75rem' }}>{tag.name}</span>
                                                    <div>
                                                        <p className="mb-0 small text-muted" style={{ fontSize: '0.6rem' }}>{tag.description || '—'}</p>
                                                        {tag.isSystem && (
                                                            <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem', padding: '1px 8px', fontWeight: '400' }}>System</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-1">
                                                    <button onClick={() => setEditingTag({ _id: tag._id, name: tag.name, color: tag.color, textColor: tag.textColor, description: tag.description || '' })} className="btn btn-sm btn-outline-secondary rounded-2 px-2 py-1" style={{ fontSize: '0.72rem' }}>Edit</button>
                                                    <button onClick={() => handleDeleteTag(tag)} className={`btn btn-sm rounded-2 px-2 py-1 ${tag.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`} style={{ fontSize: '0.72rem' }} disabled={tag.isSystem}>
                                                        {tag.isSystem ? 'Protected' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
//    PROMOTIONS & VOUCHERS — CRM Marketing Module 
// ───────────────────────────────────────────── 
const PromotionsPage = () => {
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'smc-history' | 'promo-history'
    const [promos, setPromos] = useState([]);
    const [smcLogs, setSmcLogs] = useState([]);
    const [promoLogs, setPromoLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [promoCurrentPage, setPromoCurrentPage] = useState(1);
    const [smcCurrentPage, setSmcCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [promoForm, setPromoForm] = useState({
        code: '', description: '', discountType: 'Percentage', discountValue: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '', useType: 'Infinite', minSpend: 0, isActive: true,
        maxUsage: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [promoRes, smcRes, logRes] = await Promise.all([
                axios.get(`${API_BASE}/promotions/all`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/booking?smcOnly=true`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/booking?promoOnly=true`, { headers: authHeaders(), withCredentials: true })
            ]);
            setPromos(promoRes.data);
            setSmcLogs(smcRes.data);
            setPromoLogs(logRes.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Reset pagination when search or tab changes
    useEffect(() => {
        setPromoCurrentPage(1);
        setSmcCurrentPage(1);
    }, [searchTerm, activeTab]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingPromo) {
                await axios.patch(`${API_BASE}/promotions/update/${editingPromo._id}`, promoForm, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Promo Updated!', icon: 'success', toast: true, position: 'top-end', background: '#002525', color: '#FAFAFA', timer: 2000, showConfirmButton: false });
            } else {
                await axios.post(`${API_BASE}/promotions/create`, promoForm, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Promo Created!', icon: 'success', toast: true, position: 'top-end', background: '#002525', color: '#FAFAFA', timer: 2000, showConfirmButton: false });
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to save.', 'error');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: 'Delete this promo code?', icon: 'warning', showCancelButton: true });
        if (res.isConfirmed) {
            await axios.delete(`${API_BASE}/promotions/delete/${id}`, { headers: authHeaders(), withCredentials: true });
            fetchData();
        }
    };

    const filteredSMCHistory = smcLogs.filter(log =>
        `${log.firstName} ${log.lastName} ${log.serviceType} ${log.smcId} ${log.date}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.smcId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPromoHistory = promoLogs.filter(log =>
        `${log.firstName} ${log.lastName} ${log.serviceType} ${log.promoCode} ${log.date}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.promoCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic for Promo Usage
    const indexOfLastPromo = promoCurrentPage * itemsPerPage;
    const indexOfFirstPromo = indexOfLastPromo - itemsPerPage;
    const currentPromoItems = filteredPromoHistory.slice(indexOfFirstPromo, indexOfLastPromo);
    const totalPromoPages = Math.ceil(filteredPromoHistory.length / itemsPerPage);

    // Pagination Logic for SMC Usage
    const indexOfLastSMC = smcCurrentPage * itemsPerPage;
    const indexOfFirstSMC = indexOfLastSMC - itemsPerPage;
    const currentSMCItems = filteredSMCHistory.slice(indexOfFirstSMC, indexOfLastSMC);
    const totalSMCPages = Math.ceil(filteredSMCHistory.length / itemsPerPage);

    if (isLoading && promos.length === 0) return <TableSkeleton />;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Promotions & Vouchers</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Coupons, Discounts & Membership Records</p>
                </div>
                <button onClick={() => { setEditingPromo(null); setShowModal(true); }} className="btn btn-save rounded-3 text-white fw-bold shadow-sm">
                    + Create New Promo
                </button>
            </div>

            {/* Sub Nav */}
            <div className="d-flex gap-2 mb-4 border-bottom pb-3">
                {['manage', 'promo-history', 'smc-history'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`btn btn-sm px-4 rounded-pill ${activeTab === t ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'}`}
                        style={{ fontSize: '0.85rem', fontWeight: activeTab === t ? '600' : '500' }}
                    >
                        {t === 'manage' ? 'Coupons Library' : t === 'promo-history' ? 'Promo Usage' : 'SMC Usage'}
                    </button>
                ))}
            </div>

            {(activeTab === 'promo-history' || activeTab === 'smc-history') && (
                <div className="mb-4">
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-pill px-3 bg-white border shadow-sm w-100"
                        placeholder="Search by customer name or ID..."
                        style={{ maxWidth: '350px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {/* Content Tabs */}
            {activeTab === 'manage' && (
                <div className="row g-3">
                    {promos.length === 0 ? (
                        <div className="col-12 text-center p-5 text-muted">No active promotions.</div>
                    ) : (
                        promos.map(p => (
                            <div className="col-md-6 col-lg-4" key={p._id}>
                                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative">
                                    <div className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
                                                {p.code}
                                            </span>
                                            <div className="d-flex gap-2">
                                                <button onClick={() => { setEditingPromo(p); setPromoForm({ ...p, validFrom: p.validFrom.split('T')[0], validUntil: p.validUntil.split('T')[0], maxUsage: p.maxUsage || 0 }); setShowModal(true); }} className="btn btn-sm border-0 p-1">
                                                    <img src={editIcon} style={{ width: 14 }} alt="Edit" />
                                                </button>
                                                <button onClick={() => handleDelete(p._id)} className="btn btn-sm border-0 p-1">
                                                    <img src={deleteIcon} style={{ width: 14 }} alt="Delete" />
                                                </button>
                                            </div>
                                        </div>
                                        <h6 className="fw-bold text-dark-secondary mb-1">
                                            {p.discountType === 'Percentage' ? `${p.discountValue}% Off` : `₱${p.discountValue.toLocaleString()} Off`}
                                        </h6>
                                        <p className="text-muted small mb-3">{p.description || 'No description provided.'}</p>

                                        <div className="p-3 bg-light rounded-3">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="small text-muted">Usage:</span>
                                                <span className="small fw-bold">
                                                    {p.useType === 'Limited' ? (
                                                        <span className="text-primary">{p.usageCount} / {p.maxUsage} uses</span>
                                                    ) : (
                                                        `${p.useType} (${p.usageCount} times)`
                                                    )}
                                                </span>
                                            </div>
                                            {p.useType === 'Limited' && p.maxUsage > 0 && (
                                                <div className="progress mt-2 mb-1" style={{ height: '4px' }}>
                                                    <div
                                                        className={`progress-bar ${p.usageCount >= p.maxUsage ? 'bg-danger' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, (p.usageCount / p.maxUsage) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between">
                                                <span className="small text-muted">Min Spend:</span>
                                                <span className="small fw-bold">₱{p.minSpend || 0}</span>
                                            </div>
                                            <div className="mt-2 text-center">
                                                <small className={`badge rounded-pill ${new Date(p.validUntil) < new Date() ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                                                    Until {new Date(p.validUntil).toLocaleDateString()}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {(activeTab === 'promo-history' || activeTab === 'smc-history') && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ minHeight: '690px' }}>
                    <div className="table-responsive flex-grow-1">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead className="bg-light text-muted small">
                                <tr>
                                    <th className="ps-4 py-3">Customer</th>
                                    <th>Date</th>
                                    {activeTab === 'promo-history' ? <th>Promo Code</th> : <th>SMC ID</th>}
                                    <th>Service Type</th>
                                    <th className="pe-4 text-end">Discount Applied</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === 'promo-history' ? currentPromoItems : currentSMCItems).length === 0 ? (
                                    <tr><td colSpan="5" className="p-5 text-center text-muted">No usage records found.</td></tr>
                                ) : (
                                    (activeTab === 'promo-history' ? currentPromoItems : currentSMCItems).map(log => (
                                        <tr key={log._id}>
                                            <td className="ps-4 py-3">
                                                <div className="fw-bold text-dark-secondary">{log.firstName} {log.lastName}</div>
                                                <div className="text-muted small">{log.emailAddress}</div>
                                            </td>
                                            <td className="text-muted">{new Date(log.createdAt).toLocaleDateString()}</td>
                                            <td className="fw-bold text-dark-secondary">
                                                {activeTab === 'promo-history' ? log.promoCode : log.smcId}
                                            </td>
                                            <td className="small text-muted">
                                                {Array.isArray(log.serviceType) ? log.serviceType.join(', ') : log.serviceType}
                                            </td>
                                            <td className="pe-4 text-end fw-bold text-danger">
                                                -₱{(activeTab === 'promo-history' ? log.promoDiscount : log.discountAmount)?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {(activeTab === 'promo-history' ? filteredPromoHistory.length > 0 : filteredSMCHistory.length > 0) && (
                        <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center border-top">
                            <nav className="w-100 d-flex justify-content-between align-items-center">
                                <small className="text-muted font-poppins">
                                    {activeTab === 'promo-history' ? (
                                        `Showing ${indexOfFirstPromo + 1} to ${Math.min(indexOfLastPromo, filteredPromoHistory.length)} of ${filteredPromoHistory.length} entries`
                                    ) : (
                                        `Showing ${indexOfFirstSMC + 1} to ${Math.min(indexOfLastSMC, filteredSMCHistory.length)} of ${filteredSMCHistory.length} entries`
                                    )}
                                </small>
                                <ul className="pagination pagination-sm mb-0 gap-2">
                                    <li className={`page-item ${(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === 1 ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                            onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(prev => prev - 1) : setSmcCurrentPage(prev => prev - 1)}
                                            style={{ width: '32px', height: '32px' }}
                                        >
                                            <img src={leftArrowIcon} alt="Left Arrow" style={{ width: '10px', height: '10px' }} />
                                        </button>
                                    </li>

                                    {[...Array(activeTab === 'promo-history' ? totalPromoPages : totalSMCPages)].map((_, i) => {
                                        const pg = i + 1;
                                        const currentPg = activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage;
                                        const totalPg = activeTab === 'promo-history' ? totalPromoPages : totalSMCPages;

                                        if (totalPg > 5 && (pg > 1 && pg < totalPg && Math.abs(pg - currentPg) > 1)) {
                                            if (pg === 2 || pg === totalPg - 1) return <li key={pg} className="page-item disabled"><span className="border-0">...</span></li>;
                                            return null;
                                        }

                                        return (
                                            <li key={pg} className={`page-item ${currentPg === pg ? 'active' : ''}`}>
                                                <button
                                                    className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center ${currentPg === pg ? 'brand-primary text-white' : 'text-dark-secondary'}`}
                                                    onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(pg) : setSmcCurrentPage(pg)}
                                                    style={{ width: '32px', height: '32px', background: currentPg === pg ? '#23A0CE' : 'transparent', fontSize: '0.8rem' }}
                                                >
                                                    {pg}
                                                </button>
                                            </li>
                                        );
                                    })}

                                    <li className={`page-item ${(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === (activeTab === 'promo-history' ? totalPromoPages : totalSMCPages) ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                            onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(prev => prev + 1) : setSmcCurrentPage(prev => prev + 1)}
                                            style={{ width: '32px', height: '32px' }}
                                        >
                                            <img src={rightArrowIcon} alt="Right Arrow" style={{ width: '10px', height: '10px' }} />
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Promo Modal */}
            {showModal && (
                <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg">
                            <form onSubmit={handleSave}>
                                <div className="modal-header border-0 pt-4 px-4">
                                    <h5 className="modal-title fw-bold text-dark-secondary">{editingPromo ? 'Edit Promotion' : 'New Promotion'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                                </div>
                                <div className="modal-body p-4 pt-0">
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-7">
                                            <label className="form-label text-muted small fw-bold">Promo Code</label>
                                            <input type="text" className="form-control rounded-3 text-uppercase" required value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value })} placeholder="e.g. SUMMER24" />
                                        </div>
                                        <div className="col-md-5">
                                            <label className="form-label text-muted small fw-bold">Use Type</label>
                                            <select className="form-select rounded-3" value={promoForm.useType} onChange={e => setPromoForm({ ...promoForm, useType: e.target.value })}>
                                                <option value="Infinite">Infinite Use</option>
                                                <option value="One-Time">One-Time Per User</option>
                                                <option value="Limited">Limited Use</option>
                                            </select>
                                        </div>
                                    </div>
                                    {promoForm.useType === 'Limited' && (
                                        <div className="mb-3 animate-fade-in">
                                            <label className="form-label text-muted small fw-bold">Maximum Usage Cap</label>
                                            <input type="number" className="form-control rounded-3" required value={promoForm.maxUsage} onChange={e => setPromoForm({ ...promoForm, maxUsage: e.target.value })} placeholder="Limit total uses across all customers" />
                                            <div className="form-text mt-1" style={{ fontSize: '0.7rem' }}>Stop applying discount after this many total uses.</div>
                                        </div>
                                    )}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Discount Type</label>
                                            <select className="form-select rounded-3" value={promoForm.discountType} onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value })}>
                                                <option value="Percentage">Percentage (%)</option>
                                                <option value="Flat">Flat Amount (₱)</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted small fw-bold">Value</label>
                                            <input type="number" className="form-control rounded-3" required value={promoForm.discountValue} onChange={e => setPromoForm({ ...promoForm, discountValue: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">Valid Until</label>
                                        <input type="date" className="form-control rounded-3" required value={promoForm.validUntil} onChange={e => setPromoForm({ ...promoForm, validUntil: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">Min Spend (₱)</label>
                                        <input type="number" className="form-control rounded-3" value={promoForm.minSpend} onChange={e => setPromoForm({ ...promoForm, minSpend: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">Description</label>
                                        <textarea className="form-control rounded-3" rows="2" value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} placeholder="Marketing notes..." />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pb-4 px-4">
                                    <button type="button" className="btn btn-light rounded-3 px-4" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-save rounded-3 px-4 text-white" disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Promotion'}
                                    </button>
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
            case 'finance': return <FinancePage user={user} onNavigate={setToggleActive} />;
            case 'hris': return <HRISPage user={user} />;
            case 'inventory': return <InventoryPage user={user} />;
            case 'crm': return <CRMPage user={user} />;
            case 'promotions': return <PromotionsPage user={user} />;
            case 'operations': return <ModulePlaceholder title="Project & Operations Management" icon="⚙️" description="Manage tasks, workflows, and operational efficiency." />;
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

        // Calculate Top Performer for current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const detailerStats = {};
        bookings.forEach(b => {
            if (b.status !== 'Completed' || !b.assignedTo) return;
            const bDate = new Date(b.createdAt);
            if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                const did = typeof b.assignedTo === 'object' ? b.assignedTo._id : b.assignedTo;
                detailerStats[did] = (detailerStats[did] || 0) + 1;
            }
        });
        let topPerformerId = null;
        let maxBookings = 0;
        Object.keys(detailerStats).forEach(id => {
            if (detailerStats[id] > maxBookings) {
                maxBookings = detailerStats[id];
                topPerformerId = id;
            }
        });

        let topPerformerName = 'No Data';
        if (topPerformerId) {
            const emp = employees.find(e => e._id === topPerformerId);
            topPerformerName = emp?.fullName || 'Unknown';
            // Extract first name for brevity on dashboard widget if possible
            if (topPerformerName.includes(' ')) topPerformerName = topPerformerName.split(' ')[0];
        }

        return {
            todayRevenue,
            allTimeRevenue,
            totalBookings: bookings.length,
            activeStaff,
            topPerformerName,
            maxBookings
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
            icon: <img src={revenueIcon} alt="Revenue Icon" style={{ width: '24px' }} />,
            color: '#a855f7',
            dot: '#a855f7',
            bg: 'linear-gradient(135deg,#a855f715,#a855f705)',
        },
        {
            label: 'All-Time Revenue',
            value: `₱${metrics.allTimeRevenue.toLocaleString()}`,
            desc: "Total from all completed bookings",
            icon: <img src={allTimeRevenueIcon} alt="All Time Revenue Icon" style={{ width: '24px' }} />,
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
            label: 'Top Performer',
            value: metrics.topPerformerName,
            desc: metrics.maxBookings ? `${metrics.maxBookings} vehicles washed` : "Monthly highlight",
            icon: <img src={topPerformerIcon} alt="Top Performer Icon" style={{ width: '24px' }} />,
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
                            <ChartSkeleton />
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
                            <ChartSkeleton />
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
                            <ChartSkeleton />
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
                            <ChartSkeleton />
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
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

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
    const finalLogs = baseFiltered.filter(l =>
        l.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.actorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
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
                            className={`btn btn-sm ${activeModule === f.key ? 'btn-primary text-white border-0 shadow-sm' : 'btn-light border text-muted'}`}
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
                <div className="d-flex align-items-center shadow-none border rounded-3 overflow-hidden bg-white">
                    <span className="input-group-text bg-transparent border-0"><img src={searchIcon} alt="Search Icon" style={{ width: '16px' }} /></span>
                    <input
                        type="text"
                        className="form-control border-0 bg-transparent shadow-none font-poppins ps-0"
                        placeholder="Search log..."
                        style={{ fontSize: '0.8rem', width: '220px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="btn btn-link text-muted p-0 pe-2 border-0 shadow-none text-decoration-none"
                            onClick={() => setSearchTerm('')}
                            style={{ fontSize: '1rem' }}
                        >
                            &times;
                        </button>
                    )}
                </div>
            </div>

            {/* Log list */}
            <div className="rounded-4 shadow-sm overflow-hidden d-flex flex-column" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', minHeight: '745px' }}>
                {isLoading ? (
                    <div className="p-0"><TableSkeleton /></div>
                ) : finalLogs.length === 0 ? (
                    <div className="p-5 text-center text-muted font-poppins">No activity records found."<strong>{searchTerm}</strong>"</div>
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
                            <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center border-top ">
                                <small className="text-muted font-poppins">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, finalLogs.length)} of {finalLogs.length} entries
                                </small>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0 gap-2">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                style={{ width: '32px', height: '32px' }}
                                            >
                                                <img src={leftArrowIcon} alt="Left Arrow" style={{ width: '10px', height: '10px' }} />
                                            </button>
                                        </li>

                                        {/* Page Numbers */}
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pg = i + 1;
                                            if (totalPages > 5 && (pg > 1 && pg < totalPages && Math.abs(pg - currentPage) > 1)) {
                                                if (pg === 2 || pg === totalPages - 1) return <li key={pg} className="page-item disabled"><span className="border-0">...</span></li>;
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
                                                <img src={rightArrowIcon} alt="Right Arrow" style={{ width: '10px', height: '10px' }} />
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
    );
};

// ─────────────────────────────────────────────
// FINANCE & ACCOUNTING — Professional ERP Module 
// ───────────────────────────────────────────── 
const RevenueCategoryManager = ({ show, onClose, onUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [newCatData, setNewCatData] = useState({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
    const [editingCat, setEditingCat] = useState(null);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/revenue-categories`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data);
            if (onUpdate) onUpdate(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (show) fetchCategories(); }, [show]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/revenue-categories`, newCatData, { headers: authHeaders(), withCredentials: true });
            setNewCatData({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
            fetchCategories();
            Swal.fire({ title: 'Revenue Category Created!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/revenue-categories/${editingCat._id}`, editingCat, { headers: authHeaders(), withCredentials: true });
            setEditingCat(null);
            fetchCategories();
            Swal.fire({ title: 'Category Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleDelete = async (cat) => {
        if (cat.isSystem) return Swal.fire('Blocked', 'System categories cannot be deleted.', 'warning');
        const result = await Swal.fire({ title: `Delete "${cat.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4444' });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/revenue-categories/${cat._id}`, { headers: authHeaders(), withCredentials: true });
            if (editingCat?._id === cat._id) setEditingCat(null);
            fetchCategories();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    if (!show) return null;

    const currentForm = editingCat || newCatData;

    return (
        <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                    <div className="modal-header border-0 py-4 px-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d1b1b, #162c2c)' }}>
                        <div className="text-white">
                            <h5 className="modal-title fw-bold font-poppins mb-1 ">Revenue Tag Library</h5>
                            <p className="mb-0 opacity-75 small">Manage unified income groups for financial reporting</p>
                        </div>
                        <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose} />
                    </div>
                    <div className="modal-body p-0">
                        <div className="row g-0">
                            {/* Left: Create / Edit Form */}
                            <div className="col-md-5 p-4 border-end bg-light">
                                <h6 className="fw-bold text-dark-secondary mb-3">{editingCat ? 'Edit Tag' : 'Create New'}</h6>
                                <form onSubmit={editingCat ? handleUpdate : handleCreate}>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Tag Name</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light py-2" required placeholder="e.g. Retail Office"
                                            value={currentForm.name}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCatData({ ...newCatData, name: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Description (optional)</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light py-2" placeholder="e.g. Merchandise and items"
                                            value={currentForm.description}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, description: e.target.value }) : setNewCatData({ ...newCatData, description: e.target.value })} />
                                    </div>

                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                                value={currentForm.color}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCatData({ ...newCatData, color: e.target.value })} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                                value={currentForm.textColor}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, textColor: e.target.value }) : setNewCatData({ ...newCatData, textColor: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label text-muted small fw-bold mb-2">Preview</label>
                                        <div className="p-3 border rounded-3 bg-white text-center shadow-sm">
                                            <span className="badge rounded-pill px-4 py-2" style={{ background: currentForm.color, color: currentForm.textColor, fontSize: '0.85rem' }}>
                                                {currentForm.name || 'Preview'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-2">
                                        {editingCat && (
                                            <button type="button" className="btn btn-light btn-sm flex-fill rounded-3 py-2 fw-bold" onClick={() => setEditingCat(null)}>Cancel</button>
                                        )}
                                        <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3 py-2 fw-bold">
                                            {editingCat ? 'Save Changes' : '+ Create Tag'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Right: List of Tags */}
                            <div className="col-md-7 p-4 bg-white" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                                <h6 className="fw-bold text-dark-secondary mb-3">All Tags ({categories.length})</h6>

                                {categories.length === 0 ? (
                                    <div className="py-5 text-center text-muted small opacity-50">No Tags defined yet</div>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat._id} className="p-3 mb-3 rounded-4 border border-light bg-light shadow-none hover-shadow-sm transition-all animate-fade-in">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3 flex-fill overflow-hidden pe-2">
                                                    <span className="badge rounded-pill px-3 py-2 fw-bold flex-shrink-0" style={{ background: cat.color, color: cat.textColor, fontSize: '0.72rem' }}>{cat.name}</span>
                                                    <span className="text-muted small text-truncate" title={cat.description}>{cat.description || 'No description'}</span>
                                                </div>
                                                <div className="d-flex gap-1 flex-shrink-0">
                                                    <button type="button" onClick={() => setEditingCat(cat)} className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1 font-poppins" style={{ fontSize: '0.7rem' }}>Edit</button>
                                                    <button type="button" onClick={() => handleDelete(cat)} className={`btn btn-sm rounded-3 px-3 py-1 font-poppins ${cat.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`} style={{ fontSize: '0.7rem' }} disabled={cat.isSystem}>
                                                        {cat.isSystem ? 'Protected' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
// ====== BILL CATEGORY MANAGER ======
const BillCategoryManager = ({ show, onClose, onUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [newCatData, setNewCatData] = useState({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
    const [editingCat, setEditingCat] = useState(null);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/bill-categories`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data);
            if (onUpdate) onUpdate(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (show) fetchCategories(); }, [show]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/bill-categories`, newCatData, { headers: authHeaders(), withCredentials: true });
            setNewCatData({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
            fetchCategories();
            Swal.fire({ title: 'Bill Category Created!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/bill-categories/${editingCat._id}`, editingCat, { headers: authHeaders(), withCredentials: true });
            setEditingCat(null);
            fetchCategories();
            Swal.fire({ title: 'Category Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleDelete = async (cat) => {
        if (cat.isSystem) return Swal.fire('Blocked', 'System categories cannot be deleted.', 'warning');
        const result = await Swal.fire({ title: `Delete "${cat.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4444' });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/bill-categories/${cat._id}`, { headers: authHeaders(), withCredentials: true });
            if (editingCat?._id === cat._id) setEditingCat(null);
            fetchCategories();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    if (!show) return null;

    const currentForm = editingCat || newCatData;

    return (
        <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                    <div className="modal-header border-0 py-4 px-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d1b1b, #162c2c)' }}>
                        <div className="text-white">
                            <h5 className="modal-title fw-bold font-poppins mb-1 ">Bill Type Library</h5>
                            <p className="mb-0 opacity-75 small">Define scalable categories for recurring business costs</p>
                        </div>
                        <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose} />
                    </div>
                    <div className="modal-body p-0">
                        <div className="row g-0">
                            <div className="col-md-5 p-4 border-end bg-light">
                                <h6 className="fw-bold text-dark-secondary mb-3">{editingCat ? 'Edit Type' : 'Create New'}</h6>
                                <form onSubmit={editingCat ? handleUpdate : handleCreate}>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Type Name</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light py-2" required placeholder="e.g. Subscriptions"
                                            value={currentForm.name}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCatData({ ...newCatData, name: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Description (optional)</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light py-2" placeholder="e.g. Software and services"
                                            value={currentForm.description}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, description: e.target.value }) : setNewCatData({ ...newCatData, description: e.target.value })} />
                                    </div>
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                                value={currentForm.color}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCatData({ ...newCatData, color: e.target.value })} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0 shadow-sm p-1" style={{ height: '38px' }}
                                                value={currentForm.textColor}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, textColor: e.target.value }) : setNewCatData({ ...newCatData, textColor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label text-muted small fw-bold mb-2">Preview</label>
                                        <div className="p-3 border rounded-3 bg-white text-center shadow-sm">
                                            <span className="badge rounded-pill px-4 py-2" style={{ background: currentForm.color, color: currentForm.textColor, fontSize: '0.85rem' }}>
                                                {currentForm.name || 'Preview'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {editingCat && (
                                            <button type="button" className="btn btn-light btn-sm flex-fill rounded-3 py-2 fw-bold" onClick={() => setEditingCat(null)}>Cancel</button>
                                        )}
                                        <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3 py-2 fw-bold">
                                            {editingCat ? 'Save Changes' : '+ Create Type'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="col-md-7 p-4 bg-white" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                                <h6 className="fw-bold text-dark-secondary mb-3">All Bill Types ({categories.length})</h6>
                                {categories.length === 0 ? (
                                    <div className="py-5 text-center text-muted small opacity-50">No Types defined yet</div>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat._id} className="p-3 mb-3 rounded-4 border border-light bg-light shadow-none hover-shadow-sm transition-all animate-fade-in">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3 flex-fill overflow-hidden pe-2">
                                                    <span className="badge rounded-pill px-3 py-2 fw-bold flex-shrink-0" style={{ background: cat.color, color: cat.textColor, fontSize: '0.72rem' }}>{cat.name}</span>
                                                    <span className="text-muted small text-truncate" title={cat.description}>{cat.description || 'No description'}</span>
                                                </div>
                                                <div className="d-flex gap-1 flex-shrink-0">
                                                    <button type="button" onClick={() => setEditingCat(cat)} className="btn btn-sm btn-outline-secondary rounded-3 px-3 py-1 font-poppins" style={{ fontSize: '0.7rem' }}>Edit</button>
                                                    <button type="button" onClick={() => handleDelete(cat)} className={`btn btn-sm rounded-3 px-3 py-1 font-poppins ${cat.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`} style={{ fontSize: '0.7rem' }} disabled={cat.isSystem}>
                                                        {cat.isSystem ? 'Protected' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FinancePage = ({ user, onNavigate }) => {
    const [summary, setSummary] = useState({ totalRevenue: 0, totalCommissionOwed: 0, totalExpenses: 0, totalPayables: 0, netProfit: 0 });
    const [financePeriod, setFinancePeriod] = useState('all');
    const [expenses, setExpenses] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpLoading, setIsExpLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'revenues' | 'recurring' | 'settings'
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ title: '', category: 'Supplies', amount: '', description: '' });

    const [revenues, setRevenues] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isRevLoading, setIsRevLoading] = useState(false);

    const [commissionRate, setCommissionRate] = useState(0.30);
    const [isSavingRate, setIsSavingRate] = useState(false);

    // Finance Pagination
    const [revPage, setRevPage] = useState(1);
    const [expPage, setExpPage] = useState(1);
    const itemsPerPage = 10;



    const [recurringBills, setRecurringBills] = useState([]);
    const [pendingBills, setPendingBills] = useState([]);
    const [newBill, setNewBill] = useState({ name: '', amount: '', category: 'Utilities', frequency: 'Monthly' });
    const [isApplying, setIsApplying] = useState(false);
    const [showBillForm, setShowBillForm] = useState(false);

    // ERP Category Mapping
    const [erpMapping, setErpMapping] = useState([]);
    const [inventoryCats, setInventoryCats] = useState([]);
    const [revenueCats, setRevenueCats] = useState([]);
    const [billCategories, setBillCategories] = useState([]);
    const [showRevCategoryManager, setShowRevCategoryManager] = useState(false);
    const [showBillCategoryManager, setShowBillCategoryManager] = useState(false);
    const [isSavingMapping, setIsSavingMapping] = useState(false);

    // Revenue Pagination & Search State
    const [revSearchTerm, setRevSearchTerm] = useState('');
    const [revCurrentPage, setRevCurrentPage] = useState(1);
    const revItemsPerPage = 8;

    // Forecast State
    const [forecast, setForecast] = useState(null);

    // Budgeting State
    const [budgets, setBudgets] = useState([]);
    const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
    const [isBudgetLoading, setIsBudgetLoading] = useState(false);
    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [editingBudgetId, setEditingBudgetId] = useState(null);
    const [newBudget, setNewBudget] = useState({ category: 'Overall', allocatedAmount: '' });

    // General Ledger state
    const [ledger, setLedger] = useState([]);
    const [ledgerSummary, setLedgerSummary] = useState({ totalInflow: 0, totalOutflow: 0, netIncome: 0, entryCount: 0 });
    const [ledgerExpenseBreakdown, setLedgerExpenseBreakdown] = useState([]);
    const [ledgerRevenueBreakdown, setLedgerRevenueBreakdown] = useState([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('');  // '' | 'CREDIT' | 'DEBIT'
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [ledgerFrom, setLedgerFrom] = useState('');
    const [ledgerTo, setLedgerTo] = useState('');
    const [ledgerPage, setLedgerPage] = useState(1);
    const ledgerPerPage = 15;

    // Expense Pagination & Search State
    const [expSearchTerm, setExpSearchTerm] = useState('');
    const [expCurrentPage, setExpCurrentPage] = useState(1);
    const expItemsPerPage = 5;

    const filteredRevenues = useMemo(() => {
        if (!revSearchTerm.trim()) return revenues;
        const lowTerm = revSearchTerm.toLowerCase();
        return revenues.filter(rev => {
            const dateStr = (rev.date || rev.createdAt)
                ? new Date(rev.date || rev.createdAt).toLocaleDateString().toLowerCase()
                : "";

            return (
                (rev.title && rev.title.toLowerCase().includes(lowTerm)) ||
                (rev.category && rev.category.toLowerCase().includes(lowTerm)) ||
                (rev.referenceId && rev.referenceId.toLowerCase().includes(lowTerm)) ||
                (rev.notes && rev.notes.toLowerCase().includes(lowTerm)) ||
                (dateStr && dateStr.includes(lowTerm))
            );
        });
    }, [revenues, revSearchTerm]);

    const paginatedRevenues = useMemo(() => {
        const startIndex = (revCurrentPage - 1) * revItemsPerPage;
        return filteredRevenues.slice(startIndex, startIndex + revItemsPerPage);
    }, [filteredRevenues, revCurrentPage, revItemsPerPage]);

    const revTotalPages = Math.ceil(filteredRevenues.length / revItemsPerPage);

    // Reset page on search
    useEffect(() => {
        setRevCurrentPage(1);
    }, [revSearchTerm]);

    useEffect(() => {
        setExpCurrentPage(1);
    }, [expSearchTerm]);


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
            // Fetch non-critical settings first
            axios.get(`${API_BASE}/settings`, { headers: authHeaders(), withCredentials: true }).then(res => {
                const rateSetting = res.data.find(s => s.key === 'commission_rate');
                if (rateSetting) setCommissionRate(rateSetting.value);
                const mapSetting = res.data.find(s => s.key === 'erp_mapping');
                if (mapSetting && mapSetting.value?.mappings) setErpMapping(mapSetting.value.mappings);
            }).catch(err => console.warn("Failed to fetch settings:", err));

            // Fetch summary
            axios.get(`${API_BASE}/finance/summary?period=${financePeriod}`, { headers: authHeaders(), withCredentials: true })
                .then(res => setSummary(res.data))
                .catch(err => console.error("Summary fetch error:", err));

            // Fetch expenses
            axios.get(`${API_BASE}/finance/expenses`, { headers: authHeaders(), withCredentials: true })
                .then(res => setExpenses(res.data))
                .catch(err => console.error("Expenses fetch error:", err));

            // Fetch categories in parallel
            Promise.allSettled([
                axios.get(`${API_BASE}/inventory-categories`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/revenue-categories`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/bill-categories`, { headers: authHeaders(), withCredentials: true })
            ]).then(results => {
                if (results[0].status === 'fulfilled') setInventoryCats(results[0].value.data);
                if (results[1].status === 'fulfilled') setRevenueCats(results[1].value.data);
                if (results[2].status === 'fulfilled') setBillCategories(results[2].value.data);
            });

        } catch (err) { console.error('Generic finance fetch error:', err); }
        finally { setIsLoading(false); }
    };

    const fetchForecast = async () => {
        try {
            const res = await axios.get(`${API_BASE}/forecast`, { headers: authHeaders(), withCredentials: true });
            setForecast(res.data);
        } catch (err) { console.error('Error fetching forecast:', err); }
    };

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchFinanceData();
            fetchForecast();
        }
    }, [financePeriod, activeTab]);

    const fetchRevenues = async () => {
        setIsRevLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/revenue`, { headers: authHeaders(), withCredentials: true });
            setRevenues(res.data.revenues || []);
            setTotalRevenue(res.data.total || 0);
        } catch (err) { console.error('Error fetching revenues:', err); }
        finally { setIsRevLoading(false); }
    };

    const handleUpdateRate = async () => {
        setIsSavingRate(true);
        try {
            await axios.post(`${API_BASE}/settings/update`, { key: 'commission_rate', value: parseFloat(commissionRate) }, { headers: authHeaders(), withCredentials: true });
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

    const handleUpdateMapping = async () => {
        setIsSavingMapping(true);
        try {
            await axios.post(`${API_BASE}/settings/update`, {
                key: 'erp_mapping',
                value: { mappings: erpMapping },
                description: 'Inventory Category to Revenue Group mapping'
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                title: 'ERP Mappings Saved!',
                text: 'All retail sales will now follow these group rules.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
        } catch (err) {
            Swal.fire('Error', 'Failed to save mappings', 'error');
        } finally {
            setIsSavingMapping(false);
        }
    };

    const updateMappingItem = (invCat, revGroup) => {
        setErpMapping(prev => {
            const existing = prev.find(m => m.inventoryCategory === invCat);
            if (existing) {
                return prev.map(m => m.inventoryCategory === invCat ? { ...m, revenueGroup: revGroup } : m);
            } else {
                return [...prev, { inventoryCategory: invCat, revenueGroup: revGroup }];
            }
        });
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
        fetchRevenues();
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

    const fetchBudgets = async () => {
        setIsBudgetLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/budgets?month=${budgetMonth}`, { headers: authHeaders(), withCredentials: true });
            setBudgets(res.data);
        } catch (err) { console.error('Error fetching budgets:', err); }
        finally { setIsBudgetLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'budgets') {
            fetchBudgets();
        }
    }, [activeTab, budgetMonth]);

    useEffect(() => {
        if (activeTab === 'ledger') {
            fetchLedger();
        }
    }, [activeTab, ledgerTypeFilter, ledgerFrom, ledgerTo]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (activeTab === 'ledger') {
                fetchLedger();
            }
        }, 400);
        return () => clearTimeout(handler);
    }, [ledgerSearch]);

    const fetchLedger = async () => {
        setIsLedgerLoading(true);
        try {
            const params = new URLSearchParams();
            if (ledgerFrom) params.append('from', ledgerFrom);
            if (ledgerTo) params.append('to', ledgerTo);
            if (ledgerTypeFilter) params.append('type', ledgerTypeFilter);
            if (ledgerSearch.trim()) params.append('search', ledgerSearch.trim());
            const res = await axios.get(`${API_BASE}/ledger?${params.toString()}`, { headers: authHeaders(), withCredentials: true });
            setLedger(res.data.ledger || []);
            setLedgerSummary(res.data.summary || { totalInflow: 0, totalOutflow: 0, netIncome: 0, entryCount: 0 });
            setLedgerExpenseBreakdown(res.data.expenseBreakdown || []);
            setLedgerRevenueBreakdown(res.data.revenueBreakdown || []);
            setLedgerPage(1);
        } catch (err) { console.error('Error fetching ledger:', err); }
        finally { setIsLedgerLoading(false); }
    };

    const handleSaveBudget = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/budgets`, {
                month: budgetMonth,
                category: newBudget.category,
                allocatedAmount: newBudget.allocatedAmount
            }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: editingBudgetId ? 'Budget Updated!' : 'Budget Set!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setNewBudget({ category: 'Overall', allocatedAmount: '' });
            setShowBudgetForm(false);
            setEditingBudgetId(null);
            fetchBudgets();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed to save', 'error'); }
    };

    const handleEditBudget = (b) => {
        setNewBudget({ category: b.category, allocatedAmount: b.allocatedAmount });
        setEditingBudgetId(b._id);
        setShowBudgetForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteBudget = async (id) => {
        const result = await Swal.fire({ title: 'Remove budget limit?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            await axios.delete(`${API_BASE}/budgets/${id}`, { headers: authHeaders(), withCredentials: true });
            fetchBudgets();
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

    // Filtered expenses based on search term (Search by Name, Category, or Date)
    const filteredExpenses = useMemo(() => {
        if (!expSearchTerm.trim()) return expenses;
        const lowTerm = expSearchTerm.toLowerCase();
        return expenses.filter(exp => {
            const dateStr = exp.date ? new Date(exp.date).toLocaleDateString().toLowerCase() : '';
            return (
                (exp.title && exp.title.toLowerCase().includes(lowTerm)) ||
                (exp.category && exp.category.toLowerCase().includes(lowTerm)) ||
                dateStr.includes(lowTerm) ||
                (exp.description && exp.description.toLowerCase().includes(lowTerm))
            );
        });
    }, [expenses, expSearchTerm]);

    const paginatedExpenses = useMemo(() => {
        const startIndex = (expCurrentPage - 1) * expItemsPerPage;
        return filteredExpenses.slice(startIndex, startIndex + expItemsPerPage);
    }, [filteredExpenses, expCurrentPage, expItemsPerPage]);

    const expTotalPages = Math.ceil(filteredExpenses.length / expItemsPerPage);

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

    if (isLoading) return <div className="p-0"><TableSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Finance & Accounting</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Automated Receivables, Expenses, and Profit Tracking</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="btn-group bg-light p-1 rounded-3">
                        <button onClick={() => setActiveTab('overview')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'overview' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Overview</button>
                        <button onClick={() => setActiveTab('revenues')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'revenues' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Income & Receivables</button>
                        <button onClick={() => onNavigate('accounts-payable')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 text-muted`}>
                            Accounts Payable</button>
                        <button onClick={() => setActiveTab('recurring')} className={`btn btn-sm px-3 border-0 position-relative d-flex align-items-center gap-1 ${activeTab === 'recurring' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Recurring Bills
                            {pendingBills.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                    {pendingBills.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setActiveTab('budgets')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'budgets' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Budgets</button>
                        <button onClick={() => setActiveTab('ledger')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'ledger' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            General Ledger</button>
                        <button onClick={() => setActiveTab('settings')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'settings' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Settings</button>
                    </div>
                    {activeTab === 'overview' && (
                        <button onClick={() => setShowExpenseModal(true)} className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3">
                            + Record Expense
                        </button>
                    )}
                </div>
            </div>


            {/* ══════════════════════════════════════════════
                GENERAL LEDGER TAB
            ══════════════════════════════════════════════ */}
            {activeTab === 'ledger' && (
                <div className="animate-fade-in">

                    {/* ── P&L Summary KPI Row ── */}
                    <div className="row g-3 mb-4">
                        {[
                            { label: 'Total Inflow', value: ledgerSummary.totalInflow, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', icon: '↑', desc: 'All income recorded' },
                            { label: 'Total Outflow', value: ledgerSummary.totalOutflow, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '↓', desc: 'All expenses recorded' },
                            { label: 'Net Income', value: ledgerSummary.netIncome, color: ledgerSummary.netIncome >= 0 ? '#23A0CE' : '#f59e0b', bg: ledgerSummary.netIncome >= 0 ? 'rgba(35,160,206,0.08)' : 'rgba(245,158,11,0.08)', icon: '=', desc: 'Inflow minus Outflow' },
                            { label: 'Total Entries', value: ledgerSummary.entryCount, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: '#', desc: 'Transactions logged', isCount: true },
                        ].map(kpi => (
                            <div key={kpi.label} className="col-6 col-md-3">
                                <div className="card border-0 shadow-sm rounded-4 p-4 h-100" style={{ background: kpi.bg, border: `1px solid ${kpi.color}20` }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className="fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, background: kpi.color, color: '#fff', fontSize: '0.85rem' }}>{kpi.icon}</span>
                                        <span className="text-muted small fw-bold" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                                    </div>
                                    <h4 className="fw-bold mb-0" style={{ color: kpi.color }}>
                                        {kpi.isCount ? kpi.value.toLocaleString() : `₱${kpi.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </h4>
                                    <small className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>{kpi.desc}</small>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="row g-4">
                        {/* ── Left: Ledger Table ── */}
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                {/* Filters toolbar */}
                                <div className="card-header bg-white border-bottom py-3 px-4">
                                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                                        <div>
                                            <h6 className="mb-0 fw-bold text-dark-secondary">Transaction Ledger</h6>
                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Unified audit trail of all financial entries</small>
                                        </div>
                                        <div className="d-flex gap-2 flex-wrap align-items-center">
                                            {/* Type filter */}
                                            <div className="btn-group btn-group-sm bg-light rounded-pill p-1 shadow-none border">
                                                {[['', 'All'], ['CREDIT', 'Inflow'], ['DEBIT', 'Outflow']].map(([val, label]) => (
                                                    <button key={val} onClick={() => setLedgerTypeFilter(val)}
                                                        className={`btn btn-sm px-3 rounded-pill border-0 ${ledgerTypeFilter === val ? 'btn-save text-white shadow-sm' : 'text-muted'}`}
                                                        style={{ fontSize: '0.75rem' }}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Date range */}
                                            <div className="d-flex align-items-center gap-1">
                                                <input type="date" className="form-control form-control-sm rounded-3 border-light" style={{ width: 140, fontSize: '0.8rem' }}
                                                    value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} />
                                                <input type="date" className="form-control form-control-sm rounded-3 border-light" style={{ width: 140, fontSize: '0.8rem' }}
                                                    value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} />
                                                {(ledgerFrom || ledgerTo) && (
                                                    <button onClick={() => { setLedgerFrom(''); setLedgerTo(''); }} className="btn btn-sm text-danger p-1 border-0" title="Clear Dates">
                                                        <span className="bi bi-x-circle-fill">X</span>
                                                    </button>
                                                )}
                                            </div>
                                            {/* Search */}
                                            <input type="text" className="form-control form-control-sm rounded-pill border-light ps-3" style={{ width: 180, fontSize: '0.8rem' }}
                                                placeholder="Search entries..." value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Ledger Table */}
                                <div className="card-body p-0">
                                    {isLedgerLoading ? (
                                        <div className="p-0"><TableSkeleton /></div>
                                    ) : ledger.length === 0 ? (
                                        <div className="py-5 text-center text-muted">
                                            <p className="mb-0 fw-semibold">No ledger entries found.</p>
                                            <small>Try adjusting your date range or filters.</small>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                                    <thead className="bg-light text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                        <tr>
                                                            <th className="ps-4 py-3">Date</th>
                                                            <th>Description</th>
                                                            <th>Category</th>
                                                            <th>Source</th>
                                                            <th>Type</th>
                                                            <th className="pe-4 text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ledger.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage).map(entry => (
                                                            <tr key={entry._id}>
                                                                <td className="ps-4 text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                                    {new Date(entry.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </td>
                                                                <td>
                                                                    <div className="fw-semibold text-dark-secondary" style={{ maxWidth: 220 }} title={entry.title}>
                                                                        {entry.title}
                                                                    </div>
                                                                    {entry.notes && <small className="text-muted d-block text-truncate" style={{ maxWidth: 220, fontSize: '0.68rem' }}>{entry.notes}</small>}
                                                                </td>
                                                                <td>
                                                                    <span className="badge rounded-pill px-3 py-1" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600 }}>
                                                                        {entry.category}
                                                                    </span>
                                                                </td>
                                                                <td className="text-muted" style={{ fontSize: '0.78rem' }}>{entry.source}</td>
                                                                <td>
                                                                    <span className="badge rounded-pill px-3 py-1 fw-bold" style={{
                                                                        background: entry.type === 'CREDIT' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                                        color: entry.type === 'CREDIT' ? '#16a34a' : '#dc2626',
                                                                        fontSize: '0.68rem'
                                                                    }}>
                                                                        {entry.type === 'CREDIT' ? '↑ Inflow' : '↓ Outflow'}
                                                                    </span>
                                                                </td>
                                                                <td className={`pe-4 text-end fw-bold ${entry.type === 'CREDIT' ? 'text-success' : 'text-danger'}`}>
                                                                    {entry.type === 'CREDIT' ? '+' : '-'}₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Pagination */}
                                            {ledger.length > ledgerPerPage && (
                                                <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
                                                    <small className="text-muted font-poppins">
                                                        Showing {(ledgerPage - 1) * ledgerPerPage + 1}–{Math.min(ledgerPage * ledgerPerPage, ledger.length)} of {ledger.length} entries
                                                    </small>
                                                    <nav>
                                                        <ul className="pagination pagination-sm mb-0 gap-1">
                                                            <li className={`page-item ${ledgerPage === 1 ? 'disabled' : ''}`}>
                                                                <button className="page-link rounded-circle border-0 shadow-none" style={{ width: 32, height: 32 }} onClick={() => setLedgerPage(p => p - 1)}>‹</button>
                                                            </li>
                                                            {(() => {
                                                                const totalLedgerPages = Math.ceil(ledger.length / ledgerPerPage);
                                                                return [...Array(totalLedgerPages)].map((_, i) => {
                                                                    const pg = i + 1;
                                                                    if (totalLedgerPages > 5 && pg !== 1 && pg !== totalLedgerPages && Math.abs(pg - ledgerPage) > 1) {
                                                                        if (pg === 2 || pg === totalLedgerPages - 1) return <li key={pg} className="page-item disabled"><span className="border-0">…</span></li>;
                                                                        return null;
                                                                    }
                                                                    return (
                                                                        <li key={pg} className={`page-item ${ledgerPage === pg ? 'active' : ''}`}>
                                                                            <button className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                                                style={{ width: 32, height: 32, background: ledgerPage === pg ? '#23A0CE' : 'transparent', color: ledgerPage === pg ? '#fff' : 'inherit' }}
                                                                                onClick={() => setLedgerPage(pg)}>{pg}</button>
                                                                        </li>
                                                                    );
                                                                });
                                                            })()}
                                                            <li className={`page-item ${ledgerPage === Math.ceil(ledger.length / ledgerPerPage) ? 'disabled' : ''}`}>
                                                                <button className="page-link rounded-circle border-0 shadow-none" style={{ width: 32, height: 32 }} onClick={() => setLedgerPage(p => p + 1)}>›</button>
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

                        {/* ── Right Panel: P&L Breakdown ── */}
                        <div className="col-lg-4 d-flex flex-column gap-4">

                            {/* Revenue Breakdown */}
                            <div className="card border-0 shadow-sm rounded-4 p-4">
                                <h6 className="fw-bold text-dark-secondary mb-3">Revenue Breakdown</h6>
                                {ledgerRevenueBreakdown.length === 0 ? (
                                    <p className="text-muted small text-center py-3">No revenue data.</p>
                                ) : ledgerRevenueBreakdown.map(item => (
                                    <div key={item.category} className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small fw-semibold text-dark-secondary" style={{ fontSize: '0.78rem' }}>{item.category}</span>
                                            <span className="small text-success fw-bold" style={{ fontSize: '0.78rem' }}>₱{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="flex-grow-1 rounded-pill" style={{ height: 8, background: '#f1f5f9' }}>
                                                <div className="rounded-pill" style={{ width: `${item.pct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
                                            </div>
                                            <small className="text-muted fw-semibold" style={{ fontSize: '0.7rem', minWidth: 34 }}>{item.pct}%</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Expense Breakdown */}
                            <div className="card border-0 shadow-sm rounded-4 p-4">
                                <h6 className="fw-bold text-dark-secondary mb-3">Expense Distribution</h6>
                                {ledgerExpenseBreakdown.length === 0 ? (
                                    <p className="text-muted small text-center py-3">No expense data.</p>
                                ) : ledgerExpenseBreakdown.map(item => (
                                    <div key={item.category} className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small fw-semibold text-dark-secondary" style={{ fontSize: '0.78rem' }}>{item.category}</span>
                                            <span className="small text-danger fw-bold" style={{ fontSize: '0.78rem' }}>₱{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="flex-grow-1 rounded-pill" style={{ height: 8, background: '#f1f5f9' }}>
                                                <div className="rounded-pill" style={{ width: `${item.pct}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
                                            </div>
                                            <small className="text-muted fw-semibold" style={{ fontSize: '0.7rem', minWidth: 34 }}>{item.pct}%</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* P&L Mini Statement */}
                            <div className="card border-0 shadow-sm rounded-4 p-4" style={{ background: 'linear-gradient(135deg, #0d1b1b, #162c2c)' }}>
                                <h6 className="fw-bold text-white mb-3">Profit & Loss Statement</h6>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-light opacity-75 small">Total Revenue</span>
                                    <span className="text-success fw-bold small">+₱{ledgerSummary.totalInflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-light opacity-75 small">Total Expenses</span>
                                    <span className="text-danger fw-bold small">-₱{ledgerSummary.totalOutflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <hr style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                                <div className="d-flex justify-content-between">
                                    <span className="text-white fw-bold">Net Income</span>
                                    <span className={`fw-bold ${ledgerSummary.netIncome >= 0 ? 'text-success' : 'text-warning'}`}>
                                        {ledgerSummary.netIncome >= 0 ? '+' : ''}₱{ledgerSummary.netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        {/* Revenue Tag Manager Modal */}
                        <RevenueCategoryManager
                            show={showRevCategoryManager}
                            onClose={() => setShowRevCategoryManager(false)}
                            onUpdate={(cats) => { setRevenueCats(cats); fetchFinanceData(); }}
                        />
                    </div>
                    {/* ERP Mapping Section */}
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden col-md-7">
                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="mb-0 fw-bold text-dark-secondary">Revenue Category Mapping</h6>
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Map inventory items to specific accounting groups</small>
                            </div>
                            <button onClick={() => setShowRevCategoryManager(true)} className="btn btn-sm btn-outline-secondary category-tags rounded-pill px-3">
                                Tag Library
                            </button>
                        </div>
                        <div className="card-body p-4">
                            {inventoryCats.length === 0 ? (
                                <p className="text-muted small">No inventory categories found. Define them in Inventory first.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-borderless align-middle mb-3">
                                        <thead>
                                            <tr className="small text-muted font-poppins">
                                                <th>Inventory Category</th>
                                                <th>→ Revenue Group (Tag)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const combinedItems = [
                                                    ...inventoryCats.map(c => ({ _id: c._id, name: c.name, color: c.color, textColor: c.textColor, isSystem: false })),
                                                    { _id: 'sys-service', name: 'Service', color: '#6366f1', textColor: '#ffffff', isSystem: true },
                                                    { _id: 'sys-mixed', name: 'Mixed', color: '#8b5cf6', textColor: '#ffffff', isSystem: true }
                                                ];
                                                return combinedItems.map(cat => {
                                                    const current = erpMapping.find(m => m.inventoryCategory === cat.name)?.revenueGroup || '';
                                                    return (
                                                        <tr key={cat._id} className="align-middle">
                                                            <td className="ps-0 border-bottom py-3">
                                                                <span className="badge rounded-pill border px-3 py-1" style={{ background: cat.color, color: cat.textColor, fontSize: '0.7rem' }}>
                                                                    {cat.name} {cat.isSystem && <small className="opacity-75">(System)</small>}
                                                                </span>
                                                            </td>
                                                            <td className="pe-0 border-bottom py-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <select
                                                                        className="form-select form-select-sm rounded-3 shadow-none border-light flex-grow-1"
                                                                        value={current}
                                                                        onChange={(e) => updateMappingItem(cat.name, e.target.value)}
                                                                    >
                                                                        <option value="">-- Choose Account Tag --</option>
                                                                        {revenueCats.map(rev => (
                                                                            <option key={rev._id} value={rev.name}>{rev.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    {current && (
                                                                        <span className="badge rounded-pill px-2 py-1 shadow-sm" style={{
                                                                            background: revenueCats.find(c => c.name === current)?.color || '#e9ecef',
                                                                            color: revenueCats.find(c => c.name === current)?.textColor || '#6c757d',
                                                                            fontSize: '0.6rem'
                                                                        }}>
                                                                            preview
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                    <button
                                        onClick={handleUpdateMapping}
                                        disabled={isSavingMapping}
                                        className="btn btn-save btn-primary w-100 rounded-3 shadow-sm py-2 fw-bold"
                                    >
                                        {isSavingMapping ? 'Saving Mappings...' : 'Update Mapping Rules'}
                                    </button>
                                    <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.68rem', fontStyle: 'italic' }}>
                                        * Hint: Use the Tag Library button above to create accounting groups like "Food & Beverage", "Retail Store", or "Services".
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                                <div>
                                    <h5 className="fw-bold text-dark-secondary mb-1">Financial Performance</h5>
                                    <p className="text-muted small mb-0">Overview of your business health for the selected period</p>
                                </div>
                                <div className="btn-group shadow-sm bg-white p-1 rounded-pill border">
                                    {[
                                        { id: 'today', label: 'Today' },
                                        { id: 'week', label: 'Week' },
                                        { id: 'month', label: 'Month' },
                                        { id: 'year', label: 'Year' },
                                        { id: 'all', label: 'All' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setFinancePeriod(p.id)}
                                            className={`btn btn-sm px-4 rounded-pill border-0 transition-all ${financePeriod === p.id ? 'btn-save text-white shadow-sm' : 'text-muted'}`}
                                            style={{ fontSize: '0.75rem', fontWeight: financePeriod === p.id ? 700 : 500 }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="row g-3 mb-4">
                                {[
                                    { title: "Gross Revenue", value: summary.totalRevenue, icon: <img src={grossRevenueIcon} alt="Gross Revenue" style={{ width: '24px' }} />, color: "#a855f7", bg: "linear-gradient(135deg,#a855f715,#a855f705)", dot: "#a855f7", desc: "Total from completed bookings" },
                                    { title: "Staff Commissions", value: summary.totalCommissionOwed, icon: <img src={commisionIcon} alt="Staff Commissions" style={{ width: '24px' }} />, color: "#22c55e", bg: "linear-gradient(135deg,#22c55e15,#22c55e05)", dot: "#22c55e", desc: `${(commissionRate * 100).toFixed(0)}% detailer cut (owed)` },
                                    { title: "Operation Costs", value: summary.totalExpenses, icon: <img src={operationCostIcon} alt="Operation Costs" style={{ width: '24px' }} />, color: "#23A0CE", bg: "linear-gradient(135deg,#23A0CE15,#23A0CE05)", dot: "#23A0CE", desc: "Supplies, Rent, Utilities" },
                                    { title: "Total Payables", value: summary.totalPayables, icon: <img src={accountPayableIcon} alt="Total Payables" style={{ width: '24px' }} />, color: "#f43f5e", bg: "linear-gradient(135deg,#f43f5e15,#f43f5e05)", dot: "#f43f5e", desc: "Money owed to suppliers" },
                                    { title: "Net Profit", value: summary.netProfit, icon: <img src={netProfitIcon} alt="Net Profit" style={{ width: '24px' }} />, color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)", dot: "#f59e0b", desc: "Take-home after all costs" },
                                ].map((card, idx) => (
                                    <div className="col-12 col-sm-6 col-md" key={idx}>
                                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: '#fff' }}>
                                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                                            <div className="p-3 position-relative">
                                                <div className="position-absolute top-0 end-0 p-3">
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                                </div>
                                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                                    style={{ width: '40px', height: '40px', background: card.bg, color: card.color, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                    {card.icon}
                                                </div>
                                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                                    {card.title}
                                                </p>
                                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                                    ₱{card.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </h3>
                                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* --- FORECAST WIDGET --- */}
                            {forecast && financePeriod === 'month' && (
                                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 animate-fade-in" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                                                <span className="badge rounded-pill " style={{ background: '#23A0CE', color: '#002525', fontSize: '0.75rem' }}>AI Projection</span> End-of-Month Forecast
                                            </h5>
                                            <small className="text-light opacity-75">Based on rolling 30-day daily averages. {forecast.daysRemaining} days remaining in current month.</small>
                                        </div>
                                    </div>
                                    <div className="row g-4">
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <p className="text-light opacity-75 small mb-1">Projected Total Revenue</p>
                                                <h3 className="fw-bold text-white mb-1">₱{forecast.projectedEOM.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                                <small className="text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                                    Current (MTD): ₱{forecast.mtd.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </small>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <p className="text-light opacity-75 small mb-1">Projected Total Expenses</p>
                                                <h3 className="fw-bold text-white mb-1">₱{forecast.projectedEOM.expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                                <small className="text-danger fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                                    Current (MTD): ₱{forecast.mtd.expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </small>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                <p className="text-light opacity-75 small mb-1">Projected Net Profit</p>
                                                <h3 className="fw-bold text-warning mb-1">₱{forecast.projectedEOM.netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                                                <small className="text-light-gray100 opacity-75 fw-semibold d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                                    Averaging ₱{((forecast.dailyAverages.revenue || 0) - (forecast.dailyAverages.expense || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / day
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="row g-4">
                                <div className="col-lg-8">
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ minHeight: '600px' }}>
                                        <div className="card-header bg-white py-3 border-bottom">
                                            <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-0 fw-bold text-dark-secondary">Business Expenses</h6>
                                                    <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Log of all operational costs and supplies</p>
                                                </div>
                                                <div className="d-flex gap-2 align-items-center">
                                                    <div className="position-relative">
                                                        <img src={searchIcon} style={{ width: '14px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} alt="search" />
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm ps-5 rounded-pill border-light"
                                                            placeholder="Search expenses..."
                                                            style={{ width: '220px', fontSize: '0.8rem', background: '#f8fafc' }}
                                                            value={expSearchTerm}
                                                            onChange={(e) => setExpSearchTerm(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-body p-0 flex-grow-1 d-flex flex-column">
                                            <div className="table-responsive flex-grow-1">
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
                                                        {isExpLoading ? (
                                                            <tr><td colSpan="5"><div className="p-4"><TableSkeleton /></div></td></tr>
                                                        ) : paginatedExpenses.length === 0 ? (
                                                            <tr><td colSpan="5" className="p-5 text-center text-muted font-poppins">No expenses recorded yet.</td></tr>
                                                        ) : (
                                                            paginatedExpenses.map((exp) => (
                                                                <tr key={exp._id}>
                                                                    <td className="ps-4">
                                                                        <div className="fw-semibold text-dark-secondary">{exp.title}</div>
                                                                        {exp.ingredients && exp.ingredients.length > 0 && (
                                                                            <div className="d-flex flex-wrap gap-2 mt-1">
                                                                                {exp.ingredients.map((ing, i) => (
                                                                                    <span key={i} className="badge bg-light text-dark-gray100 border rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                                        {ing.inventoryItem?.name ?? '–'}: {ing.quantityUsed} {ing.inventoryItem?.unit}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
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
                                            {filteredExpenses.length > expItemsPerPage && (
                                                <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center mt-auto">
                                                    <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
                                                        Showing {(expCurrentPage - 1) * expItemsPerPage + 1} to {Math.min(expCurrentPage * expItemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} entries
                                                    </div>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <button
                                                            className="btn btn-sm p-0 rounded-circle border-0"
                                                            disabled={expCurrentPage === 1}
                                                            onClick={() => setExpCurrentPage(expCurrentPage - 1)}
                                                            style={{ width: '32px', height: '32px', background: expCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                        >
                                                            <img src={leftArrowIcon} style={{ width: '12px', opacity: expCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                                        </button>
                                                        {getPaginationRange(expCurrentPage, expTotalPages).map((p, idx) => (
                                                            p === '...' ? (
                                                                <span key={`dot-exp-${idx}`} className="px-2 text-muted">...</span>
                                                            ) : (
                                                                <button
                                                                    key={`page-exp-${p}`}
                                                                    onClick={() => setExpCurrentPage(p)}
                                                                    className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${expCurrentPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                                    style={{ width: '32px', height: '32px', fontSize: '0.8rem', background: expCurrentPage === p ? '#23A0CE' : 'transparent' }}
                                                                >
                                                                    {p}
                                                                </button>
                                                            )
                                                        ))}
                                                        <button
                                                            className="btn btn-sm p-0 rounded-circle border-0"
                                                            disabled={expCurrentPage === expTotalPages}
                                                            onClick={() => setExpCurrentPage(expCurrentPage + 1)}
                                                            style={{ width: '32px', height: '32px', background: expCurrentPage === expTotalPages ? '#f1f5f9' : 'transparent' }}
                                                        >
                                                            <img src={rightArrowIcon} style={{ width: '12px', opacity: expCurrentPage === expTotalPages ? 0.3 : 0.7 }} alt="next" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                    {activeTab === 'revenues' && (
                        <div className="animate-fade-in">
                            <div className="row g-4 mb-4">
                                <div className="col-md-4">
                                    <div className="card border-0 shadow-sm rounded-4 p-4 text-white" style={{ background: 'linear-gradient(135deg, #23A0CE, #0a58ca)' }}>
                                        <small className="text-white-50 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>Total Sales (This Period)</small>
                                        <h2 className="fw-bold mb-0 mt-1">₱{totalRevenue.toLocaleString()}</h2>
                                        <p className="mb-0 mt-2 text-white-50" style={{ fontSize: '0.75rem' }}>Auto-recorded from all finalized transactions</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap gap-3 justify-content-between align-items-center">
                                    <div>
                                        <h6 className="mb-0 fw-bold text-dark-secondary">Revenue & Receivables Recognition</h6>
                                        <small className="text-muted" style={{ fontSize: '0.72rem' }}>All finalized earnings from services and retail</small>
                                    </div>
                                    <div className="d-flex gap-2 align-items-center">
                                        <div className="position-relative">
                                            <img src={searchIcon} style={{ width: '14px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} alt="search" />
                                            <input
                                                type="text"
                                                className="form-control form-control-sm ps-5 rounded-pill border-light"
                                                placeholder="Search income records..."
                                                style={{ width: '250px', fontSize: '0.8rem', background: '#f8fafc' }}
                                                value={revSearchTerm}
                                                onChange={(e) => setRevSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-0 flex-grow-1 d-flex flex-column" style={{ minHeight: '521px' }}>
                                    {isRevLoading ? <div className="p-5 flex-grow-1"><ChartSkeleton /></div> : (
                                        <div className="table-responsive flex-grow-1">
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead className="bg-light text-dark-gray400 font-poppins">
                                                    <tr>
                                                        <th className="ps-4 py-3">Income Source / Title</th>
                                                        <th>Category</th>
                                                        <th>Reference</th>
                                                        <th>Date Recorded</th>
                                                        <th className="pe-4 text-end">Amount Realized</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedRevenues.length === 0 ? (
                                                        <tr><td colSpan="5" className="p-5 text-center text-muted font-poppins ">No income records found matching your search.</td></tr>
                                                    ) : (
                                                        paginatedRevenues.map((rev) => (
                                                            <tr key={rev._id}>
                                                                <td className="ps-4">
                                                                    <div className="fw-bold text-dark-secondary">{rev.title}</div>
                                                                    <small className="text-muted">{rev.notes || 'No description'}</small>
                                                                </td>
                                                                <td>
                                                                    {(() => {
                                                                        const tag = revenueCats.find(c => c.name.toLowerCase().trim() === rev.category?.toLowerCase().trim());
                                                                        return (
                                                                            <span className="badge rounded-pill px-3 py-1 fw-bold" style={{
                                                                                background: tag ? tag.color : '#e9ecef',
                                                                                color: tag ? tag.textColor : '#6c757d',
                                                                                fontSize: '0.68rem',
                                                                                border: tag ? 'none' : '1px solid #dee2e6'
                                                                            }}>
                                                                                {rev.category || '--'}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td><code style={{ fontSize: '0.75rem' }}>#{rev.referenceId || '--'}</code></td>
                                                                <td className="text-dark-gray200">{new Date(rev.date).toLocaleString('en-PH')}</td>
                                                                <td className="pe-4 text-end fw-bold brand-primary">+ ₱{rev.amount.toLocaleString()}</td>
                                                                <td className="pe-4 text-end">
                                                                    <button onClick={() => deleteRevenue(rev._id)} className="btn btn-sm text-danger-hover p-0 border-0 bg-transparent">
                                                                        <img src={deleteIcon} alt="Delete" style={{ width: '18px' }} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                {filteredRevenues.length > revItemsPerPage && (
                                    <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
                                        <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
                                            Showing {(revCurrentPage - 1) * revItemsPerPage + 1} to {Math.min(revCurrentPage * revItemsPerPage, filteredRevenues.length)} of {filteredRevenues.length} entries
                                        </div>
                                        <div className="d-flex align-items-center gap-1">
                                            <button
                                                className="btn btn-sm p-0 rounded-circle border-0"
                                                disabled={revCurrentPage === 1}
                                                onClick={() => setRevCurrentPage(revCurrentPage - 1)}
                                                style={{ width: '32px', height: '32px', background: revCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                            >
                                                <img src={leftArrowIcon} style={{ width: '12px', opacity: revCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                            </button>
                                            {getPaginationRange(revCurrentPage, revTotalPages).map((p, idx) => (
                                                p === '...' ? (
                                                    <span key={`dot-rev-${idx}`} className="px-2 text-muted">...</span>
                                                ) : (
                                                    <button
                                                        key={`page-rev-${p}`}
                                                        onClick={() => setRevCurrentPage(p)}
                                                        className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${revCurrentPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                        style={{ width: '32px', height: '32px', fontSize: '0.8rem', background: revCurrentPage === p ? '#23A0CE' : 'transparent' }}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            ))}
                                            <button
                                                className="btn btn-sm p-0 rounded-circle border-0"
                                                disabled={revCurrentPage === revTotalPages}
                                                onClick={() => setRevCurrentPage(revCurrentPage + 1)}
                                                style={{ width: '32px', height: '32px', background: revCurrentPage === revTotalPages ? '#f1f5f9' : 'transparent' }}
                                            >
                                                <img src={rightArrowIcon} style={{ width: '12px', opacity: revCurrentPage === revTotalPages ? 0.3 : 0.7 }} alt="next" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'budgets' && (
                        <div className="animate-fade-in">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center gap-2">
                                    <h5 className="fw-bold mb-0">Monthly Expense Budgets</h5>
                                    <input
                                        type="month"
                                        className="form-control form-control-sm rounded-3 shadow-none fw-bold text-muted"
                                        style={{ width: '150px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                        value={budgetMonth}
                                        onChange={(e) => setBudgetMonth(e.target.value)}
                                    />
                                </div>
                                <button onClick={() => setShowBudgetForm(!showBudgetForm)} className="btn btn-save btn-primary btn-sm rounded-pill px-3">+ Set Category Budget</button>
                            </div>

                            {showBudgetForm && (
                                <form onSubmit={handleSaveBudget} className="p-4 border rounded-4 bg-white shadow-sm mb-4 animate-fade-in" style={{ borderLeft: editingBudgetId ? '5px solid #23A0CE' : 'none' }}>
                                    <h6 className="fw-bold text-dark-secondary mb-3">{editingBudgetId ? 'Update Budget Limit' : 'Set New Budget Limit'}</h6>
                                    <div className="row g-3 align-items-end">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold text-muted mb-1">Expense Category</label>
                                            <select className="form-select rounded-3" value={newBudget.category} onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}>
                                                <option value="Overall">Total Business Expenses (Overall)</option>
                                                {billCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold text-muted mb-1">Target Limit Amount (₱)</label>
                                            <input type="number" className="form-control rounded-3" required placeholder="e.g. 5000" value={newBudget.allocatedAmount} onChange={e => setNewBudget({ ...newBudget, allocatedAmount: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 d-flex gap-2">
                                            <button type="submit" className="btn btn-save btn-primary rounded-3 flex-fill shadow-sm">{editingBudgetId ? 'Save Changes' : 'Apply Limit'}</button>
                                            <button type="button" className="btn btn-light rounded-3" onClick={() => { setShowBudgetForm(false); setEditingBudgetId(null); setNewBudget({ category: 'Overall', allocatedAmount: '' }); }}>Cancel</button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {isBudgetLoading ? (
                                <TableSkeleton />
                            ) : budgets.length === 0 ? (
                                <div className="p-5 text-center bg-white rounded-4 border shadow-sm">
                                    <h5 className="text-muted fw-bold font-poppins text-dark-secondary mt-2">No budgets set for {new Date(budgetMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h5>
                                    <p className="small text-muted mb-3">Keep your expenses in check by defining limits. Start by clicking the button above.</p>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {budgets.map(b => {
                                        let progressClass = "bg-success";
                                        let textClass = "text-success";
                                        const util = Number(b.utilizationPercentage);

                                        if (util >= 95) {
                                            progressClass = "bg-danger"; textClass = "text-danger";
                                        } else if (util >= 75) {
                                            progressClass = "bg-warning"; textClass = "text-warning";
                                        }

                                        const cat = billCategories.find(c => c.name === b.category);

                                        return (
                                            <div className="col-md-4 mb-2" key={b._id}>
                                                <div className="card shadow-sm rounded-4 p-4 h-100" style={{ border: util >= 100 ? '1px solid #fecdd3' : '1px solid #f1f5f9' }}>
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <span className="badge mb-2 rounded-pill px-3 py-2 fw-bold" style={{
                                                                background: b.category === 'Overall' ? '#e0e7ff' : (cat?.color || '#f1f5f9'),
                                                                color: b.category === 'Overall' ? '#4f46e5' : (cat?.textColor || '#475569')
                                                            }}>
                                                                {b.category === 'Overall' ? 'Total Business Budget' : b.category}
                                                            </span>
                                                            <h4 className="fw-bold mb-0 text-dark-secondary">₱{b.spentAmount.toLocaleString()}</h4>
                                                            <span className="text-muted fw-medium" style={{ fontSize: '0.85rem' }}>spent of ₱{b.allocatedAmount.toLocaleString()} Limit</span>
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            <button onClick={() => handleEditBudget(b)} className="btn btn-link text-primary p-0 border-0" title="Edit Limit">
                                                                <img src={editIcon} style={{ width: '18px' }} alt="edit" />
                                                            </button>
                                                            <button onClick={() => handleDeleteBudget(b._id)} className="btn btn-link text-danger p-0 border-0" title="Delete Limit">
                                                                <img src={deleteIcon} style={{ width: '18px' }} alt="delete" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex justify-content-between mb-1 mt-4">
                                                        <span className="text-muted small fw-bold">Utilization</span>
                                                        <span className={`small fw-bold ${textClass}`}>{b.utilizationPercentage}%</span>
                                                    </div>
                                                    <div className="progress rounded-pill shadow-none" style={{ height: '10px', background: '#f1f5f9' }}>
                                                        <div className={`progress-bar rounded-pill ${progressClass}`} role="progressbar" style={{ width: `${Math.min(util, 100)}%` }}></div>
                                                    </div>
                                                    {util >= 100 && <small className="text-danger mt-2 d-block fw-bold" style={{ fontSize: '0.75rem' }}>⚠️ Budget Exceeded</small>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'recurring' && (
                        <div className="animate-fade-in">
                            <div className="row g-4">
                                <div className="col-12">
                                    {pendingBills.length > 0 && (
                                        <div className="alert border-0 rounded-4 p-3 mb-3 d-flex justify-content-between align-items-center"
                                            style={{ background: '#fffbeb', border: '1px solid #fbbf24 !important', borderLeft: '5px solid #f59e0b' }}>
                                            <div>
                                                <p className="mb-0 fw-bold" style={{ fontSize: '0.85rem' }}>🔔 {pendingBills.length} Bill{pendingBills.length > 1 ? 's' : ''} Pending This Period</p>
                                                <small className="text-muted">{pendingBills.map(b => b.name).join(', ')}</small>
                                            </div>
                                            <button onClick={handleApplyPending} disabled={isApplying} className="btn btn-warning btn-sm px-3 rounded-pill fw-bold shadow-sm" style={{ whiteSpace: 'nowrap' }}>
                                                {isApplying ? 'Applying...' : 'Apply All Now'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-0 fw-bold text-dark-secondary">Recurring Bills</h6>
                                                <small className="text-muted" style={{ fontSize: '0.72rem' }}>Fixed monthly/weekly/yearly costs (Internet, Rent, Utilities)</small>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button onClick={() => setShowBillCategoryManager(true)} className="btn btn-sm btn-outline-secondary rounded-pill px-3">Types Library</button>
                                                <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-save btn-sm rounded-pill px-3">+ Add Bill</button>
                                            </div>
                                        </div>
                                        {showBillForm && (
                                            <form onSubmit={handleAddBill} className="p-3 border-bottom bg-light">
                                                <div className="row g-2 align-items-end">
                                                    <div className="col-md-3">
                                                        <label className="form-label small fw-bold text-muted mb-1">Bill Name</label>
                                                        <input type="text" className="form-control form-control-sm rounded-3" required placeholder="e.g. Electricity" value={newBill.name} onChange={e => setNewBill({ ...newBill, name: e.target.value })} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold text-muted mb-1">Amount (₱)</label>
                                                        <input type="number" className="form-control form-control-sm rounded-3" required placeholder="2000" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold text-muted mb-1">Type</label>
                                                        <select className="form-select form-select-sm rounded-3" value={newBill.category} onChange={e => setNewBill({ ...newBill, category: e.target.value })}>
                                                            {billCategories.length === 0 ? <option value="Utilities">Utilities</option> : billCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold text-muted mb-1">Frequency</label>
                                                        <select className="form-select form-select-sm rounded-3" value={newBill.frequency} onChange={e => setNewBill({ ...newBill, frequency: e.target.value })}>
                                                            <option value="Monthly">Monthly</option>
                                                            <option value="Weekly">Weekly</option>
                                                            <option value="Yearly">Yearly</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-md-3 d-flex gap-2">
                                                        <button type="submit" className="btn btn-save btn-primary btn-sm w-100 rounded-3">Save</button>
                                                        <button type="button" className="btn btn-danger btn-sm w-100 rounded-3" onClick={() => setShowBillForm(false)}>Cancel</button>
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
                                                                                {billCategories.length === 0 ? (
                                                                                    ['Utilities', 'Subscriptions', 'Other'].map(c => <option key={c} value={c}>{c}</option>)
                                                                                ) : (
                                                                                    billCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                        <div className="col-md-2">
                                                                            <select className="form-select form-select-sm rounded-3" value={editingBill.frequency} onChange={e => setEditingBill({ ...editingBill, frequency: e.target.value })}>
                                                                                <option value="Monthly">Monthly</option>
                                                                                <option value="Weekly">Weekly</option>
                                                                                <option value="Yearly">Yearly</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="col-md-2 d-flex gap-2">
                                                                            <button type="submit" className="btn brand-primary btn-save btn-sm rounded-3 flex-fill">Save</button>
                                                                            <button type="button" onClick={() => setEditingBill(null)} className="btn btn-danger btn-sm rounded-3 flex-fill">Cancel</button>
                                                                        </div>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <div>
                                                                        <p className="mb-0 fw-bold text-dark-secondary" style={{ fontSize: '0.9rem' }}>{bill.name}</p>
                                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                                            {(() => {
                                                                                const cat = billCategories.find(c => c.name === bill.category);
                                                                                return cat ? (
                                                                                    <span className="badge rounded-pill px-2 py-1" style={{ background: cat.color, color: cat.textColor, fontSize: '0.65rem' }}>
                                                                                        {bill.category}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="badge rounded-pill bg-light text-muted px-2 py-1 border" style={{ fontSize: '0.65rem' }}>
                                                                                        {bill.category}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>· {bill.frequency}</span>
                                                                        </div>
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
                                                                                <img src={editIcon} style={{ width: 18 }} alt="Edit" />
                                                                            </button>
                                                                            <button onClick={() => handleDeleteBill(bill._id)} className="btn btn-sm border-0 bg-transparent p-1">
                                                                                <img src={deleteIcon} style={{ width: 18 }} alt="Delete" />
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
                        </div>
                    )}
                </>
            )}

            <BillCategoryManager
                show={showBillCategoryManager}
                onClose={() => setShowBillCategoryManager(false)}
                onUpdate={(cats) => { setBillCategories(cats); fetchRecurringBills(); }}
            />

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
// ====== INVENTORY CATEGORY MANAGER ====== 
const InventoryCategoryManager = ({ show, onClose, onUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [newCatData, setNewCatData] = useState({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
    const [editingCat, setEditingCat] = useState(null);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/inventory-categories`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data);
            if (onUpdate) onUpdate(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (show) fetchCategories(); }, [show]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/inventory-categories`, newCatData, { headers: authHeaders(), withCredentials: true });
            setNewCatData({ name: '', color: '#23A0CE', textColor: '#ffffff', description: '' });
            fetchCategories();
            Swal.fire({ title: 'Category Created!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_BASE}/inventory-categories/${editingCat._id}`, editingCat, { headers: authHeaders(), withCredentials: true });
            setEditingCat(null);
            fetchCategories();
            Swal.fire({ title: 'Category Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    const handleDelete = async (cat) => {
        if (cat.isSystem) return Swal.fire('Blocked', 'System categories cannot be deleted.', 'warning');
        const result = await Swal.fire({ title: `Delete "${cat.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4444' });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/inventory-categories/${cat._id}`, { headers: authHeaders(), withCredentials: true });
            if (editingCat?._id === cat._id) setEditingCat(null);
            fetchCategories();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed', 'error'); }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                    <div className="modal-header border-0 py-4 px-4" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                        <div className="text-white">
                            <h5 className="modal-title fw-bold font-poppins mb-1 ">Category Library</h5>
                            <p className="mb-0 opacity-75 small">Manage unified categories for Warehouse and Catalog</p>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} />
                    </div>
                    <div className="modal-body p-0">
                        <div className="row g-0">
                            <div className="col-md-5 p-4 border-end bg-light">
                                <h6 className="fw-bold text-dark-secondary mb-3">{editingCat ? 'Edit Category' : 'Create New'}</h6>
                                <form onSubmit={editingCat ? handleUpdate : handleCreate}>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Category Name</label>
                                        <input type="text" className="form-control rounded-3" required
                                            value={editingCat ? editingCat.name : newCatData.name}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, name: e.target.value }) : setNewCatData({ ...newCatData, name: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold mb-1">Description <span className="text-muted fw-normal">(optional)</span></label>
                                        <input type="text" className="form-control rounded-3" placeholder="e.g. Chemicals & cleaning materials"
                                            value={editingCat ? editingCat.description : newCatData.description}
                                            onChange={e => editingCat ? setEditingCat({ ...editingCat, description: e.target.value }) : setNewCatData({ ...newCatData, description: e.target.value })} />
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Badge Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0" style={{ height: '38px' }}
                                                value={editingCat ? editingCat.color : newCatData.color}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, color: e.target.value }) : setNewCatData({ ...newCatData, color: e.target.value })} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label text-muted small fw-bold mb-1">Text Color</label>
                                            <input type="color" className="form-control form-control-color w-100 rounded-3 border-0" style={{ height: '38px' }}
                                                value={editingCat ? editingCat.textColor : newCatData.textColor}
                                                onChange={e => editingCat ? setEditingCat({ ...editingCat, textColor: e.target.value }) : setNewCatData({ ...newCatData, textColor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label text-muted small fw-bold mb-1">Preview</label>
                                        <div className="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-center h-100">
                                            <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: editingCat ? editingCat.color : newCatData.color, color: editingCat ? editingCat.textColor : newCatData.textColor, fontSize: '0.75rem' }}>
                                                {(editingCat ? editingCat.name : newCatData.name) || 'Preview'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {editingCat && (
                                            <button type="button" className="btn btn-light btn-sm flex-fill rounded-3" onClick={() => setEditingCat(null)}>Cancel Edit</button>
                                        )}
                                        <button type="submit" className="btn btn-save btn-primary btn-sm flex-fill rounded-3">
                                            {editingCat ? 'Save Changes' : '+ Create Category'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="col-md-7 p-4 bg-white" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                                <h6 className="fw-bold text-dark-secondary mb-3">All Categories ({categories.length})</h6>
                                {categories.map(cat => (
                                    <div key={cat._id} className="d-flex align-items-center justify-content-between py-2 px-3 mb-2 rounded-3 border bg-light">
                                        <div className="d-flex align-items-center gap-3">
                                            <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ background: cat.color, color: cat.textColor, fontSize: '0.75rem' }}>{cat.name}</span>
                                            <div>
                                                <p className="mb-0 small text-muted">{cat.description || '—'}</p>
                                                {cat.isSystem && <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem' }}>System</span>}
                                            </div>
                                        </div>
                                        <div className="d-flex gap-1">
                                            <button type="button" onClick={() => setEditingCat(cat)} className="btn btn-sm btn-outline-secondary rounded-2 px-2 py-1" style={{ fontSize: '0.72rem' }}>Edit</button>
                                            <button type="button" onClick={() => handleDelete(cat)} className={`btn btn-sm rounded-2 px-2 py-1 ${cat.isSystem ? 'btn-outline-secondary opacity-50' : 'btn-outline-danger'}`} style={{ fontSize: '0.72rem' }} disabled={cat.isSystem}>
                                                {cat.isSystem ? 'Protected' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventoryPage = ({ user }) => {
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', category: '', currentStock: '', unit: 'ml', reorderPoint: '', costPerUnit: '' });
    const [activeTab, setActiveTab] = useState('warehouse');
    const [editingItem, setEditingItem] = useState(null); // holds item being edited inline

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true });
            setItems(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true });
            setProducts(res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE}/inventory-categories`, { headers: authHeaders(), withCredentials: true });
            setCategories(res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchInventory(), fetchProducts(), fetchCategories()]);
        } catch (err) {
            console.error('Inventory Fetch Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            const itemToSave = { ...newItem, category: newItem.category || (categories.length > 0 ? categories[0].name : 'Uncategorized') };
            await axios.post(`${API_BASE}/inventory`, itemToSave, { headers: authHeaders(), withCredentials: true });
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
            setNewItem({ name: '', category: '', currentStock: '', unit: 'ml', reorderPoint: '', costPerUnit: '' });
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
            const finalCat = categories.some(cat => cat.name === editingItem.category) ? editingItem.category : (categories.length > 0 ? categories[0].name : 'Uncategorized');
            const itemToSave = { ...editingItem, category: finalCat };
            await axios.patch(`${API_BASE}/inventory/${editingItem._id}`, itemToSave, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Item Updated Successfully!',
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });
            setEditingItem(null);
            fetchInventory();
        } catch (err) { Swal.fire('Error', 'Could not update item.', 'error'); }
    };

    const lowStockItems = items.filter(i => i.currentStock <= i.reorderPoint);

    if (isLoading) return <div className="p-0"><TableSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header with High-End Navigation */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Inventory & Supply Chain</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Track Warehouse Stock levels and soap usage</p>
                </div>

                <div className="d-flex gap-3 align-items-center">
                    <button onClick={() => setShowCategoryManager(true)} className="btn btn-sm btn-outline-secondary px-3 rounded-pill shadow-sm category-tags">
                        <i className="bi bi-tags"></i> Tag Library
                    </button>

                    {/* Ghost Style Tabs (Right-Aligned) */}
                    <div className="d-flex gap-2 bg-light p-1 rounded-3">
                        <button
                            className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'warehouse' ? 'bg-white shadow-sm fw-bold' : 'text-muted'}`}
                            onClick={() => setActiveTab('warehouse')}
                            style={{ fontSize: '0.85rem' }}
                        >
                            <img src={stocksIcon} alt="" style={{ width: 14 }} />
                            Warehouse
                        </button>
                        <button
                            className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'catalog' ? 'bg-white shadow-sm fw-bold' : 'text-muted'}`}
                            onClick={() => setActiveTab('catalog')}
                            style={{ fontSize: '0.85rem' }}
                        >
                            <img src={inventoryIcon} alt="" style={{ width: 14, filter: 'grayscale(1)' }} />
                            Catalog
                        </button>
                        <button
                            className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'recipes' ? 'bg-white shadow-sm fw-bold' : 'text-muted'}`}
                            onClick={() => setActiveTab('recipes')}
                            style={{ fontSize: '0.85rem' }}
                        >
                            <img src={recipeIcon} alt="" style={{ width: 14 }} />
                            Recipes
                        </button>
                    </div>
                </div>
            </div>

            <InventoryCategoryManager show={showCategoryManager} onClose={() => setShowCategoryManager(false)} onUpdate={fetchCategories} />

            {activeTab === 'warehouse' ? (
                <>
                    {/* Low Stock Alerts */}
                    {lowStockItems.length > 0 && (
                        <div className="alert alert-warning border-0 rounded-4 shadow-sm mb-4 animate-fade-in">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-warning text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                                    ⚠️
                                </div>
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
                                                            <tr key={item._id} className="bg-light shadow-sm">
                                                                <td className="ps-4">
                                                                    <input type="text" className="form-control form-control-sm rounded-3 shadow-none border-primary" style={{ fontWeight: 600 }} required value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
                                                                </td>
                                                                <td>
                                                                    <select className="form-select form-select-sm rounded-3 shadow-none" value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}>
                                                                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                                        {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <div className="input-group input-group-sm">
                                                                        <input type="number" className="form-control shadow-none rounded-start-3" value={editingItem.currentStock} onChange={e => setEditingItem({ ...editingItem, currentStock: e.target.value })} />
                                                                        <span className="input-group-text bg-white text-muted" style={{ fontSize: '0.7rem' }}>{editingItem.unit}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="input-group input-group-sm">
                                                                        <span className="input-group-text bg-white px-1">₱</span>
                                                                        <input type="number" step="0.001" className="form-control shadow-none rounded-end-3" value={editingItem.costPerUnit} onChange={e => setEditingItem({ ...editingItem, costPerUnit: e.target.value })} />
                                                                    </div>
                                                                </td>
                                                                <td className="text-muted small">Editing...</td>
                                                                <td className="pe-4 text-end">
                                                                    <div className="d-flex gap-1 justify-content-end">
                                                                        <button onClick={handleSaveItemEdit} className="btn btn-save btn-sm px-3 rounded-pill fw-bold">Save</button>
                                                                        <button onClick={() => setEditingItem(null)} className="btn btn-danger btn-sm px-2 rounded-pill shadow-none">Cancel</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            <tr key={item._id}>
                                                                <td className="ps-4">
                                                                    <div className="fw-bold text-dark-secondary">{item.name}</div>
                                                                    <small className="text-muted small">{item.supplier || "Standard Supply"}</small>
                                                                </td>
                                                                <td>
                                                                    {(() => {
                                                                        const catMatch = categories.find(c => c.name === item.category) || { color: 'rgba(35,160,206,0.1)', textColor: '#23A0CE' };
                                                                        return (
                                                                            <span className="badge rounded-pill border px-2" style={{ background: catMatch.color, color: catMatch.textColor, fontSize: '0.7rem' }}>
                                                                                {item.category}
                                                                            </span>
                                                                        )
                                                                    })()}
                                                                </td>
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
            ) : activeTab === 'catalog' ? (
                <ProductCatalog onUpdate={fetchProducts} categories={categories} />
            ) : (
                <RecipeBuilder inventoryItems={items} products={products} onUpdate={fetchData} categories={categories} />
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
                                            <select className="form-select rounded-3" value={newItem.category || (categories.length > 0 ? categories[0].name : 'Uncategorized')} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
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
                                            <span className="input-group-text bg-light border-end-0 text-dark">₱</span>
                                            <input type="number" step="0.001" className="form-control rounded-3 border-start-0 text-dark-secondary" required value={newItem.costPerUnit} onChange={e => setNewItem({ ...newItem, costPerUnit: e.target.value })} placeholder="0.05" />
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

    if (isLoading) return <div className="p-0"><TableSkeleton /></div>;

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


/* ─────────────────────────────────────────────
   RECIPE BUILDER — Service → Ingredient Linker
───────────────────────────────────────────── */
const RecipeBuilder = ({ inventoryItems, products, onUpdate, categories = [] }) => {
    const [recipes, setRecipes] = useState([]);
    const [dynamicPricing, setDynamicPricing] = useState([]);
    const [category, setCategory] = useState('Service');
    const [serviceType, setServiceType] = useState('');
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
        } catch (err) { console.error('Error fetching recipe data:', err); }
    };

    useEffect(() => { fetchData(); }, []);

    const dynamicServiceTypes = useMemo(() => {
        if (category === 'Product') return products.map(p => p.name);
        const all = new Set();
        dynamicPricing.forEach(v => {
            v.services?.forEach(s => all.add(s.name));
            v.addons?.forEach(a => all.add(a.name));
        });
        return Array.from(all).sort();
    }, [dynamicPricing, category, products]);

    const dynamicVehicleTypes = useMemo(() => {
        if (category === 'Product') return ['N/A'];
        const all = new Set(dynamicPricing.map(p => p.vehicleType));
        return ['All', ...Array.from(all).sort()];
    }, [dynamicPricing, category]);

    const handleSaveRecipe = async (e) => {
        e.preventDefault();
        const validIngredients = ingredients.filter(i => i.inventoryItem && i.quantityUsed);
        setIsSaving(true);
        try {
            const payload = { category, serviceType, vehicleType, ingredients: validIngredients };
            if (editingId) await axios.patch(`${API_BASE}/service-recipes/${editingId}`, payload, { headers: authHeaders(), withCredentials: true });
            else await axios.post(`${API_BASE}/service-recipes`, payload, { headers: authHeaders(), withCredentials: true });
            setEditingId(null); setIngredients([{ inventoryItem: '', quantityUsed: '' }]); fetchData();
            if (onUpdate) onUpdate();
            Swal.fire({ title: 'Recipe Saved!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
        } catch (err) { Swal.fire('Error', 'Save failed', 'error'); }
        finally { setIsSaving(false); }
    };

    const handleDeleteRecipe = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Recipe?',
            text: 'This will remove the inventory link for this item.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/service-recipes/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchData();
                if (onUpdate) onUpdate();
                Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } catch (err) { console.error('Delete Recipe Error:', err); }
        }
    };

    return (
        <div className="row g-4 animate-fade-in">
            <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <form onSubmit={handleSaveRecipe}>
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="mb-0 fw-bold text-dark-secondary">{editingId ? 'Edit Recipe' : 'New Recipe'}</h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">Category</label>
                                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}><option value="Service">Service</option><option value="Product">Product</option></select>
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">Item Selection</label>
                                <select className="form-select" value={serviceType} onChange={e => setServiceType(e.target.value)} required><option value="">-- Choose --</option>{dynamicServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <p className="small fw-bold text-muted mb-2">Ingredients</p>
                            {ingredients.map((ing, i) => (
                                <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                                    <select className="form-select" value={ing.inventoryItem} onChange={e => { const copy = [...ingredients]; copy[i].inventoryItem = e.target.value; setIngredients(copy); }} required>
                                        <option value="">-- Chemical --</option>
                                        {inventoryItems.map(it => <option key={it._id} value={it._id}>{it.name}</option>)}
                                    </select>
                                    <input className="form-control" placeholder="Qty" value={ing.quantityUsed} onChange={e => { const copy = [...ingredients]; copy[i].quantityUsed = e.target.value; setIngredients(copy); }} style={{ width: 80 }} required />
                                    {ingredients.length > 1 && (
                                        <button type="button" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="btn btn-sm text-danger p-1 border-0 bg-transparent" title="Remove Ingredient">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setIngredients([...ingredients, { inventoryItem: '', quantityUsed: '' }])} className="btn btn-sm btn-link brand-primary text-decoration-none fw-bold" style={{ fontSize: '0.8rem' }}>+ Add Ingredient</button>
                        </div>
                        <div className="card-footer bg-white border-top d-flex gap-2 py-3">
                            {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setCategory('Service'); setVehicleType('All'); setServiceType(''); setIngredients([{ inventoryItem: '', quantityUsed: '' }]); }} className="btn btn-light w-50 rounded-3">Cancel</button>
                            )}
                            <button type="submit" className={`btn btn-save ${editingId ? 'w-50' : 'w-100'} rounded-3 shadow-sm`}>{editingId ? 'Update Recipe' : 'Save Recipe'}</button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-header bg-white py-3 border-bottom"><h6 className="mb-0 fw-bold text-dark-secondary">Active Rules</h6></div>
                    <div className="card-body p-0">
                        {recipes.length === 0 ? <p className="p-4 text-center text-muted">No recipes found.</p> : recipes.map(r => (
                            <div key={r._id} className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                <div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-light text-dark-gray300 border me-2 small uppercase" style={{ fontSize: '0.65rem' }}>{r.category}</span>
                                        <span className="fw-bold text-dark-secondary">{r.serviceType}</span>
                                        <span className="ms-2 badge rounded-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.65rem' }}>
                                            Supply Cost: ₱{r.ingredients.reduce((acc, ing) => acc + (ing.quantityUsed * (ing.inventoryItem?.costPerUnit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {r.ingredients.map((ing, idx) => {
                                            const itemCatMatch = categories.find(c => c.name === ing.inventoryItem?.category) || { color: '#f8f9fa', textColor: '#6c757d' };
                                            return (
                                                <span key={idx} className="badge rounded-pill border fw-normal" style={{ background: itemCatMatch.color, color: itemCatMatch.textColor, fontSize: '0.65rem' }}>
                                                    {ing.inventoryItem?.name || 'Item'}: {ing.quantityUsed}{ing.inventoryItem?.unit || ''}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="d-flex gap-1">
                                    <button onClick={() => {
                                        setEditingId(r._id);
                                        setCategory(r.category);
                                        setVehicleType(r.vehicleType || 'All');
                                        setServiceType(r.serviceType);
                                        setIngredients(r.ingredients.map(ing => ({ inventoryItem: ing.inventoryItem?._id || ing.inventoryItem, quantityUsed: ing.quantityUsed })));
                                    }} className="btn btn-sm border-0 p-1">
                                        <img src={editIcon} style={{ width: 14 }} alt="Edit" />
                                    </button>
                                    <button onClick={() => handleDeleteRecipe(r._id)} className="btn btn-sm border-0 p-1">
                                        <img src={deleteIcon} style={{ width: 14 }} alt="Delete" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   PRODUCT CATALOG (CRUD)
───────────────────────────────────────────── */
const ProductCatalog = ({ onUpdate, categories = [] }) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', basePrice: 0, description: '', category: '' });

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true });
            setProducts(res.data);
            if (onUpdate) onUpdate();
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            const finalCat = categories.some(cat => cat.name === newProduct.category) ? newProduct.category : (categories.length > 0 ? categories[0].name : 'Uncategorized');
            const prodToSave = { ...newProduct, category: finalCat };
            if (editingProduct) await axios.patch(`${API_BASE}/products/${editingProduct._id}`, prodToSave, { headers: authHeaders(), withCredentials: true });
            else await axios.post(`${API_BASE}/products`, prodToSave, { headers: authHeaders(), withCredentials: true });
            setShowModal(false); fetchProducts();
            Swal.fire({ title: 'Product Catalog Updated', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
        } catch (err) {
            Swal.fire('Error', err.response.data.error, 'error');
            setShowModal(false)
        }
    };

    const deleteProduct = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Product?',
            text: 'This will remove this item from the catalog.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/products/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchProducts();
                Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } catch (err) { console.error('Delete Product Error:', err); }
        }
    };

    if (isLoading) return <div className="p-5 text-center"><div className="spinner-border spinner-border-sm text-primary" /></div>;

    return (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark-secondary">Inventory Products</h6>
                <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="btn btn-save btn-sm px-4 rounded-pill shadow-sm">+ Add Product</button>
            </div>
            <div className="card-body p-0">
                <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light small text-muted">
                        <tr>
                            <th className="ps-4">Product</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Retail Price</th>
                            <th className="pe-4 text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p._id}>
                                <td className="ps-4">
                                    <div className="fw-bold text-dark-secondary">{p.name}</div>
                                </td>
                                <td>
                                    {(() => {
                                        const catMatch = categories.find(c => c.name === p.category) || { color: 'rgba(35,160,206,0.1)', textColor: '#23A0CE' };
                                        return (
                                            <span className="badge rounded-pill border px-2 fw-bold" style={{ background: catMatch.color, color: catMatch.textColor, fontSize: '0.7rem' }}>
                                                {p.category || 'General'}
                                            </span>
                                        )
                                    })()}
                                </td>
                                <td>
                                    <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                                        {p.description || "—"}
                                    </small>
                                </td>
                                <td className="fw-bold text-dark-secondary">₱{p.basePrice.toLocaleString()}</td>
                                <td className="pe-4 text-end">
                                    <div className="d-flex gap-2 justify-content-end">
                                        <button onClick={() => { setEditingProduct(p); setNewProduct({ name: p.name, basePrice: p.basePrice, category: p.category || '', description: p.description || '' }); setShowModal(true); }} className="btn btn-sm border-0 p-1">
                                            <img src={editIcon} style={{ width: 16 }} alt="Edit" />
                                        </button>
                                        <button onClick={() => deleteProduct(p._id)} className="btn btn-sm border-0 p-1">
                                            <img src={deleteIcon} style={{ width: 16 }} alt="Delete" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 rounded-4 shadow-lg"><form onSubmit={handleSaveProduct}><div className="modal-body p-4">
                    <h6 className="fw-bold mb-3 text-dark-secondary">Product Entry</h6>
                    <input className="form-control mb-3" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product Name" />
                    <div className="row g-2 mb-3">
                        <div className="col-md-6">
                            <select className="form-select" value={newProduct.category || (categories.length > 0 ? categories[0].name : 'Uncategorized')} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text bg-light text-dark">₱</span>
                                <input className="form-control" type="number" required value={newProduct.basePrice} onChange={e => setNewProduct({ ...newProduct, basePrice: Number(e.target.value) })} placeholder="Price" />
                            </div>
                        </div>
                    </div>
                    <textarea className="form-control mb-4" rows="2" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Brief description (optional)"></textarea>
                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-save w-100 rounded-3 shadow">Save Product</button>
                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-light w-100 rounded-3">Cancel</button>
                    </div>
                </div></form></div></div></div>
            )}
        </div>
    );
};

export default AdminDashboard;
