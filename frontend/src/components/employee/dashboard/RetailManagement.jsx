import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import TopHeader from './TopHeader';
import getPaginationRange from '../../admin/getPaginationRange';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';
import searchIcon from '../../../assets/icon/search.png';
import leftArrowIcon from '../../../assets/icon/left-arrow.png';
import rightArrowIcon from '../../../assets/icon/right-arrow.png';

const RetailManagement = ({ employee, onSMCRequest, isDark }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localQuantities, setLocalQuantities] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 18;

    const fetchData = async () => {
        try {
            const [prodRes, saleRes] = await Promise.all([
                axios.get(`${API_BASE}/products`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/retail`, { headers: authHeaders(), withCredentials: true })
            ]);
            setProducts(prodRes.data);
            setSales(saleRes.data);

            // Initialize local quantities
            const initialQtys = {};
            prodRes.data.forEach(p => {
                initialQtys[p._id] = p.stock > 0 ? 1 : 0;
            });
            setLocalQuantities(initialQtys);

            setIsLoading(false);
        } catch (err) {
            console.error('POS fetch error:', err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLocalQtyChange = (id, val, stock) => {
        const num = Math.max(1, Math.min(stock, parseInt(val) || 1));
        setLocalQuantities(prev => ({ ...prev, [id]: num }));
    };

    const addToCart = (product) => {
        const requestedQty = localQuantities[product._id] || 1;
        const currentInCart = cart.find(item => item._id === product._id)?.qty || 0;
        const totalAfterAdding = currentInCart + requestedQty;

        if (totalAfterAdding > product.stock) {
            Swal.fire({
                title: 'Stock Limit Reached',
                text: `Only ${product.stock} units available. You already have ${currentInCart} in your cart.`,
                icon: 'warning',
                confirmButtonColor: '#23A0CE'
            });
            return;
        }

        setCart(prev => {
            const exists = prev.find(item => item._id === product._id);
            if (exists) {
                return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + requestedQty } : item);
            }
            return [...prev, { ...product, qty: requestedQty }];
        });

        // Reset local qty to 1 (if stock permits)
        setLocalQuantities(prev => ({ ...prev, [product._id]: product.stock > 0 ? 1 : 0 }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i._id !== id));

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            // Process each item in cart as a sale
            for (const item of cart) {
                await axios.post(`${API_BASE}/retail/buy`, {
                    productId: item._id,
                    quantity: item.qty
                }, { headers: authHeaders(), withCredentials: true });
            }

            Swal.fire({ title: 'Purchase Successful!', text: 'Stock and revenue have been updated.', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });

            setCart([]);
            fetchData();
        } catch (err) {
            Swal.fire('Checkout Failed', err.response?.data?.error || 'Error processing sale.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.basePrice * item.qty), 0);

    const filteredSales = sales.filter(s => {
        const search = searchTerm.toLowerCase();
        const tid = s.transactionId?.toLowerCase() || '';
        const pname = s.productName?.toLowerCase() || '';
        const smc = s.smcId?.toLowerCase() || '';
        const dateStr = new Date(s.createdAt).toLocaleDateString().toLowerCase();
        const refLink = s.customerId ? 'crm' : 'pos';

        return tid.includes(search) ||
            pname.includes(search) ||
            smc.includes(search) ||
            dateStr.includes(search) ||
            refLink.includes(search);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Reset to page 1 on search or fetch
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sales.length]);

    return (
        <div>
            <TopHeader
                employee={employee}
                title="Retail Store"
                subtitle="Direct product sales and membership issuance"
                isDark={isDark}
            />

            <div className="row g-4">
                {/* Product Catalog */}
                <div className="col-lg-8">
                    <div className="rounded-4 p-4 shadow-sm h-100 overflow-y-auto" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', maxHeight: '550px' }}>
                        <h6 className="fw-bold mb-4 font-poppins" style={{ color: 'var(--theme-content-text)' }}>PRODUCT CATALOG</h6>
                        {isLoading ? (
                            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
                                {products.map(p => (
                                    <div className="col" key={p._id}>
                                        <div className="p-3 border rounded-3 h-100 d-flex flex-column justify-content-between hover-shadow transition-all position-relative" style={{ minHeight: '220px', background: 'var(--theme-card-bg)', borderColor: 'var(--theme-content-border)' }}>
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div className="d-flex flex-column gap-1">
                                                        <span className="badge bg-light text-dark border align-self-start" style={{ fontSize: '0.6rem' }}>{p.category}</span>
                                                        <span className={`fw-bold ${p.stock > 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.7rem' }}>
                                                            {p.stock > 0 ? `Stock: ${p.stock}` : 'Out of Stock'}
                                                        </span>
                                                    </div>
                                                    <span className="fw-bold brand-primary" style={{ fontSize: '0.9rem' }}>₱{p.basePrice}</span>
                                                </div>
                                                <h6 className="mb-1 fw-bold" style={{ fontSize: '0.9rem', color: 'var(--theme-content-text)' }}>{p.name}</h6>
                                                <p className="text-muted mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{p.description || 'No description'}</p>
                                            </div>

                                            <div>
                                                {p.stock > 0 && (
                                                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                                        <small className="text-muted font-poppins" style={{ fontSize: '0.7rem' }}>Qty:</small>
                                                        <div className="input-group input-group-sm flex-nowrap" style={{ width: '90px' }}>
                                                            <button className="btn btn-outline-secondary py-0" onClick={() => handleLocalQtyChange(p._id, (localQuantities[p._id] || 1) - 1, p.stock)}>-</button>
                                                            <input
                                                                type="text"
                                                                className="form-control text-center py-0 shadow-none border-secondary-subtle"
                                                                value={localQuantities[p._id] || 0}
                                                                onChange={(e) => handleLocalQtyChange(p._id, e.target.value, p.stock)}
                                                                style={{ fontSize: '0.75rem' }}
                                                            />
                                                            <button className="btn btn-outline-secondary py-0" onClick={() => handleLocalQtyChange(p._id, (localQuantities[p._id] || 1) + 1, p.stock)}>+</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-primary w-100 rounded-pill shadow-none fw-bold"
                                                    style={{ fontSize: '0.75rem' }}
                                                    disabled={p.stock === 0}
                                                    onClick={() => addToCart(p)}
                                                >
                                                    {p.stock === 0 ? 'Unavailable' : 'Add to Cart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Shopping Cart */}
                <div className="col-lg-4">
                    <div className="rounded-4 p-4 shadow-sm sticky-top" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', top: '100px', maxHeight: '550px' }}>
                        <h6 className="fw-bold mb-4 font-poppins" style={{ color: 'var(--theme-content-text)' }}>CURRENT ORDER</h6>
                        <div className="mb-4 overflow-y-auto" style={{ maxHeight: '320px', minHeight: '320px' }}>
                            {cart.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <p style={{ fontSize: '0.85rem' }}>Your cart is empty</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {cart.map(item => (
                                        <div key={item._id} className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border">
                                            <div style={{ flex: 1 }}>
                                                <p className="mb-0 fw-bold" style={{ fontSize: '0.8rem', color: 'var(--theme-content-text)' }}>{item.name}</p>
                                                <small className="text-muted">₱{item.basePrice} x {item.qty}</small>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold brand-primary" style={{ fontSize: '0.8rem' }}>₱{(item.basePrice * item.qty).toLocaleString()}</span>
                                                <button className="btn btn-sm text-danger p-0 border-0" onClick={() => removeFromCart(item._id)}>✖</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-top pt-3 sticky-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted font-poppins">Total Amount</span>
                                <h4 className="mb-0 fw-bold" style={{ color: 'var(--theme-content-text)' }}>₱{cartTotal.toLocaleString()}</h4>
                            </div>
                            <button
                                className="btn btn-save w-100 py-3 rounded-4 fw-bold shadow-sm"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                            >
                                {isProcessing ? 'Processing...' : 'Complete Payment'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="col-12 mt-4">
                    <div className="rounded-4 p-4 shadow-sm d-flex flex-column" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)', minHeight: '970px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h6 className="fw-bold mb-0 font-poppins" style={{ color: 'var(--theme-content-text)' }}>RECENT POS TRANSACTIONS</h6>
                            <SharedSearchBar
                                placeholder="Search entries..."
                                onDebouncedSearch={(val) => setSearchTerm(val)}
                                debounceDelay={400}
                            />
                        </div>
                        <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr style={{ fontSize: '0.85rem' }}>
                                        <th>Transaction ID</th>
                                        <th>Product</th>
                                        <th>Qty</th>
                                        <th>Total</th>
                                        <th>Ref</th>
                                        <th>Date & Time</th>
                                        <th>SMC Linked</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSales.length > 0 ? currentSales.map(s => (
                                        <tr key={s._id} style={{ fontSize: '0.85rem' }}>
                                            <td className="font-monospace text-uppercase fw-bold text-dark-secondary">{s.transactionId}</td>
                                            <td>{s.productName}</td>
                                            <td>{s.quantity}</td>
                                            <td className="fw-bold">₱{s.totalPrice.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge rounded-pill ${s.customerId ? 'bg-info-subtle text-info border border-info' : 'bg-light text-muted border'}`} style={{ fontSize: '0.65rem' }}>
                                                    {s.customerId ? 'CRM' : 'POS'}
                                                </span>
                                            </td>
                                            <td className="text-muted">{new Date(s.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td>
                                                {s.smcId ? (
                                                    <span className="badge rounded-pill bg-success-subtle text-success px-3 border border-success" style={{ fontFamily: 'monospace' }}>{s.smcId}</span>
                                                ) : <span className="text-muted">—</span>}
                                            </td>
                                            <td className="text-end">
                                                {(s.smcId || s.productName?.toLowerCase().includes('smc')) && (
                                                    <button
                                                        className="btn btn-sm btn-smc-card rounded-pill px-3 py-1 fw-bold"
                                                        onClick={() => onSMCRequest(s.smcId || s.transactionId)}
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        Print Card
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-5 text-muted">No transactions recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="card-footer bg-white border-0 py-3 px-0 d-flex justify-content-between align-items-center">
                                <small className="text-muted font-poppins">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSales.length)} of {filteredSales.length} transactions
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetailManagement;
