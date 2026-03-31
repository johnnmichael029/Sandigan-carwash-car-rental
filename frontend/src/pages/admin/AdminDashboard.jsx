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
import { API_BASE, authHeaders } from '../../api/config';
import { PageSkeleton, ChartSkeleton, TableSkeleton } from '../../components/SkeletonLoaders';
import { io } from 'socket.io-client';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

/* ─────────────────────────────────────────────
   TOP HEADER — Activity Log Bell (Admin Only)
───────────────────────────────────────────── */
const ACTION_META = {
    booking_created: { icon: bookingsIcon, color: '#23A0CE' },
    booking_status_changed: { icon: updateIcon, color: '#f59e0b' },
    booking_updated: { icon: editIcon, color: '#a855f7' },
    booking_deleted: { icon: deleteIcon, color: '#f43f5e' },
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
const ERP_ITEMS = ['finance', 'hris', 'inventory', 'crm', 'promotions', 'operations'];
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
    const [hrTab, setHrTab] = useState('directory'); // 'directory' | 'payroll' | 'analytics' | 'attendance'
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Attendance state
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

    // Directory modal state
    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null); // null = new
    const [empForm, setEmpForm] = useState({ fullName: '', email: '', password: '', role: 'employee', age: '', address: '', phone: '', baseSalary: '', salaryFrequency: 'Monthly', status: 'Active' });
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Payroll state
    const [payrollPeriod, setPayrollPeriod] = useState('month');
    const [payrollData, setPayrollData] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [isPayrollLoading, setIsPayrollLoading] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(null); // detailerId being processed

    // Performance History state
    const [showHistory, setShowHistory] = useState(false);
    const [historyEmp, setHistoryEmp] = useState(null);
    const [historyData, setHistoryData] = useState({ summary: {}, history: [] });
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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

            const histRes = await axios.get(`${API_BASE}/payroll/history`, { headers: authHeaders(), withCredentials: true });
            setPayoutHistory(histRes.data || []);
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

    const fetchEmployeeHistory = async (emp) => {
        setIsHistoryLoading(true);
        setHistoryEmp(emp);
        setShowHistory(true);
        try {
            // Using the booking API base
            const res = await axios.get(`${API_BASE}/booking/employee-history/${emp._id}`, { headers: authHeaders(), withCredentials: true });
            setHistoryData(res.data);
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
    useEffect(() => { if (hrTab === 'attendance') fetchAttendance(); }, [hrTab]);

    const openAdd = () => {
        setEditingEmp(null);
        setEmpForm({ fullName: '', email: '', password: '', role: 'employee', age: '', address: '', phone: '', baseSalary: '', salaryFrequency: 'Monthly', status: 'Active' });
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
            status: emp.status || 'Active'
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...empForm };
            if (payload.role === 'detailer') {
                delete payload.email;
                delete payload.password;
            } else {
                if (!payload.email) return Swal.fire('Error', 'Email is required for system access.', 'error');
                if (!editingEmp && !payload.password) return Swal.fire('Error', 'Password is required for new accounts.', 'error');
                if (payload.password.length < 8) return Swal.fire('Error', 'Password must be at least 8 characters.', 'error');
            }

            // Remove email property if we are not actively updating it
            if (!payload.email) delete payload.email;

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

    const handlePaySalary = async (employeeId, employeeName) => {
        setIsMarkingPaid(employeeId);
        try {
            const res = await axios.post(`${API_BASE}/payroll/pay-salary`, { employeeId }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: `Paid ${employeeName}`,
                html: `<p style="color:#9ca3af">Logged Salary Payment.<br>Amount: <b style="color:#22c55e">₱${res.data.amount.toLocaleString()}</b></p>`,
                icon: 'success',
                confirmButtonColor: '#23A0CE',
                background: '#0d1b1b',
                color: '#FAFAFA'
            });
            fetchPayroll(); // Refresh history
            fetchEmployees(); // Refresh lastPaidDate
        } catch (err) {
            Swal.fire('Notice', err.response?.data?.error || 'Failed to pay salary.', 'info');
        } finally { setIsMarkingPaid(null); }
    };

    const downloadPayoutReceipt = (hist) => {
        const doc = new jsPDF();
        const date = new Date(hist.createdAt).toLocaleDateString();
        const time = new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const recipientName = hist.detailer?.fullName || hist.employee?.fullName || 'Staff Member';
        const adminName = hist.paidBy?.fullName || 'System';

        // --- Header Design ---
        doc.setFillColor(35, 160, 206); // Brand Primary
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("SALARY PAYOUT RECEIPT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Sandigan Carwash & Car Rental", 105, 30, { align: "center" });

        // --- Content ---
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.text(`Reference No: ${hist._id.slice(-8).toUpperCase()}`, 20, 55);
        doc.text(`Date & Time: ${date} ${time}`, 20, 62);

        // --- Subject Block ---
        doc.setFillColor(245, 245, 250);
        doc.rect(20, 70, 170, 35, 'F');

        doc.setFont("helvetica", "bold");
        doc.text("RECIPIENT INFORMATION", 25, 78);
        doc.setFont("helvetica", "normal");
        doc.text(`Name: ${recipientName}`, 25, 85);
        doc.text(`Payout Type: ${hist.period || 'Fixed Salary'}`, 25, 92);
        doc.text(`Account Role: ${hist.detailer?.role || 'Staff'}`, 25, 99);

        // --- Payment Details ---
        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT INFORMATION", 25, 120);
        doc.line(20, 123, 190, 123);

        doc.setFont("helvetica", "normal");
        if (hist.itemsCount > 0) {
            doc.text(`Bookings Handled: ${hist.itemsCount} Cars`, 25, 130);
        } else {
            doc.text(`Transaction Type: Staff Fixed Salary`, 25, 130);
        }
        doc.text(`Payment Authorized By: ${adminName}`, 25, 137);

        // --- Total ---
        doc.setFillColor(235, 248, 243);
        doc.rect(20, 145, 170, 18, 'F');
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL AMOUNT PAID:", 25, 157);
        doc.setTextColor(34, 197, 94); // Green
        doc.text(`PHP ${hist.amount.toLocaleString()}`, 185, 157, { align: "right" });

        // --- Thank You ---
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Confidential financial document generated by Sandigan ERP System.", 105, 185, { align: "center" });
        doc.text("Thank you for your hard work and service!", 105, 190, { align: "center" });

        doc.save(`Salary_Receipt_${recipientName.replace(/\s+/g, '_')}_${date}.pdf`);
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
                            <img src={attendanceIcon} alt="Attendance Icon" style={{ width: '16px' }} />Attendance</button>
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
                                            <th>Status</th>
                                            <th>Joined</th>
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
                                                <tr key={emp._id}>
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 36, height: 36, background: roleStyle.bg, color: roleStyle.color, fontSize: '0.85rem', flexShrink: 0 }}>
                                                                {getEmpName(emp).charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="fw-semibold text-dark-secondary">{getEmpName(emp)}</div>
                                                                {isSelf && <small className="text-muted" style={{ fontSize: '0.7rem' }}>(You)</small>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted">{emp.email}</td>
                                                    <td>
                                                        <span className="badge rounded-pill px-3 py-1" style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: '0.72rem', fontWeight: 600 }}>
                                                            {roleStyle.label}
                                                        </span>
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
                                                    <td className="text-muted">{new Date(emp.createdAt).toLocaleDateString()}</td>
                                                    <td className="pe-4 text-end">
                                                        {emp.role === 'detailer' && (
                                                            <button onClick={() => fetchEmployeeHistory(emp)} className="btn btn-sm border-0 bg-transparent p-1 me-2" title="Work History">
                                                                <img src={detailerHistoryIcon} alt="History" style={{ width: 18 }} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEdit(emp)} className="btn btn-sm border-0 bg-transparent p-1 me-1" title="Edit">
                                                            <img src={editIcon} alt="Edit" style={{ width: 18 }} />
                                                        </button>
                                                        {!isSelf && (
                                                            <button onClick={() => handleDeleteEmployee(emp)} className="btn btn-sm border-0 bg-transparent p-1" title="Remove">
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
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <h6 className="fw-bold text-dark-secondary mb-0">Detailer Commission Payroll</h6>
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
                            <p className="text-muted mb-1" style={{ fontSize: '2rem' }}>🧼</p>
                            <p className="text-muted mb-0">No detailers found. Add a detailer in the Directory tab first.</p>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {payrollData.map(({ detailer, bookingCount, totalRevenue, totalCommission, unpaidCommission }, idx) => (
                                <div className="col-md-6 col-xl-4" key={detailer._id}>
                                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                                        {/* Card Header */}
                                        <div className="p-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(35,160,206,0.05))' }}>
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 44, height: 44, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '1.1rem', flexShrink: 0 }}>
                                                    {getEmpName(detailer).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{getEmpName(detailer)}</div>
                                                    <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: '0.68rem' }}>Detailer</span>
                                                </div>
                                            </div>
                                            {/* Metrics */}
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
                                        {/* Mark as Paid button */}
                                        <div className="p-3 pt-2 border-top">
                                            <button
                                                onClick={() => handleMarkPaid(detailer._id, getEmpName(detailer))}
                                                disabled={unpaidCommission === 0 || isMarkingPaid === detailer._id}
                                                className="btn w-100 rounded-3 fw-semibold"
                                                style={{
                                                    background: unpaidCommission > 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#f3f4f6',
                                                    color: unpaidCommission > 0 ? '#fff' : '#9ca3af',
                                                    fontSize: '0.85rem',
                                                    border: 'none',
                                                    cursor: unpaidCommission === 0 ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isMarkingPaid === detailer._id ? (
                                                    <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
                                                ) : unpaidCommission > 0 ? (
                                                    `Mark as Paid — ₱${unpaidCommission.toLocaleString()}`
                                                ) : 'All Commissions Settled'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* FIXED SALARY STAFF */}
                    {!isPayrollLoading && employees.some(e => e.role !== 'detailer' && e.baseSalary > 0) && (
                        <div className="mt-5">
                            <h6 className="fw-bold text-dark-secondary mb-3"><i className="bi bi-person-badge text-primary me-2"></i>Fixed Salary Staff</h6>
                            <div className="row g-4 mb-4">
                                {employees.filter(e => e.role !== 'detailer' && e.baseSalary > 0).map(emp => {
                                    // A robust check to see if they've been paid this period.
                                    // Currently keeping it simple: just checking if lastPaidDate exists and is in the current month
                                    const isPaidRecently = emp.lastPaidDate && new Date(emp.lastPaidDate).getMonth() === new Date().getMonth() && new Date(emp.lastPaidDate).getFullYear() === new Date().getFullYear();

                                    return (
                                        <div className="col-md-6 col-xl-4" key={emp._id}>
                                            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                                                <div className="p-4 pb-3" style={{ background: 'linear-gradient(135deg, rgba(35,160,206,0.08), rgba(168,85,247,0.05))' }}>
                                                    <div className="d-flex align-items-center gap-3 mb-3">
                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 44, height: 44, background: '#fff', color: '#23A0CE', fontSize: '1.2rem', flexShrink: 0 }}>
                                                            {getEmpName(emp).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{getEmpName(emp)}</div>
                                                            <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.12)', color: '#23A0CE', fontSize: '0.68rem', textTransform: 'capitalize' }}>
                                                                {emp.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <div className="p-2 rounded-3" style={{ background: '#fff' }}>
                                                                <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Base Salary</div>
                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '1.05rem', color: '#23A0CE' }}>₱{emp.baseSalary?.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                        <div className="col-6">
                                                            <div className="p-2 rounded-3" style={{ background: '#fff' }}>
                                                                <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Frequency</div>
                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '1.05rem' }}>{emp.salaryFrequency || 'Monthly'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-3 pt-2 border-top">
                                                    <button
                                                        onClick={() => handlePaySalary(emp._id, getEmpName(emp))}
                                                        disabled={isMarkingPaid === emp._id || isPaidRecently}
                                                        className="btn w-100 rounded-3 fw-semibold"
                                                        style={{
                                                            background: isPaidRecently ? '#f3f4f6' : 'linear-gradient(135deg, #23A0CE, #1D88AF)',
                                                            color: isPaidRecently ? '#9ca3af' : '#fff',
                                                            fontSize: '0.85rem',
                                                            border: 'none',
                                                        }}
                                                    >
                                                        {isMarkingPaid === emp._id ? <span className="spinner-border spinner-border-sm" /> : isPaidRecently ? `Paid (${new Date(emp.lastPaidDate).toLocaleDateString()})` : `Log Salary Payment`}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PAYOUT HISTORY LOG */}
                    {!isPayrollLoading && payoutHistory.length > 0 && (
                        <div className="mt-5">
                            <h6 className="fw-bold text-dark-secondary mb-3"><i className="bi bi-clock-history me-2"></i>Recent Payout Ledger</h6>
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <tr>
                                                <th className="ps-4 py-3 border-0">Date & Time</th>
                                                <th className="py-3 border-0">Detailer Paid</th>
                                                <th className="py-3 border-0">Bookings Paid</th>
                                                <th className="py-3 border-0">Period</th>
                                                <th className="py-3 border-0">Authorized Admin</th>
                                                <th className="py-3 border-0">Total Amount</th>
                                                <th className="pe-4 py-3 border-0 text-end">Reciept</th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-top-0">
                                            {payoutHistory.map((hist) => (
                                                <tr key={hist._id}>
                                                    <td className="ps-4">
                                                        <div className="fw-semibold text-dark-secondary">{new Date(hist.createdAt).toLocaleDateString()}</div>
                                                        <small className="text-muted">{new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark-secondary">{hist.detailer?.fullName || 'Unknown'}</div>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-light text-dark px-2 py-1 rounded-3">{hist.itemsCount} Cars</span>
                                                    </td>
                                                    <td className="text-capitalize text-muted">{hist.period}</td>
                                                    <td className="text-muted">
                                                        {hist.paidBy ? `${hist.paidBy.fullName} ` : 'System'}
                                                    </td>
                                                    <td className="pe-4 fw-bold" style={{ color: '#22c55e', fontSize: '0.95rem' }}>
                                                        ₱{hist.amount?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="pe-4 text-end">
                                                        <button onClick={() => downloadPayoutReceipt(hist)} className="btn btn-sm btn-outline-primary border-0 rounded-pill p-1 shadow-none" title="Download Receipt">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                                <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293z" />
                                                                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
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

            {/* ── ATTENDANCE LOGS TAB ── */}
            {hrTab === 'attendance' && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-dark-secondary">Staff Shift Tracker</h6>
                        <button onClick={fetchAttendance} className="btn btn-sm btn-light border shadow-sm px-3">
                            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                        </button>
                    </div>
                    <div className="card-body p-0">
                        {isAttendanceLoading ? (
                            <div className="p-0"><TableSkeleton /></div>
                        ) : attendanceLogs.length === 0 ? (
                            <div className="p-5 text-center text-muted">No attendance records found yet.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                    <thead className="bg-light text-dark-gray400" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <tr>
                                            <th className="ps-4 py-3 border-0">Date</th>
                                            <th className="py-3 border-0">Staff Member</th>
                                            <th className="py-3 border-0">Duration</th>
                                            <th className="py-3 border-0">Clock In</th>
                                            <th className="pe-4 py-3 border-0 text-end">Clock Out</th>
                                        </tr>
                                    </thead>
                                    <tbody className="border-top-0">
                                        {attendanceLogs.map((log) => {
                                            const isActive = !log.clockOutTime;
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
                                                            <div>
                                                                <div className="fw-bold text-dark-secondary">{getEmpName(log.employee)}</div>
                                                                <span className="badge rounded-pill bg-light text-muted border text-capitalize" style={{ fontSize: '0.65rem' }}>{log.employee?.role || 'Deleted Staff'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {isActive ? (
                                                            <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Currently Working</span>
                                                        ) : (
                                                            <span className="fw-semibold text-dark-secondary">{Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark-secondary">{new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Logged In</small>
                                                    </td>
                                                    <td className="pe-4 text-end">
                                                        {log.clockOutTime ? (
                                                            <>
                                                                <div className="fw-bold text-dark-secondary">{new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Logged Out</small>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted fst-italic">—</span>
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

            {/* ── ADD / EDIT EMPLOYEE MODAL ── */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
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
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Address <span className="text-muted fw-normal">(Opt)</span></label>
                                        <input type="text" className="form-control rounded-3" value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} placeholder="Full address" />
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

                                    <div className="mb-3">
                                        <small className="text-muted mt-2 d-block" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                            {empForm.role === 'detailer' && 'Detailers do not require an email or password. They appear in the booking assignment and payroll.'}
                                            {empForm.role === 'admin' && 'Admins have full access to all ERP modules. Requires secure login.'}
                                            {empForm.role === 'employee' && 'Employees access the staff dashboard to process bookings. Requires secure login.'}
                                        </small>
                                    </div>

                                    {empForm.role !== 'detailer' && (
                                        <div className="p-3 bg-light rounded-3 mt-3 border">
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold" style={{ fontSize: '0.83rem' }}>Email Address</label>
                                                <input type="email" className="form-control rounded-3" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} required={empForm.role !== 'detailer'} placeholder="staff@sandigan.com" />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label fw-semibold" style={{ fontSize: '0.83rem' }}>{editingEmp ? 'New Password' : 'Password'}</label>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control rounded-start-3"
                                                        value={empForm.password}
                                                        onChange={e => setEmpForm({ ...empForm, password: e.target.value })}
                                                        required={!editingEmp && empForm.role !== 'detailer'}
                                                        placeholder={editingEmp ? '••••••••' : 'Min. 8 characters'}
                                                        minLength={editingEmp ? 0 : 8}
                                                    />
                                                    <button
                                                        className="btn btn-outline-secondary rounded-end-3"
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        title={showPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.939 6.065 0 8 0 8s3 5.5 8 5.5a7.07 7.07 0 0 0 2.79-.588M5.21 3.088A7.07 7.07 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.935-2.642 3.179zm4.653 4.653a2.5 2.5 0 0 1-3.499-3.499z" /><path d="m13.646 14.354-12-12 .708-.708 12 12z" />
                                                        </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" /><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                                                        </svg>}
                                                    </button>
                                                </div>
                                            </div>

                                            <hr className="my-3 text-muted opacity-25" />

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
            {/* ── PERFORMANCE HISTORY MODAL ── */}
            {showHistory && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                            <div className="modal-header border-0 bg-light p-4">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark-secondary mb-1">Detailed Performance History</h5>
                                    <p className="text-muted mb-0 small">Performance summary for <span className="fw-bold brand-primary">{getEmpName(historyEmp)}</span></p>
                                </div>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowHistory(false)} />
                            </div>

                            <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {isHistoryLoading ? (
                                    <div className="py-5 text-center">
                                        <div className="spinner-border text-primary mb-3" role="status"></div>
                                        <p className="text-muted">Loading history data...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Stats Row */}
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6">
                                                <div className="p-3 rounded-4 border" style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.15) !important' }}>
                                                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Total Bookings Completed</small>
                                                    <h3 className="mb-0 fw-bold text-success font-poppins mt-1">
                                                        {historyData.summary?.totalCompleted || 0}
                                                        <span className="fs-6 fw-normal text-muted ms-2">Cars Wash</span>
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="p-3 rounded-4 border" style={{ background: 'rgba(35,160,206,0.05)', borderColor: 'rgba(35,160,206,0.15) !important' }}>
                                                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Total Revenue Generated</small>
                                                    <h3 className="mb-0 fw-bold brand-primary font-poppins mt-1">
                                                        ₱{(historyData.summary?.totalRevenue || 0).toLocaleString()}
                                                        <span className="fs-6 fw-normal text-muted ms-2">PHP</span>
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* History Table */}
                                        <div className="table-responsive rounded-3 border">
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                                <thead className="bg-light text-muted">
                                                    <tr>
                                                        <th className="ps-3 py-3 border-0">Date</th>
                                                        <th className="py-3 border-0">BookID</th>
                                                        <th className="py-3 border-0">Customer</th>
                                                        <th className="py-3 border-0">Vehicle</th>
                                                        <th className="pe-3 py-3 border-0 text-end">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyData.history?.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="text-center py-5 text-muted">
                                                                No work history found for this employee yet.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        historyData.history.map((b) => (
                                                            <tr key={b._id}>
                                                                <td className="ps-3 text-muted">
                                                                    {new Date(b.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </td>
                                                                <td className="fw-semibold text-dark-secondary">#{b.batchId}</td>
                                                                <td>{b.firstName} {b.lastName}</td>
                                                                <td>
                                                                    <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '0.7rem' }}>
                                                                        {b.vehicleType}
                                                                    </span>
                                                                </td>
                                                                <td className="pe-3 fw-bold text-dark-secondary text-end">
                                                                    ₱{(b.totalPrice || 0).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-0 bg-light p-3">
                                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowHistory(false)}>Close Summary</button>
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

/* ─────────────────────────────────────────────
   PROMOTIONS & VOUCHERS — CRM Marketing Module
───────────────────────────────────────────── */
const PromotionsPage = () => {
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'smc-history' | 'promo-history'
    const [promos, setPromos] = useState([]);
    const [smcLogs, setSmcLogs] = useState([]);
    const [promoLogs, setPromoLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
        `${log.firstName} ${log.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.smcId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPromoHistory = promoLogs.filter(log =>
        `${log.firstName} ${log.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.promoCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
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
                                {(activeTab === 'promo-history' ? filteredPromoHistory : filteredSMCHistory).length === 0 ? (
                                    <tr><td colSpan="5" className="p-5 text-center text-muted">No usage records found.</td></tr>
                                ) : (
                                    (activeTab === 'promo-history' ? filteredPromoHistory : filteredSMCHistory).map(log => (
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
            case 'finance': return <FinancePage user={user} />;
            case 'hris': return <HRISPage user={user} />;
            case 'inventory': return <InventoryPage user={user} />;
            case 'crm': return <CRMPage user={user} />;
            case 'promotions': return <PromotionsPage user={user} />;
            case 'operations': return <ModulePlaceholder title="Project & Operations Management" icon="⚙️" description="Manage tasks, workflows, and operational efficiency." />;
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
        { key: 'booking_created', label: 'New Booking' },
        { key: 'booking_status_changed', label: 'Status Change' },
        { key: 'booking_updated', label: 'Updated' },
        { key: 'booking_deleted', label: 'Deleted' },
        { key: 'staff_logged_in', label: 'Login' },
        { key: 'staff_logged_out', label: 'Logout' },
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
                    <div className="p-0"><TableSkeleton /></div>
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
        <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1085 }}>
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

const FinancePage = ({ user }) => {
    const [summary, setSummary] = useState({ totalRevenue: 0, totalCommissionOwed: 0, totalExpenses: 0, netProfit: 0 });
    const [expenses, setExpenses] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'revenues' | 'recurring' | 'settings'
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ title: '', category: 'Supplies', amount: '', description: '' });

    const [revenues, setRevenues] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isRevLoading, setIsRevLoading] = useState(false);

    const [commissionRate, setCommissionRate] = useState(0.30);
    const [isSavingRate, setIsSavingRate] = useState(false);

    // Recurring bills state
    const [recurringBills, setRecurringBills] = useState([]);
    const [pendingBills, setPendingBills] = useState([]);
    const [newBill, setNewBill] = useState({ name: '', amount: '', category: 'Utilities', frequency: 'Monthly' });
    const [isApplying, setIsApplying] = useState(false);
    const [showBillForm, setShowBillForm] = useState(false);

    // ERP Category Mapping
    const [erpMapping, setErpMapping] = useState([]);
    const [inventoryCats, setInventoryCats] = useState([]);
    const [revenueCats, setRevenueCats] = useState([]);
    const [showRevCategoryManager, setShowRevCategoryManager] = useState(false);
    const [isSavingMapping, setIsSavingMapping] = useState(false);

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
            const [sumRes, expRes, settingsRes, invCatsRes, revCatsRes] = await Promise.all([
                axios.get(`${API_BASE}/finance/summary`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/finance/expenses`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/settings`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/inventory-categories`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/revenue-categories`, { headers: authHeaders(), withCredentials: true })
            ]);
            setSummary(sumRes.data);
            setExpenses(expRes.data);
            setInventoryCats(invCatsRes.data);
            setRevenueCats(revCatsRes.data);

            const rateSetting = settingsRes.data.find(s => s.key === 'commission_rate');
            if (rateSetting) setCommissionRate(rateSetting.value);

            const mapSetting = settingsRes.data.find(s => s.key === 'erp_mapping');
            if (mapSetting && mapSetting.value?.mappings) {
                setErpMapping(mapSetting.value.mappings);
            }
        } catch (err) { console.error('Error fetching finance data:', err); }
        finally { setIsLoading(false); }
    };

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
                        <button onClick={() => setActiveTab('recurring')} className={`btn btn-sm px-3 border-0 position-relative d-flex align-items-center gap-1 ${activeTab === 'recurring' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`}>
                            Recurring Bills
                            {pendingBills.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                    {pendingBills.length}
                                </span>
                            )}
                        </button>
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

                        {/* ERP Mapping Section */}
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
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
                                                                            <div>
                                                                                {(() => {
                                                                                    const tag = revenueCats.find(c => c.name === current);
                                                                                    return tag ? (
                                                                                        <span className="badge rounded-pill px-2 py-1 shadow-sm" style={{ background: tag.color, color: tag.textColor, fontSize: '0.6rem' }}>
                                                                                            preview
                                                                                        </span>
                                                                                    ) : null;
                                                                                })()}
                                                                            </div>
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

                        {/* Revenue Tag Manager Modal */}
                        <RevenueCategoryManager
                            show={showRevCategoryManager}
                            onClose={() => setShowRevCategoryManager(false)}
                            onUpdate={(cats) => { setRevenueCats(cats); fetchFinanceData(); }}
                        />
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
                    {activeTab === 'overview' && (
                        <>
                            {/* Financial Summary Cards */}
                            <div className="row g-3 mb-4">
                                {[
                                    { title: "Gross Revenue", value: summary.totalRevenue, icon: <img src={grossRevenueIcon} alt="Gross Revenue" style={{ width: '24px' }} />, color: "#a855f7", bg: "linear-gradient(135deg,#a855f715,#a855f705)", dot: "#a855f7", desc: "Total from completed bookings" },
                                    { title: "Staff Commissions", value: summary.totalCommissionOwed, icon: <img src={commisionIcon} alt="Staff Commissions" style={{ width: '24px' }} />, color: "#22c55e", bg: "linear-gradient(135deg,#22c55e15,#22c55e05)", dot: "#22c55e", desc: `${(commissionRate * 100).toFixed(0)}% detailer cut (owed)` },
                                    { title: "Operation Costs", value: summary.totalExpenses, icon: <img src={operationCostIcon} alt="Operation Costs" style={{ width: '24px' }} />, color: "#23A0CE", bg: "linear-gradient(135deg,#23A0CE15,#23A0CE05)", dot: "#23A0CE", desc: "Supplies, Rent, Utilities" },
                                    { title: "Net Profit", value: summary.netProfit, icon: <img src={netProfitIcon} alt="Net Profit" style={{ width: '24px' }} />, color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)", dot: "#f59e0b", desc: "Take-home after all costs" },
                                ].map((card, idx) => (
                                    <div className="col-6 col-md-3" key={idx}>
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
                                                                        <div className="fw-semibold text-dark-secondary">{exp.title}</div>
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
                                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold text-dark-secondary">Revenue & Receivables Recognition</h6>
                                    <div className="d-flex gap-2">
                                        <button onClick={fetchRevenues} className="btn btn-sm btn-light border">Refresh Ledger</button>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    {isRevLoading ? <div className="p-5"><ChartSkeleton /></div> : (
                                        <div className="table-responsive">
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
                                                    {revenues.length === 0 ? (
                                                        <tr><td colSpan="5" className="p-5 text-center text-muted">No revenue recognized yet. Bookings and SMC sales will appear here automatically.</td></tr>
                                                    ) : (
                                                        revenues.map((rev) => (
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
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recurring' && (
                        <div className="animate-fade-in">
                            {/* Reuse existing Recurring Bills Logic */}
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
                                                {isApplying ? 'Applying...' : '✅ Apply All Now'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-0 fw-bold text-dark-secondary">Recurring Bills</h6>
                                                <small className="text-muted" style={{ fontSize: '0.72rem' }}>Fixed monthly/weekly costs (Internet, Water, Electricity)</small>
                                            </div>
                                            <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-save btn-sm rounded-pill px-3">+ Add Bill</button>
                                        </div>

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
                                                    <div className="col-md-2 d-flex gap-2">
                                                        <button type="submit" className="btn btn-save btn-primary btn-sm w-100 rounded-3">Save</button>
                                                        <button type="button" className="btn btn-danger btn-sm w-100 rounded-3" onClick={() => setShowBillForm(false)}>Cancel</button>
                                                    </div>
                                                </div>
                                            </form>
                                        )}

                                        <div className="card-body p-0">
                                            {recurringBills.length === 0 ? (
                                                <div className="p-4 text-center text-muted small">No recurring bills yet.</div>
                                            ) : (
                                                recurringBills.map(bill => (
                                                    <div key={bill._id} className="px-4 py-3 border-bottom">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <p className="mb-0 fw-bold text-dark-secondary">{bill.name}</p>
                                                                <small className="text-muted">{bill.category} · {bill.frequency}</small>
                                                            </div>
                                                            <div className="text-end">
                                                                <p className="mb-0 fw-bold text-danger">- ₱{Number(bill.amount).toLocaleString()}</p>
                                                                {bill.isPending ? <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '0.6rem' }}>Pending</span> : <span className="badge bg-success text-white rounded-pill" style={{ fontSize: '0.6rem' }}>Applied</span>}
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
                    )}
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
// ====== INVENTORY CATEGORY MANAGER ======
// Same structure as TagManager for Categories
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
        <div className="modal show d-block animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
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
