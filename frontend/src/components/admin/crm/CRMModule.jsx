import { useState, useEffect, useMemo } from 'react';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, CRMSkeleton } from '../../SkeletonLoaders';
import Swal from 'sweetalert2';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';

import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import sandiganLogo from '../../../assets/logo/sandigan-logo.png';

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

    if (isLoading) return <div className="p-4"><CRMSkeleton /></div>;

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
                                        <tr key={client._id} style={{ cursor: 'pointer' }} onClick={() => handleOpen360(client)}>
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
                <AdminModalWrapper show={!!selectedClient} onClose={() => setSelectedClient(null)} dialogStyle={{ maxWidth: '800px' }}>
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
                </AdminModalWrapper>
            )}

            {/* Edit Client Modal */}
            {showEditClientModal && editClientData && (
                <AdminModalWrapper show={showEditClientModal} onClose={() => setShowEditClientModal(false)}>
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
                </AdminModalWrapper>
            )}

            {/* SMC Config Modal */}
            {showSMCConfig && (
                <AdminModalWrapper show={showSMCConfig} onClose={() => setShowSMCConfig(false)}>
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
                </AdminModalWrapper>
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

                                        {/* <div className="mt-2 text-start">
                                            <h4 className="mb-0 fw-bold" style={{ fontSize: '1.4rem' }}>{selectedClient.firstName?.toUpperCase()} {selectedClient.lastName?.toUpperCase()}</h4>
                                            <p className="mb-0 opacity-75" style={{ fontSize: '0.7rem', fontWeight: 300, spacing: '2px' }}>MEMBERSHIP STATUS: ACTIVE</p>
                                        </div> */}

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
                <AdminModalWrapper show={showAddClientModal} onClose={() => setShowAddClientModal(false)}>
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
                </AdminModalWrapper>
            )}

            {/* Tag Library Manager Modal */}
            {showTagManager && (
                <AdminModalWrapper show={showTagManager} onClose={() => { setShowTagManager(false); setEditingTag(null); }} dialogStyle={{ maxWidth: '800px' }}>
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
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default CRMPage;