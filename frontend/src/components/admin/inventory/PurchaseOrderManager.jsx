import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from '../shared/AdminModalWrapper';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';

const PurchaseOrderManager = ({ vendors, inventoryItems, onUpdate }) => {
    const [pos, setPos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPO, setEditingPO] = useState(null); // null = create mode, object = edit mode

    // New PO state
    const [newPO, setNewPO] = useState({
        vendor: '',
        items: [],
        expectedDeliveryDate: '',
        notes: ''
    });

    const fetchPOs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/purchase-orders`, { headers: authHeaders(), withCredentials: true });
            setPos(res.data);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchPOs(); }, []);

    const handleAddItemToPO = () => {
        setNewPO({
            ...newPO,
            items: [...newPO.items, { inventoryItem: '', quantity: 1, unitCost: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const list = [...newPO.items];
        list.splice(index, 1);
        setNewPO({ ...newPO, items: list });
    };

    const handleItemChange = (index, field, value) => {
        const list = [...newPO.items];
        list[index][field] = value;
        // Auto-fill cost if selecting item
        if (field === 'inventoryItem') {
            const matched = inventoryItems.find(i => i._id === value);
            if (matched) list[index].unitCost = matched.costPerUnit;
        }
        setNewPO({ ...newPO, items: list });
    };

    const handleSubmitPO = async (e) => {
        e.preventDefault();
        try {
            if (editingPO) {
                // Update existing PO
                await axios.patch(`${API_BASE}/purchase-orders/${editingPO._id}`, newPO, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'PO Updated!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
            } else {
                // Create new PO
                await axios.post(`${API_BASE}/purchase-orders`, newPO, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'PO Created!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
            }
            setShowModal(false);
            setEditingPO(null);
            setNewPO({ vendor: '', items: [], expectedDeliveryDate: '', notes: '' });
            fetchPOs();
            if (onUpdate) onUpdate();
        } catch (err) { Swal.fire('Error', err.response?.data?.error || err.message || 'Failed to save PO', 'error'); }
    };

    const handleEditPO = (po) => {
        setEditingPO(po);
        setNewPO({
            vendor: po.vendor?._id || po.vendor || '',
            items: po.items.map(item => ({
                inventoryItem: item.inventoryItem?._id || item.inventoryItem || '',
                quantity: item.quantity,
                unitCost: item.unitCost
            })),
            expectedDeliveryDate: po.expectedDeliveryDate || '',
            notes: po.notes || ''
        });
        setShowModal(true);
    };

    const handleDeletePO = async (po) => {
        const result = await Swal.fire({
            title: 'Delete Purchase Order?',
            text: `This will permanently remove ${po.poNumber}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/purchase-orders/${po._id}`, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'PO Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
                fetchPOs();
                if (onUpdate) onUpdate();
            } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Cannot delete this PO', 'error'); }
        }
    };

    const handleReceivePO = async (id) => {
        const result = await Swal.fire({
            title: 'Receive Goods?',
            text: 'This will restock your inventory, create a payable bill in AP, and log the expense to the ledger.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, Receive',
            confirmButtonColor: '#22c55e'
        });
        if (result.isConfirmed) {
            try {
                await axios.post(`${API_BASE}/purchase-orders/${id}/receive`, {}, { headers: authHeaders(), withCredentials: true });
                Swal.fire({ title: 'Inventory Restocked & Bill Created!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
                fetchPOs();
                if (onUpdate) onUpdate();
            } catch (err) { Swal.fire('Error', err.response?.data?.error || 'Failed to receive', 'error'); }
        }
    };

    const openCreateModal = () => {
        setEditingPO(null);
        setNewPO({ vendor: '', items: [], expectedDeliveryDate: '', notes: '' });
        setShowModal(true);
    };

    if (isLoading) return <div className="text-center p-5 text-muted">Loading Orders...</div>;

    return (
        <div className="animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark-secondary">Purchase Orders</h6>
                    <button onClick={openCreateModal} className="btn btn-save btn-sm px-3 rounded-pill shadow-sm">+ Generate PO</button>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                            <thead className="bg-light font-poppins text-muted small">
                                <tr className="border-bottom">
                                    <th className="ps-4 py-3">PO Number</th>
                                    <th className="py-3">Vendor</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3">Items</th>
                                    <th className="py-3">Qty</th>
                                    <th className="py-3">Amount</th>
                                    <th className="py-3">Created</th>
                                    <th className="pe-4 py-3 text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pos.length === 0 ? (
                                    <tr><td colSpan="8" className="p-5 text-center text-muted">No purchase orders found.</td></tr>
                                ) : (
                                    pos.map(po => (
                                        <tr key={po._id}>
                                            <td className="ps-4 fw-bold">{po.poNumber}</td>
                                            <td className='fw-bold text-dark-secondary'>{po.vendor?.name || 'Unknown Vendor'}</td>
                                            <td>
                                                <span className={`badge rounded-pill ${po.status === 'Received' ? 'bg-success' : po.status === 'Draft' ? 'bg-secondary' : 'bg-warning'}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td>
                                                {po.items.map((item, i) => (
                                                    <div key={i} className="text-truncate fw-bold text-dark-gray100" style={{ maxWidth: 180, color: 'var(--theme-content-text)' }}>
                                                        {item.inventoryItem?.name || 'Unknown'} <span className="text-muted">({item.inventoryItem?.unit || '?'})</span>
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="fw-bold text-success">
                                                {po.items.map((item, i) => (
                                                    <div key={i}>{item.quantity}</div>
                                                ))}
                                            </td>
                                            <td className="fw-semibold text-dark-secondary">₱{po.totalAmount?.toLocaleString()}</td>
                                            <td className="text-muted small">{new Date(po.createdAt).toLocaleDateString()}</td>
                                            <td className="pe-4 text-end">
                                                <div className="d-flex gap-1 justify-content-end align-items-center">
                                                    {po.status !== 'Received' && (
                                                        <>
                                                            <button onClick={() => handleReceivePO(po._id)} className="btn btn-sm btn-outline-success rounded-pill px-3" style={{ fontSize: '0.8rem' }}>
                                                                Receive
                                                            </button>
                                                            <button onClick={() => handleEditPO(po)} className="btn btn-sm border-0 bg-transparent">
                                                                <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} title="Edit PO" />
                                                            </button>
                                                            <button onClick={() => handleDeletePO(po)} className="btn btn-sm border-0 bg-transparent">
                                                                <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} title="Delete PO" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <AdminModalWrapper show={showModal} onClose={() => { setShowModal(false); setEditingPO(null); }} size="lg">
                    <div className="modal-content border-0 rounded-4 shadow">
                        <form onSubmit={handleSubmitPO}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold">{editingPO ? 'Edit Purchase Order' : 'Generate Purchase Order'}</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowModal(false); setEditingPO(null); }} />
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label text-muted small fw-bold">Select Vendor</label>
                                    <select className="form-select rounded-3" required value={newPO.vendor} onChange={e => setNewPO({ ...newPO, vendor: e.target.value })}>
                                        <option value="">-- Choose Vendor --</option>
                                        {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <h6 className="fw-bold mt-4 mb-3 text-muted small">Order Items</h6>
                                {newPO.items.map((item, index) => (
                                    <div key={index} className="row g-2 mb-2 align-items-center">
                                        <div className="col-md-5">
                                            <span className="text-muted small fw-semibold">Item</span>
                                            <select className="form-select form-select-sm" required value={item.inventoryItem} onChange={e => handleItemChange(index, 'inventoryItem', e.target.value)}>
                                                <option value="">-- Select Item --</option>
                                                {inventoryItems.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <span className="text-muted small fw-semibold">Quantity</span>
                                            <input type="number" className="form-control form-control-sm" placeholder="Qty" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="col-md-3">
                                            <span className="text-muted small fw-semibold ms-4">Cost</span>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text text-dark border bg-light">₱</span>
                                                <input type="number" className="form-control" placeholder="Cost" required value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="col-md-1">
                                            <button type="button" className="btn btn-sm btn-danger w-100 mt-4" onClick={() => handleRemoveItem(index)}>X</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddItemToPO} className="btn btn-sm btn-outline-primary mt-2">+ Add Item</button>
                            </div>
                            <div className="modal-footer border-0">
                                <button type="button" className="btn btn-light" onClick={() => { setShowModal(false); setEditingPO(null); }}>Cancel</button>
                                <button type="submit" className="btn btn-save" disabled={!newPO.vendor || newPO.items.length === 0}>
                                    {editingPO ? 'Update Order' : 'Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default PurchaseOrderManager;
