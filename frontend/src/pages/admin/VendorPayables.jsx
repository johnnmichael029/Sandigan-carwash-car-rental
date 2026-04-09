import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import viewHistoryIcon from '../../assets/icon/detailer-history.png';
import editIcon from '../../assets/icon/edit.png';
import deleteIcon from '../../assets/icon/delete.png';
import accountPayableIcon from '../../assets/icon/account-payable.png';
import commisionIcon from '../../assets/icon/commission.png';
import operationCostIcon from '../../assets/icon/operation-cost.png';
import netProfitIcon from '../../assets/icon/net-profit.png';
import { API_BASE, authHeaders } from '../../api/config';
import { TableSkeleton, VendorSkeleton } from '../../components/SkeletonLoaders';
import AdminModalWrapper from '../../components/admin/shared/AdminModalWrapper';

const VendorPayables = ({ isDark }) => {
    const [vendors, setVendors] = useState([]);
    const [bills, setBills] = useState([]);
    const [summary, setSummary] = useState({ totalDebt: 0, overdueDebt: 0, upcomingDebt: 0, totalPaid: 0, count: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bills'); // 'bills', 'vendors', 'history'

    // Form Modals State
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showEditVendorModal, setShowEditVendorModal] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [selectedBill, setSelectedBill] = useState(null);
    const [selectedVendorHistory, setSelectedVendorHistory] = useState(null);
    const [newVendor, setNewVendor] = useState({ name: '', category: 'Supplies', contactPerson: '', phone: '', email: '', paymentTerms: 'Cash on Delivery' });
    const [editVendorData, setEditVendorData] = useState(null);
    const [newBill, setNewBill] = useState({ vendorId: '', billNumber: '', description: '', amount: 0, dueDate: '', notes: '' });
    const [paymentData, setPaymentData] = useState({ amount: 0, method: 'Cash', reference: '', date: new Date().toISOString().split('T')[0] });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [vRes, bRes, sRes] = await Promise.all([
                axios.get(`${API_BASE}/vendors`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/payables?status=Unpaid`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/payables/summary`, { headers: authHeaders(), withCredentials: true })
            ]);
            setVendors(vRes.data);
            setBills(bRes.data);
            setSummary(sRes.data);
        } catch (err) {
            console.error('Error fetching AP data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-generate Bill Number from backend (searching all invoices)
    useEffect(() => {
        const fetchNextNumber = async () => {
            if (showBillModal && (!newBill.billNumber || newBill.billNumber === '')) {
                try {
                    const res = await axios.get(`${API_BASE}/payables/next-bill-number`, { headers: authHeaders(), withCredentials: true });
                    if (res.data.nextBillNumber) {
                        setNewBill(prev => ({ ...prev, billNumber: res.data.nextBillNumber }));
                    }
                } catch (err) {
                    console.error("Error fetching next bill number:", err);
                }
            }
        };
        fetchNextNumber();
    }, [showBillModal]);

    // Reset bill number when modal is closed to ensure a fresh fetch next time
    useEffect(() => {
        if (!showBillModal) {
            setNewBill(prev => ({ ...prev, billNumber: '' }));
        }
    }, [showBillModal]);

    // Auto-generate Payment Reference
    useEffect(() => {
        if (showPaymentModal && (!paymentData.reference || paymentData.reference === '')) {
            const today = new Date();
            const mm = today.getMonth() + 1;
            const dd = String(today.getDate()).padStart(2, '0');
            const yy = String(today.getFullYear()).slice(-2);
            const dateStr = `${mm}${dd}${yy}`;

            const sequence = String(Math.floor(Math.random() * 90) + 10); // Random suffix for variety in frontend
            const generatedRef = `PAY-${dateStr}-${sequence}`;

            setPaymentData(prev => ({ ...prev, reference: generatedRef, date: new Date().toISOString().split('T')[0] }));
        }
    }, [showPaymentModal, paymentData.reference]);

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/vendors/add`, newVendor, { headers: authHeaders(), withCredentials: true });
            setShowVendorModal(false);
            setNewVendor({ name: '', category: 'Supplies', contactPerson: '', phone: '', email: '', paymentTerms: 'Cash on Delivery' });
            fetchData();
            Swal.fire('Success', 'Vendor profile created.', 'success');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to create vendor', 'error');
        }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/payables/add`, newBill, { headers: authHeaders(), withCredentials: true });
            setShowBillModal(false);
            setNewBill({ vendorId: '', billNumber: '', description: '', amount: 0, dueDate: '', notes: '' });
            fetchData();
            Swal.fire('Success', 'Bill recorded in Accounts Payable.', 'success');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to record bill', 'error');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedBill) return;
        try {
            await axios.post(`${API_BASE}/payables/${selectedBill._id}/pay`, paymentData, { headers: authHeaders(), withCredentials: true });
            setShowPaymentModal(false);
            setSelectedBill(null);
            setPaymentData({ amount: 0, method: 'Cash', reference: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
            Swal.fire({
                title: 'Payment Recorded',
                text: 'The bill has been updated and a financial expense was logged.',
                icon: 'success',
                confirmButtonColor: '#10b981'
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Payment failed', 'error');
        }
    };

    const handleViewHistory = async (vendorId) => {
        try {
            const res = await axios.get(`${API_BASE}/vendors/${vendorId}/stats`, { headers: authHeaders(), withCredentials: true });
            setSelectedVendorHistory(res.data);
            setShowHistoryModal(true);
        } catch (err) {
            Swal.fire('Error', 'Failed to fetch vendor history.', 'error');
        }
    };

    const handleOpenEditVendor = () => {
        if (!selectedVendorHistory) return;
        setEditVendorData({ ...selectedVendorHistory.vendor });
        setShowEditVendorModal(true);
    };

    const handleUpdateVendor = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_BASE}/vendors/${editVendorData._id}/update`, editVendorData, { headers: authHeaders(), withCredentials: true });
            Swal.fire({ title: 'Updated!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            setShowEditVendorModal(false);
            setSelectedVendorHistory(null);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to update vendor', 'error');
        }
    };

    const handleDeleteVendor = async () => {
        if (!selectedVendorHistory) return;
        Swal.fire({
            title: 'Are you sure?',
            text: "This vendor profile will be permanently deleted. This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE}/vendors/${selectedVendorHistory.vendor._id}/delete`, { headers: authHeaders(), withCredentials: true });
                    Swal.fire('Deleted!', 'Vendor has been removed.', 'success');
                    setShowHistoryModal(false);
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', err.response?.data?.error || 'Cannot delete vendor with transaction history.', 'error');
                }
            }
        });
    };

    if (isLoading) return <div className="p-4"><VendorSkeleton /></div>;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary fw-bold">Accounts Payable (AP)</h4>
                    <p className="mb-0 text-muted small">Manage suppliers, unpaid bills, and outgoing cash flow.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => setShowVendorModal(true)} className="btn btn-save btn-sm px-3 rounded-3 shadow-sm">+ Add Vendor</button>
                    <button onClick={() => setShowBillModal(true)} className="btn btn-save btn-sm px-4 rounded-3 shadow-sm">+ New Bill</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-3 mb-4">
                {[
                    {
                        title: "Total Payable",
                        value: `₱${summary.totalDebt.toLocaleString()}`,
                        icon: <img src={accountPayableIcon} style={{ width: '20px' }} alt="Payable" />,
                        color: "#f43f5e",
                        bg: "linear-gradient(135deg,#f43f5e15,#f43f5e05)",
                        dot: "#f43f5e",
                        desc: "Amount currently owed to all vendors"
                    },
                    {
                        title: "Upcoming (7 Days)",
                        value: `₱${summary.upcomingDebt.toLocaleString()}`,
                        icon: <img src={operationCostIcon} style={{ width: '20px' }} alt="Upcoming" />,
                        color: "#f59e0b",
                        bg: "linear-gradient(135deg,#f59e0b15,#f59e0b05)",
                        dot: "#f59e0b",
                        desc: "Due within the next week"
                    },
                    {
                        title: "Overdue Debt",
                        value: `₱${summary.overdueDebt.toLocaleString()}`,
                        icon: <img src={netProfitIcon} style={{ width: '20px' }} alt="Overdue" />,
                        color: "#ef4444",
                        bg: "linear-gradient(135deg,#ef444415,#ef444405)",
                        dot: "#ef4444",
                        desc: "Payments past their set due date"
                    },
                    {
                        title: "Total Paid",
                        value: `₱${summary.totalPaid.toLocaleString()}`,
                        icon: <img src={commisionIcon} style={{ width: '20px' }} alt="Paid" />,
                        color: "#22c55e",
                        bg: "linear-gradient(135deg,#22c55e15,#22c55e05)",
                        dot: "#22c55e",
                        desc: "Cumulative payments released"
                    },
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
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.68rem', lineHeight: 1 }}>{card.value}</h3>
                                <small className="d-block text-truncate" style={{ color: '#9ca3af', fontSize: '0.68rem' }} title={card.desc}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub-Tabs */}
            <ul className="nav nav-pills mb-4 gap-2 bg-light p-2 rounded-4 d-inline-flex border shadow-sm">
                <li className="nav-item">
                    <button className={`nav-link border-0 rounded-3 px-4 ${activeTab === 'bills' ? 'btn-save text-primary shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('bills')}>Unpaid Bills</button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link border-0 rounded-3 px-4 ${activeTab === 'vendors' ? 'btn-save text-primary shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('vendors')}>Vendor Directory</button>
                </li>
            </ul>

            {/* BILLS VIEW */}
            {activeTab === 'bills' && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    {bills.length === 0 ? (
                        <div className="p-5 text-center text-muted">
                            <p>No unpaid bills found. All clear!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-muted small">
                                    <tr>
                                        <th className="ps-4">Due Date</th>
                                        <th>Vendor</th>
                                        <th>Bill #</th>
                                        <th>Description</th>
                                        <th className="pe-4">Balance Owed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.map(bill => {
                                        const isOverdue = new Date(bill.dueDate) < new Date();
                                        return (
                                            <tr
                                                key={bill._id}
                                                onClick={() => handleViewHistory(bill.vendorId?._id)}
                                                style={{ cursor: 'pointer' }}
                                                className="transition-all hover:bg-light"
                                            >
                                                <td className="ps-4">
                                                    <div className={`fw-bold ${isOverdue ? 'text-danger' : 'text-dark-secondary'}`}>{new Date(bill.dueDate).toLocaleDateString()}</div>
                                                    {isOverdue && <span className="badge bg-danger-subtle text-danger p-1" style={{ fontSize: '0.65rem' }}>OVERDUE</span>}
                                                </td>
                                                <td className="fw-bold">{bill.vendorId?.name || 'Unknown'}</td>
                                                <td className="text-muted small">{bill.billNumber}</td>
                                                <td>{bill.description}</td>
                                                <td className="pe-4">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="fw-bold text-dark-secondary">₱{bill.balanceOwed.toLocaleString()}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBill(bill);
                                                                setPaymentData({ ...paymentData, amount: bill.balanceOwed });
                                                                setShowPaymentModal(true);
                                                            }}
                                                            className="btn btn-sm btn-success px-3 rounded-pill shadow-sm"
                                                        >
                                                            Pay
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
            )}

            {/* VENDORS VIEW */}
            {activeTab === 'vendors' && (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-muted small">
                                <tr>
                                    <th className="ps-4">Supplier Name</th>
                                    <th>Category</th>
                                    <th>Contact</th>
                                    <th>Total Owed</th>
                                    <th className="pe-4">Total Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendors.map(v => (
                                    <tr
                                        key={v._id}
                                        onClick={() => handleViewHistory(v._id)}
                                        style={{ cursor: 'pointer' }}
                                        className="transition-all hover:bg-light"
                                    >
                                        <td className="ps-4">
                                            <div className="fw-bold text-dark-secondary">{v.name}</div>
                                            <div className="text-muted small">{v.paymentTerms}</div>
                                        </td>
                                        <td><span className="badge bg-light text-dark border px-2">{v.category}</span></td>
                                        <td>
                                            <div className="small">{v.contactPerson}</div>
                                            <div className="text-muted extra-small">{v.phone}</div>
                                        </td>
                                        <td className="fw-bold text-danger">₱{v.totalOwed.toLocaleString()}</td>
                                        <td className="pe-4 fw-bold text-success">₱{v.totalPaid.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* 1. Add Vendor Modal */}
            {showVendorModal && (
                <AdminModalWrapper show={showVendorModal} onClose={() => setShowVendorModal(false)}>
                    <div className="modal-content border-0 rounded-4 shadow-lg">
                        <form onSubmit={handleCreateVendor}>
                            <div className="modal-header border-0 p-4 pb-0">
                                <h5 className="fw-bold mb-0">New Supplier Profile</h5>
                                <button type="button" className="btn-close" onClick={() => setShowVendorModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Vendor Name</label>
                                    <input className="form-control" required value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} placeholder="e.g. CleanMaster Corp" />
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Category</label>
                                        <select className="form-select" value={newVendor.category} onChange={e => setNewVendor({ ...newVendor, category: e.target.value })}>
                                            <option value="Supplies">Supplies</option>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Rent">Rent</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Payment Terms</label>
                                        <select className="form-select" value={newVendor.paymentTerms} onChange={e => setNewVendor({ ...newVendor, paymentTerms: e.target.value })}>
                                            <option value="Cash on Delivery">Cash on Delivery</option>
                                            <option value="Gcash">Gcash</option>
                                            <option value="Maya">Maya</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Contact Person</label>
                                        <input className="form-control" value={newVendor.contactPerson} onChange={e => setNewVendor({ ...newVendor, contactPerson: e.target.value })} placeholder="e.g. Juan Dela Cruz" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Phone Number</label>
                                        <input
                                            className="form-control"
                                            value={newVendor.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 11) {
                                                    setNewVendor({ ...newVendor, phone: val });
                                                }
                                            }}
                                            placeholder="e.g. 09123456789"
                                        />
                                    </div>
                                </div>
                                <label className="form-label small fw-bold text-muted">Email Address</label>
                                <input className="form-control" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} placeholder="e.g. juandelacruz@gmail.com" />
                            </div>
                            <div className="modal-footer border-0 p-4 pt-0">
                                <button type="submit" className="btn btn-save w-100 rounded-3 shadow">Create Vendor</button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}

            {/* 2. Add Bill Modal */}
            {showBillModal && (
                <AdminModalWrapper show={showBillModal} onClose={() => setShowBillModal(false)}>
                    <div className="modal-content border-0 rounded-4 shadow-lg">
                        <form onSubmit={handleCreateBill}>
                            <div className="modal-header border-0 p-4 pb-0">
                                <h5 className="fw-bold mb-0">Record New Bill</h5>
                                <button type="button" className="btn-close" onClick={() => setShowBillModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Vendor</label>
                                    <select className="form-select" required value={newBill.vendorId} onChange={e => setNewBill({ ...newBill, vendorId: e.target.value })}>
                                        <option value="">-- Select Vendor --</option>
                                        {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Bill / Invoice #</label>
                                        <input className="form-control" required readOnly value={newBill.billNumber} onChange={e => setNewBill({ ...newBill, billNumber: e.target.value })} placeholder="INV-2024-001" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Amount Due (₱)</label>
                                        <input className="form-control" type="number" required value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Description</label>
                                    <input className="form-control" required value={newBill.description} onChange={e => setNewBill({ ...newBill, description: e.target.value })} placeholder="e.g. 5 Liters Foam Soap" />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Due Date</label>
                                    <input className="form-control" type="date" required value={newBill.dueDate} onChange={e => setNewBill({ ...newBill, dueDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-4 pt-0">
                                <button type="submit" className="btn btn-primary w-100 rounded-3 shadow">Add to Payables</button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}

            {/* 3. Record Payment Modal */}
            {showPaymentModal && selectedBill && (
                <AdminModalWrapper show={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
                    <div className="modal-content border-0 rounded-4 shadow-lg">
                        <form onSubmit={handleRecordPayment}>
                            <div className="modal-header border-0 p-4 pb-0">
                                <h5 className="fw-bold mb-0 text-success">Release Payment</h5>
                                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <p className="text-muted mb-4">You are recording a payment for:<br /><b className="text-dark-secondary">{selectedBill.description}</b><br /><small className="text-muted">{selectedBill.vendorId?.name}</small></p>

                                <div className="bg-light p-3 rounded-4 mb-4">
                                    <label className="form-label small fw-bold text-muted mb-1">Amount to Release</label>
                                    <div className="input-group input-group-lg">
                                        <span className="input-group-text bg-transparent border-0 fw-bold text-dark">₱</span>
                                        <input className="form-control border-0 fw-bold text-center text-dark rounded-3" type="number" required value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} />
                                    </div>
                                </div>

                                <div className="row g-2 mb-3 text-start">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Method</label>
                                        <select className="form-select" value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}>
                                            <option value="Cash">Cash</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="GCash">GCash</option>
                                            <option value="Check">Check</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Date Paid</label>
                                        <input className="form-control" type="date" value={paymentData.date} onChange={e => setPaymentData({ ...paymentData, date: e.target.value })} />
                                    </div>
                                </div>
                                <div className="text-start">
                                    <label className="form-label small fw-bold text-muted">Reference #</label>
                                    <input className="form-control bg-light border-0 fw-bold text-muted" readOnly value={paymentData.reference} onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })} placeholder="PAY-MMDDYY-01" />
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-4 pt-0">
                                <button type="submit" className="btn btn-success w-100 rounded-3 shadow py-2">Confirm & Sync to Expenses</button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}

            {/* 4. Vendor History / 360 Modal (CRM Matched UI) */}
            {showHistoryModal && selectedVendorHistory && (
                <AdminModalWrapper show={showHistoryModal} onClose={() => setShowHistoryModal(false)} size="lg">
                    <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
                        {/* Modal Header Profile (Matching CRM) */}
                        <div className="modal-header border-0 pb-4 pt-5 px-5 position-relative" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                            <button type="button" className="btn-close btn-close-white position-absolute top-0 end-0 m-3" onClick={() => setShowHistoryModal(false)} />
                            <div className="d-flex align-items-center gap-4 w-100 text-white">
                                <div className="rounded-circle d-flex align-items-center justify-content-center brand-accent fw-bold shadow-lg text-white" style={{ width: 80, height: 80, fontSize: '2rem', background: 'var(--brand-active)' }}>
                                    {selectedVendorHistory.vendor.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-grow-1">
                                    <h3 className="mb-1 fw-bold font-poppins">{selectedVendorHistory.vendor.name}</h3>
                                    <p className="mb-2 text-light opacity-75 d-flex gap-3" style={{ fontSize: '0.85rem' }}>
                                        <span>Email: {selectedVendorHistory.vendor.email || 'N/A'}</span>
                                        <span>Phone: {selectedVendorHistory.vendor.phone || 'N/A'}</span>
                                    </p>
                                    <div className="d-flex gap-2">
                                        <button onClick={handleOpenEditVendor} className="btn border-0 bg-transparent px-3 d-flex justify-content-center align-items-center">
                                            <img src={editIcon} style={{ width: '16px' }} alt="Edit Icon" /></button>
                                        <button onClick={handleDeleteVendor} className="btn border-0 bg-transparent px-3 d-flex justify-content-center align-items-center">
                                            <img src={deleteIcon} style={{ width: '16px' }} alt="Delete Icon" /></button>
                                    </div>
                                </div>
                                <div className="text-end pe-2">
                                    <p className="mb-1 text-light opacity-75 small text-uppercase">Total Spent</p>
                                    <h3 className="mb-0 text-success fw-bold">₱{selectedVendorHistory.vendor.totalPaid.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="modal-body p-0">
                            <div className="row g-0">
                                {/* Left Column (Stats & Info) */}
                                <div className="col-md-5 p-4 border-end bg-light" style={{ minHeight: '420px' }}>
                                    <h6 className="fw-bold text-dark-secondary mb-3">Quick Actions</h6>
                                    <div className="d-flex gap-2 mb-4">
                                        {selectedVendorHistory.vendor.email ? (
                                            <a href={`mailto:${selectedVendorHistory.vendor.email}`} className="btn btn-save btn-sm flex-fill rounded-3 shadow-sm text-decoration-none text-center d-flex align-items-center justify-content-center">Email</a>
                                        ) : (
                                            <button disabled className="btn btn-sm btn-outline-secondary flex-fill rounded-3 opacity-50" style={{ cursor: 'not-allowed' }}>No Email</button>
                                        )}
                                        {selectedVendorHistory.vendor.phone ? (
                                            <a href={`tel:${selectedVendorHistory.vendor.phone}`} className="btn btn-call btn-sm flex-fill rounded-3 text-decoration-none text-center d-flex align-items-center justify-content-center">Call</a>
                                        ) : (
                                            <button disabled className="btn btn-sm btn-outline-secondary flex-fill rounded-3 opacity-50" style={{ cursor: 'not-allowed' }}>No Phone</button>
                                        )}
                                    </div>

                                    <h6 className="fw-bold text-dark-secondary mb-2">Vendor Details</h6>
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center gap-2 p-2 px-3 border rounded-3 bg-white" style={{ borderColor: '#f59e0b', borderLeft: '4px solid #f59e0b' }}>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', color: '#d97706' }}>{selectedVendorHistory.vendor.category}</div>
                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{selectedVendorHistory.vendor.paymentTerms}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <h6 className="fw-bold text-dark-secondary mb-2">Unpaid Balance</h6>
                                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-4">
                                        <h4 className="fw-bold mb-0 text-danger">₱{selectedVendorHistory.vendor.totalOwed.toLocaleString()}</h4>
                                        <small className="text-muted">Outstanding debt for this vendor</small>
                                    </div>

                                    <h6 className="fw-bold text-dark-secondary mb-2">Contact Person</h6>
                                    <div className="bg-white p-3 rounded-3 shadow-sm border border-light">
                                        <div className="fw-bold text-dark-secondary small">{selectedVendorHistory.vendor.contactPerson || 'No Contact Person'}</div>
                                        <div className="text-muted small mt-1">{selectedVendorHistory.vendor.address || 'No Address Provided'}</div>
                                    </div>
                                </div>

                                {/* Right Column (Payment Timeline) */}
                                <div className="col-md-7 p-4 bg-white">
                                    <h6 className="fw-bold text-dark-secondary mb-3">Payment Timeline</h6>
                                    {selectedVendorHistory.history.length === 0 ? (
                                        <p className="text-muted small">No past transactions found.</p>
                                    ) : (
                                        <div style={{ maxHeight: '600px', overflowY: 'auto' }} className="pe-2 custom-scrollbar">
                                            {selectedVendorHistory.history.map((bill, idx) => (
                                                <div key={bill._id} className="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom border-light">
                                                    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center text-muted fw-bold" style={{ width: 32, height: 32, flexShrink: 0, fontSize: '0.8rem' }}>
                                                        {selectedVendorHistory.history.length - idx}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span className="fw-bold text-dark-secondary" style={{ fontSize: '0.85rem' }}>{bill.description}</span>
                                                            <span className="fw-bold text-dark-secondary" style={{ fontSize: '0.85rem' }}>₱{bill.amount?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <small className="text-muted">{new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                                                            <div className="d-flex gap-2 align-items-center">
                                                                <span className="badge bg-light text-muted border px-2" style={{ fontSize: '0.65rem' }}>{bill.billNumber}</span>
                                                                <span className={`badge rounded-pill ${bill.status === 'Paid' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: '0.65rem' }}>
                                                                    {bill.status}
                                                                </span>
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
                </AdminModalWrapper>
            )}

            {/* 5. Edit Vendor Modal */}
            {showEditVendorModal && editVendorData && (
                <AdminModalWrapper show={showEditVendorModal} onClose={() => setShowEditVendorModal(false)}>
                    <div className="modal-content border-0 rounded-4 shadow-lg">
                        <form onSubmit={handleUpdateVendor}>
                            <div className="modal-header border-0 p-4 pb-0">
                                <h5 className="fw-bold mb-0">Edit Supplier Profile</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditVendorModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Vendor Name</label>
                                    <input className="form-control" required value={editVendorData.name} onChange={e => setEditVendorData({ ...editVendorData, name: e.target.value })} />
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Category</label>
                                        <select className="form-select" value={editVendorData.category} onChange={e => setEditVendorData({ ...editVendorData, category: e.target.value })}>
                                            <option value="Supplies">Supplies</option>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Rent">Rent</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Payment Terms</label>
                                        <select className="form-select" value={editVendorData.paymentTerms} onChange={e => setEditVendorData({ ...editVendorData, paymentTerms: e.target.value })}>
                                            <option value="Cash on Delivery">Cash on Delivery</option>
                                            <option value="Gcash">Gcash</option>
                                            <option value="Maya">Maya</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Contact Person</label>
                                        <input className="form-control" value={editVendorData.contactPerson} onChange={e => setEditVendorData({ ...editVendorData, contactPerson: e.target.value })} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Phone Number</label>
                                        <input
                                            className="form-control"
                                            value={editVendorData.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 11) {
                                                    setEditVendorData({ ...editVendorData, phone: val });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <label className="form-label small fw-bold text-muted">Email Address</label>
                                <input className="form-control" value={editVendorData.email} onChange={e => setEditVendorData({ ...editVendorData, email: e.target.value })} />
                            </div>
                            <div className="modal-footer border-0 p-4 pt-0">
                                <button type="submit" className="btn btn-save w-100 rounded-3 shadow">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default VendorPayables;
