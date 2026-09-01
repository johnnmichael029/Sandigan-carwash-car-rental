import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import TopHeader from './TopHeader';
import { TableSkeleton } from '../../SkeletonLoaders';
import getPaginationRange from '../../admin/getPaginationRange';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';
import searchIcon from '../../../assets/icon/search.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

const MembershipManagement = ({ employee, onSMCRequest, isDark }) => {
    const [memberships, setMemberships] = useState([]);
    const [config, setConfig] = useState(null);
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [memRes, confRes] = await Promise.all([
                axios.get(`${API_BASE}/crm/memberships/all`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/crm/config/smc`, { headers: authHeaders(), withCredentials: true })
            ]);
            setMemberships(memRes.data);
            setConfig(confRes.data);
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
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Renewal failed.', 'error');
        } finally {
            setIsRenewing(false);
        }
    };

    const filteredMembers = memberships.filter(m => {
        const search = searchTerm.toLowerCase();
        const cid = m.cardId?.toLowerCase() || '';
        const name = m.customerName?.toLowerCase() || '';
        const dateStr = new Date(m.expiryDate).toLocaleDateString().toLowerCase();
        const status = new Date(m.expiryDate) < new Date() ? 'expired' : 'active';

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

                                <div className="p-3 rounded-4 mb-4 border" style={{ background: 'var(--theme-input-bg)', borderColor: 'var(--theme-content-border)' }}>
                                    <div className="form-check form-switch d-flex align-items-center gap-2 mb-3">
                                        <input
                                            className="form-check-input mt-0"
                                            type="checkbox"
                                            role="switch"
                                            id="personalizeSwitch"
                                            checked={isRegistering}
                                            onChange={e => setIsRegistering(e.target.checked)}
                                        />
                                        <label className="form-check-label fw-bold small" htmlFor="personalizeSwitch" style={{ cursor: 'pointer', color: 'var(--theme-content-text)' }}>
                                            Personalize / Linking Customer?
                                        </label>
                                    </div>

                                    {isRegistering && (
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
                                    )}
                                </div>

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
                                                    <th className="text-end pe-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentItems.length > 0 ? currentItems.map(m => {
                                                    const isExpired = new Date(m.expiryDate) < new Date();
                                                    return (
                                                        <tr key={m._id} style={{ fontSize: '0.85rem' }}>
                                                            <td className="ps-4 font-monospace fw-bold text-dark-secondary">{m.cardId}</td>
                                                            <td>{m.customerName || <span className="text-muted italic">No Profile Linked</span>}</td>
                                                            <td>{new Date(m.expiryDate).toLocaleDateString()}</td>
                                                            <td>
                                                                <span className={`badge rounded-pill ${isExpired ? 'bg-danger-subtle text-danger border border-danger' : 'bg-success-subtle text-success border border-success'}`}>
                                                                    {isExpired ? 'Expired' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="text-end pe-4">
                                                                <button className="btn btn-sm btn-smc-card rounded-pill px-3" onClick={() => onSMCRequest(m.cardId)}>
                                                                    Print Card
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5 text-muted">No matching records found.</td>
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
        </div>
    );
};

export default MembershipManagement;
