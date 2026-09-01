import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import TopHeader from '../TopHeader';
import { KPICardSkeleton } from '../../SkeletonLoaders';
import SharedSearchBar from '../shared/SharedSearchBar';
import getPaginationRange from '../getPaginationRange';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

const DEPARTMENTS = ['Finance', 'Inventory', 'Operations', 'Workforce', 'Clientele'];
const ACTIONS = ['read', 'create', 'update', 'delete'];
const ROLE_OPTIONS = ['super_admin', 'admin', 'department_staff', 'employee', 'detailer'];

const ROLE_BADGE = {
    super_admin: { label: 'Super Admin', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    admin: { label: 'Admin', color: '#23A0CE', bg: 'rgba(35,160,206,0.12)' },
    department_staff: { label: 'Dept. Staff', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    employee: { label: 'Employee', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    detailer: { label: 'Detailer', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

const RoleBadge = ({ role }) => {
    const badge = ROLE_BADGE[role] || { label: role, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: badge.bg, color: badge.color,
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px'
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color, flexShrink: 0 }} />
            {badge.label}
        </span>
    );
};

const PermissionMatrix = ({ departments, permissions, onChange }) => {
    const isAllFullAccess = DEPARTMENTS.every(d => departments.includes(d) && ACTIONS.every(a => (permissions[d] || []).includes(a)));
    const isAllReadOnly = DEPARTMENTS.every(d => departments.includes(d) && (permissions[d] || []).length === 1 && (permissions[d] || [])[0] === 'read');

    const handleSelectAllFullAccess = () => {
        const newPerms = {};
        DEPARTMENTS.forEach(dept => {
            newPerms[dept] = [...ACTIONS];
        });
        onChange({ departments: [...DEPARTMENTS], permissions: newPerms });
    };

    const handleSelectAllReadOnly = () => {
        const newPerms = {};
        DEPARTMENTS.forEach(dept => {
            newPerms[dept] = ['read'];
        });
        onChange({ departments: [...DEPARTMENTS], permissions: newPerms });
    };

    const handleClearAll = () => {
        onChange({ departments: [], permissions: {} });
    };

    return (
        <div className="mt-3">
            {/* Quick Action Presets */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 pb-2 border-bottom" style={{ borderColor: 'var(--theme-content-border)' }}>
                <span className="small fw-bold text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quick Presets:
                </span>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className={`btn btn-sm px-3 py-1 rounded-pill fw-bold shadow-sm ${isAllFullAccess ? 'btn-save' : 'btn-outline-primary'}`}
                        style={{ fontSize: '0.75rem', border: isAllFullAccess ? 'none' : '1px solid #23A0CE', color: isAllFullAccess ? '#fff' : '#23A0CE' }}
                        onClick={handleSelectAllFullAccess}
                    >
                        Full Access (All)
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm px-3 py-1 rounded-pill fw-semibold ${isAllReadOnly ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={handleSelectAllReadOnly}
                    >
                        Read Only (All)
                    </button>
                    {departments.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm px-2 py-1 rounded-pill btn-link text-danger text-decoration-none fw-semibold"
                            style={{ fontSize: '0.75rem' }}
                            onClick={handleClearAll}
                        >
                            ✕ Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Department Rows */}
            {DEPARTMENTS.map(dept => {
                const isAssigned = departments.includes(dept);
                const deptPerms = permissions[dept] || [];
                const isDeptFull = isAssigned && ACTIONS.every(a => deptPerms.includes(a));

                const toggleDeptFullAccess = (e) => {
                    e.stopPropagation();
                    const newPerms = { ...permissions };
                    if (isDeptFull) {
                        newPerms[dept] = ['read'];
                    } else {
                        newPerms[dept] = [...ACTIONS];
                    }
                    const newDepts = departments.includes(dept) ? departments : [...departments, dept];
                    onChange({ departments: newDepts, permissions: newPerms });
                };

                return (
                    <div key={dept} className="mb-3 rounded-3 p-3 transition-all" style={{
                        background: isAssigned ? 'rgba(35,160,206,0.06)' : 'var(--theme-input-bg)',
                        border: `1px solid ${isAssigned ? 'rgba(35,160,206,0.25)' : 'var(--theme-content-border)'}`,
                    }}>
                        <div className="d-flex align-items-center justify-content-between mb-0 flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`dept-${dept}`}
                                    className="form-check-input"
                                    checked={isAssigned}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    onChange={e => {
                                        const newDepts = e.target.checked
                                            ? [...departments, dept]
                                            : departments.filter(d => d !== dept);
                                        const newPerms = { ...permissions };
                                        if (!e.target.checked) delete newPerms[dept];
                                        else newPerms[dept] = ['read'];
                                        onChange({ departments: newDepts, permissions: newPerms });
                                    }}
                                />
                                <label htmlFor={`dept-${dept}`} style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--theme-content-text)' }}>
                                    {dept}
                                </label>
                            </div>
                            {isAssigned && (
                                <div className="d-flex align-items-center gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={toggleDeptFullAccess}
                                        className="btn btn-link p-0 text-decoration-none"
                                        style={{ fontSize: '0.72rem', fontWeight: 600, color: isDeptFull ? '#22c55e' : '#23A0CE' }}
                                    >
                                        {isDeptFull ? '✓ All Selected' : '+ Full Access'}
                                    </button>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {ACTIONS.map(action => (
                                            <label key={action} className="d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--theme-content-text-secondary)' }}>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    style={{ width: 13, height: 13 }}
                                                    checked={deptPerms.includes(action)}
                                                    onChange={e => {
                                                        const newPerms = { ...permissions };
                                                        const current = [...(newPerms[dept] || [])];
                                                        if (e.target.checked) newPerms[dept] = [...current, action];
                                                        else newPerms[dept] = current.filter(a => a !== action);
                                                        onChange({ departments, permissions: newPerms });
                                                    }}
                                                />
                                                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{action}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const UserManagement = ({ user, isDark }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [page, setPage] = useState(1);
    const PER_PAGE = 8;
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state for the permission editor modal
    const [form, setForm] = useState({
        fullName: '', email: '', password: '', role: 'department_staff',
        departments: [], permissions: {}
    });

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/employees`, { headers: authHeaders(), credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) setEmployees(data);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const openCreate = () => {
        setEditingEmployee(null);
        setForm({ fullName: '', email: '', password: '', role: 'department_staff', departments: [], permissions: {} });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditingEmployee(emp);
        let perms = {};
        if (emp.permissions && typeof emp.permissions === 'object') {
            perms = JSON.parse(JSON.stringify(emp.permissions));
        }
        setForm({
            fullName: emp.fullName || '',
            email: emp.email || '',
            password: '',
            role: emp.role || 'department_staff',
            departments: emp.departments || [],
            permissions: perms,
        });
        setShowModal(true);
    };


    const handleSave = async () => {
        if (!form.fullName.trim()) return Swal.fire('Validation', 'Full name is required.', 'warning');
        if (!editingEmployee && !form.email.trim()) return Swal.fire('Validation', 'Email is required to create an account.', 'warning');
        if (!editingEmployee && !form.password.trim()) return Swal.fire('Validation', 'Password is required for new accounts.', 'warning');

        setSaving(true);
        try {
            const payload = {
                fullName: form.fullName,
                email: form.email || undefined,
                role: form.role,
                departments: form.role === 'department_staff' ? form.departments : [],
                permissions: form.role === 'department_staff' ? form.permissions : {},
                ...(form.password ? { password: form.password } : {}),
            };

            let res;
            if (editingEmployee) {
                res = await fetch(`${API_BASE}/employees/${editingEmployee._id}`, {
                    method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${API_BASE}/employees/signup`, {
                    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify(payload)
                });
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');

            await fetchEmployees();
            setShowModal(false);
            Swal.fire({
                icon: 'success',
                title: editingEmployee ? 'Account Updated' : 'Account Created',
                text: `${form.fullName}'s account has been ${editingEmployee ? 'updated' : 'created'} successfully.`,
                timer: 2000, showConfirmButton: false,
                background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)',
            });
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (emp) => {
        const result = await Swal.fire({
            title: `Delete ${emp.fullName}?`,
            text: 'This will permanently remove their account. This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete',
            background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE}/employees/${emp._id}`, {
                method: 'DELETE', headers: authHeaders(), credentials: 'include'
            });
            if (!res.ok) throw new Error((await res.json()).error);
            await fetchEmployees();
            Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false, background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)' });
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    };

    const filtered = employees.filter(e => {
        const matchSearch = e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            e.email?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === 'all' || e.role === filterRole;
        return matchSearch && matchRole;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginatedEmployees = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    const roleCounts = ROLE_OPTIONS.reduce((acc, r) => {
        acc[r] = employees.filter(e => e.role === r).length;
        return acc;
    }, {});

    // KPI Cards configuration matching OperationsModule style
    const kpiCards = [
        {
            title: 'Super Admins',
            value: (roleCounts['super_admin'] || 0).toLocaleString(),
            icon: '👑',
            color: '#f59e0b',
            bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
            dot: '#f59e0b',
            desc: 'System owners & global access'
        },
        {
            title: 'Administrators',
            value: (roleCounts['admin'] || 0).toLocaleString(),
            icon: '🛡️',
            color: '#23A0CE',
            bg: 'linear-gradient(135deg, rgba(35,160,206,0.15), rgba(35,160,206,0.05))',
            dot: '#23A0CE',
            desc: 'Operational managers'
        },
        {
            title: 'Dept. Staff',
            value: (roleCounts['department_staff'] || 0).toLocaleString(),
            icon: '🏢',
            color: '#10b981',
            bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
            dot: '#10b981',
            desc: 'Granular access members'
        },
        {
            title: 'Employees & Detailers',
            value: ((roleCounts['employee'] || 0) + (roleCounts['detailer'] || 0)).toLocaleString(),
            icon: '👷',
            color: '#8b5cf6',
            bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
            dot: '#8b5cf6',
            desc: 'Floor staff & mobile app'
        },
    ];

    return (
        <div className="animate-fade-in pb-5">
            <TopHeader title="User & Role Management" subtitle="Manage system accounts and department access permissions" isDark={isDark} />

            {/* ── KPI Summary Cards (OperationsModule Style) ── */}
            {loading ? (
                <div className="row g-3 mb-4">{[1, 2, 3, 4].map(i => <div className="col-6 col-md-3" key={i}><KPICardSkeleton /></div>)}</div>
            ) : (
                <div className="row g-3 mb-4">
                    {kpiCards.map((card, idx) => (
                        <div className="col-6 col-md-3" key={idx}>
                            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                                <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                                <div className="p-3 position-relative">
                                    <div className="position-absolute top-0 end-0 p-3">
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                    </div>
                                    <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                        style={{ width: '40px', height: '40px', background: card.bg, fontSize: '1.2rem' }}>
                                        {card.icon}
                                    </div>
                                    <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--theme-content-text-secondary)' }}>{card.title}</p>
                                    <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>{card.value}</h3>
                                    <small style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.72rem' }}>{card.desc}</small>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
                <select
                    className="form-select rounded-3"
                    value={filterRole}
                    onChange={e => { setFilterRole(e.target.value); setPage(1); }}
                    style={{ maxWidth: 180, fontSize: '0.85rem', background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-input-border)' }}
                >
                    <option value="all">All Roles</option>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_BADGE[r]?.label || r}</option>)}
                </select>
                <div className="d-flex gap-2 flex-wrap align-items-center">
                    <SharedSearchBar
                        searchTerm={search}
                        onDebouncedSearch={val => { setSearch(val); setPage(1); }}
                        placeholder="Search name or email..."
                        width="260px"
                        debounceDelay={350}
                    />
                    <button
                        className="btn btn-save btn-sm text-white px-3 font-poppins d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '0.75rem', borderRadius: '8px', height: '36px', border: 'none', fontWeight: 600, background: '#23A0CE' }}
                        onClick={openCreate}
                    >
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Create Account
                    </button>
                </div>
            </div>

            {/* ── User Table ── */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                {loading ? (
                    <div className="text-center py-5" style={{ color: 'var(--theme-content-text-secondary)' }}>Loading accounts...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-5" style={{ color: 'var(--theme-content-text-secondary)' }}>No accounts found matching your search.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ color: 'var(--theme-content-text)', fontSize: '0.88rem' }}>
                            <thead className="font-poppins" style={{ background: 'var(--theme-input-bg)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--theme-content-text-secondary)', textTransform: 'uppercase' }}>
                                <tr className="border-bottom">
                                    <th className="py-3 ps-4">Account</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3">Departments</th>
                                    <th className="py-3">Permissions</th>
                                    <th className="py-3 text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEmployees.map(emp => {
                                    const depts = emp.departments || [];
                                    const perms = emp.permissions || {};
                                    return (
                                        <tr key={emp._id} style={{ borderColor: 'var(--theme-content-border)' }}>
                                            <td className="py-3 ps-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                        background: 'linear-gradient(135deg, #23A0CE, #002525)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontWeight: 700, fontSize: '0.85rem'
                                                    }}>
                                                        {emp.fullName?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--theme-content-text)' }}>{emp.fullName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-content-text-secondary)' }}>{emp.email || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 align-middle"><RoleBadge role={emp.role} /></td>
                                            <td className="py-3 align-middle">
                                                {depts.length > 0 ? (
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {depts.map(d => (
                                                            <span key={d} style={{
                                                                padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem',
                                                                background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontWeight: 600
                                                            }}>{d}</span>
                                                        ))}
                                                    </div>
                                                ) : <span style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.8rem' }}>—</span>}
                                            </td>
                                            <td className="py-3 align-middle">
                                                {depts.length > 0 ? (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--theme-content-text-secondary)' }}>
                                                        {depts.map(d => {
                                                            const actions = (perms[d] || []);
                                                            return actions.length > 0 ? (
                                                                <span key={d} className="me-2"><strong style={{ color: 'var(--theme-content-text)' }}>{d}:</strong> {actions.join(', ')}</span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : <span style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.8rem' }}>Full Access</span>}
                                            </td>
                                            <td className="py-3 pe-4 text-end align-middle">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm rounded-3"
                                                        style={{ fontSize: '0.78rem', padding: '5px 14px', background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontWeight: 600, border: 'none' }}
                                                        onClick={() => openEdit(emp)}
                                                    >
                                                        Edit
                                                    </button>
                                                    {emp._id !== user?._id && (
                                                        <button
                                                            className="btn btn-sm rounded-3"
                                                            style={{ fontSize: '0.78rem', padding: '5px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, border: 'none' }}
                                                            onClick={() => handleDelete(emp)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Standard Pagination Footer */}
                {filtered.length > PER_PAGE && (
                    <div className="card-footer border-top py-3 d-flex justify-content-between align-items-center" style={{ background: 'var(--theme-card-bg)', borderTop: '1px solid var(--theme-content-border)' }}>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                            Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <button
                                className="btn btn-sm p-0 rounded-circle border-0"
                                disabled={safePage === 1}
                                onClick={() => setPage(safePage - 1)}
                                style={{ width: '30px', height: '30px', background: safePage === 1 ? 'transparent' : 'var(--theme-badge-muted-bg)', opacity: safePage === 1 ? 0.3 : 1 }}
                            >
                                <img src={leftArrowIcon} style={{ width: '9px' }} alt="prev" />
                            </button>
                            {getPaginationRange(safePage, totalPages).map((p, idx) => (
                                p === '...' ? (
                                    <span key={`dot-${idx}`} className="px-1 text-muted" style={{ fontSize: '0.8rem' }}>...</span>
                                ) : (
                                    <button
                                        key={`p-${p}`}
                                        onClick={() => setPage(p)}
                                        className={`btn btn-sm p-0 rounded-circle border-0 fw-bold transition-all ${safePage === p ? 'btn-save text-white shadow-sm' : 'text-muted'}`}
                                        style={{ width: '30px', height: '30px', fontSize: '0.78rem', background: safePage === p ? '' : 'transparent' }}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}
                            <button
                                className="btn btn-sm p-0 rounded-circle border-0"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage(safePage + 1)}
                                style={{ width: '30px', height: '30px', background: safePage >= totalPages ? 'transparent' : 'var(--theme-badge-muted-bg)', opacity: safePage >= totalPages ? 0.3 : 1 }}
                            >
                                <img src={rightArrowIcon} style={{ width: '9px' }} alt="next" />
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* ── Create/Edit Modal ── */}
            {showModal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content rounded-4 border-0 shadow" style={{ background: 'var(--theme-modal-bg)', color: 'var(--theme-content-text)' }}>
                            <div className="modal-header border-0 pb-0 px-4 pt-4">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">{editingEmployee ? 'Edit Account' : 'Create Account'}</h5>
                                    <p className="text-muted small mb-0 mt-1" style={{ color: 'var(--theme-content-text-secondary)' }}>
                                        {editingEmployee ? `Updating permissions for ${editingEmployee.fullName}` : 'Set up a new system account with role & department access'}
                                    </p>
                                </div>
                                <button className="btn-close" onClick={() => setShowModal(false)} style={{ filter: isDark ? 'invert(1)' : 'none' }} />
                            </div>
                            <div className="modal-body px-4 pt-3">

                                {/* Basic Info */}
                                <div className="mb-4 p-3 rounded-3" style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-content-border)' }}>
                                    <p className="fw-bold mb-3" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--theme-content-text-secondary)' }}>Basic Info</p>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Full Name *</label>
                                            <input className="form-control rounded-3" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-input-border)' }}
                                                value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Juan Dela Cruz" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Email {editingEmployee ? '(leave blank to keep)' : '*'}</label>
                                            <input type="email" className="form-control rounded-3" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-input-border)' }}
                                                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. juan@sandigan.com" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Password {editingEmployee ? '(leave blank to keep)' : '*'}</label>
                                            <input type="password" className="form-control rounded-3" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-input-border)' }}
                                                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editingEmployee ? 'Leave blank to keep current' : 'Set a password'} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Role *</label>
                                            <select className="form-select rounded-3" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-input-border)' }}
                                                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, departments: [], permissions: {} }))}>
                                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_BADGE[r]?.label || r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Department Permissions (only for department_staff) */}
                                {form.role === 'department_staff' && (
                                    <div className="p-3 rounded-3" style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-content-border)' }}>
                                        <p className="fw-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--theme-content-text-secondary)' }}>Department Access & Permissions</p>
                                        <p className="small mb-0" style={{ color: 'var(--theme-content-text-secondary)' }}>Check the departments this staff member can access, then set their actions per department.</p>
                                        <PermissionMatrix
                                            departments={form.departments}
                                            permissions={form.permissions}
                                            onChange={({ departments, permissions }) => setForm(f => ({ ...f, departments, permissions }))}
                                        />
                                    </div>
                                )}

                                {form.role !== 'department_staff' && (
                                    <div className="rounded-3 p-3 d-flex align-items-center gap-3" style={{ background: 'rgba(35,160,206,0.06)', border: '1px solid rgba(35,160,206,0.2)' }}>
                                        <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                                        <p className="mb-0 small" style={{ color: 'var(--theme-content-text-secondary)' }}>
                                            <strong style={{ color: 'var(--theme-content-text)' }}>{ROLE_BADGE[form.role]?.label}</strong> accounts have{' '}
                                            {['super_admin', 'admin'].includes(form.role) ? 'full system access — no department restrictions apply.' : 'no admin portal access — they use floor staff or mobile app.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-0 px-4 pb-4">
                                <button className="btn btn-sm rounded-3 fw-semibold" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-content-text-secondary)', border: '1px solid var(--theme-content-border)', padding: '8px 20px' }}
                                    onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-sm rounded-3 fw-bold" style={{ background: '#23A0CE', color: '#fff', padding: '8px 24px', minWidth: 100 }}
                                    onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : editingEmployee ? 'Update' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
