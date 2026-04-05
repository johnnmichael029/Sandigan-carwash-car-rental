import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';
import editIcon from '../../../assets/icon/edit.png';
import deleteIcon from '../../../assets/icon/delete.png';

const RecipeBuilder = ({ inventoryItems, products, onUpdate, categories = [] }) => {
    const [recipes, setRecipes] = useState([]);
    const [dynamicPricing, setDynamicPricing] = useState([]);
    const [category, setCategory] = useState('Service');
    const [serviceType, setServiceType] = useState('');
    const [vehicleType, setVehicleType] = useState('All');
    const [ingredients, setIngredients] = useState([{ inventoryItem: '', quantityUsed: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const fetchData = async () => {
        try {
            const [recipesRes, pricingRes] = await Promise.all([
                axios.get(`${API_BASE}/service-recipes`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/pricing`, { headers: authHeaders(), withCredentials: true })
            ]);
            setRecipes(recipesRes.data);
            setDynamicPricing(pricingRes.data.dynamicPricing || []);
        } catch (err) { console.error('Error fetching recipe data:', err); }
    };

    useEffect(() => { fetchData(); }, []);

    const dynamicServiceTypes = useMemo(() => {
        if (category === 'Product') return products.map(p => p.name);
        const all = new Set();
        dynamicPricing.forEach(v => {
            v.services?.forEach(s => all.add(s.name));
            v.addons?.forEach(a => all.add(a.name));
        });
        return Array.from(all).sort();
    }, [dynamicPricing, category, products]);

    const dynamicVehicleTypes = useMemo(() => {
        if (category === 'Product') return ['N/A'];
        const all = new Set(dynamicPricing.map(p => p.vehicleType));
        return ['All', ...Array.from(all).sort()];
    }, [dynamicPricing, category]);

    const handleSaveRecipe = async (e) => {
        e.preventDefault();
        const validIngredients = ingredients.filter(i => i.inventoryItem && i.quantityUsed);
        setIsSaving(true);
        try {
            const payload = { category, serviceType, vehicleType, ingredients: validIngredients };
            if (editingId) await axios.patch(`${API_BASE}/service-recipes/${editingId}`, payload, { headers: authHeaders(), withCredentials: true });
            else await axios.post(`${API_BASE}/service-recipes`, payload, { headers: authHeaders(), withCredentials: true });
            setEditingId(null); setIngredients([{ inventoryItem: '', quantityUsed: '' }]); fetchData();
            if (onUpdate) onUpdate();
            Swal.fire({ title: 'Recipe Saved!', icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false, background: '#002525', color: '#fff' });
        } catch (err) { Swal.fire('Error', 'Save failed', 'error'); }
        finally { setIsSaving(false); }
    };

    const handleDeleteRecipe = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Recipe?',
            text: 'This will remove the inventory link for this item.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/service-recipes/${id}`, { headers: authHeaders(), withCredentials: true });
                fetchData();
                if (onUpdate) onUpdate();
                Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#002525', color: '#FAFAFA' });
            } catch (err) { console.error('Delete Recipe Error:', err); }
        }
    };

    return (
        <div className="row g-4 animate-fade-in">
            <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <form onSubmit={handleSaveRecipe}>
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="mb-0 fw-bold text-dark-secondary">{editingId ? 'Edit Recipe' : 'New Recipe'}</h6>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">Category</label>
                                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}><option value="Service">Service</option><option value="Product">Product</option></select>
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">Item Selection</label>
                                <select className="form-select" value={serviceType} onChange={e => setServiceType(e.target.value)} required><option value="">-- Choose --</option>{dynamicServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <p className="small fw-bold text-muted mb-2">Ingredients</p>
                            {ingredients.map((ing, i) => (
                                <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                                    <select className="form-select" value={ing.inventoryItem} onChange={e => { const copy = [...ingredients]; copy[i].inventoryItem = e.target.value; setIngredients(copy); }} required>
                                        <option value="">-- Chemical --</option>
                                        {inventoryItems.map(it => <option key={it._id} value={it._id}>{it.name}</option>)}
                                    </select>
                                    <input className="form-control" placeholder="Qty" value={ing.quantityUsed} onChange={e => { const copy = [...ingredients]; copy[i].quantityUsed = e.target.value; setIngredients(copy); }} style={{ width: 80 }} required />
                                    {ingredients.length > 1 && (
                                        <button type="button" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="btn btn-sm text-danger p-1 border-0 bg-transparent" title="Remove Ingredient">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setIngredients([...ingredients, { inventoryItem: '', quantityUsed: '' }])} className="btn btn-sm btn-link brand-primary text-decoration-none fw-bold" style={{ fontSize: '0.8rem' }}>+ Add Ingredient</button>
                        </div>
                        <div className="card-footer bg-white border-top d-flex gap-2 py-3">
                            {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setCategory('Service'); setVehicleType('All'); setServiceType(''); setIngredients([{ inventoryItem: '', quantityUsed: '' }]); }} className="btn btn-light w-50 rounded-3">Cancel</button>
                            )}
                            <button type="submit" className={`btn btn-save ${editingId ? 'w-50' : 'w-100'} rounded-3 shadow-sm`}>{editingId ? 'Update Recipe' : 'Save Recipe'}</button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-header bg-white py-3 border-bottom"><h6 className="mb-0 fw-bold text-dark-secondary">Active Rules</h6></div>
                    <div className="card-body p-0">
                        {recipes.length === 0 ? <p className="p-4 text-center text-muted">No recipes found.</p> : recipes.map(r => (
                            <div key={r._id} className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                <div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-light text-dark-gray300 border me-2 small uppercase" style={{ fontSize: '0.65rem' }}>{r.category}</span>
                                        <span className="fw-bold text-dark-secondary">{r.serviceType}</span>
                                        <span className="ms-2 badge rounded-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.65rem' }}>
                                            Supply Cost: ₱{r.ingredients.reduce((acc, ing) => acc + (ing.quantityUsed * (ing.inventoryItem?.costPerUnit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {r.ingredients.map((ing, idx) => {
                                            const itemCatMatch = categories.find(c => c.name === ing.inventoryItem?.category) || { color: '#f8f9fa', textColor: '#6c757d' };
                                            return (
                                                <span key={idx} className="badge rounded-pill border fw-normal" style={{ background: itemCatMatch.color, color: itemCatMatch.textColor, fontSize: '0.65rem' }}>
                                                    {ing.inventoryItem?.name || 'Item'}: {ing.quantityUsed}{ing.inventoryItem?.unit || ''}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="d-flex gap-1">
                                    <button onClick={() => {
                                        setEditingId(r._id);
                                        setCategory(r.category);
                                        setVehicleType(r.vehicleType || 'All');
                                        setServiceType(r.serviceType);
                                        setIngredients(r.ingredients.map(ing => ({ inventoryItem: ing.inventoryItem?._id || ing.inventoryItem, quantityUsed: ing.quantityUsed })));
                                    }} className="btn btn-sm border-0 p-1">
                                        <img src={editIcon} style={{ width: 14 }} alt="Edit" title='Edit Recipe' />
                                    </button>
                                    <button onClick={() => handleDeleteRecipe(r._id)} className="btn btn-sm border-0 p-1">
                                        <img src={deleteIcon} style={{ width: 14 }} alt="Delete" title='Delete Recipe' />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default RecipeBuilder;