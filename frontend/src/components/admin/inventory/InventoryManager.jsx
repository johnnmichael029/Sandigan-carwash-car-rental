import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import { TableSkeleton, InventorySkeleton } from '../../SkeletonLoaders';
import InventoryCategoryManager from './InventoryCategorySettings';
import ProductCatalog from './ProductCatalog';
import RecipeBuilder from './ServiceRecipeBuilder';
import stocksIcon from '../../../assets/icon/stocks.png';
import inventoryIcon from '../../../assets/icon/inventory.png';
import recipeIcon from '../../../assets/icon/recipe.png';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';

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

    if (isLoading) return <div className="p-4"><InventorySkeleton /></div>;

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
                                                                        <img src={editIcon} alt="Edit" style={{ width: '18px', height: '18px' }} title='Edit Item' />
                                                                    </button>
                                                                    <button onClick={() => deleteItem(item._id)} className="btn btn-sm text-danger-hover border-0 bg-transparent">
                                                                        <img src={deleteIcon} alt="Delete" style={{ width: '18px', height: '18px' }} title='Delete Item' />
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
                <AdminModalWrapper show={showAddModal} onClose={() => setShowAddModal(false)}>
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
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default InventoryPage;