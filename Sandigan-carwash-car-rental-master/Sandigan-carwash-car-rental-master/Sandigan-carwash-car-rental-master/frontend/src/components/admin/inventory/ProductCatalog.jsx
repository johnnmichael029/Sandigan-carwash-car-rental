import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';
import AdminModalWrapper from '../shared/AdminModalWrapper';

const ProductCatalog = ({ onUpdate, categories = [] }) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', basePrice: 0, description: '', category: '' });

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true });
            setProducts(res.data);
            if (onUpdate) onUpdate();
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            const finalCat = categories.some(cat => cat.name === newProduct.category) ? newProduct.category : (categories.length > 0 ? categories[0].name : 'Uncategorized');
            const prodToSave = { ...newProduct, category: finalCat };
            if (editingProduct) await axios.patch(`${API_BASE}/products/${editingProduct._id}`, prodToSave, { headers: authHeaders(), withCredentials: true });
            else await axios.post(`${API_BASE}/products`, prodToSave, { headers: authHeaders(), withCredentials: true });
            setShowModal(false); fetchProducts();
            Swal.fire({ title: 'Product Catalog Updated', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
        } catch (err) {
            Swal.fire('Error', err.response.data.error, 'error');
            setShowModal(false)
        }
    };

    const deleteProduct = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Product?',
            text: 'This will remove this item from the catalog.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/products/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchProducts();
                Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } catch (err) { console.error('Delete Product Error:', err); }
        }
    };

    if (isLoading) return <div className="p-5 text-center"><div className="spinner-border spinner-border-sm text-primary" /></div>;

    return (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark-secondary">Inventory Products</h6>
                <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="btn btn-save btn-sm px-4 rounded-pill shadow-sm">+ Add Product</button>
            </div>
            <div className="card-body p-0">
                <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light small text-muted">
                        <tr>
                            <th className="ps-4">Product</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Retail Price</th>
                            <th className="pe-4 text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p._id}>
                                <td className="ps-4">
                                    <div className="fw-bold text-dark-secondary">{p.name}</div>
                                </td>
                                <td>
                                    {(() => {
                                        const catMatch = categories.find(c => c.name === p.category) || { color: 'rgba(35,160,206,0.1)', textColor: '#23A0CE' };
                                        return (
                                            <span className="badge rounded-pill border px-2 fw-bold" style={{ background: catMatch.color, color: catMatch.textColor, fontSize: '0.7rem' }}>
                                                {p.category || 'General'}
                                            </span>
                                        )
                                    })()}
                                </td>
                                <td>
                                    <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                                        {p.description || "—"}
                                    </small>
                                </td>
                                <td className="fw-bold text-dark-secondary">₱{p.basePrice.toLocaleString()}</td>
                                <td className="pe-4 text-end">
                                    <div className="d-flex gap-2 justify-content-end">
                                        <button onClick={() => { setEditingProduct(p); setNewProduct({ name: p.name, basePrice: p.basePrice, category: p.category || '', description: p.description || '' }); setShowModal(true); }} className="btn btn-sm border-0 p-1">
                                            <img src={editIcon} style={{ width: 16 }} alt="Edit" title='Edit Product' />
                                        </button>
                                        <button onClick={() => deleteProduct(p._id)} className="btn btn-sm border-0 p-1">
                                            <img src={deleteIcon} style={{ width: 16 }} alt="Delete" title='Delete Product' />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <AdminModalWrapper show={showModal} onClose={() => setShowModal(false)}>
                    <div className="modal-content border-0 rounded-4 shadow-lg"><form onSubmit={handleSaveProduct}><div className="modal-body p-4">
                    <h6 className="fw-bold mb-3 text-dark-secondary">Product Entry</h6>
                    <input className="form-control mb-3" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product Name" />
                    <div className="row g-2 mb-3">
                        <div className="col-md-6">
                            <select className="form-select" value={newProduct.category || (categories.length > 0 ? categories[0].name : 'Uncategorized')} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                {categories.length === 0 && <option value="Uncategorized">Uncategorized</option>}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text bg-light text-dark">₱</span>
                                <input className="form-control" type="number" required value={newProduct.basePrice} onChange={e => setNewProduct({ ...newProduct, basePrice: Number(e.target.value) })} placeholder="Price" />
                            </div>
                        </div>
                    </div>
                    <textarea className="form-control mb-4" rows="2" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Brief description (optional)"></textarea>
                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-save w-100 rounded-3 shadow">Save Product</button>
                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-light w-100 rounded-3">Cancel</button>
                    </div>
                </div></form></div>
                </AdminModalWrapper>
            )}
        </div>
    );
};

export default ProductCatalog;