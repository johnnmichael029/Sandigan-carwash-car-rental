import { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, PromotionsSkeleton } from '../../SkeletonLoaders';

import Swal from 'sweetalert2';
import axios from 'axios';

import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';

import rightArrowIcon from '../../../assets/icon/right-arrow.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import getPaginationRange from '../getPaginationRange';
import searchIcon from '../../../assets/icon/search.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import SharedSearchBar from '../shared/SharedSearchBar';

const PromotionsPage = ({ isDark }) => {
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'smc-history' | 'promo-history'
    const [promos, setPromos] = useState([]);
    const [smcLogs, setSmcLogs] = useState([]);
    const [promoLogs, setPromoLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const isPromosMounted = useRef(false);

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

    const fetchData = async (search = '') => {
        setIsLoading(true);
        try {
            const [promoRes, smcRes, logRes] = await Promise.all([
                axios.get(`${API_BASE}/promotions/all`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/booking?smcOnly=true&search=${search}`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/booking?promoOnly=true&search=${search}`, { headers: authHeaders(), withCredentials: true })
            ]);
            setPromos(promoRes.data);
            setSmcLogs(smcRes.data);
            setPromoLogs(logRes.data);
            isPromosMounted.current = true;
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (!isPromosMounted.current) return;
        if (!searchTerm.trim()) {
            fetchData();
            return;
        }
        const handler = setTimeout(() => {
            fetchData(searchTerm);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm]);

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

    const filteredSMCHistory = smcLogs;
    const filteredPromoHistory = promoLogs;

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

    if (isLoading && promos.length === 0) return <div className="p-4"><PromotionsSkeleton /></div>;

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
                        className={`btn btn-sm px-4 rounded-pill btn-active ${activeTab === t ? 'btn-save text-primary shadow-sm' : ' text-muted border'}`}
                        style={{ fontSize: '0.85rem', fontWeight: activeTab === t ? '600' : '500' }}
                    >
                        {t === 'manage' ? 'Coupons Library' : t === 'promo-history' ? 'Promo Usage' : 'SMC Usage'}
                    </button>
                ))}
            </div>

            {(activeTab === 'promo-history' || activeTab === 'smc-history') && (
                <div className="d-flex justify-content-end">
                    <div className="mb-4" style={{ width: 300 }}>
                        <SharedSearchBar
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            placeholder="Search by customer name or ID..."
                            width="100%"
                        />
                    </div>
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
                                                    <img src={editIcon} style={{ width: 16 }} alt="Edit" title='Edit Promo' />
                                                </button>
                                                <button onClick={() => handleDelete(p._id)} className="btn btn-sm border-0 p-1">
                                                    <img src={deleteIcon} style={{ width: 16 }} alt="Delete" title='Delete Promo' />
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
                                    <tr><td colSpan="5" className="p-5 text-center text-muted">No usage records found matching your "<strong className='fw-bold'>{searchTerm}</strong>"</td></tr>
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
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                        disabled={(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === 1}
                                        onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(prev => prev - 1) : setSmcCurrentPage(prev => prev - 1)}
                                        style={{ width: '32px', height: '32px', background: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === 1 ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={leftArrowIcon} alt="Left Arrow" style={{ width: '10px', height: '10px', opacity: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === 1 ? 0.3 : 0.7 }} />
                                    </button>

                                    {getPaginationRange(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage, activeTab === 'promo-history' ? totalPromoPages : totalSMCPages).map((p, idx) => (
                                        p === '...' ? (
                                            <span key={`dot-${idx}`} className="px-2 text-muted">...</span>
                                        ) : (
                                            <button
                                                key={`page-${p}`}
                                                onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(p) : setSmcCurrentPage(p)}
                                                className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center fw-bold ${(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === p ? 'brand-primary text-white shadow-sm' : 'text-dark-secondary'}`}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    fontSize: '0.75rem',
                                                    background: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === p ? '#23A0CE' : 'transparent',
                                                    color: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === p ? '#fff' : 'inherit'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}

                                    <button
                                        className="page-link btn-next rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                        disabled={(activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === (activeTab === 'promo-history' ? totalPromoPages : totalSMCPages)}
                                        onClick={() => activeTab === 'promo-history' ? setPromoCurrentPage(prev => prev + 1) : setSmcCurrentPage(prev => prev + 1)}
                                        style={{ width: '32px', height: '32px', background: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === (activeTab === 'promo-history' ? totalPromoPages : totalSMCPages) ? '#f1f5f9' : 'transparent' }}
                                    >
                                        <img src={rightArrowIcon} alt="Right Arrow" style={{ width: '10px', height: '10px', opacity: (activeTab === 'promo-history' ? promoCurrentPage : smcCurrentPage) === (activeTab === 'promo-history' ? totalPromoPages : totalSMCPages) ? 0.3 : 0.7 }} />
                                    </button>
                                </div>
                            </nav>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Promo Modal */}
            {showModal && (
                <AdminModalWrapper show={showModal} onClose={() => setShowModal(false)}>
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
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default PromotionsPage;