import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import TopHeader from './TopHeader';
import { TableSkeleton } from '../../SkeletonLoaders';
import getPaginationRange from '../../admin/getPaginationRange';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';
import searchIcon from '../../../assets/icon/search.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

const MembershipManagement = ({ employee, onSMCRequest, isDark }) => {
    const [memberships, setMemberships] = useState([]);
    const [config, setConfig] = useState(null);
    const [loyaltyConfig, setLoyaltyConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 11;

    // Renewal State
    const [lookupId, setLookupId] = useState('');
    const [foundCard, setFoundCard] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [renewalForm, setRenewalForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });

    // Customer Search & Link Modal State
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customersList, setCustomersList] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customerSearchText, setCustomerSearchText] = useState('');
    const [customerFilterTab, setCustomerFilterTab] = useState('all'); // 'all' | 'no-smc' | 'has-smc'
    const [previewedCustomer, setPreviewedCustomer] = useState(null);
    const [isLinkingDirectly, setIsLinkingDirectly] = useState(false);
    const [linkedCustomer, setLinkedCustomer] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [memRes, confRes, loyaltyConfRes] = await Promise.all([
                axios.get(`${API_BASE}/crm/memberships/all`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/crm/config/smc`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/loyalty/config`, { headers: authHeaders(), withCredentials: true }).catch(() => null)
            ]);
            setMemberships(memRes.data);
            setConfig(confRes.data);
            if (loyaltyConfRes && loyaltyConfRes.data) {
                setLoyaltyConfig(loyaltyConfRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch membership data', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleLookup = async () => {
        if (!lookupId) return;
        setIsSearching(true);
        setFoundCard(null);
        try {
            const res = await axios.get(`${API_BASE}/crm/card/${lookupId.trim().toUpperCase()}`, { headers: authHeaders(), withCredentials: true });
            setFoundCard(res.data);
            const isAlreadyLinked = Boolean(
                res.data.isAssigned &&
                res.data.firstName &&
                res.data.firstName !== 'Anonymous' &&
                res.data.firstName !== 'Walk-in'
            );
            if (isAlreadyLinked) {
                setIsRegistering(false);
                setLinkedCustomer(null);
            }
            // Pre-fill if already assigned
            if (res.data.firstName || res.data.lastName) {
                setRenewalForm({
                    firstName: res.data.firstName || '',
                    lastName: res.data.lastName || '',
                    phone: res.data.phone || '',
                    email: res.data.email || ''
                });
            }
        } catch (err) {
            Swal.fire('Not Found', 'This Membership ID does not exist.', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRenew = async () => {
        if (!foundCard) return;
        if (isRegistering && (!renewalForm.firstName || !renewalForm.lastName)) {
            return Swal.fire('Required', 'Please provide Name and Last Name for personalization.', 'warning');
        }

        const confirm = await Swal.fire({
            title: 'Confirm Renewal?',
            text: `This will renew ${foundCard.smcId} and charge ${config?.renewalPrice || 0}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Process!'
        });

        if (!confirm.isConfirmed) return;

        setIsRenewing(true);
        try {
            await axios.post(`${API_BASE}/crm/renew/${foundCard.smcId}`, {
                ...renewalForm,
                isRegistering
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({ title: 'Renewed!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setFoundCard(null);
            setLookupId('');
            setRenewalForm({ firstName: '', lastName: '', phone: '', email: '' });
            setLinkedCustomer(null);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Renewal failed.', 'error');
        } finally {
            setIsRenewing(false);
        }
    };

    const fetchCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
            const res = await axios.get(`${API_BASE}/crm`, { headers: authHeaders(), withCredentials: true });
            const list = Array.isArray(res.data) ? res.data : [];
            setCustomersList(list);
            if (list.length > 0 && !previewedCustomer) {
                setPreviewedCustomer(list[0]);
            }
        } catch (err) {
            console.error('Failed to fetch customers list:', err);
        } finally {
            setIsLoadingCustomers(false);
        }
    };

    const handleDirectLink = async (targetCustomer) => {
        const target = targetCustomer || previewedCustomer || linkedCustomer;
        if (!foundCard || !target) {
            Swal.fire('No Customer Selected', 'Please select a customer to link this card.', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Link SMC to Customer?',
            html: `Are you sure you want to link <b>${foundCard.smcId}</b> to <b>${target.firstName} ${target.lastName}</b>?<br/><span class="small text-muted">This will update the customer profile and assign the card without charging a renewal fee.</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#23A0CE',
            confirmButtonText: 'Yes, Link Card',
            cancelButtonText: 'Cancel'
        });

        if (!confirm.isConfirmed) return;

        setIsLinkingDirectly(true);
        try {
            const res = await axios.post(`${API_BASE}/crm/link-card/${foundCard.smcId}`, {
                customerId: target._id
            }, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                title: 'Card Linked!',
                text: res.data?.message || `SMC ${foundCard.smcId} successfully assigned to ${target.firstName} ${target.lastName}.`,
                icon: 'success',
                confirmButtonColor: '#23A0CE'
            });

            // Update found card state
            setFoundCard(prev => ({
                ...prev,
                firstName: target.firstName,
                lastName: target.lastName,
                customerName: `${target.firstName} ${target.lastName}`,
                customerId: target._id,
                phone: target.phone || '',
                email: target.email || '',
                isAssigned: true
            }));

            // Pre-fill renewal form
            setRenewalForm({
                firstName: target.firstName || '',
                lastName: target.lastName || '',
                phone: (target.phone && target.phone !== '00000000000') ? target.phone : '',
                email: target.email || ''
            });

            setLinkedCustomer(target);
            setShowCustomerSearch(false);
            fetchData();
        } catch (err) {
            Swal.fire('Link Failed', err.response?.data?.error || 'Failed to link card.', 'error');
        } finally {
            setIsLinkingDirectly(false);
        }
    };

    const handleSelectCustomer = (cust) => {
        setLinkedCustomer(cust);
        setRenewalForm({
            firstName: cust.firstName || '',
            lastName: cust.lastName || '',
            phone: (cust.phone && cust.phone !== '00000000000') ? cust.phone : '',
            email: cust.email || ''
        });
        setShowCustomerSearch(false);
    };

    const filteredCustomers = customersList.filter(c => {
        const query = customerSearchText.toLowerCase().trim();
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const smc = (c.smcId || '').toLowerCase();
        const loyalty = (c.loyaltyCardId || '').toLowerCase();
        const vehicles = Array.isArray(c.vehicles) ? c.vehicles.join(' ').toLowerCase() : '';

        const matchesQuery = !query ||
            fullName.includes(query) ||
            phone.includes(query) ||
            email.includes(query) ||
            smc.includes(query) ||
            loyalty.includes(query) ||
            vehicles.includes(query);

        if (!matchesQuery) return false;

        if (customerFilterTab === 'no-smc') {
            return !c.hasSMC && !c.smcId;
        }
        if (customerFilterTab === 'has-smc') {
            return c.hasSMC || Boolean(c.smcId);
        }
        return true;
    });

    const filteredMembers = memberships.filter(m => {
        const search = searchTerm.toLowerCase();
        const cid = m.cardId?.toLowerCase() || '';
        const name = m.customerName?.toLowerCase() || '';
        const dateStr = m.expiryDate ? new Date(m.expiryDate).toLocaleDateString().toLowerCase() : 'never';
        const status = m.expiryDate ? (new Date(m.expiryDate) < new Date() ? 'expired' : 'active') : 'active';

        return cid.includes(search) ||
            name.includes(search) ||
            dateStr.includes(search) ||
            status.includes(search);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to page 1 on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="animate-fade-in p-1">
            <TopHeader employee={employee}
                title="Membership Console"
                subtitle="Track card usage and process renewals"
                isDark={isDark} />

            <div className="row g-4">
                {/* 1. Renewal Panel */}
                <div className="col-12 col-xl-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <h6 className="fw-bold mb-3 brand-primary d-flex align-items-center gap-2">
                            <i className="bi bi-arrow-repeat"></i> SMC RENEWAL CONSOLE
                        </h6>

                        <div className="mb-4">
                            <label className="form-label text-muted small fw-bold">SCAN OR ENTER SMC ID</label>
                            <div className="d-flex gap-2">
                                <input
                                    type="text"
                                    className="form-control rounded-pill px-3 font-monospace text-uppercase"
                                    placeholder="SMC-XXXXXX"
                                    value={lookupId}
                                    onChange={e => setLookupId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                />
                                <button className="btn brand-primary rounded-pill px-3" onClick={handleLookup} disabled={isSearching || !lookupId}>
                                    {isSearching ? '...' : 'Lookup'}
                                </button>
                            </div>
                        </div>

                        {foundCard && (
                            <div className="animate-fade-in">
                                <div className="p-3 rounded-4 mb-4" style={{ background: 'rgba(35,160,206,0.05)', border: '1px solid rgba(35,160,206,0.1)' }}>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="mb-0 fw-bold">{foundCard.firstName} {foundCard.lastName}</h5>
                                        <span className={`badge rounded-pill ${new Date(foundCard.smcExpiryDate) > new Date() ? 'bg-success' : 'bg-danger'}`}>
                                            {new Date(foundCard.smcExpiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                                        </span>
                                    </div>
                                    <p className="small text-muted font-monospace mb-0">{foundCard.smcId}</p>
                                    <small className="d-block mt-2">Expires: <b>{new Date(foundCard.smcExpiryDate).toLocaleDateString()}</b></small>
                                </div>

                                {(() => {
                                    const isCardAlreadyLinked = Boolean(
                                        foundCard?.isAssigned &&
                                        foundCard?.firstName &&
                                        foundCard?.firstName !== 'Anonymous' &&
                                        foundCard?.firstName !== 'Walk-in'
                                    );
                                    return (
                                        <div className="p-3 rounded-4 mb-4 border" style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-content-border)' }}>
                                            <div className="form-check form-switch d-flex align-items-center gap-2 mb-2">
                                                <input
                                                    className="form-check-input mt-0"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="personalizeSwitch"
                                                    checked={!isCardAlreadyLinked && isRegistering}
                                                    disabled={isCardAlreadyLinked}
                                                    onChange={e => setIsRegistering(e.target.checked)}
                                                    style={{ cursor: isCardAlreadyLinked ? 'not-allowed' : 'pointer' }}
                                                />
                                                <label
                                                    className="form-check-label fw-bold small"
                                                    htmlFor="personalizeSwitch"
                                                    style={{
                                                        cursor: isCardAlreadyLinked ? 'not-allowed' : 'pointer',
                                                        color: isCardAlreadyLinked ? 'var(--bs-secondary)' : 'var(--theme-content-text)'
                                                    }}
                                                >
                                                    Personalize / Linking Customer?
                                                </label>
                                            </div>

                                            {isCardAlreadyLinked && (
                                                <div className="d-flex align-items-center gap-2 mt-2 p-2 rounded-3" style={{ background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                    <i className="bi bi-shield-lock-fill text-danger" style={{ fontSize: '0.85rem' }}></i>
                                                    <span className="small text-muted" style={{ fontSize: '0.74rem' }}>
                                                        Card linked to <b style={{ color: 'var(--theme-content-text)' }}>{foundCard.firstName} {foundCard.lastName}</b>. Personalization is disabled.
                                                    </span>
                                                </div>
                                            )}

                                            {!isCardAlreadyLinked && isRegistering && (
                                                <div className="animate-fade-in mt-3">
                                                    {/* Search Customer in System Button */}
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm w-100 rounded-pill mb-3 d-flex align-items-center justify-content-center gap-2 py-2"
                                                        style={{
                                                            background: 'rgba(35,160,206,0.12)',
                                                            border: '1px solid rgba(35,160,206,0.35)',
                                                            color: '#23A0CE',
                                                            fontWeight: 600
                                                        }}
                                                        onClick={() => {
                                                            setShowCustomerSearch(true);
                                                            if (customersList.length === 0) fetchCustomers();
                                                        }}
                                                    >
                                                        <i className="bi bi-search"></i>
                                                        <span>Search Customer in System</span>
                                                    </button>

                                                    {/* Selected Customer Preview */}
                                                    {linkedCustomer && (() => {
                                                        const custAlreadyHasSMC = Boolean(linkedCustomer.hasSMC || linkedCustomer.smcId);
                                                        const disableLeftLink = custAlreadyHasSMC || isLinkingDirectly;
                                                        return (
                                                            <div className="p-2.5 rounded-3 mb-3 border position-relative" style={{ background: 'rgba(35,160,206,0.08)', borderColor: 'rgba(35,160,206,0.25)' }}>
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 32, height: 32, background: '#23A0CE', fontSize: '0.8rem' }}>
                                                                            {linkedCustomer.firstName?.[0]}{linkedCustomer.lastName?.[0]}
                                                                        </div>
                                                                        <div>
                                                                            <div className="fw-bold small" style={{ color: 'var(--theme-content-text)' }}>
                                                                                {linkedCustomer.firstName} {linkedCustomer.lastName}
                                                                            </div>
                                                                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                                                {linkedCustomer.phone && linkedCustomer.phone !== '00000000000' ? linkedCustomer.phone : (linkedCustomer.email || 'No contact')}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                                                                        onClick={() => setLinkedCustomer(null)}
                                                                        title="Clear selection"
                                                                    >
                                                                        <i className="bi bi-x-circle"></i>
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className={`btn btn-sm w-100 mt-2 py-1.5 rounded-pill fw-bold ${disableLeftLink ? 'btn-secondary opacity-75' : 'btn-info text-white'}`}
                                                                    style={{ fontSize: '0.78rem', cursor: disableLeftLink ? 'not-allowed' : 'pointer' }}
                                                                    onClick={() => !disableLeftLink && handleDirectLink(linkedCustomer)}
                                                                    disabled={disableLeftLink}
                                                                >
                                                                    {isLinkingDirectly ? (
                                                                        'Linking...'
                                                                    ) : custAlreadyHasSMC ? (
                                                                        '🔒 Customer already has SMC — Linking Disabled'
                                                                    ) : (
                                                                        `🔗 Link ${foundCard.smcId} to ${linkedCustomer.firstName} (No Fee)`
                                                                    )}
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <label className="small text-muted fw-bold mb-1">First Name</label>
                                                            <input type="text" className="form-control form-control-sm" value={renewalForm.firstName} onChange={e => setRenewalForm({ ...renewalForm, firstName: e.target.value })} />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="small text-muted fw-bold mb-1">Last Name</label>
                                                            <input type="text" className="form-control form-control-sm" value={renewalForm.lastName} onChange={e => setRenewalForm({ ...renewalForm, lastName: e.target.value })} />
                                                        </div>
                                                        <div className="col-12 mt-2">
                                                            <label className="small text-muted fw-bold mb-1">Phone (Optional)</label>
                                                            <input type="text" className="form-control form-control-sm" value={renewalForm.phone} onChange={e => setRenewalForm({ ...renewalForm, phone: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <button className="btn brand-primary border-0 w-100 py-3 rounded-pill fw-bold shadow-sm" onClick={handleRenew} disabled={isRenewing}>
                                    {isRenewing ? 'Processing...' : `Renew Card — ₱${config?.renewalPrice || 0}`}
                                </button>
                                <small className="text-center d-block mt-2 text-muted">Adds {config?.validityMonths || 12} months to the validity</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Audit Logs Table */}
                <div className="col-12 col-xl-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden d-flex flex-column" style={{ minHeight: 730 }}>
                        <div className="p-4 border-0 d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold mb-0" style={{ color: 'var(--theme-content-text)' }}>SMC MEMBERSHIP AUDIT LOG</h6>
                            <SharedSearchBar
                                placeholder="Search card or name..."
                                onDebouncedSearch={(val) => setSearchTerm(val)}
                                debounceDelay={400}
                            />
                        </div>
                        <div className="card-body p-0 d-flex flex-column flex-grow-1">
                            {isLoading ? <TableSkeleton /> : (
                                <>
                                    <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
                                        <table className="table table-hover align-middle mb-0 ">
                                            <thead className="table-light sticky-top">
                                                <tr style={{ fontSize: '0.8rem' }}>
                                                    <th className="ps-4">Card ID</th>
                                                    <th>Member Name</th>
                                                    <th>Expiry Date</th>
                                                    <th>Status</th>
                                                    <th>Stamps Progress</th>
                                                    <th className="text-end pe-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentItems.length > 0 ? currentItems.map(m => {
                                                    const isExpired = m.expiryDate ? new Date(m.expiryDate) < new Date() : false;
                                                    const stampsRequired = loyaltyConfig?.stampsRequired || 9;
                                                    const currentStamps = m.stampCount || 0;
                                                    const pct = Math.min(100, (currentStamps / stampsRequired) * 100);
                                                    const isLoyalty = m.cardType === 'Loyalty' || (m.cardId && m.cardId.toUpperCase().startsWith('LOY')) || !m.expiryDate;
                                                    const isSMC = !isLoyalty;
                                                    return (
                                                        <tr key={m._id} style={{ fontSize: '0.85rem' }}>
                                                            <td className="ps-4 font-monospace fw-bold text-dark-secondary">{m.cardId}</td>
                                                            <td>{m.customerName || <span className="text-muted italic">No Profile Linked</span>}</td>
                                                            <td>{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : <span className="text-muted italic">Never (Stamp Card)</span>}</td>
                                                            <td>
                                                                <span className={`badge rounded-pill ${isExpired ? 'bg-danger-subtle text-danger border border-danger' : 'bg-success-subtle text-success border border-success'}`}>
                                                                    {isExpired ? 'Expired' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {m.pendingReward ? (
                                                                    <span className="badge bg-success-subtle text-success border border-success rounded-pill fw-bold" style={{ fontSize: '0.72rem' }}>
                                                                        🎁 Reward Ready!
                                                                    </span>
                                                                ) : (
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <div className="progress rounded-pill" style={{ width: '65px', height: '6px', backgroundColor: 'rgba(99,102,241,0.1)' }}>
                                                                            <div
                                                                                className="progress-bar rounded-pill"
                                                                                style={{
                                                                                    width: `${pct}%`,
                                                                                    backgroundColor: '#6366f1'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                                                                            {currentStamps}/{stampsRequired}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="text-end pe-4">
                                                                {isSMC ? (
                                                                    <button className="btn btn-sm btn-smc-card rounded-pill px-3" onClick={() => onSMCRequest(m.cardId)}>
                                                                        Print Card
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-muted small fst-italic">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5 text-muted">No matching records found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                            <small className="text-muted font-poppins">
                                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} entries
                                            </small>
                                            <nav>
                                                <ul className="pagination pagination-sm mb-0 gap-2">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={leftArrowIcon} style={{ width: '12px' }} alt="Left arrow icon" />
                                                        </button>
                                                    </li>

                                                    {/* Page Numbers */}
                                                    {getPaginationRange(currentPage, totalPages).map((pg, idx) => (
                                                        <li key={idx} className={`page-item ${currentPage === pg ? 'active' : ''} ${pg === '...' ? 'disabled' : ''}`}>
                                                            <button
                                                                className={`page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center ${currentPage === pg ? 'brand-primary text-white' : 'text-dark-secondary'}`}
                                                                onClick={() => pg !== '...' && handlePageChange(pg)}
                                                                style={{ width: '32px', height: '32px', background: currentPage === pg ? '#23A0CE' : 'transparent' }}
                                                            >
                                                                {pg}
                                                            </button>
                                                        </li>
                                                    ))}

                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link rounded-circle border-0 shadow-none d-flex align-items-center justify-content-center"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            style={{ width: '32px', height: '32px' }}
                                                        >
                                                            <img src={rightArrowIcon} style={{ width: '12px' }} alt="Right arrow icon" />
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
                </div>
            </div>

            {/* Customer Search & Link Modal */}
            {showCustomerSearch && (
                <AdminModalWrapper show={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} size="xl">
                    <div className="modal-content rounded-4 shadow border-0 overflow-hidden" style={{ background: 'var(--theme-modal-bg)', color: 'var(--theme-content-text)', border: '1px solid var(--theme-content-border)' }}>
                        <div className="modal-header px-4 pt-4 pb-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 44, height: 44, background: 'rgba(35,160,206,0.2)', border: '1px solid rgba(35,160,206,0.4)' }}>
                                    <i className="bi bi-person-bounding-box fs-5 text-info"></i>
                                </div>
                                <div>
                                    <h5 className="modal-title fw-bold mb-0" style={{ color: 'var(--theme-content-text)' }}>
                                        Search & Link Customer
                                    </h5>
                                    <small className="text-muted">
                                        Target Card: <span className="font-monospace text-info fw-bold">{foundCard?.smcId}</span> &bull; Connect an existing customer profile to this SMC card
                                    </small>
                                </div>
                            </div>
                            <button type="button" className={`btn-close ${isDark ? 'btn-close-white' : ''} shadow-none`} onClick={() => setShowCustomerSearch(false)}></button>
                        </div>

                        <div className="modal-body p-4">
                            {/* Search & Filter Header */}
                            <div className="row g-3 mb-3 align-items-center">
                                <div className="col-12 col-md-7">
                                    <div className="position-relative">
                                        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                                        <input
                                            type="text"
                                            className="form-control rounded-pill ps-5 pe-4 py-2"
                                            style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-content-text)', borderColor: 'var(--theme-content-border)' }}
                                            placeholder="Search customer by name, phone, email, plate, vehicle..."
                                            value={customerSearchText}
                                            onChange={e => setCustomerSearchText(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="col-12 col-md-5">
                                    <div className="d-flex gap-1 justify-content-md-end flex-wrap">
                                        {[
                                            { id: 'all', label: 'All', count: customersList.length },
                                            { id: 'no-smc', label: 'No SMC', count: customersList.filter(c => !c.hasSMC && !c.smcId).length },
                                            { id: 'has-smc', label: 'Has SMC', count: customersList.filter(c => c.hasSMC || c.smcId).length }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                className={`btn btn-sm rounded-pill px-3 py-1.5 ${customerFilterTab === tab.id ? 'btn-info text-white fw-bold' : isDark ? 'btn-outline-secondary' : 'btn-outline-secondary text-secondary'}`}
                                                style={{ fontSize: '0.78rem' }}
                                                onClick={() => setCustomerFilterTab(tab.id)}
                                            >
                                                {tab.label} ({tab.count})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isLoadingCustomers ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-info" role="status"></div>
                                    <p className="small text-muted mt-2">Loading customer directory...</p>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {/* Customer List Column */}
                                    <div className="col-12 col-lg-5">
                                        <div className="p-2 rounded-4 border overflow-auto" style={{ maxHeight: '460px', background: 'var(--theme-input-bg)', borderColor: 'var(--theme-content-border)' }}>
                                            {filteredCustomers.length === 0 ? (
                                                <div className="text-center py-5 text-muted small">
                                                    <i className="bi bi-emoji-neutral fs-3 d-block mb-2"></i>
                                                    No matching customers found.
                                                </div>
                                            ) : (
                                                filteredCustomers.map(cust => {
                                                    const isSelected = previewedCustomer?._id === cust._id;
                                                    return (
                                                        <div
                                                            key={cust._id}
                                                            className={`p-3 rounded-3 mb-2 border transition-all ${isSelected ? 'border-info' : ''}`}
                                                            style={{
                                                                background: isSelected
                                                                    ? (isDark ? 'rgba(35,160,206,0.18)' : 'rgba(35,160,206,0.1)')
                                                                    : (isDark ? 'rgba(255,255,255,0.02)' : 'var(--theme-card-bg, #ffffff)'),
                                                                borderColor: isSelected ? '#23A0CE' : 'var(--theme-content-border)',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setPreviewedCustomer(cust)}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 36, height: 36, background: '#23A0CE', fontSize: '0.85rem' }}>
                                                                        {cust.firstName?.[0]}{cust.lastName?.[0]}
                                                                    </div>
                                                                    <div>
                                                                        <div className="fw-bold" style={{ color: 'var(--theme-content-text)' }}>
                                                                            {cust.firstName} {cust.lastName}
                                                                        </div>
                                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                            {cust.phone && cust.phone !== '00000000000' ? cust.phone : (cust.email || 'No contact')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {cust.hasSMC || cust.smcId ? (
                                                                    <span className="badge rounded-pill bg-info bg-opacity-25 text-info font-monospace" style={{ fontSize: '0.7rem' }}>
                                                                        {cust.smcId || 'SMC'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge rounded-pill bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: '0.7rem' }}>
                                                                        No SMC
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-secondary border-opacity-10" style={{ fontSize: '0.72rem' }}>
                                                                <span className="text-muted">
                                                                    <i className="bi bi-clock-history me-1"></i> {cust.totalVisits || 0} visits
                                                                </span>
                                                                <span className="text-info fw-bold">
                                                                    ₱{(cust.lifetimeSpend || 0).toLocaleString()} spent
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer 360 Detail Column */}
                                    <div className="col-12 col-lg-7">
                                        {previewedCustomer ? (
                                            <div className="p-4 rounded-4 border h-100 d-flex flex-column justify-content-between" style={{ background: 'var(--theme-card-bg, rgba(0,0,0,0.02))', borderColor: 'var(--theme-content-border)' }}>
                                                <div>
                                                    {/* Header info */}
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #23A0CE 0%, #00e8e9 100%)', fontSize: '1.2rem' }}>
                                                                {previewedCustomer.firstName?.[0]}{previewedCustomer.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <h5 className="fw-bold mb-0" style={{ color: 'var(--theme-content-text)' }}>
                                                                    {previewedCustomer.firstName} {previewedCustomer.lastName}
                                                                </h5>
                                                                <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                                                                    {(previewedCustomer.tags || ['Customer']).map((tag, idx) => (
                                                                        <span key={idx} className="badge bg-secondary bg-opacity-25" style={{ fontSize: '0.7rem', color: 'var(--theme-content-text)' }}>
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Contact + Stats */}
                                                    <div className="d-flex gap-3 mb-3 flex-wrap" style={{ fontSize: '0.82rem' }}>
                                                        {previewedCustomer.phone && previewedCustomer.phone !== '00000000000' && (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-telephone-fill" style={{ color: '#23A0CE', fontSize: '0.75rem' }}></i>
                                                                <span>{previewedCustomer.phone}</span>
                                                            </div>
                                                        )}
                                                        {previewedCustomer.email && (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-envelope-fill" style={{ color: '#23A0CE', fontSize: '0.75rem' }}></i>
                                                                <span className="text-truncate" style={{ maxWidth: 200 }}>{previewedCustomer.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Stat Tiles */}
                                                    <div className="row g-2 mb-3">
                                                        {[
                                                            { icon: 'bi-clock-history', label: 'Total Visits', value: previewedCustomer.totalVisits || 0, color: '#23A0CE', bg: isDark ? 'rgba(35,160,206,0.12)' : 'rgba(35,160,206,0.08)', border: 'rgba(35,160,206,0.25)' },
                                                            { icon: 'bi-currency-exchange', label: 'Lifetime Spend', value: `₱${(previewedCustomer.lifetimeSpend || 0).toLocaleString()}`, color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
                                                            { icon: 'bi-calendar3', label: 'Last Visit', value: previewedCustomer.lastVisitDate ? new Date(previewedCustomer.lastVisitDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' }
                                                        ].map((s, i) => (
                                                            <div key={i} className="col-4">
                                                                <div className="rounded-3 p-2 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                                                                    <i className={`bi ${s.icon} d-block mb-1`} style={{ color: s.color, fontSize: '0.95rem' }}></i>
                                                                    <div className="fw-bold" style={{ color: s.color, fontSize: '0.9rem', lineHeight: 1.1 }}>{s.value}</div>
                                                                    <div className="text-muted" style={{ fontSize: '0.62rem', marginTop: 2 }}>{s.label}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Vehicles */}
                                                    <div className="mb-3">
                                                        <div className="text-muted small fw-bold mb-1" style={{ fontSize: '0.75rem' }}>REGISTERED VEHICLES</div>
                                                        <div className="d-flex gap-2 flex-wrap">
                                                            {previewedCustomer.vehicles && previewedCustomer.vehicles.length > 0 ? (
                                                                previewedCustomer.vehicles.map((v, i) => (
                                                                    <span key={i} className="badge rounded-pill px-3 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem', background: isDark ? 'rgba(35,160,206,0.12)' : 'rgba(35,160,206,0.08)', color: '#23A0CE', border: '1px solid rgba(35,160,206,0.25)' }}>
                                                                        <i className="bi bi-car-front-fill" style={{ fontSize: '0.68rem' }}></i> {v}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted small fst-italic">No vehicles registered yet</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Membership Status Alert */}
                                                    {(() => {
                                                        const isCardAlreadyLinked = Boolean(
                                                            foundCard?.isAssigned &&
                                                            foundCard?.firstName &&
                                                            foundCard?.firstName !== 'Anonymous' &&
                                                            foundCard?.firstName !== 'Walk-in' &&
                                                            foundCard?.customerId !== previewedCustomer._id
                                                        );
                                                        const alreadyHasSMC = Boolean(previewedCustomer.hasSMC || previewedCustomer.smcId);

                                                        if (isCardAlreadyLinked) {
                                                            return (
                                                                <div className="p-3 rounded-3 mb-2 border border-danger border-opacity-50" style={{ background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}>
                                                                    <div className="d-flex align-items-center gap-2 text-danger fw-bold small">
                                                                        <i className="bi bi-shield-lock-fill"></i>
                                                                        Card Already Assigned to {foundCard.firstName} {foundCard.lastName}
                                                                    </div>
                                                                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                                                        This SMC (<span className="font-monospace fw-bold">{foundCard?.smcId}</span>) already belongs to another customer. Re-linking or personalizing this card to another customer is disabled.
                                                                    </small>
                                                                </div>
                                                            );
                                                        }

                                                        if (alreadyHasSMC) {
                                                            return (
                                                                <div className="p-3 rounded-3 mb-2 border border-warning border-opacity-50" style={{ background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)' }}>
                                                                    <div className="d-flex align-items-center gap-2 text-warning fw-bold small">
                                                                        <i className="bi bi-exclamation-triangle-fill"></i>
                                                                        Customer Already Has SMC: <span className="font-monospace ms-1">{previewedCustomer.smcId}</span>
                                                                    </div>
                                                                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                                                        This customer already has an active SMC card. Linking or personalizing another card to this customer is disabled.
                                                                    </small>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="p-3 rounded-3 mb-2 border border-success border-opacity-50" style={{ background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)' }}>
                                                                <div className="d-flex align-items-center gap-2 text-success fw-bold small">
                                                                    <i className="bi bi-patch-check-fill"></i>
                                                                    Ready to Link — Customer has no existing SMC
                                                                </div>
                                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                                                    Linking will connect <span className="font-monospace text-info fw-bold">{foundCard?.smcId}</span> directly to this customer's profile.
                                                                </small>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Action Buttons */}
                                                {(() => {
                                                    const isCardAlreadyLinked = Boolean(
                                                        foundCard?.isAssigned &&
                                                        foundCard?.firstName &&
                                                        foundCard?.firstName !== 'Anonymous' &&
                                                        foundCard?.firstName !== 'Walk-in' &&
                                                        foundCard?.customerId !== previewedCustomer._id
                                                    );
                                                    const alreadyHasSMC = Boolean(previewedCustomer.hasSMC || previewedCustomer.smcId);
                                                    const isLinkDisabled = alreadyHasSMC || isCardAlreadyLinked || isLinkingDirectly;
                                                    const isPersonalizeDisabled = alreadyHasSMC || isCardAlreadyLinked;

                                                    const disabledBtnStyle = {
                                                        background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                                                        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                                                        color: isDark ? 'rgba(255,255,255,0.38)' : '#64748b',
                                                        boxShadow: 'none',
                                                        fontSize: '0.9rem',
                                                        cursor: 'not-allowed',
                                                        transition: 'all 0.2s ease'
                                                    };

                                                    const activeBtnStyle = {
                                                        background: isLinkingDirectly
                                                            ? 'rgba(35,160,206,0.5)'
                                                            : 'linear-gradient(135deg, #23A0CE 0%, #0ea5e9 55%, #00d4d4 100%)',
                                                        border: 'none',
                                                        color: '#ffffff',
                                                        boxShadow: '0 4px 18px rgba(35,160,206,0.28)',
                                                        fontSize: '0.9rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    };

                                                    return (
                                                        <div className="d-flex flex-column gap-2 pt-3" style={{ borderTop: '1px solid var(--theme-content-border)' }}>
                                                            <button
                                                                type="button"
                                                                className="btn w-100 fw-bold rounded-pill py-3 d-flex align-items-center justify-content-center gap-2"
                                                                style={isLinkDisabled ? disabledBtnStyle : activeBtnStyle}
                                                                onClick={() => !isLinkDisabled && handleDirectLink(previewedCustomer)}
                                                                disabled={isLinkDisabled}
                                                            >
                                                                {isCardAlreadyLinked ? (
                                                                    <><i className="bi bi-shield-lock-fill me-1"></i>Card Already Linked — Linking Disabled</>
                                                                ) : alreadyHasSMC ? (
                                                                    <><i className="bi bi-lock-fill me-1"></i>Customer already has SMC — Linking Disabled</>
                                                                ) : isLinkingDirectly ? (
                                                                    <><span className="spinner-border spinner-border-sm me-2"></span>Linking Card...</>
                                                                ) : (
                                                                    <><i className="bi bi-link-45deg fs-5"></i>Link <span className="font-monospace ms-1">{foundCard?.smcId}</span>&nbsp;→&nbsp;{previewedCustomer.firstName} {previewedCustomer.lastName}</>
                                                                )}
                                                            </button>

                                                            {isCardAlreadyLinked ? (
                                                                <div className="text-center" style={{ fontSize: '0.75rem', color: isDark ? '#f87171' : '#dc2626' }}>
                                                                    <i className="bi bi-shield-exclamation me-1"></i>
                                                                    This card is already registered to <span className="fw-bold">{foundCard?.firstName} {foundCard?.lastName}</span>
                                                                </div>
                                                            ) : alreadyHasSMC ? (
                                                                <div className="text-center" style={{ fontSize: '0.75rem', color: isDark ? 'rgba(245,158,11,0.9)' : '#d97706' }}>
                                                                    <i className="bi bi-exclamation-circle me-1"></i>
                                                                    Card <span className="font-monospace fw-bold">{previewedCustomer.smcId}</span> is already linked to this customer
                                                                </div>
                                                            ) : null}

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm rounded-pill py-2 d-flex align-items-center justify-content-center gap-2"
                                                                style={{
                                                                    background: isPersonalizeDisabled ? (isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9') : 'transparent',
                                                                    border: '1px solid var(--theme-content-border)',
                                                                    color: isPersonalizeDisabled ? (isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8') : 'var(--theme-content-text)',
                                                                    fontSize: '0.82rem',
                                                                    cursor: isPersonalizeDisabled ? 'not-allowed' : 'pointer'
                                                                }}
                                                                onClick={() => !isPersonalizeDisabled && handleSelectCustomer(previewedCustomer)}
                                                                disabled={isPersonalizeDisabled}
                                                            >
                                                                <i className={`bi ${isPersonalizeDisabled ? 'bi-lock-fill' : 'bi-pencil-square'}`}></i>
                                                                {isCardAlreadyLinked
                                                                    ? 'Personalize Disabled (Card Already Linked)'
                                                                    : alreadyHasSMC
                                                                        ? 'Personalize Disabled (Customer Has SMC)'
                                                                        : 'Fill in Personalize Form Only'}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="p-5 rounded-4 border text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: 'var(--theme-content-border)' }}>
                                                <i className="bi bi-person-bounding-box fs-1 mb-2 text-secondary"></i>
                                                <h6 style={{ color: 'var(--theme-content-text)' }}>Select a customer from the left list</h6>
                                                <small className="text-muted">Review their complete profile, visit history, and link this SMC card.</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default MembershipManagement;
