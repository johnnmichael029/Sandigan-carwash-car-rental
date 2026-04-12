import { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, HRISSkeleton, KPICardSkeleton } from '../../SkeletonLoaders';
import ROLE_COLORS from '../RoleColors';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';

import axios from 'axios';
import directoryIcon from '../../../assets/icon/directory.png';
import attendanceIcon from '../../../assets/icon/attendance.png';
import payrollIcon from '../../../assets/icon/payroll.png';

import getPaginationRange from '../getPaginationRange';
import analyticsIcon from '../../../assets/icon/analytics.png';
import staffIcon from '../../../assets/icon/staff.png';
import detailerIcon from '../../../assets/icon/detailers.png';
import employeeIcon from '../../../assets/icon/employee.png';
import adminIcon from '../../../assets/icon/admin.png';
import detailerHistoryIcon from '../../../assets/icon/detailer-history.png';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import searchIcon from '../../../assets/icon/search.png';
import topPerformerIcon from '../../../assets/icon/top-performer.png';
import refreshIcon from '../../../assets/icon/refresh.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';
import SharedSearchBar from '../shared/SharedSearchBar';
import { filterDataBySearch } from '../shared/searchUtils';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';

const HRISPage = ({ user, isDark }) => {
    const getEmpName = (emp) => emp?.fullName || emp?.fullname || 'Unknown Staff';
    const getEmpId = (emp) => emp?.employeeId || 'No ID';

    const getPayableMinutes = (log, fallbackEmp = null) => {
        const emp = log.employee || fallbackEmp;
        if (!emp || !log.clockInTime || !log.clockOutTime) return { regMins: 0, otMins: 0, ndMins: 0 };

        const clockIn = new Date(log.clockInTime);
        const clockOut = new Date(log.clockOutTime);

        let shiftEndMarker = new Date(clockIn);
        if (emp.shiftType === 'Morning') shiftEndMarker.setHours(17, 0, 0, 0);
        else if (emp.shiftType === 'Night') {
            shiftEndMarker.setHours(5, 0, 0, 0);
            if (shiftEndMarker < clockIn) shiftEndMarker.setDate(shiftEndMarker.getDate() + 1);
        }

        let regMins = 0;
        let otMins = 0;


        if (emp.shiftType === 'Morning' || emp.shiftType === 'Night') {
            // REGULAR PAY: Always stop counting at the shift end marker
            if (clockIn < shiftEndMarker) {
                const regEnd = clockOut < shiftEndMarker ? clockOut : shiftEndMarker;
                regMins = Math.floor((regEnd - clockIn) / 60000);
            }

            // OVERTIME PAY: Only count if approved
            if (log.isOTApproved && clockOut > shiftEndMarker) {
                const otStart = clockIn > shiftEndMarker ? clockIn : shiftEndMarker;
                otMins = Math.floor((clockOut - otStart) / 60000);
            }
        } else {
            // Employees without a fixed shift (e.g. flexible schedule)
            const duration = log.durationMinutes || Math.floor((clockOut - clockIn) / 60000);
            regMins = duration;
            if (log.isOTApproved) otMins = Math.max(0, duration - 480);
        }

        if (emp.shiftType === 'Morning') {
            const noon = new Date(clockIn); noon.setHours(12, 0, 0, 0);
            const onePM = new Date(clockIn); onePM.setHours(13, 0, 0, 0);
            if (clockIn < noon && clockOut > onePM) regMins = Math.max(0, regMins - 60);
        } else if (emp.shiftType === 'Night') {
            const midnight = new Date(clockIn);
            midnight.setHours(24, 0, 0, 0);
            const oneAM = new Date(clockIn);
            oneAM.setHours(25, 0, 0, 0);
            if (clockIn < midnight && clockOut > oneAM) {
                regMins = Math.max(0, regMins - 60);
            }
        }

        regMins = Math.min(regMins, 480);
        let ndMins = 0;
        const getOverlap = (s1, e1, s2, e2) => {
            const start = s1 > s2 ? s1 : s2;
            const end = e1 < e2 ? e1 : e2;
            const diff = Math.floor((end - start) / 60000);
            return diff > 0 ? diff : 0;
        };

        // NIGHT DIFFERENTIAL
        // Only count ND for the portion that is actually PAYABLE (Regular or Approved OT)
        const payableNDOut = log.isOTApproved ? clockOut : (clockOut < shiftEndMarker ? clockOut : shiftEndMarker);
        let dayBase = new Date(clockIn); dayBase.setHours(0, 0, 0, 0);

        // ND only applies if: Night shift (all regular hours) OR OT is approved (any shift)
        if (emp.shiftType === 'Night' || log.isOTApproved) {
            for (let i = 0; i < 2; i++) {
                const d = new Date(dayBase); d.setDate(d.getDate() + i);
                const w1S = new Date(d); w1S.setHours(22, 0, 0, 0);
                const w1E = new Date(d); w1E.setHours(24, 0, 0, 0);
                const w2S = new Date(d); w2S.setHours(0, 0, 0, 0);
                const w2E = new Date(d); w2E.setHours(6, 0, 0, 0);
                ndMins += getOverlap(clockIn, payableNDOut, w1S, w1E);
                ndMins += getOverlap(clockIn, payableNDOut, w2S, w2E);
            }
        }

        // Apply Smart Break Deduction to Night Differential (use payableNDOut, not clockOut)
        if (emp.shiftType === 'Night') {
            const midnight = new Date(clockIn); midnight.setHours(24, 0, 0, 0);
            const oneAM = new Date(clockIn); oneAM.setHours(25, 0, 0, 0);
            if (clockIn < midnight && payableNDOut > oneAM) {
                ndMins = Math.max(0, ndMins - 60);
            }
        }

        return { regMins, otMins, ndMins };
    };

    const getDailyPay = (log, fallbackEmp = null) => {
        const emp = log.employee || fallbackEmp;
        if (!emp || !emp.baseSalary) return 0;

        let divisor = 26;
        if (emp.salaryFrequency === 'Weekly') divisor = 6;
        else if (emp.salaryFrequency === 'Bi-Weekly') divisor = 13;
        else if (emp.salaryFrequency === 'Daily') divisor = 1;

        const baseVal = Number(emp.baseSalary) || 0;
        const dailyRate = (emp?.salaryFrequency === 'Daily') ? baseVal : (baseVal / divisor);
        const hourlyRate = dailyRate / 8;

        const { regMins, otMins, ndMins } = getPayableMinutes(log, emp);

        // --- DOLE REST DAY DETECTION ---
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const restDayIdx = dayNames.indexOf(emp.restDay || 'Sunday');
        const clockIn = new Date(log.clockInTime);
        const isRestDay = clockIn.getDay() === restDayIdx;

        let total = 0;

        if (isRestDay) {
            // DOLE: Rest day pays at premium rate (replaces regular pay)
            let restMultiplier = 1.30; // Regular rest day = 130%
            if (log.holidayType === 'Regular') restMultiplier = 2.60;      // Rest day + Regular Holiday = 260%
            else if (log.holidayType === 'Special') restMultiplier = 1.80; // Rest day + Special NWD = 180%
            total = (regMins / 60) * hourlyRate * restMultiplier;
        } else {
            // Normal working day
            total = (regMins / 60) * hourlyRate;
            if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
                if (log.holidayType === 'Regular') {
                    total += ((regMins / 60) * hourlyRate);
                    total += ((otMins / 60) * hourlyRate * 1.30);
                } else if (log.holidayType === 'Special') {
                    total += ((regMins / 60) * hourlyRate * 0.30);
                    total += ((otMins / 60) * hourlyRate * 0.39);
                }
            }
        }

        if (otMins > 0) total += (otMins / 60) * (hourlyRate * 1.30);
        if (ndMins > 0) total += (ndMins / 60) * (hourlyRate * 0.10);
        return total;
    };

    const [hrTab, setHrTab] = useState('directory');

    // ── LEAVE MANAGEMENT STATE ──
    const [leaveLogs, setLeaveLogs] = useState([]);
    const [isLeaveLoading, setIsLeaveLoading] = useState(false);
    const [leaveSearch, setLeaveSearch] = useState('');
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ employeeId: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' });
    const [isFilingLeave, setIsFilingLeave] = useState(false);
    const [leaveFilter, setLeaveFilter] = useState('All');
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [skillsMasterList, setSkillsMasterList] = useState([
        'Exterior Washing', 'Interior Detailing', 'Engine Wash',
        'Vacuuming', 'Hand Waxing', 'Machine Buffing',
        'Basic Car Repair', 'Customer Relations'
    ]);

    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [attendanceSearch, setAttendanceSearch] = useState('');
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [holidayLogs, setHolidayLogs] = useState([]);
    const [isHolidayLoading, setIsHolidayLoading] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [newHoliday, setNewHoliday] = useState({ dateStr: '', name: '', type: 'Regular' });

    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [empForm, setEmpForm] = useState({
        fullName: '', email: '', password: '', role: 'employee',
        age: '', address: '', phone: '', baseSalary: '',
        salaryFrequency: 'Monthly', status: 'Active',
        hasAccount: true, shiftType: 'None', shiftStartTime: '',
        hiredDate: new Date().toISOString().split('T')[0],
        sssNo: '', tinNo: '', philhealthNo: '', pagibigNo: '',
        nonTaxableAllowance: '', restDay: 'Sunday'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [payrollPeriod, setPayrollPeriod] = useState('month');
    const [payrollData, setPayrollData] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [isPayrollLoading, setIsPayrollLoading] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(null);
    const [pendingFixed, setPendingFixed] = useState([]);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [selectedPayoutStaff, setSelectedPayoutStaff] = useState(null);
    const [payoutAdjustments, setPayoutAdjustments] = useState({ bonus: 0, deductions: 0, remarks: '' });

    const [payrollSubTab, setPayrollSubTab] = useState('review');
    const [reviewViewMode, setReviewViewMode] = useState('grid');
    const [detCurrentPage, setDetCurrentPage] = useState(1);
    const [staffCurrentPage, setStaffCurrentPage] = useState(1);
    const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [detSearch, setDetSearch] = useState('');

    const isHrisMounted = useRef(false);

    const filteredDetPayroll = useMemo(() => {
        return filterDataBySearch(payrollData, detSearch, ['detailer.fullName']);
    }, [payrollData, detSearch]);

    const filteredStaffPayroll = useMemo(() => {
        return filterDataBySearch(pendingFixed, staffSearch, ['fullName', 'role']);
    }, [pendingFixed, staffSearch]);

    const mappedPayoutHistory = useMemo(() => {
        return (payoutHistory || []).map(hist => ({
            ...hist,
            derivedType: hist.itemsCount > 0 ? 'Commission' : 'Salary'
        }));
    }, [payoutHistory]);

    const filteredLedger = useMemo(() => {
        return filterDataBySearch(mappedPayoutHistory, ledgerSearch, ['recipient.fullName', 'detailer.fullName', 'derivedType', 'period', 'paidBy.fullName'], ['createdAt', 'date']);
    }, [mappedPayoutHistory, ledgerSearch]);
    const filteredAttendance = filterDataBySearch(attendanceLogs, attendanceSearch, ['employee.fullName', 'holidayType', 'holidayName', 'status'], ['date', 'clockInTime', 'clockOutTime']);

    const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
    const [auditCurrentPage, setAuditCurrentPage] = useState(1);

    // Attendance Edit Modal State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [attendanceForm, setAttendanceForm] = useState({ clockInTime: '', clockOutTime: '' });

    // Computation Modal State
    const [showCompModal, setShowCompModal] = useState(false);
    const [selectedCompLog, setSelectedCompLog] = useState(null);
    const attendancePerPage = 10;
    const auditPerPage = 10;
    const cardsPerPage = 10;
    const ledgerPerPage = 10;

    useEffect(() => { setLedgerCurrentPage(1); }, [ledgerSearch]);
    useEffect(() => { setStaffCurrentPage(1); }, [staffSearch]);
    useEffect(() => { setDetCurrentPage(1); }, [detSearch]);
    useEffect(() => { setAttendanceCurrentPage(1); setAuditCurrentPage(1); }, [attendanceSearch]);

    // Search states handled by client-side filtering

    const [showHistory, setShowHistory] = useState(false);
    const [historyEmp, setHistoryEmp] = useState(null);
    const [historyData, setHistoryData] = useState({ summary: {}, history: [] });
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isClocking, setIsClocking] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [historyTab, setHistoryTab] = useState('summary'); // 'summary' or 'performance'
    const [historySearch, setHistorySearch] = useState('');
    const [historySearchDebounced, setHistorySearchDebounced] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const historyPerPage = 6;

    const [performanceRating, setPerformanceRating] = useState(5);
    const [performanceComment, setPerformanceComment] = useState('');
    const [skillsList, setSkillsList] = useState([]);
    const [isSavingPerformance, setIsSavingPerformance] = useState(false);

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

    const fetchLeaves = async (search = '') => {
        setIsLeaveLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/leaves/all?search=${search}`, { headers: authHeaders(), withCredentials: true });
            setLeaveLogs(res.data || []);
        } catch (err) { console.error(err); }
        finally { setIsLeaveLoading(false); }
    };

    const handleFileLeave = async (e) => {
        e.preventDefault();
        setIsFilingLeave(true);
        try {
            await axios.post(`${API_BASE}/leaves`, leaveForm, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Filed!', text: 'Leave request created.', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setShowLeaveModal(false);
            setLeaveForm({ employeeId: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to file leave.', 'error');
        } finally { setIsFilingLeave(false); }
    };

    const handleLeaveStatus = async (leaveId, status) => {
        const { value: remarks } = await Swal.fire({ title: `${status} Leave?`, input: 'textarea', inputPlaceholder: 'Add a note...', showCancelButton: true, confirmButtonText: status, confirmButtonColor: status === 'Approved' ? '#22c55e' : '#ef4444' });
        if (remarks === undefined) return;
        try {
            await axios.patch(`${API_BASE}/leaves/${leaveId}/status`, { status, adminRemarks: remarks || '' }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: `${status}!`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            fetchLeaves();
            fetchEmployees();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed.', 'error');
        }
    };

    const handleDeleteLeave = async (leaveId) => {
        const result = await Swal.fire({ title: 'Delete Leave Record?', text: 'This will also revert any balances deducted.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete' });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${API_BASE}/leaves/${leaveId}`, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            fetchLeaves();
            fetchEmployees();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed.', 'error');
        }
    };

    const fetchPayroll = async (search = '') => {
        setIsPayrollLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/payroll/summary?period=${payrollPeriod}`, { headers: authHeaders(), withCredentials: true });
            setPayrollData(res.data.summaries || []);

            const pendRes = await axios.get(`${API_BASE}/payroll/pending-fixed`, { headers: authHeaders(), withCredentials: true });
            setPendingFixed(pendRes.data || []);

            const histRes = await axios.get(`${API_BASE}/payroll/history?limit=100&search=${search}`, { headers: authHeaders(), withCredentials: true });
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
            Swal.fire({ title: 'Success', text: res.data.message, icon: 'success', background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)' });
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
        } finally { setIsClocking(null); }
    };

    const handleSaveEvaluation = async (e) => {
        e.preventDefault();
        setIsSavingPerformance(true);
        try {
            await axios.post(`${API_BASE}/employees/${historyEmp._id}/evaluation`, { rating: performanceRating, comment: performanceComment }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({
                title: 'Saved!', text: 'Evaluation recorded.', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#0d1b1b',
                color: '#FAFAFA'
            });
            setPerformanceComment('');
            // Refresh history view
            fetchEmployeeHistory(historyEmp);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to save evaluation.', 'error');
        } finally { setIsSavingPerformance(false); }
    };

    const fetchSkills = async () => {
        try {
            const res = await axios.get(`${API_BASE}/settings`, { headers: authHeaders(), withCredentials: true });
            const skillsSetting = (res.data || []).find(s => s.key === 'hr_staff_skills');
            if (skillsSetting) setSkillsMasterList(skillsSetting.value);
        } catch (err) { console.error('Failed to fetch skills', err); }
    };

    const handleAddMasterSkill = async () => {
        const { value: skill } = await Swal.fire({
            title: 'New Skill Parameter',
            input: 'text',
            inputPlaceholder: 'e.g. Ceremic Coating',
            showCancelButton: true,
            confirmButtonColor: '#2563eb'
        });
        if (!skill) return;

        const updated = [...skillsMasterList, skill];
        setSkillsMasterList(updated);
        try {
            await axios.post(`${API_BASE}/settings/update`, { key: 'hr_staff_skills', value: updated }, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Skill Added!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#0d1b1b', color: '#FAFAFA' });
        } catch (err) {
            Swal.fire('Error', 'Failed to update system skills.', 'error');
        }
    };

    const handleRemoveMasterSkill = async (skillToRemove) => {
        const result = await Swal.fire({
            title: 'Remove Skill?',
            text: `Remove "${skillToRemove}" from system options? Existing staff records won't be deleted but it won't appear in the checklist anymore.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;

        const updated = skillsMasterList.filter(s => s !== skillToRemove);
        setSkillsMasterList(updated);
        try {
            await axios.post(`${API_BASE}/settings/update`, { key: 'hr_staff_skills', value: updated }, { headers: authHeaders(), withCredentials: true });
        } catch (err) { console.error(err); }
    };

    const handleUpdateSkills = async (skill) => {
        const newSkills = skillsList.includes(skill) ? skillsList.filter(s => s !== skill) : [...skillsList, skill];
        setSkillsList(newSkills);
        try {
            await axios.patch(`${API_BASE}/employees/${historyEmp._id}/skills`, { skills: newSkills }, { headers: authHeaders(), withCredentials: true });
            // Update the historyEmp state locally so UI doesn't lag
            setHistoryEmp(prev => ({ ...prev, skills: newSkills }));
        } catch (err) {
            console.error('Failed to sync skills', err);
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
                await axios.patch(`${API_BASE}/holidays/${editingHoliday._id}`, newHoliday, { headers: authHeaders(), withCredentials: true });
                setEditingHoliday(null);
                Swal.fire('Updated', 'Holiday updated successfully.', 'success');
            } else {
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
            if (showAttendanceModal) setShowAttendanceModal(false);
            Swal.fire({ title: 'Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#0d1b1b', color: '#FAFAFA' });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to update attendance.', 'error');
        }
    };

    const handleDeleteAttendance = async (logId) => {
        const result = await Swal.fire({
            title: 'Cancel Session?',
            text: "This will remove the clock-in record completely. Only do this for accidental clock-ins.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, cancel it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/attendance/${logId}`, { headers: authHeaders(), withCredentials: true });
                fetchAttendance();
                Swal.fire({ title: 'Cancelled!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Failed to delete record.', 'error');
            }
        }
    };

    const openEditAttendance = (log) => {
        setEditingAttendance(log);
        setAttendanceForm({
            clockInTime: log.clockInTime ? new Date(log.clockInTime).toISOString().slice(0, 16) : '',
            clockOutTime: log.clockOutTime ? new Date(log.clockOutTime).toISOString().slice(0, 16) : ''
        });
        setShowAttendanceModal(true);
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
        setHistoryTab('summary');
        setPerformanceRating(5);
        setPerformanceComment('');

        try {
            // First, fetch the LATEST data for this employee to ensure evaluations/skills are fresh
            const resEmp = await axios.get(`${API_BASE}/employees/${emp._id}`, { headers: authHeaders(), withCredentials: true });
            const freshEmp = resEmp.data;

            setHistoryEmp(freshEmp);
            setSkillsList(freshEmp.skills || []);
            setHistorySearch('');
            setHistoryPage(1);
            setShowHistory(true);

            if (freshEmp.role === 'detailer') {
                const res = await axios.get(`${API_BASE}/booking/employee-history/${emp._id}`, { headers: authHeaders(), withCredentials: true });
                setHistoryData(res.data);
            } else {
                const logs = await fetchAttendanceHistory(emp._id);
                const totalHours = logs.reduce((acc, l) => {
                    if (!l.clockOutTime) return acc;
                    const { regMins } = getPayableMinutes(l, emp);
                    return acc + regMins;
                }, 0) / 60;
                const totalPay = logs.reduce((acc, l) => acc + (l.clockOutTime ? getDailyPay(l, emp) : 0), 0);

                setHistoryData({
                    summary: {
                        bookingCount: logs.filter(l => l.clockOutTime).length,
                        totalRevenue: Number(totalHours.toFixed(1)),
                        totalEarnings: totalPay
                    },
                    history: logs.map(l => ({
                        _id: l._id,
                        createdAt: l.dateStr,
                        bookingId: l._id.slice(-8).toUpperCase(),
                        customerName: l.holidayType !== 'None' ? l.holidayName : 'Regular Shift',
                        vehicleType: l.clockOutTime ? `${Math.floor(l.durationMinutes / 60)}h ${l.durationMinutes % 60}m` : 'In Progress',
                        commission: l.clockOutTime ? getDailyPay(l) : 0,
                        isAttendance: true,
                        rawLog: l
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

    useEffect(() => {
        isHrisMounted.current = true;
        fetchEmployees();
        fetchLeaves(); // Load leaves on mount for the badge
        fetchSkills(); // Load dynamic skills list
    }, []);
    useEffect(() => { if (hrTab === 'payroll' || hrTab === 'analytics') fetchPayroll(); }, [hrTab, payrollPeriod]);
    useEffect(() => { if (hrTab === 'attendance' || hrTab === 'directory') { fetchAttendance(); } if (hrTab === 'attendance') fetchHolidays(); }, [hrTab]);
    useEffect(() => { if (hrTab === 'leaves') fetchLeaves(); }, [hrTab]);

    const openAdd = () => {
        setEditingEmp(null);
        setEmpForm({
            fullName: '', email: '', password: '', role: 'employee',
            age: '', address: '', phone: '', baseSalary: '',
            salaryFrequency: 'Monthly', status: 'Active',
            hasAccount: true, shiftType: 'None', shiftStartTime: '',
            hiredDate: new Date().toISOString().split('T')[0],
            sssNo: '', tinNo: '', philhealthNo: '', pagibigNo: '',
            nonTaxableAllowance: '', restDay: 'Sunday'
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
            nonTaxableAllowance: emp.nonTaxableAllowance || '',
            restDay: emp.restDay || 'Sunday'
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

                // Preserve existing leave balances during simple employee update
                payload.leaveBalances = editingEmp.leaveBalances;

                await axios.patch(`${API_BASE}/employees/${editingEmp._id}`, payload, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Employee Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2500, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } else {
                // CREATE
                // Initialize standard leave balances for new hires
                payload.leaveBalances = {
                    sickLeave: { allocated: 5, used: 0 },
                    vacationLeave: { allocated: 5, used: 0 }
                };

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
                html: `<p class="text-primary">Successfully logged payment of <b class="text-success">₱${res.data.amount.toLocaleString()}</b> for ${selectedPayoutStaff.fullName}</p>`,
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
        const emp = hist.recipient || hist.detailer || {};
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
        doc.text(`Employee ID: ${emp.employeeId || emp._id?.slice(-8).toUpperCase() || 'N/A'}`, 15, 68);
        doc.text(`Position: ${emp.role?.toUpperCase() || 'STAFF'}`, 15, 73);

        doc.text(`Pay Date: ${date} ${time}`, 130, 63);
        doc.text(`Period: ${hist.period || 'Regular Cycle'}`, 130, 68);
        doc.text(`Ref No: PAY-${hist._id?.slice(-8).toUpperCase()}`, 130, 73);

        // --- ID Numbers (Tiny Sub-header) ---
        // if (!isDetailer) {
        //     doc.setFontSize(7);
        //     doc.setTextColor(100, 100, 100);
        //     doc.text(`SSS: ${emp.sssNo || '---'} | TIN: ${emp.tinNo || '---'} | PH: ${emp.philhealthNo || '---'} | HDMF: ${emp.pagibigNo || '---'}`, 15, 78);
        //     doc.setFontSize(9);
        //     doc.setTextColor(40, 40, 40);
        // }

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
            doc.text(`PHP ${(hist.basicPay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 105, { align: 'right' });

            doc.text(`Overtime (${(hist.overtimeHours || 0).toFixed(1)} hrs)`, 20, 111);
            doc.text(`PHP ${(hist.overtimePay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 111, { align: 'right' });

            doc.text(`Night Diff (${(hist.nightDiffHours || 0).toFixed(1)} hrs)`, 20, 117);
            doc.text(`PHP ${(hist.nightDiffPay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 117, { align: 'right' });

            doc.text("Holiday Pay", 20, 123);
            doc.text(`PHP ${(hist.holidayPay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 123, { align: 'right' });

            doc.text("Bonuses / Adjustments", 20, 129);
            doc.text(`PHP ${(hist.bonuses || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 129, { align: 'right' });

            doc.text("Non-Taxable Allowance", 20, 135);
            doc.text(`PHP ${(hist.allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 135, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.text("TOTAL GROSS EARNINGS", 20, 145);
            doc.text(`PHP ${(hist.grossPay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 95, 145, { align: 'right' });

            // Deductions Column (Right)
            doc.setFont("helvetica", "bold");
            doc.text("DEDUCTIONS", 110, 95);
            doc.line(110, 97, 195, 97);

            doc.setFont("helvetica", "normal");
            doc.text("SSS Contribution (EE)", 115, 105);
            doc.text(`PHP ${(hist.sssEE || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 105, { align: 'right' });

            doc.text("PhilHealth (EE)", 115, 111);
            doc.text(`PHP ${(hist.philhealthEE || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 111, { align: 'right' });

            doc.text("Pag-IBIG / HDMF (EE)", 115, 117);
            doc.text(`PHP ${(hist.hdmfEE || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 117, { align: 'right' });

            doc.text("Withholding Tax", 115, 123);
            doc.text(`PHP ${(hist.withholdingTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 123, { align: 'right' });

            doc.text("Lates / Absents", 115, 129);
            doc.text(`PHP ${((hist.latesDeduction || 0) + (hist.absentsDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 129, { align: 'right' });

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("Taxable Income Base for Gov Deductions", 115, 138);
            doc.text(`PHP ${((hist.grossPay || 0) - (hist.allowances || 0) - (hist.bonuses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 138, { align: 'right' });
            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);

            doc.setFont("helvetica", "bold");
            doc.text("TOTAL DEDUCTIONS", 115, 145);
            doc.text(`PHP ${(hist.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 145, { align: 'right' });

            // Take Home Pay Box
            doc.setFillColor(241, 245, 249);
            doc.rect(15, 155, 180, 20, 'F');
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text("NET TAKE-HOME PAY:", 25, 168);
            doc.setTextColor(34, 197, 94); // Success Green
            doc.text(`PHP ${(hist.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, 168, { align: 'right' });

            // Employer's Share Section
            doc.setTextColor(120, 120, 120);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("EMPLOYER'S GOV'T CONTRIBUTIONS (Informational)", 15, 185);
            doc.line(15, 187, 195, 187);
            doc.setFont("helvetica", "normal");
            doc.text(`SSS ER: PHP ${hist.sssER || 0} | PhilHealth ER: PHP ${hist.philhealthER || 0} | HDMF ER: PHP ${hist.hdmfER || 0}`, 15, 193);
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
                    <div className="btn-group p-1 rounded-3" style={{ background: 'var(--theme-input-bg)' }}>
                        <button onClick={() => setHrTab('directory')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'directory' ? 'shadow-sm fw-bold' : 'text-muted'}`} style={{ background: hrTab === 'directory' ? 'var(--theme-card-bg)' : 'transparent', color: hrTab === 'directory' ? 'var(--theme-content-text)' : 'inherit' }}>
                            <img src={directoryIcon} alt="Directory Icon" style={{ width: '16px' }} />Directory</button>
                        <button onClick={() => setHrTab('payroll')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'payroll' ? 'shadow-sm fw-bold' : 'text-muted'}`} style={{ background: hrTab === 'payroll' ? 'var(--theme-card-bg)' : 'transparent', color: hrTab === 'payroll' ? 'var(--theme-content-text)' : 'inherit' }}>
                            <img src={payrollIcon} alt="Payroll Icon" style={{ width: '16px' }} />Payroll</button>
                        <button onClick={() => setHrTab('analytics')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'analytics' ? 'shadow-sm fw-bold' : 'text-muted'}`} style={{ background: hrTab === 'analytics' ? 'var(--theme-card-bg)' : 'transparent', color: hrTab === 'analytics' ? 'var(--theme-content-text)' : 'inherit' }}>
                            <img src={analyticsIcon} alt="Analytics Icon" style={{ width: '16px' }} />Analytics</button>
                        <button onClick={() => setHrTab('attendance')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${hrTab === 'attendance' ? 'shadow-sm fw-bold' : 'text-muted'}`} style={{ background: hrTab === 'attendance' ? 'var(--theme-card-bg)' : 'transparent', color: hrTab === 'attendance' ? 'var(--theme-content-text)' : 'inherit' }}>
                            <img src={attendanceIcon} alt="Attendance Icon" style={{ width: '16px' }} />Attendance History</button>
                        <button onClick={() => setHrTab('leaves')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 position-relative ${hrTab === 'leaves' ? 'shadow-sm fw-bold' : 'text-muted'}`} style={{ background: hrTab === 'leaves' ? 'var(--theme-card-bg)' : 'transparent', color: hrTab === 'leaves' ? 'var(--theme-content-text)' : 'inherit' }}>
                            {leaveLogs.filter(l => l.status === 'Pending').length > 0 && (
                                <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.5rem', padding: '2px 5px', marginTop: '4px' }}>{leaveLogs.filter(l => l.status === 'Pending').length}</span>
                            )}
                            Leaves</button>
                    </div>
                    {hrTab === 'directory' && (
                        <div className="d-flex gap-2">
                            <button
                                id="btn-backfill-employee-ids"
                                onClick={async () => {
                                    try {
                                        const res = await axios.post(`${API_BASE}/employees/backfill-ids`, {}, { headers: authHeaders(), withCredentials: true });
                                        Swal.fire({
                                            title: res.data.updated > 0 ? `Fixed ${res.data.updated} ID(s)!` : 'All Good!',
                                            text: res.data.message,
                                            icon: 'success',
                                            toast: true,
                                            position: 'top-end',
                                            timer: 3500,
                                            showConfirmButton: false,
                                            background: '#002525',
                                            color: '#FAFAFA'
                                        });
                                        fetchEmployees();
                                        fetchPayroll();
                                    } catch (err) {
                                        Swal.fire('Error', err.response?.data?.message || 'Failed to backfill IDs.', 'error');
                                    }
                                }}
                                className="btn btn-sm px-3 shadow-sm rounded-3"
                                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem' }}
                                title="Assign IDs to employees that are missing one"
                            >
                                Fix Missing IDs
                            </button>
                            <button onClick={() => openAdd()} className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3">
                                + Add Employee
                            </button>
                        </div>
                    )}
                    {hrTab === 'leaves' && (
                        <button onClick={() => setShowLeaveModal(true)} className="btn btn-record-expenses brand-primary btn-sm px-3 shadow-sm rounded-3">
                            + File Leave
                        </button>
                    )}
                </div>
            </div>

            {/* ── DIRECTORY TAB ── */}
            {hrTab === 'directory' && (
                <>
                    {/* Human Resource cards */}
                    <div className="row g-3 mb-4">
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <div className="col-6 col-md-3" key={i}><KPICardSkeleton /></div>
                            ))
                            : [
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
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-dark-secondary">Employee Directory</h6>
                        </div>
                        <div className="card-body p-0">
                            {isLoading ? (
                                <div className="p-4"><HRISSkeleton /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light text-dark-gray400">
                                            <tr>
                                                <th className="ps-4 py-3">ID</th>
                                                <th>Name</th>
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
                                                    <tr key={emp._id} onClick={() => fetchEmployeeHistory(emp)} style={{ cursor: 'pointer' }}>
                                                        <td className="ps-4 text-muted fw-bold" style={{ fontSize: '0.8rem' }}>
                                                            {getEmpId(emp)}
                                                        </td>
                                                        <td>
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
                                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(activeShift._id); }} className="btn btn-cancel btn-sm rounded-circle border-0 shadow-sm" title="Cancel Session">
                                                                                    <span className="bi bi-x-circle text-danger" style={{ fontSize: '0.85rem' }}>X</span>
                                                                                </button>
                                                                                <button onClick={(e) => { e.stopPropagation(); openEditAttendance(activeShift); }} className="btn btn-edit btn-sm rounded-circle border-0 shadow-sm" title="Adjust Time">
                                                                                    <img src={editIcon} alt="Edit" style={{ width: '12px' }} />
                                                                                </button>
                                                                            </div>
                                                                            <small className="text-muted" style={{ fontSize: '0.62rem' }}>Since {new Date(activeShift.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                                        </div>
                                                                    );
                                                                }

                                                                if (isCompletedToday) {
                                                                    return (
                                                                        <div className="d-flex flex-column gap-1">
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <span className="badge rounded-pill bg-light text-muted border px-3 py-1" style={{ fontSize: '0.63rem', width: 'fit-content' }}>
                                                                                    Shift Done
                                                                                </span>
                                                                                <button onClick={(e) => { e.stopPropagation(); openEditAttendance(isCompletedToday); }} className="btn btn-sm btn-outline-secondary rounded-pill p-1 border-0" title="Adjust Time">
                                                                                    <i className="bi bi-pencil-square" style={{ fontSize: '0.85rem' }}></i>
                                                                                </button>
                                                                            </div>
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
                </>
            )}

            {/* ── LEAVES TAB ── */}
            {hrTab === 'leaves' && (() => {
                const pendingCount = leaveLogs.filter(l => l.status === 'Pending').length;
                const approvedToday = leaveLogs.filter(l => l.status === 'Approved' && l.startDate <= new Date().toLocaleDateString('en-CA') && l.endDate >= new Date().toLocaleDateString('en-CA')).length;
                const filteredLeavesByStatus = leaveLogs.filter(l => leaveFilter === 'All' || l.status === leaveFilter);
                const filteredLeaves = filterDataBySearch(filteredLeavesByStatus, leaveSearch, ['employee.fullName', 'leaveType', 'reason'], ['startDate', 'endDate']);

                return (
                    <div className="animate-fade-in">
                        {/* KPI Summary Cards (Matched to HRIS Main Card Design) */}
                        <div className="row g-3 mb-4">
                            {isLeaveLoading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                    <div className="col-6 col-md-3" key={i}><KPICardSkeleton /></div>
                                ))
                                : [
                                    { title: 'Pending Requests', value: pendingCount, color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)', dot: '#f59e0b', icon: '⏳', desc: 'Awaiting admin review' },
                                    { title: 'On Leave Today', value: approvedToday, color: '#22c55e', bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)', dot: '#22c55e', icon: '🏙️', desc: 'Currently out of office' },
                                    { title: 'Total Filed', value: leaveLogs.length, color: '#23A0CE', bg: 'linear-gradient(135deg,#23A0CE15,#23A0CE05)', dot: '#23A0CE', icon: '📋', desc: 'All time leave records' },
                                    { title: 'Rejected', value: leaveLogs.filter(l => l.status === 'Rejected').length, color: '#ef4444', bg: 'linear-gradient(135deg,#ef444415,#ef444405)', dot: '#ef4444', icon: '❌', desc: 'Denied or revoked requests' },
                                ].map((card, i) => (
                                    <div className="col-6 col-md-3" key={i}>
                                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: 'var(--theme-card-bg)' }}>
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
                                ))
                            }
                        </div>

                        {/* Filter + Search Bar */}
                        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                            <div className="btn-group p-1 rounded-pill shadow-none" style={{ background: 'var(--theme-input-bg)' }}>
                                {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                                    <button key={f} onClick={() => setLeaveFilter(f)} className={`btn btn-sm px-3 rounded-pill border-0 ${leaveFilter === f ? 'btn-save shadow-sm' : 'text-muted'}`} style={{ fontSize: '0.8rem' }}>{f}</button>
                                ))}
                            </div>
                            <SharedSearchBar
                                searchTerm={leaveSearch}
                                onDebouncedSearch={setLeaveSearch}
                                placeholder="Search by name..."
                                width="180px"
                            />
                        </div>

                        {/* Leave Records Table */}
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            {isLeaveLoading ? (
                                <div className="p-4"><HRISSkeleton /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.84rem' }}>
                                        <thead className="bg-light text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                            <tr>
                                                <th className="ps-4 py-3">Employee</th>
                                                <th>Leave Type</th>
                                                <th>Date Range</th>
                                                <th>Days</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th className="pe-4 text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLeaves.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-5 text-muted">No leave records found.</td></tr>
                                            ) : filteredLeaves.map(leave => {
                                                const emp = leave.employee;
                                                const roleStyle = ROLE_COLORS[emp?.role] || ROLE_COLORS.employee;
                                                const sl = emp?.leaveBalances?.sickLeave || { allocated: 5, used: 0 };
                                                const vl = emp?.leaveBalances?.vacationLeave || { allocated: 5, used: 0 };
                                                const statusColor = leave.status === 'Approved' ? '#22c55e' : leave.status === 'Pending' ? '#f59e0b' : '#ef4444';
                                                const ltColor = leave.leaveType === 'Sick Leave' ? '#ef4444' : leave.leaveType === 'Vacation Leave' ? '#23A0CE' : '#9ca3af';
                                                return (
                                                    <tr key={leave._id}>
                                                        <td className="ps-4">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 34, height: 34, background: roleStyle.bg, color: roleStyle.color, fontSize: '0.85rem', flexShrink: 0 }}>
                                                                    {(emp?.fullName || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="fw-semibold text-dark-secondary" style={{ fontSize: '0.85rem' }}>{emp?.fullName || 'Unknown'}</div>
                                                                    <small className="text-muted" style={{ fontSize: '0.68rem' }}>
                                                                        SL: {sl.allocated - sl.used}/{sl.allocated} · VL: {vl.allocated - vl.used}/{vl.allocated}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="badge rounded-pill px-3 py-1" style={{ background: `${ltColor}15`, color: ltColor, fontSize: '0.72rem', border: `1px solid ${ltColor}30` }}>
                                                                {leave.leaveType}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold text-dark-secondary" style={{ fontSize: '0.82rem' }}>{leave.startDate}</div>
                                                            {leave.startDate !== leave.endDate && <small className="text-muted">to {leave.endDate}</small>}
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-light text-dark border rounded-pill px-2">{leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}</span>
                                                        </td>
                                                        <td className="text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                            {leave.reason || <span className="text-muted fst-italic">—</span>}
                                                        </td>
                                                        <td>
                                                            <span className="badge rounded-pill px-3 py-1" style={{ background: `${statusColor}15`, color: statusColor, fontSize: '0.72rem', border: `1px solid ${statusColor}30` }}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                        <td className="pe-4 text-end">
                                                            <div className="d-flex gap-1 justify-content-end">
                                                                {leave.status === 'Pending' && (
                                                                    <>
                                                                        <button onClick={() => handleLeaveStatus(leave._id, 'Approved')} className="btn btn-sm px-3 rounded-pill fw-bold" style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>Approve</button>
                                                                        <button onClick={() => handleLeaveStatus(leave._id, 'Rejected')} className="btn btn-sm px-3 rounded-pill fw-bold" style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>Reject</button>
                                                                    </>
                                                                )}
                                                                {leave.status === 'Approved' && (
                                                                    <button onClick={() => handleLeaveStatus(leave._id, 'Rejected')} className="btn btn-sm px-2 rounded-pill" style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Revoke</button>
                                                                )}
                                                                <button onClick={() => handleDeleteLeave(leave._id)} className="btn btn-sm p-1 rounded-circle border-0 bg-transparent" title="Delete"><img src={deleteIcon} alt="Delete" style={{ width: 16 }} /></button>
                                                            </div>
                                                            {leave.adminRemarks && <small className="text-muted d-block text-end mt-1" style={{ fontSize: '0.65rem' }}>{leave.adminRemarks}</small>}
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
                );
            })()}

            {/* ── FILE LEAVE MODAL ── */}
            {showLeaveModal && (
                <AdminModalWrapper show={showLeaveModal} onClose={() => setShowLeaveModal(false)} dialogStyle={{ maxWidth: 520 }}>
                    <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                        <div className="modal-header border-0 px-4 pt-4 pb-2" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                            <div>
                                <h5 className="fw-bold text-white mb-0">File a Leave Request</h5>
                                <small className="text-secondary">Admin filing on staff behalf</small>
                            </div>
                            <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowLeaveModal(false)} />
                        </div>
                        <form onSubmit={handleFileLeave}>
                            <div className="modal-body px-4 py-4">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Employee</label>
                                    <select className="form-select rounded-3" value={leaveForm.employeeId} onChange={e => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} required>
                                        <option value="">-- Select Employee --</option>
                                        {employees.filter(e => e.role !== 'detailer').map(e => (
                                            <option key={e._id} value={e._id}>{e.fullName} ({e.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Leave Type</label>
                                    <select className="form-select rounded-3" value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}>
                                        <option value="Sick Leave">Sick Leave (Paid)</option>
                                        <option value="Vacation Leave">Vacation Leave (Paid)</option>
                                        <option value="Unpaid Leave">Unpaid Leave</option>
                                    </select>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Start Date</label>
                                        <input type="date" className="form-control rounded-3" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>End Date</label>
                                        <input type="date" className="form-control rounded-3" value={leaveForm.endDate} min={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Reason <span className="text-muted fw-normal">(Optional)</span></label>
                                    <textarea className="form-control rounded-3" rows={3} placeholder="e.g. Flu, Family emergency, Personal rest..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} style={{ fontSize: '0.85rem', resize: 'none' }} />
                                </div>
                                {leaveForm.leaveType !== 'Unpaid Leave' && (
                                    <div className="p-3 rounded-3" style={{ background: 'rgba(35,160,206,0.06)', border: '1px dashed rgba(35,160,206,0.3)' }}>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Upon <b>Approval</b>, the system will automatically create a paid attendance log for each working day in this range, so payroll picks it up correctly.</small>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-0 px-4 pb-4 pt-0">
                                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-save rounded-pill px-4" disabled={isFilingLeave}>{isFilingLeave ? 'Filing...' : 'File Leave'}</button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
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
                            <div className="btn-group shadow-sm ">
                                {['today', 'week', 'month'].map(p => (
                                    <button key={p} onClick={() => setPayrollPeriod(p)} className={`btn btn-sm btn-active ${payrollPeriod === p ? 'btn-save' : 'btn-outline-secondary'} text-capitalize`}>{p}</button>
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
                                                    <button onClick={() => setReviewViewMode('grid')} className={`btn btn-sm px-3 rounded-pill border-0 ${reviewViewMode === 'grid' ? 'btn-save text-primary shadow-sm' : 'text-muted'}`}>Grid</button>
                                                    <button onClick={() => setReviewViewMode('list')} className={`btn btn-sm px-3 rounded-pill border-0 ${reviewViewMode === 'list' ? 'btn-save text-primary shadow-sm' : 'text-muted'}`}>List</button>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                                <SharedSearchBar
                                                    searchTerm={detSearch}
                                                    onDebouncedSearch={setDetSearch}
                                                    placeholder="Search detailers..."
                                                    width="150px"
                                                />
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
                                                <p className="text-muted mb-0">No detailers found matching your "<strong className='fw-bold'>{detSearch}</strong>"</p>
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
                                                                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 44, height: 44, background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '1.2rem', flexShrink: 0 }}>
                                                                            {getEmpName(detailer).charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{getEmpName(detailer)}</div>
                                                                            <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: '0.62rem' }}>{detailer.employeeId}</span>
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
                                                                            <div className="p-2 rounded-3" style={{ background: 'var(--theme-card-bg)' }}>
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
                                                <SharedSearchBar
                                                    searchTerm={staffSearch}
                                                    onDebouncedSearch={setStaffSearch}
                                                    placeholder="Search staff..."
                                                    width="150px"
                                                />
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
                                                <p className="text-muted small mb-0">No Staff Records Found matching your "<strong className='fw-bold'>{staffSearch}</strong>"</p>
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
                                                                            {p.nonTaxableAllowance > 0 && <span className="ms-1 fw-bold" style={{ color: '#9333ea' }}>| +₱{p.nonTaxableAllowance.toLocaleString()} Allw.</span>}
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
                                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: 44, height: 44, background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '1.2rem', flexShrink: 0 }}>
                                                                                {p.fullName.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="fw-bold text-dark-secondary" style={{ fontSize: '0.95rem' }}>{p.fullName}</div>
                                                                                <div className="d-flex gap-1 align-items-center">
                                                                                    <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.12)', color: '#23A0CE', fontSize: '0.62rem' }}>{p.employeeId}</span>
                                                                                    <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.12)', color: '#23A0CE', fontSize: '0.62rem' }}>{p.role}</span>
                                                                                    <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.62rem' }}>{p.frequency}</span>
                                                                                    {p.nonTaxableAllowance > 0 && <span className="badge rounded-pill border" style={{ background: 'rgba(147,51,234,0.08)', color: '#9333ea', borderColor: 'rgba(147,51,234,0.2)', fontSize: '0.62rem' }}>+₱{p.nonTaxableAllowance.toLocaleString()} Allowance</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-end">
                                                                            <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Net Pay</div>
                                                                            <div className="fw-bold text-dark-secondary" style={{ fontSize: '1.2rem' }}>₱{p.netAmount.toFixed(2)}</div>
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
                                                                                    {p.stats.ndHours || 0}h <span className="opacity-75" style={{ fontSize: '0.65rem' }}>₱{(p.stats.ndPay || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-4">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(56,189,248,0.08)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>Holiday Pay</div>
                                                                                <div className="fw-bold text-info" style={{ fontSize: '0.85rem' }}>₱{p.stats.holidayPay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-6">
                                                                            <div className="p-2 rounded-3" style={{ background: 'rgba(239,68,68,0.06)' }}>
                                                                                <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>Gov Deduct</div>
                                                                                <div className="fw-bold text-danger" style={{ fontSize: '0.95rem' }}>₱{(p.stats.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
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
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden flex-column" style={{ minHeight: '762px' }}>
                                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center ">
                                            <div className="d-flex align-items-center gap-3">
                                                <h6 className="fw-bold text-dark-secondary mb-0"><i className="bi bi-clock-history me-2"></i>Staff Payout Ledger</h6>
                                                <span className="badge bg-light text-muted fw-normal" style={{ fontSize: '0.72rem', border: '1px solid #e9ecef' }}>
                                                    Total Records: {payoutHistory.length}
                                                </span>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                                <SharedSearchBar
                                                    searchTerm={ledgerSearch}
                                                    onDebouncedSearch={setLedgerSearch}
                                                    placeholder="Search records..."
                                                    width="220px"
                                                />
                                            </div>
                                        </div>
                                        <div className="table-responsive flex-grow-1">
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
                                                        <tr><td colSpan="7" className="text-center p-5 text-muted">No payout recordings found matching your "<strong className='fw-bold'>{ledgerSearch}</strong>"</td></tr>
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
                                                        <img src={leftArrowIcon} style={{ width: '10px', opacity: ledgerCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
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
                                                        <img src={rightArrowIcon} style={{ width: '10px', opacity: ledgerCurrentPage * ledgerPerPage >= filteredLedger.length ? 0.3 : 0.7 }} alt="next" />
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
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" style={{ minHeight: '705px' }}>
                        <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <h6 className="mb-0 fw-bold text-dark-secondary">Live Shift Management</h6>
                                <p className="text-muted small mb-0">Adjust holiday status and approve overtime for recent sessions</p>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                <SharedSearchBar
                                    searchTerm={attendanceSearch}
                                    onDebouncedSearch={setAttendanceSearch}
                                    placeholder="Search detailers..."
                                    width="150px"
                                />
                                <button onClick={() => setShowHolidayModal(true)} className="btn btn-sm btn-outline-secondary px-3 rounded-pill shadow-sm category-tags">
                                    Manage Holidays
                                </button>
                                <button onClick={fetchAttendance} className="btn btn-sm  shadow-sm px-3 rounded-pill text-muted d-flex align-items-center justify-content-center" style={{ background: 'var(--theme-card-bg)' }}>
                                    <img src={refreshIcon} alt="Refresh" style={{ width: 14 }} />
                                </button>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {isAttendanceLoading ? (
                                <div className="p-0"><TableSkeleton /></div>
                            ) : filteredAttendance.length === 0 ? (
                                <div className="p-5 text-center text-muted">No attendance activity found matching your "<strong className='fw-bold'>{attendanceSearch}</strong>"</div>
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
                                            {filteredAttendance.slice((attendanceCurrentPage - 1) * attendancePerPage, attendanceCurrentPage * attendancePerPage).map((log) => {
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
                                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                                                {isActive ? (
                                                                    <span className="badge rounded-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Currently Working</span>
                                                                ) : (
                                                                    <span className="badge rounded-pill bg-light text-muted border">Completed Shift</span>
                                                                )}
                                                                <button onClick={() => openEditAttendance(log)} className="btn btn-sm border-0 p-1" title="Adjust Session">
                                                                    <img src={editIcon} alt="Edit" style={{ width: 14 }} />
                                                                </button>
                                                                <button onClick={() => handleDeleteAttendance(log._id)} className="btn btn-sm border-0 p-1" title="Cancel Session">
                                                                    <img src={deleteIcon} alt="Cancel" style={{ width: 14 }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        {filteredAttendance.length > attendancePerPage && (
                            <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
                                <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                                    Showing {(attendanceCurrentPage - 1) * attendancePerPage + 1} to {Math.min(attendanceCurrentPage * attendancePerPage, filteredAttendance.length)} of {filteredAttendance.length} entries
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <button
                                        className="btn btn-sm p-0 rounded-circle border-0"
                                        disabled={attendanceCurrentPage === 1}
                                        onClick={() => setAttendanceCurrentPage(attendanceCurrentPage - 1)}
                                        style={{ width: '32px', height: '32px', background: attendanceCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={leftArrowIcon} style={{ width: '10px', opacity: attendanceCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                    </button>
                                    {getPaginationRange(attendanceCurrentPage, Math.ceil(filteredAttendance.length / attendancePerPage)).map((p, idx) => (
                                        p === '...' ? (
                                            <span key={`dot-att-${idx}`} className="px-2 text-muted">...</span>
                                        ) : (
                                            <button
                                                key={`page-att-${p}`}
                                                onClick={() => setAttendanceCurrentPage(p)}
                                                className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${attendanceCurrentPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: attendanceCurrentPage === p ? '#23A0CE' : 'transparent' }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        className="btn btn-sm p-0 rounded-circle border-0"
                                        disabled={attendanceCurrentPage * attendancePerPage >= filteredAttendance.length}
                                        onClick={() => setAttendanceCurrentPage(attendanceCurrentPage + 1)}
                                        style={{ width: '32px', height: '32px', background: attendanceCurrentPage * attendancePerPage >= filteredAttendance.length ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={rightArrowIcon} style={{ width: '10px', opacity: attendanceCurrentPage * attendancePerPage >= filteredAttendance.length ? 0.3 : 0.7 }} alt="next" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── SECTION 2: ATTENDANCE AUDIT HISTORY (READ ONLY) ── */}
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ minHeight: '804px' }}>
                        <div className="card-header bg-white border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-dark-secondary">Attendance Audit History</h6>
                            <p className="text-muted small mb-0">Read-only historical view of all completed shifts</p>
                        </div>
                        <div className="card-body p-0">
                            {isAttendanceLoading ? (
                                <div className="p-0"><TableSkeleton /></div>
                            ) : filteredAttendance.filter(l => l.clockOutTime && l.durationMinutes > 0).length === 0 ? (
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
                                            {(() => {
                                                const completedLogs = filteredAttendance.filter(l => l.clockOutTime && l.durationMinutes > 0);
                                                return completedLogs.slice((auditCurrentPage - 1) * auditPerPage, auditCurrentPage * auditPerPage).map((log) => (
                                                    <tr
                                                        key={log._id}
                                                        onClick={() => { setSelectedCompLog(log); setShowCompModal(true); }}
                                                        style={{ cursor: 'pointer' }}
                                                        className="hover-bg-light"
                                                    >
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
                                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                                                <div className="text-end me-2">
                                                                    <div className="text-dark-secondary fw-bold fs-6" style={{ color: '#059669' }}>₱{getDailyPay(log).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                    <small className="text-muted" style={{ fontSize: '0.6rem' }}>Daily Net Pay</small>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openEditAttendance(log); }}
                                                                    className="btn btn-sm border-0 p-1 rounded-circle"
                                                                    title="Adjust Record"
                                                                    style={{ width: '28px', height: '28px' }}
                                                                >
                                                                    <img src={editIcon} alt="Edit" style={{ width: 12 }} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(log._id); }}
                                                                    className="btn btn-sm border-0 p-1  rounded-circle"
                                                                    title="Remove Record"
                                                                    style={{ width: '28px', height: '28px' }}
                                                                >
                                                                    <img src={deleteIcon} alt="Delete" style={{ width: 12 }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        {(() => {
                            const completedLogs = filteredAttendance.filter(l => l.clockOutTime && l.durationMinutes > 0);
                            if (completedLogs.length > auditPerPage) {
                                return (
                                    <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
                                        <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                                            Showing {(auditCurrentPage - 1) * auditPerPage + 1} to {Math.min(auditCurrentPage * auditPerPage, completedLogs.length)} of {completedLogs.length}
                                        </div>
                                        <div className="d-flex align-items-center gap-1">
                                            <button
                                                className="btn btn-sm p-0 rounded-circle border-0"
                                                disabled={auditCurrentPage === 1}
                                                onClick={() => setAuditCurrentPage(auditCurrentPage - 1)}
                                                style={{ width: '32px', height: '32px', background: auditCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                            >
                                                <img src={leftArrowIcon} style={{ width: '10px', opacity: auditCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                            </button>
                                            {getPaginationRange(auditCurrentPage, Math.ceil(completedLogs.length / auditPerPage)).map((p, idx) => (
                                                p === '...' ? (
                                                    <span key={`dot-audit-${idx}`} className="px-2 text-muted">...</span>
                                                ) : (
                                                    <button
                                                        key={`page-audit-${p}`}
                                                        onClick={() => setAuditCurrentPage(p)}
                                                        className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${auditCurrentPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                        style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: auditCurrentPage === p ? '#23A0CE' : 'transparent' }}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            ))}
                                            <button
                                                className="btn btn-sm p-0 rounded-circle border-0"
                                                disabled={auditCurrentPage * auditPerPage >= completedLogs.length}
                                                onClick={() => setAuditCurrentPage(auditCurrentPage + 1)}
                                                style={{ width: '32px', height: '32px', background: auditCurrentPage * auditPerPage >= completedLogs.length ? '#f1f5f9' : 'transparent' }}
                                            >
                                                <img src={rightArrowIcon} style={{ width: '10px', opacity: auditCurrentPage * auditPerPage >= completedLogs.length ? 0.3 : 0.7 }} alt="next" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}


            {/* ── ADD / EDIT EMPLOYEE MODAL ── */}
            {showModal && (
                <AdminModalWrapper show={showModal} onClose={() => setShowModal(false)} size="lg">
                    <div className="modal-content rounded-4 border-0 shadow-lg">
                        <div className="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="modal-title fw-bold text-dark-secondary mb-1">{editingEmp ? 'Update Profile' : 'New Employee'}</h4>
                                <p className="text-muted small mb-0">{editingEmp ? 'Refine staff credentials and access' : 'Enter details to onboard a new staff member'}</p>
                            </div>
                            <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)} />
                        </div>
                        <div className="modal-body p-4">
                            {/* SECTION: PERSONAL INFORMATION */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <h6 className="fw-bold text-dark-secondary mb-0">Basic Information</h6>
                                </div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Full Name</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" placeholder="e.g. John Doe" value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} required />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Email Address</label>
                                        <input type="email" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" placeholder="e.g. john@sandigan.com" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Contact Number</label>
                                        <input type="text" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" placeholder="0912-XXX-XXXX" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Age</label>
                                        <input type="number" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.age} onChange={(e) => setEmpForm({ ...empForm, age: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Hired Date</label>
                                        <input type="date" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.hiredDate} onChange={(e) => setEmpForm({ ...empForm, hiredDate: e.target.value })} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Complete Address</label>
                                        <textarea className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" rows="2" value={empForm.address} onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}></textarea>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4 opacity-50" />

                            {/* SECTION: WORK & SCHEDULE */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center gap-2 mb-3">

                                    <h6 className="fw-bold text-dark-secondary mb-0">Role & Schedule</h6>
                                </div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Designated Role</label>
                                        <select className="form-select rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}>
                                            <option value="employee">Employee (Staff Dashboard access)</option>
                                            <option value="admin">Administrator (Full Access)</option>
                                            <option value="detailer">Service Detailer (Payroll Only)</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Staff Status</label>
                                        <select className="form-select rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.status} onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}>
                                            <option value="Active">Active / Working</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Sick">Sick / Medical</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Shift Schedule</label>
                                        <select className="form-select rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.shiftType} onChange={(e) => setEmpForm({ ...empForm, shiftType: e.target.value })}>
                                            <option value="None">No Regular Shift</option>
                                            <option value="Morning">Morning Shift (8H)</option>
                                            <option value="Night">Night Shift (8H)</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Shift Start Time</label>
                                        <div className="input-group">

                                            <input type="text" className="form-control border-start-0 rounded-end-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.shiftStartTime} onChange={(e) => setEmpForm({ ...empForm, shiftStartTime: e.target.value })} placeholder="08:00 AM" />
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Weekly Rest Day</label>
                                        <select className="form-select rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.restDay} onChange={(e) => setEmpForm({ ...empForm, restDay: e.target.value })}>
                                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4 opacity-50" />

                            {/* SECTION: PAYROLL & GOVERNMENT IDs */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center gap-2 mb-3">

                                    <h6 className="fw-bold text-dark-secondary mb-0">Salary & Government IDs</h6>
                                </div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Monthly Base Salary (₱)</label>
                                        <input type="number" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Payment Frequency</label>
                                        <select className="form-select rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.salaryFrequency} onChange={(e) => setEmpForm({ ...empForm, salaryFrequency: e.target.value })}>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Bi-Weekly">Bi-Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Non-Taxable Allowance (₱)</label>
                                        <input type="number" className="form-control rounded-3 shadow-none border-light-subtle bg-light-subtle" value={empForm.nonTaxableAllowance} onChange={(e) => setEmpForm({ ...empForm, nonTaxableAllowance: e.target.value })} />
                                    </div>

                                    <div className="col-12 col-md-6 mt-3">
                                        <div className="card border-0 rounded-4 bg-light-subtle p-3">
                                            <div className="row g-3">
                                                <div className="col-6">
                                                    <label className="form-label text-muted x-small text-uppercase fw-bold mb-1">SSS Number</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2 shadow-none border-light" placeholder="XX-XXXXXXXXX-X" value={empForm.sssNo} onChange={(e) => setEmpForm({ ...empForm, sssNo: e.target.value })} />
                                                </div>
                                                <div className="col-6">
                                                    <label className="form-label text-muted x-small text-uppercase fw-bold mb-1">TIN Number</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2 shadow-none border-light" placeholder="XXX-XXX-XXX" value={empForm.tinNo} onChange={(e) => setEmpForm({ ...empForm, tinNo: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6 mt-3">
                                        <div className="card border-0 rounded-4 bg-light-subtle p-3">
                                            <div className="row g-3">
                                                <div className="col-6">
                                                    <label className="form-label text-muted x-small text-uppercase fw-bold mb-1">PhilHealth No.</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2 shadow-none border-light" placeholder="XX-XXXXXXXXX-X" value={empForm.philhealthNo} onChange={(e) => setEmpForm({ ...empForm, philhealthNo: e.target.value })} />
                                                </div>
                                                <div className="col-6">
                                                    <label className="form-label text-muted x-small text-uppercase fw-bold mb-1">Pag-IBIG ID</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2 shadow-none border-light" placeholder="XXXX-XXXX-XXXX" value={empForm.pagibigNo} onChange={(e) => setEmpForm({ ...empForm, pagibigNo: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: LOGIN ACCOUNT */}
                            <div className="px-4 py-3 bg-light rounded-4 mt-2">
                                <div className="form-check form-switch d-flex align-items-center gap-3">
                                    <input className="form-check-input shadow-none" type="checkbox" role="switch" id="accountSwitch" checked={empForm.hasAccount} onChange={(e) => setEmpForm({ ...empForm, hasAccount: e.target.checked })} />
                                    <label className="form-check-label fw-bold text-dark-secondary" htmlFor="accountSwitch">Enable Staff Login Account</label>
                                </div>
                                {empForm.hasAccount && (
                                    <div className="mt-3">
                                        <label className="form-label fw-semibold text-dark-secondary" style={{ fontSize: '0.83rem' }}>Login Password</label>
                                        <div className="input-group">
                                            <input type={showPassword ? 'text' : 'password'} className="form-control rounded-start-3 shadow-none border-light bg-white" placeholder="Min. 6 characters" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} />
                                            <button className="btn btn-outline-secondary rounded-end-3" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer border-0 p-4 pt-0">
                            <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-save rounded-pill px-5 shadow-sm fw-bold" onClick={handleSaveEmployee} disabled={isSaving}>
                                {isSaving ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
                                ) : (
                                    editingEmp ? 'Save Changes' : 'Create Employee'
                                )}
                            </button>
                        </div>
                    </div>
                </AdminModalWrapper>
            )}

            {/* ── PERFORMANCE HISTORY MODAL (UNIFIED) ── */}
            {showHistory && (
                <AdminModalWrapper show={showHistory} onClose={() => setShowHistory(false)} size="lg">
                    <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden" style={{ minHeight: '600px' }}>
                        <div className="modal-header border-0 pt-4 px-4 pb-0 d-flex flex-column align-items-start" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                            <div className="d-flex justify-content-between w-100 align-items-start mb-3">
                                <div>
                                    <h4 className="modal-title fw-bold text-white mb-1">Detailed Performance History</h4>
                                    <p className="text-light opacity-75 small mb-0">Performance summary for <span className="fw-bold">{getEmpName(historyEmp)}</span> <span className="badge bg-light text-dark ms-2" style={{ opacity: 0.9 }}>{getEmpId(historyEmp)}</span></p>
                                </div>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowHistory(false)} />
                            </div>
                            {/* Modal Tabs */}
                            <div className="d-flex gap-4 mt-2">
                                <button onClick={() => setHistoryTab('summary')} className={`btn btn-link text-decoration-none px-0 pb-2 border-0 rounded-0 ${historyTab === 'summary' ? 'text-white border-bottom border-primary fw-bold' : 'text-white opacity-50 small'}`} style={{ borderBottomWidth: '3px !important' }}>
                                    Work History
                                </button>
                                <button onClick={() => setHistoryTab('performance')} className={`btn btn-link text-decoration-none px-0 pb-2 border-0 rounded-0 ${historyTab === 'performance' ? 'text-white border-bottom border-primary fw-bold' : 'text-white opacity-50 small'}`} style={{ borderBottomWidth: '3px !important' }}>
                                    Performance & Skills
                                </button>
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
                                    {historyTab === 'summary' ? (
                                        <>
                                            {/* KPI Cards */}
                                            <div className="row g-3 mb-4">
                                                <div className="col-md-4">
                                                    <div className="p-3 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(35,160,206,0.04))', border: '1px solid rgba(34,197,94,0.1)' }}>
                                                        <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.6rem' }}>
                                                            {historyEmp?.role === 'detailer' ? 'Bookings Completed' : 'Sessions Done'}
                                                        </small>
                                                        <div className="d-flex align-items-baseline gap-2">
                                                            <h3 className="fw-bold text-success mb-0">{historyData.summary.bookingCount || 0}</h3>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-4">
                                                    <div className="p-3 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(35,160,206,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(35,160,206,0.1)' }}>
                                                        <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.6rem' }}>
                                                            {historyEmp?.role === 'detailer' ? 'Revenue Generated' : 'Total Work Hours'}
                                                        </small>
                                                        <div className="d-flex align-items-baseline gap-2">
                                                            <h3 className={historyEmp?.role === 'detailer' ? "fw-bold text-success mb-0" : "fw-bold mb-0"} style={{ color: historyEmp?.role === 'detailer' ? '' : '#2563eb' }}>
                                                                {historyEmp?.role === 'detailer' ? `₱${(historyData.summary.totalRevenue || 0).toLocaleString()}` : `${historyData.summary.totalRevenue || 0}h`}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-4">
                                                    <div className="p-3 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.03))', border: '1px solid rgba(245,158,11,0.15)' }}>
                                                        <small className="text-muted d-block text-uppercase fw-bold mb-2" style={{ letterSpacing: '0.8px', fontSize: '0.6rem' }}>
                                                            {historyEmp?.role === 'detailer' ? 'Commission' : 'Payout Total'}
                                                        </small>
                                                        <div className="d-flex align-items-baseline gap-2">
                                                            <h3 className="fw-bold mb-0" style={{ color: '#f59e0b' }}>
                                                                ₱{(historyData.summary.totalEarnings || 0).toLocaleString()}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Search Bar ── */}
                                            <div className="d-flex justify-content-end">
                                                <div className="mb-4" style={{ width: 300 }}>
                                                    <SharedSearchBar
                                                        searchTerm={historySearch}
                                                        onSearchChange={setHistorySearch}
                                                        onDebouncedSearch={setHistorySearchDebounced}
                                                        placeholder="Search History..."
                                                        width="100%"
                                                    />
                                                </div>
                                            </div>

                                            {(() => {
                                                const q = historySearchDebounced.toLowerCase().trim();
                                                const filtered = (historyData.history || []).filter(item => {
                                                    if (!q) return true;
                                                    // Accurate date search matching toLocaleDateString()
                                                    const itemDate = new Date(item.createdAt);
                                                    const dateStr = itemDate.toLocaleDateString().toLowerCase();
                                                    const monthName = itemDate.toLocaleString('default', { month: 'long' }).toLowerCase();
                                                    const monthShort = itemDate.toLocaleString('default', { month: 'short' }).toLowerCase();

                                                    const dateMatch = dateStr.includes(q) ||
                                                        monthName.includes(q) ||
                                                        monthShort.includes(q);

                                                    // Numeric partial date (e.g. "4/3")
                                                    let numericMatch = false;
                                                    if (q.includes('/')) {
                                                        const parts = q.split('/');
                                                        const m = parseInt(parts[0]);
                                                        const d = parseInt(parts[1]);
                                                        const y = parts[2] ? parseInt(parts[2]) : null;
                                                        if (!isNaN(m) && !isNaN(d)) {
                                                            numericMatch = (itemDate.getMonth() + 1 === m && itemDate.getDate() === d);
                                                            if (numericMatch && y) {
                                                                const fullYear = itemDate.getFullYear();
                                                                numericMatch = y < 100 ? (fullYear % 100 === y) : (fullYear === y);
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        dateMatch ||
                                                        numericMatch ||
                                                        (item.bookingId || '').toLowerCase().includes(q) ||
                                                        (item.customerName || '').toLowerCase().includes(q) ||
                                                        (item.vehicleType || '').toLowerCase().includes(q)
                                                    );
                                                });
                                                const totalPages = Math.ceil(filtered.length / historyPerPage);
                                                const paginated = filtered.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);
                                                return (
                                                    <div className="card rounded-4 border overflow-hidden d-flex flex-column" style={{ minHeight: 410, background: 'var(--theme-card-bg)' }}>
                                                        <div className="table-responsive flex-grow-1">
                                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                                                <thead className="bg-light text-muted sticky-top shadow-sm" style={{ zIndex: 1, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                                    <tr>
                                                                        <th className="ps-4 py-3 border-0">Date</th>
                                                                        <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'BookID' : 'RefID'}</th>
                                                                        <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'Customer' : 'Event'}</th>
                                                                        <th className="py-3 border-0">{historyEmp?.role === 'detailer' ? 'Vehicle' : 'Duration'}</th>
                                                                        <th className="pe-4 py-3 border-0 text-end">Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="border-top-0">
                                                                    {paginated.length > 0 ? (
                                                                        paginated.map((item, idx) => (
                                                                            <tr
                                                                                key={idx}
                                                                                onClick={() => { if (item.isAttendance && item.rawLog && item.rawLog.clockOutTime) { setSelectedCompLog({ ...item.rawLog, employee: historyEmp }); setShowCompModal(true); } }}
                                                                                style={{ cursor: item.isAttendance && item.rawLog && item.rawLog.clockOutTime ? 'pointer' : 'default' }}
                                                                                className={item.isAttendance && item.rawLog && item.rawLog.clockOutTime ? 'hover-bg-light transition-all' : ''}
                                                                            >
                                                                                <td className="ps-4 py-3 border-0">
                                                                                    <span className="fw-semibold text-dark-secondary">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                                                </td>
                                                                                <td className="text-muted fw-bold border-0">#{item.bookingId}</td>
                                                                                <td className="border-0">
                                                                                    <div className={`${item.isAttendance ? 'text-muted fw-bold' : 'text-dark-secondary fw-semibold'}`}>{item.customerName}</div>
                                                                                </td>
                                                                                <td className="border-0">
                                                                                    <span className="badge bg-light text-dark-secondary border px-2 py-1 rounded-3" style={{ fontSize: '0.7rem' }}>{item.vehicleType}</span>
                                                                                </td>
                                                                                <td className="pe-4 text-end fw-bold text-dark-secondary border-0">
                                                                                    ₱{(item.commission || item.price || 0).toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr><td colSpan="5" className="text-center py-5 text-muted fst-italic">
                                                                            {historySearch ? `No results for "${historySearch}"` : 'No work records found for this period.'}
                                                                        </td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* ── Pagination Footer ── */}
                                                        {filtered.length > historyPerPage && (
                                                            <div className="card-footer border-top py-2 d-flex justify-content-between align-items-center" style={{ background: 'transparent' }}>
                                                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                                    Showing {(historyPage - 1) * historyPerPage + 1}–{Math.min(historyPage * historyPerPage, filtered.length)} of {filtered.length}
                                                                </div>
                                                                <div className="d-flex align-items-center gap-1">
                                                                    <button
                                                                        className="btn btn-sm p-0 rounded-circle border-0"
                                                                        disabled={historyPage === 1}
                                                                        onClick={() => setHistoryPage(historyPage - 1)}
                                                                        style={{ width: '30px', height: '30px', background: historyPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                                    >
                                                                        <img src={leftArrowIcon} style={{ width: '9px', opacity: historyPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                                                    </button>
                                                                    {getPaginationRange(historyPage, totalPages).map((p, idx) => (
                                                                        p === '...' ? (
                                                                            <span key={`dot-h-${idx}`} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>...</span>
                                                                        ) : (
                                                                            <button
                                                                                key={`hp-${p}`}
                                                                                onClick={() => setHistoryPage(p)}
                                                                                className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${historyPage === p ? 'text-white shadow-sm' : 'text-muted'}`}
                                                                                style={{ width: '30px', height: '30px', fontSize: '0.78rem', background: historyPage === p ? '#23A0CE' : 'transparent' }}
                                                                            >
                                                                                {p}
                                                                            </button>
                                                                        )
                                                                    ))}
                                                                    <button
                                                                        className="btn btn-sm p-0 rounded-circle border-0"
                                                                        disabled={historyPage >= totalPages}
                                                                        onClick={() => setHistoryPage(historyPage + 1)}
                                                                        style={{ width: '30px', height: '30px', background: historyPage >= totalPages ? '#f1f5f9' : 'transparent' }}
                                                                    >
                                                                        <img src={rightArrowIcon} style={{ width: '9px', opacity: historyPage >= totalPages ? 0.3 : 0.7 }} alt="next" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <div className="row g-4 animate-fade-in">
                                            {/* Skills & Training Checklist */}
                                            <div className="col-md-5">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h6 className="fw-bold text-dark-secondary mb-0 d-flex align-items-center gap-2">
                                                        <i className="bi bi-patch-check text-primary"></i> Skills & Training
                                                    </h6>
                                                    <button
                                                        onClick={handleAddMasterSkill}
                                                        className="btn btn-sm border-0 brand-primary"
                                                        title="Manage master skills list"
                                                    >
                                                        <span className="bi bi-plus-lg">Add</span>
                                                    </button>
                                                </div>
                                                <div className="card border shadow-sm rounded-4 p-3 bg-light-subtle">
                                                    <div className="d-flex flex-column" style={{ maxHeight: '430px', overflowY: 'auto' }}>
                                                        {skillsMasterList.map(skill => (
                                                            <div key={skill} className="d-flex align-items-center justify-content-between hover-bg-light rounded-3 pe-2">
                                                                <label className="form-check d-flex align-items-center gap-2 p-2 mb-0 flex-grow-1" style={{ cursor: 'pointer' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input mt-0 ms-1"
                                                                        style={{ width: 17, height: 17 }}
                                                                        checked={skillsList.includes(skill)}
                                                                        onChange={() => handleUpdateSkills(skill)}
                                                                    />
                                                                    <span className={skillsList.includes(skill) ? 'fw-bold brand-primary' : 'text-muted'} style={{ fontSize: '0.82rem' }}>{skill}</span>
                                                                </label>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveMasterSkill(skill); }}
                                                                    className="btn btn-sm border-0 hover-opacity-100 p-0 px-2"
                                                                    style={{ transition: 'opacity 0.2s' }}
                                                                >
                                                                    <img src={deleteIcon} alt="Delete" style={{ width: 14 }} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {skillsMasterList.length === 0 && (
                                                            <small className="text-center text-muted p-4">No skills defined in system settings.</small>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Evaluations & Ratings */}
                                            <div className="col-md-7">
                                                <h6 className="fw-bold text-dark-secondary mb-3 d-flex align-items-center gap-2">
                                                    <i className="bi bi-star text-warning"></i> Add Evaluation
                                                </h6>
                                                <div className="card shadow-sm border rounded-4 p-3 mb-4">
                                                    <form onSubmit={handleSaveEvaluation}>
                                                        <div className="mb-3">
                                                            <label className="form-label small fw-bold text-muted">Performance Rating (1-5)</label>
                                                            <div className="d-flex gap-2">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => setPerformanceRating(star)}
                                                                        className="btn btn-sm p-0 m-0 border-0 bg-transparent"
                                                                    >
                                                                        <span className={`bi ${performanceRating >= star ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-4`}>★</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="form-label small fw-bold text-muted">Manager's Notes</label>
                                                            <textarea
                                                                className="form-control rounded-3"
                                                                placeholder="Write internal feedback..."
                                                                rows={3}
                                                                style={{ fontSize: '0.82rem', resize: 'none' }}
                                                                value={performanceComment}
                                                                onChange={e => setPerformanceComment(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <button type="submit" className="btn btn-save btn-sm rounded-pill px-4 float-end" disabled={isSavingPerformance}>
                                                            {isSavingPerformance ? 'Saving...' : 'Submit Review'}
                                                        </button>
                                                    </form>
                                                </div>

                                                <h6 className="fw-bold text-dark-secondary mb-3 small opacity-75">Recent Reviews</h6>
                                                <div className="pe-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                    {historyEmp?.evaluations?.length > 0 ? (
                                                        [...historyEmp.evaluations].reverse().map((evalItem, idx) => (
                                                            <div key={idx} className="p-3 bg-white border rounded-4 mb-3 shadow-sm border-start border-primary border-1">
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <div className="d-flex gap-1">
                                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                                            <span key={i} className={`bi bi-star-fill small ${evalItem.rating > i ? 'text-warning' : 'text-light'}`}>★</span>
                                                                        ))}
                                                                    </div>
                                                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>{new Date(evalItem.date).toLocaleDateString()}</small>
                                                                </div>
                                                                <p className="mb-1 text-dark-secondary" style={{ fontSize: '0.8rem' }}>"{evalItem.comment}"</p>
                                                                <small className="fw-bold brand-primary" style={{ fontSize: '0.7rem' }}>Reviewed by: {evalItem.reviewerName}</small>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-4 bg-light rounded-4">
                                                            <small className="text-muted italic">No performance reviews recorded yet.</small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="modal-footer border-0 p-4 pt-2">
                            <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowHistory(false)} style={{ background: isDark ? 'var(--theme-bg-secondary)' : '' }}>Close Summary</button>
                        </div>
                    </div>
                </AdminModalWrapper>
            )}

            {/* ── PAYOUT REVIEW MODAL ── */}
            {
                showPayoutModal && selectedPayoutStaff && (
                    <AdminModalWrapper show={showPayoutModal} onClose={() => setShowPayoutModal(false)} size="xl" dialogClassName="modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div className="modal-header border-0 bg-white pt-4 px-4 pb-2">
                                <div>
                                    <h4 className="fw-bold text-dark-secondary mb-1">Finalize Payout Review</h4>
                                    <p className="text-muted mb-0 small">Performance summary for <b className="brand-primary">{selectedPayoutStaff.fullName}</b> — {selectedPayoutStaff.frequency} Cycle</p>
                                </div>
                                <button onClick={() => setShowPayoutModal(false)} className="btn-close shadow-none" />
                            </div>

                            <div className="modal-body p-4 pt-2">
                                {/* KPI CARDS  */}
                                <div className="row row-cols-1 row-cols-md-5 g-3 mb-4">
                                    <div className="col">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: isDark ? 'var(--theme-card-bg)' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">Cycle Work Hours</div>
                                            <div className="d-flex align-items-baseline gap-2">
                                                <h3 className="fw-bold text-dark-secondary mb-0">₱{Math.round(selectedPayoutStaff.accruedBase || 0).toLocaleString()}</h3>
                                            </div>
                                            <small className="text-muted mt-1">
                                                {Math.round(selectedPayoutStaff.stats.totalHours).toLocaleString()}h / {selectedPayoutStaff.stats.targetHours}h
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: isDark ? 'var(--theme-card-bg)' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">OT, RD & Holiday</div>
                                            <h3 className="fw-bold brand-primary mb-0">
                                                ₱{Math.round((selectedPayoutStaff.stats.otPay || 0) + (selectedPayoutStaff.stats.holidayPay || 0) + (selectedPayoutStaff.stats.restDayPay || 0)).toLocaleString()}
                                            </h3>
                                            <small className="text-muted mt-1">
                                                {selectedPayoutStaff.stats.otHours}h OT
                                                {(selectedPayoutStaff.stats.restDayHours > 0) && <span style={{ color: '#f97316' }}> · {selectedPayoutStaff.stats.restDayHours}h RD</span>}
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: isDark ? 'var(--theme-card-bg)' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">NT Allowance</div>
                                            <h3 className="fw-bold mb-0" style={{ color: '#9333ea' }}>₱{Math.round(selectedPayoutStaff.nonTaxableAllowance || 0).toLocaleString()}</h3>
                                            <small className="text-muted mt-1">Fixed Cycle Benefit</small>
                                        </div>
                                    </div>
                                    <div className="col">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: isDark ? 'var(--theme-card-bg)' : 'linear-gradient(135deg, #fff7ed, #fff1f2)', border: '1px solid #fee2e2' }}>
                                            <div className="text-danger small fw-bold text-uppercase mb-2">Late & Absences</div>
                                            <h3 className="fw-bold text-danger mb-0">₱{Math.round(selectedPayoutStaff.stats.lateDeduction || 0).toLocaleString()}</h3>
                                            <small className="text-muted mt-1">{selectedPayoutStaff.stats.totalLateMinutes || 0}m Late | {selectedPayoutStaff.stats.absentCount || 0}d Absent</small>
                                        </div>
                                    </div>
                                    <div className="col">
                                        <div className="card h-100 border-0 rounded-4 p-4 shadow-sm" style={{ background: 'rgba(34,197,94,0.07)', border: '1px dashed rgba(34,197,94,0.3)' }}>
                                            <div className="text-muted small fw-bold text-uppercase mb-2">Final Net Payout</div>
                                            <h2 className="fw-bold text-success mb-0">₱{Math.round(selectedPayoutStaff.netAmount).toLocaleString()}</h2>
                                            <small className="text-muted mt-1">Net After Gov & Lates</small>
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
                                                                {(() => {
                                                                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                                    const restDayIdx = dayNames.indexOf(selectedPayoutStaff.restDay || 'Sunday');
                                                                    const isRestDay = new Date(log.clockInTime).getDay() === restDayIdx;
                                                                    if (isRestDay) return <span className="badge me-1" style={{ fontSize: '0.65rem', backgroundColor: '#f97316', color: '#fff' }}>Rest Day</span>;
                                                                    return null;
                                                                })()}
                                                                {log.otMinutes > 0 && log.isOTApproved && (
                                                                    <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.65rem' }}>
                                                                        +OT ({Math.floor(log.otMinutes / 60)}h {log.otMinutes % 60}m)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="pe-4 text-end">
                                                                ₱{getDailyPay({ ...log, employee: selectedPayoutStaff }).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                                                <span className="badge rounded-pill bg-white shadow-sm" style={{ fontSize: '0.75rem', color: 'var(--theme-content-text)' }}>FINAL PAYOUT</span>
                                                <p className="text-white-50 mb-0 small">This marks all current attendance logs as Settled and records a liquidation expense.</p>
                                            </div>
                                        </div>
                                        <div className="col-md-5 text-end">
                                            <div className="text-white-50 small mb-1">Total Net Liquidation</div>
                                            <h2 className="fw-bold text-white mb-0 lh-1">
                                                ₱{(selectedPayoutStaff.netAmount + payoutAdjustments.bonus - payoutAdjustments.deductions).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                    </AdminModalWrapper>
                )
            }

            {/* ── HOLIDAY MANAGEMENT MODAL ── */}
            {
                showHolidayModal && (
                    <AdminModalWrapper show={showHolidayModal} onClose={() => setShowHolidayModal(false)} size="lg">
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

                            <div className="modal-footer border-0 p-4 pt-2">
                                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowHolidayModal(false)}>Close Calendar</button>
                            </div>
                        </div>
                    </AdminModalWrapper>
                )
            }
            {/* ── ATTENDANCE EDIT MODAL (ADMIN OVERRIDE) ── */}
            {
                showAttendanceModal && editingAttendance && (
                    <AdminModalWrapper show={showAttendanceModal} onClose={() => setShowAttendanceModal(false)}>
                        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                            <div className="modal-header border-0 pt-4 px-4 pb-0">
                                <h5 className="modal-title fw-bold text-dark-secondary">Manual Attendance Correction</h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowAttendanceModal(false)} />
                            </div>
                            <div className="modal-body px-4 py-3">
                                <p className="text-muted small mb-4">Correcting attendance for <b className="text-dark-secondary">{getEmpName(editingAttendance.employee)}</b> on <b className="text-dark-secondary">{new Date(editingAttendance.dateStr).toLocaleDateString()}</b></p>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Clock In Timestamp</label>
                                    <input
                                        type="datetime-local"
                                        className="form-control rounded-3"
                                        value={attendanceForm.clockInTime}
                                        onChange={e => setAttendanceForm({ ...attendanceForm, clockInTime: e.target.value })}
                                    />
                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>Original: {new Date(editingAttendance.clockInTime).toLocaleString()}</small>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Clock Out Timestamp</label>
                                    <input
                                        type="datetime-local"
                                        className="form-control rounded-3"
                                        value={attendanceForm.clockOutTime}
                                        onChange={e => setAttendanceForm({ ...attendanceForm, clockOutTime: e.target.value })}
                                        placeholder="Set time to clock-out"
                                    />
                                    {editingAttendance.clockOutTime ? (
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Original: {new Date(editingAttendance.clockOutTime).toLocaleString()}</small>
                                    ) : (
                                        <small className="text-info fw-bold" style={{ fontSize: '0.7rem' }}>Session is ACTIVE. Setting a time will manually clock them out.</small>
                                    )}
                                </div>

                                <div className="p-3 rounded-4 bg-light border">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="bi bi-info-circle-fill text-primary"></i>
                                        <span className="fw-bold text-dark-secondary" style={{ fontSize: '0.8rem' }}>Automatic Recalculation</span>
                                    </div>
                                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                                        Saving these changes will automatically re-calculate the shift duration, overtime eligibility, and daily pay based on the employee's shift type.
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-4 pt-2">
                                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAttendanceModal(false)}>Discard</button>
                                <button
                                    type="button"
                                    className="btn btn-save rounded-pill px-4 shadow"
                                    onClick={() => handleUpdateAttendance(editingAttendance._id, attendanceForm)}
                                >
                                    Apply Correction
                                </button>
                            </div>
                        </div>
                    </AdminModalWrapper>
                )
            }
            {/* ── PAYROLL ADVICE MODAL ── */}
            {
                showCompModal && selectedCompLog && (() => {
                    const log = selectedCompLog;
                    const emp = log.employee || {};
                    const name = getEmpName(emp);
                    const date = new Date(log.dateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

                    // Calculations
                    let divisor = 26;
                    if (emp.salaryFrequency === 'Weekly') divisor = 6;
                    else if (emp.salaryFrequency === 'Bi-Weekly') divisor = 13;
                    else if (emp.salaryFrequency === 'Daily') divisor = 1;

                    const baseVal = Number(emp.baseSalary) || 0;
                    const dailyRate = (emp?.salaryFrequency === 'Daily') ? baseVal : (baseVal / divisor);
                    const hourlyRate = dailyRate / 8;

                    const { regMins, otMins, ndMins } = getPayableMinutes(log, emp);

                    const regPay = (regMins / 60) * hourlyRate;
                    let holidayBonus = 0;
                    let holidayOTBonus = 0;
                    let holidayMultLabel = "";

                    if (log.holidayType && log.holidayType !== 'None' && log.wasPresentYesterday) {
                        if (log.holidayType === 'Regular') {
                            holidayBonus = ((regMins / 60) * hourlyRate);
                            holidayOTBonus = ((otMins / 60) * hourlyRate * 1.30);
                            holidayMultLabel = "200% (Regular Holiday)";
                        } else if (log.holidayType === 'Special') {
                            holidayBonus = ((regMins / 60) * hourlyRate * 0.30);
                            holidayOTBonus = ((otMins / 60) * hourlyRate * 0.39);
                            holidayMultLabel = "130% (Special Non-Working)";
                        }
                    }

                    const standardOTPay = (otMins / 60) * (hourlyRate * 1.30);
                    const ndPay = (ndMins / 60) * (hourlyRate * 0.10);
                    const totalPay = getDailyPay(log);

                    return (
                        <AdminModalWrapper show={showCompModal} onClose={() => setShowCompModal(false)} size="lg">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                {/* Header */}
                                <div className="modal-header border-0 text-white p-4 d-flex justify-content-between align-items-start" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <h4 className="modal-title fw-bold mb-0">{name}</h4>
                                            <span className="badge bg-primary rounded-pill text-uppercase px-2" style={{ fontSize: '0.65rem' }}>{emp.role}</span>
                                        </div>
                                        <p className="text-white-50 mb-0 small"><i className="bi bi-calendar3 me-1"></i> {date}</p>
                                    </div>
                                    <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowCompModal(false)} />
                                </div>

                                <div className="modal-body p-0">
                                    {/* Summary Banner */}
                                    <div className="bg-light p-4 border-bottom d-flex justify-content-between align-items-center">
                                        <div>
                                            <small className="text-muted text-uppercase fw-bold ls-1" style={{ fontSize: '0.6rem' }}>Total Daily Payout</small>
                                            <h2 className="fw-bold mb-0 " style={{ color: '#059669' }}>₱{totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                        </div>
                                        <div className="text-end">
                                            {(() => {
                                                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                const restDayIdx = dayNames.indexOf(emp.restDay || 'Sunday');
                                                const isRestDay = new Date(log.clockInTime).getDay() === restDayIdx;
                                                const isHoliday = log.holidayType && log.holidayType !== 'None';
                                                let badgeClass = 'bg-secondary';
                                                let label = 'Standard Work Day';
                                                if (isRestDay && isHoliday) {
                                                    badgeClass = log.holidayType === 'Regular' ? 'bg-danger' : 'bg-warning text-dark';
                                                    label = `Rest Day + ${log.holidayType} Holiday`;
                                                } else if (isRestDay) {
                                                    badgeClass = 'bg-orange text-white';
                                                    label = 'Rest Day (130%)';
                                                } else if (isHoliday) {
                                                    badgeClass = log.holidayType === 'Regular' ? 'bg-danger' : 'bg-warning text-dark';
                                                    label = `${log.holidayType} Holiday`;
                                                }
                                                return <span className={`badge rounded-pill ${badgeClass}`} style={isRestDay && !isHoliday ? { backgroundColor: '#f97316' } : {}}>{label}</span>;
                                            })()}
                                            <div className="small text-muted mt-1">{emp.shiftType} Shift • 8h Base</div>
                                        </div>
                                    </div>

                                    <div className="row g-0">
                                        {/* Left Col: Timesheet */}
                                        <div className="col-md-5 border-end bg-white p-4">
                                            <h6 className="fw-bold text-dark-secondary mb-3 pb-2 border-bottom">Timesheet Details</h6>

                                            <div className="d-flex justify-content-between mb-3">
                                                <div className="small text-muted">Clock In</div>
                                                <div className="fw-bold">{new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                            <div className="d-flex justify-content-between mb-3">
                                                <div className="small text-muted">Clock Out</div>
                                                <div className="fw-bold">{new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                            <div className="d-flex justify-content-between mb-3">
                                                <div className="small text-muted">Wall-Clock Duration</div>
                                                <div className="fw-bold">{Math.floor((new Date(log.clockOutTime) - new Date(log.clockInTime)) / 3600000)}h {Math.floor(((new Date(log.clockOutTime) - new Date(log.clockInTime)) % 3600000) / 60000)}m</div>
                                            </div>

                                            <div className="alert py-2 px-3 rounded-3 mt-4 mb-0" style={{ fontSize: '0.75rem', backgroundColor: 'var(--theme-card-bg)', border: '1px dashed #dee2e6' }}>
                                                <div className="fw-bold  mb-1"><i className="bi bi-info-circle me-1" style={{ color: 'var(--theme-content-text)' }}></i> Calculation Notes</div>
                                                <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '0.72rem', color: 'var(--theme-content-text)' }}>
                                                    {emp.shiftType === 'Morning' && <li>1h Lunch break deducted (12PM-1PM).</li>}
                                                    {emp.shiftType === 'Night' && <li>1h Smart break deducted (12AM-1AM).</li>}
                                                    {regMins >= 480 && <li>Regular pay capped at strictly 8 hours.</li>}
                                                    {log.isOTApproved ? <li>OT is approved (+30% premium applied).</li> : <li>OT not approved (excluded from pay).</li>}
                                                    {(() => {
                                                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                        const restDayIdx = dayNames.indexOf(emp.restDay || 'Sunday');
                                                        const isRestDay = new Date(log.clockInTime).getDay() === restDayIdx;
                                                        if (!isRestDay) return null;
                                                        let pct = '130%'; let rule = 'regular rest day';
                                                        if (log.holidayType === 'Regular') { pct = '260%'; rule = 'rest day + Regular Holiday'; }
                                                        else if (log.holidayType === 'Special') { pct = '180%'; rule = 'rest day + Special NWD'; }
                                                        return <li style={{ color: '#f97316', fontWeight: 600 }}>Rest day pay applied at {pct} DOLE rate ({rule}).</li>;
                                                    })()}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Right Col: Pay Breakdown */}
                                        <div className="col-md-7 bg-white p-4">
                                            <h6 className="fw-bold text-dark-secondary mb-3 pb-2 border-bottom">Computation Breakdown</h6>
                                            <table className="table table-sm table-borderless align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr className="text-muted small border-bottom">
                                                        <th className="fw-normal py-2">Component</th>
                                                        <th className="fw-normal py-2 text-center">Qty / Rate</th>
                                                        <th className="fw-normal py-2 text-end">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Regular Pay OR Rest Day Pay */}
                                                    {(() => {
                                                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                        const restDayIdx = dayNames.indexOf(emp.restDay || 'Sunday');
                                                        const isRestDay = new Date(log.clockInTime).getDay() === restDayIdx;
                                                        let restMultiplier = 1.30;
                                                        if (log.holidayType === 'Regular') restMultiplier = 2.60;
                                                        else if (log.holidayType === 'Special') restMultiplier = 1.80;
                                                        const restDayPayAmt = (regMins / 60) * hourlyRate * restMultiplier;

                                                        if (isRestDay) {
                                                            return (
                                                                <tr>
                                                                    <td className="py-2">
                                                                        <div className="fw-semibold" style={{ color: '#f97316' }}>Rest Day Pay</div>
                                                                        <small className="text-muted">
                                                                            {restMultiplier === 2.60 ? '260% (Rest Day + Regular Holiday)'
                                                                                : restMultiplier === 1.80 ? '180% (Rest Day + Special NWD)'
                                                                                    : '130% DOLE Premium'}
                                                                        </small>
                                                                    </td>
                                                                    <td className="text-center">{(regMins / 60).toFixed(1)}h @ ₱{(hourlyRate * restMultiplier).toFixed(2)}</td>
                                                                    <td className="text-end fw-bold" style={{ color: '#f97316' }}>₱{restDayPayAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            );
                                                        }
                                                        return (
                                                            <tr>
                                                                <td className="py-2">
                                                                    <div className="fw-semibold">Regular Pay</div>
                                                                    <small className="text-muted">Standard 8h Shift</small>
                                                                </td>
                                                                <td className="text-center">{(regMins / 60).toFixed(1)}h @ ₱{hourlyRate.toFixed(2)}</td>
                                                                <td className="text-end fw-bold">₱{regPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        );
                                                    })()}

                                                    {/* Holiday Bonus */}
                                                    {holidayBonus > 0 && (
                                                        <tr>
                                                            <td className="py-2">
                                                                <div className="fw-semibold text-danger">Holiday Premium</div>
                                                                <small className="text-muted">{holidayMultLabel}</small>
                                                            </td>
                                                            <td className="text-center">{(regMins / 60).toFixed(1)}h Bonus</td>
                                                            <td className="text-end fw-bold text-danger">+ ₱{holidayBonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    )}

                                                    {/* Overtime Pay */}
                                                    {otMins > 0 && log.isOTApproved && (
                                                        <tr>
                                                            <td className="py-2">
                                                                <div className="fw-semibold">Overtime (Standard)</div>
                                                                <small className="text-muted">Approved @ 130% Rate</small>
                                                            </td>
                                                            <td className="text-center">{(otMins / 60).toFixed(1)}h @ ₱{(hourlyRate * 1.3).toFixed(2)}</td>
                                                            <td className="text-end fw-bold text-dark-secondary">₱{standardOTPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    )}

                                                    {/* Holiday OT Bonus */}
                                                    {holidayOTBonus > 0 && (
                                                        <tr>
                                                            <td className="py-2">
                                                                <div className="fw-semibold text-danger">Holiday OT Premium</div>
                                                                <small className="text-muted">Additional {log.holidayType} Bonus</small>
                                                            </td>
                                                            <td className="text-center">{(otMins / 60).toFixed(1)}h Bonus</td>
                                                            <td className="text-end fw-bold text-danger">+ ₱{holidayOTBonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    )}

                                                    {/* Night Differential */}
                                                    {ndMins > 0 && (
                                                        <tr>
                                                            <td className="py-2">
                                                                <div className="fw-semibold">Night Differential</div>
                                                                <small className="text-muted">10PM - 6AM @ 10% Extra</small>
                                                            </td>
                                                            <td className="text-center">{(ndMins / 60).toFixed(1)}h @ ₱{(hourlyRate * 0.1).toFixed(2)}</td>
                                                            <td className="text-end fw-bold">+ ₱{ndPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-top" style={{ borderTopWidth: '2px !important' }}>
                                                        <td colSpan="2" className="pt-3 fw-bold fs-5 text-end" style={{ color: 'var(--theme-text-primary)' }}>Net Daily Pay:</td>
                                                        <td className="pt-3 fw-bold fs-5 text-end" style={{ color: '#059669' }}>₱{totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0 p-4 pt-2">
                                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowCompModal(false)} style={{ background: isDark ? 'var(--theme-bg-secondary)' : '' }}>Close Breakdown</button>
                                </div>
                            </div>
                        </AdminModalWrapper>
                    );
                })()
            }
        </div >
    );
};

export default HRISPage;