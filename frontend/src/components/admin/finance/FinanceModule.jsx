import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import { FinanceSkeleton, TableSkeleton, ChartSkeleton, KPICardSkeleton } from '../../SkeletonLoaders';
import BillCategorySettings from './BillCategorySettings';
import RevenueCategorySettings from './RevenueCategorySettings';
import getPaginationRange from '../getPaginationRange';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import SharedSearchBar from '../shared/SharedSearchBar';
import { filterDataBySearch } from '../shared/searchUtils';

import netProfitIcon from '../../../assets/icon/net-profit.png';
import operationCostIcon from '../../../assets/icon/operation-cost.png';
import grossRevenueIcon from '../../../assets/icon/gross-revenue.png';
import deleteIcon from '../../../assets/icon/delete.png';
import editIcon from '../../../assets/icon/edit.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';
import commisionIcon from '../../../assets/icon/commission.png';
import accountPayableIcon from '../../../assets/icon/account-payable.png';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

const RevenueCategoryManager = RevenueCategorySettings;

const FinancePage = ({ user, onNavigate, isDark }) => {
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
    const revItemsPerPage = 6;

    const isFinanceMounted = useRef(false);

    // Server-side filtered revenues 
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
    const ledgerPerPage = 10;

    // Expense Pagination & Search State
    const [expSearchTerm, setExpSearchTerm] = useState('');
    const [expCurrentPage, setExpCurrentPage] = useState(1);
    const expItemsPerPage = 4;

    // Client-side filtered revenues
    const filteredRevenues = filterDataBySearch(revenues, revSearchTerm, ['title', 'category', 'reference', 'amount'], ['createdAt', 'date']);

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
            fetchExpenses();
            isFinanceMounted.current = true; // Mark as mounted after first fetch
        }
    }, [financePeriod, activeTab]);

    const fetchExpenses = async () => {
        setIsExpLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/finance/expenses`, {
                headers: authHeaders(),
                withCredentials: true
            });
            setExpenses(res.data || []);
        } catch (err) { console.error('Error fetching expenses:', err); }
        finally { setIsExpLoading(false); }
    };

    const fetchRevenues = async () => {
        setIsRevLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/revenue`, {
                headers: authHeaders(),
                withCredentials: true
            });

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
        fetchRecurringBills();
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

    const deleteRevenue = async (id) => {
        const result = await Swal.fire({
            title: 'Delete revenue record?',
            text: 'This will remove the recorded income permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/revenue/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchRevenues();
                fetchFinanceData();
            } catch (err) { console.error('Error deleting revenue:', err); }
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
        if (activeTab === 'ledger') {
            fetchLedger();
        }
        if (activeTab === 'revenues') {
            fetchRevenues();
        }
        if (activeTab === 'overview') {
            fetchExpenses();
        }
    }, [activeTab, budgetMonth, ledgerTypeFilter, ledgerFrom, ledgerTo]);

    const fetchLedger = async () => {
        setIsLedgerLoading(true);
        try {
            const params = new URLSearchParams();
            if (ledgerFrom) params.append('from', ledgerFrom);
            if (ledgerTo) params.append('to', ledgerTo);
            if (ledgerTypeFilter) params.append('type', ledgerTypeFilter);
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

    // Client-side filtered expenses & ledger
    const filteredExpenses = filterDataBySearch(expenses, expSearchTerm, ['title', 'category', 'reference', 'amount', 'description'], ['createdAt', 'date']);
    const filteredLedger = filterDataBySearch(ledger, ledgerSearch, ['title', 'category', 'reference', 'amount', 'type'], ['createdAt', 'date']);

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

    if (isLoading) return <div className="p-4"><FinanceSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Finance & Accounting</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Automated Receivables, Expenses, and Profit Tracking</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="btn-group p-1 rounded-3" style={{ background: 'var(--theme-input-bg)' }}>
                        <button onClick={() => setActiveTab('overview')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'overview' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'overview' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'overview' ? 'var(--theme-content-text)' : 'inherit' }}>
                            Overview</button>
                        <button onClick={() => setActiveTab('revenues')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'revenues' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'revenues' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'revenues' ? 'var(--theme-content-text)' : 'inherit' }}>
                            Income & Receivables</button>
                        <button onClick={() => onNavigate('accounts-payable')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 text-muted`}>
                            Accounts Payable</button>
                        <button onClick={() => setActiveTab('recurring')} className={`btn btn-sm px-3 border-0 position-relative d-flex align-items-center gap-1 ${activeTab === 'recurring' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'recurring' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'recurring' ? 'var(--theme-content-text)' : 'inherit' }}>
                            Recurring Bills
                            {pendingBills.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                    {pendingBills.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setActiveTab('budgets')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'budgets' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'budgets' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'budgets' ? 'var(--theme-content-text)' : 'inherit' }}>
                            Budgets</button>
                        <button onClick={() => setActiveTab('ledger')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'ledger' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'ledger' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'ledger' ? 'var(--theme-content-text)' : 'inherit' }}>
                            General Ledger</button>
                        <button onClick={() => setActiveTab('settings')} className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-1 ${activeTab === 'settings' ? 'btn-white shadow-sm fw-bold' : 'text-muted'}`} style={{ background: activeTab === 'settings' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'settings' ? 'var(--theme-content-text)' : 'inherit' }}>
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
                        {isLedgerLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <div className="col-6 col-md-3" key={i}><KPICardSkeleton /></div>
                            ))
                            : [
                                { title: 'Total Inflow', value: ledgerSummary.totalInflow, color: '#22c55e', bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)', dot: '#22c55e', icon: '↑', desc: 'All income recorded' },
                                { title: 'Total Outflow', value: ledgerSummary.totalOutflow, color: '#ef4444', bg: 'linear-gradient(135deg,#ef444415,#ef444405)', dot: '#ef4444', icon: '↓', desc: 'All expenses recorded' },
                                { title: 'Net Income', value: ledgerSummary.netIncome, color: ledgerSummary.netIncome >= 0 ? '#23A0CE' : '#f59e0b', bg: ledgerSummary.netIncome >= 0 ? 'linear-gradient(135deg,#23A0CE15,#23A0CE05)' : 'linear-gradient(135deg,#f59e0b15,#f59e0b05)', dot: ledgerSummary.netIncome >= 0 ? '#23A0CE' : '#f59e0b', icon: '💰', desc: 'Inflow minus Outflow' },
                                { title: 'Total Entries', value: ledgerSummary.entryCount, color: '#8b5cf6', bg: 'linear-gradient(135deg,#8b5cf615,#8b5cf605)', dot: '#8b5cf6', icon: '📑', desc: 'Transactions logged', isCount: true },
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
                                            <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.3rem', lineHeight: 1 }}>
                                                {card.isCount ? card.value.toLocaleString() : `₱${card.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                                            </h3>
                                            {/* Description */}
                                            <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ minHeight: '743px' }}>
                                {/* Filters toolbar */}
                                <div className="card-header bg-white border-bottom py-3 px-4" >
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
                                            <SharedSearchBar
                                                searchTerm={ledgerSearch}
                                                onDebouncedSearch={setLedgerSearch}
                                                placeholder="Search entries..."
                                                width="150px"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Ledger Table */}
                                <div className="card-body p-0 flex-grow-1 d-flex flex-column">
                                    {isLedgerLoading ? (
                                        <div className="p-0"><TableSkeleton /></div>
                                    ) : ledger.length === 0 ? (
                                        <div className="py-5 text-center text-muted">
                                            <small>No ledger entries found matching your "<strong className='fw-bold'>{ledgerSearch}</strong>"</small>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-responsive flex-grow-1">
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
                                                        {filteredLedger.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage).map(entry => (
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
                                                                    <span className="badge rounded-pill px-3 py-1" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.7rem' }}>
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
                                            {ledger.length > ledgerPerPage && (
                                                <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center mt-auto">
                                                    <small className="text-muted font-poppins" style={{ fontSize: '0.8rem' }}>
                                                        Showing {(ledgerPage - 1) * ledgerPerPage + 1}–{Math.min(ledgerPage * ledgerPerPage, ledger.length)} of {ledger.length} entries
                                                    </small>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <button
                                                            className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            disabled={ledgerPage === 1}
                                                            onClick={() => setLedgerPage(p => p - 1)}
                                                            style={{ width: '32px', height: '32px', background: ledgerPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                        >
                                                            <img src={leftArrowIcon} style={{ width: '10px', opacity: ledgerPage === 1 ? 0.3 : 0.7 }} alt="prev" />
                                                        </button>
                                                        {getPaginationRange(ledgerPage, Math.ceil(filteredLedger.length / ledgerPerPage)).map((p, idx) => (
                                                            p === '...' ? (
                                                                <span key={`dot-ledger-${idx}`} className="px-2 text-muted">...</span>
                                                            ) : (
                                                                <button
                                                                    key={`page-ledger-${p}`}
                                                                    onClick={() => setLedgerPage(p)}
                                                                    className={`btn btn-sm p-0 rounded-circle border-0 fw-bold ${ledgerPage === p ? 'brand-primary text-white shadow-sm' : 'text-muted hover-bg-light'}`}
                                                                    style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: ledgerPage === p ? '#23A0CE' : 'transparent', color: ledgerPage === p ? '#fff' : 'inherit' }}
                                                                >
                                                                    {p}
                                                                </button>
                                                            )
                                                        ))}
                                                        <button
                                                            className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => setLedgerPage(p => p + 1)}
                                                            disabled={ledgerPage === Math.ceil(filteredLedger.length / ledgerPerPage)}
                                                            style={{ width: '32px', height: '32px', background: ledgerPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                        >
                                                            <img src={rightArrowIcon} alt="Right Arrow" style={{ width: '10px', height: '10px', opacity: ledgerPage === Math.ceil(filteredLedger.length / ledgerPerPage) ? 0.3 : 0.7 }} />
                                                        </button>
                                                    </div>
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
                            <div className="card border-0 shadow-sm rounded-4 p-4" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
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
            )
            }

            {
                activeTab === 'settings' ? (
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
                                isDark={isDark}
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
                                <div className="d-flex align-items-center justify-content-end mb-4 flex-wrap gap-3">
                                    <div className="btn-group shadow-sm bg-white p-1 rounded-pill border align-self-end">
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
                                                className={`btn btn-sm px-4 rounded-pill border-0 transition-all btn-active ${financePeriod === p.id ? 'btn-save text-white shadow-sm' : 'text-muted'}`}
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="row g-3 mb-4">
                                    {isLoading
                                        ? Array.from({ length: 5 }).map((_, i) => (
                                            <div className="col-12 col-sm-6 col-md" key={i}><KPICardSkeleton /></div>
                                        ))
                                        : [
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
                                        ))
                                    }
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
                                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ minHeight: 490 }}>
                                            <div className="card-header bg-white py-3 border-bottom">
                                                <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="mb-0 fw-bold text-dark-secondary">Business Expenses</h6>
                                                        <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>Log of all operational costs and supplies</p>
                                                    </div>
                                                    <div className="d-flex gap-2 align-items-center">
                                                        <SharedSearchBar
                                                            searchTerm={expSearchTerm}
                                                            onDebouncedSearch={setExpSearchTerm}
                                                            placeholder="Search expenses..."
                                                            width="180px"
                                                        />
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
                                                                <tr><td colSpan="5" className="p-5 text-center text-muted font-poppins">No expenses recorded found matching your "<strong className='fw-bold'>{expSearchTerm}</strong>"</td></tr>
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
                                                                            <span className="text-dark-gray200" style={{ fontSize: '0.7rem', color: 'var(--theme-content-text-secondary)' }}>{exp.description}</span>
                                                                        </td>
                                                                        <td>
                                                                            <span className="badge rounded-pill" style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.7rem' }}>{exp.category}</span>
                                                                        </td>
                                                                        <td className="text-dark-gray200" style={{ color: 'var(--theme-content-text-secondary)' }}>{new Date(exp.date).toLocaleDateString()}</td>
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
                                                                className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                                disabled={expCurrentPage === 1}
                                                                onClick={() => setExpCurrentPage(expCurrentPage - 1)}
                                                                style={{ width: '32px', height: '32px', background: expCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                            >
                                                                <img src={leftArrowIcon} style={{ width: '10px', opacity: expCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
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
                                                                className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                                disabled={expCurrentPage === expTotalPages}
                                                                onClick={() => setExpCurrentPage(expCurrentPage + 1)}
                                                                style={{ width: '32px', height: '32px', background: expCurrentPage === expTotalPages ? '#f1f5f9' : 'transparent' }}
                                                            >
                                                                <img src={rightArrowIcon} style={{ width: '10px', opacity: expCurrentPage === expTotalPages ? 0.3 : 0.7 }} alt="next" />
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
                                            <div className="p-3 rounded-3" style={{ background: 'var(--theme-card-bg)', border: '1px dashed #dee2e6' }}>
                                                <p className="mb-1 text-dark-secondary fw-bold" style={{ fontSize: '0.8rem', color: 'var(--theme-content-text)' }}>Admin Tip:</p>
                                                <small className="text-muted d-block" style={{ fontSize: '0.72rem', lineHeight: 1.4, color: 'var(--theme-content-text)' }}>
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
                                            <SharedSearchBar
                                                searchTerm={revSearchTerm}
                                                onDebouncedSearch={setRevSearchTerm}
                                                placeholder="Search income records..."
                                                width="220px"
                                            />
                                        </div>
                                    </div>
                                    <div className="card-body p-0 flex-grow-1 d-flex flex-column" style={{ minHeight: 445 }}>
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
                                                            <tr><td colSpan="5" className="p-5 text-center text-muted font-poppins ">No income records found matching your "<span className="fw-bold">{revSearchTerm}</span>"</td></tr>
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
                                        <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center mt-auto">
                                            <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
                                                Showing {(revCurrentPage - 1) * revItemsPerPage + 1} to {Math.min(revCurrentPage * revItemsPerPage, filteredRevenues.length)} of {filteredRevenues.length} entries
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <button
                                                    className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                    disabled={revCurrentPage === 1}
                                                    onClick={() => setRevCurrentPage(revCurrentPage - 1)}
                                                    style={{ width: '32px', height: '32px', background: revCurrentPage === 1 ? '#f1f5f9' : 'transparent' }}
                                                >
                                                    <img src={leftArrowIcon} style={{ width: '10px', opacity: revCurrentPage === 1 ? 0.3 : 0.7 }} alt="prev" />
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
                                                    className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                    disabled={revCurrentPage === revTotalPages}
                                                    onClick={() => setRevCurrentPage(revCurrentPage + 1)}
                                                    style={{ width: '32px', height: '32px', background: revCurrentPage === revTotalPages ? '#f1f5f9' : 'transparent' }}
                                                >
                                                    <img src={rightArrowIcon} style={{ width: '10px', opacity: revCurrentPage === revTotalPages ? 0.3 : 0.7 }} alt="next" />
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
                )
            }

            <BillCategorySettings
                show={showBillCategoryManager}
                onClose={() => setShowBillCategoryManager(false)}
                onUpdate={(cats) => { setBillCategories(cats); fetchRecurringBills(); }}
                isDark={isDark}
            />

            {
                showExpenseModal && (
                    <AdminModalWrapper show={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
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
                    </AdminModalWrapper>
                )
            }
        </div >
    );
};

export default FinancePage;