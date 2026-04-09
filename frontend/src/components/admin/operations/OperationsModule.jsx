import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../../../api/config';
import { KPICardSkeleton, TableSkeleton } from '../../SkeletonLoaders';
import BayManager from './BayManager';
import AssetTracker from './AssetTracker';
import MaintenanceProjects from './MaintenanceProjects';
import bayIcon from '../../../assets/icon/bay.png';
import assetIcon from '../../../assets/icon/asset.png';
import maintenanceIcon from '../../../assets/icon/maintenance.png';

const OperationsModule = ({ user, isDark }) => {
    const [bays, setBays] = useState([]);
    const [assets, setAssets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bays');

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [bayRes, assetRes, projRes, empRes, invRes] = await Promise.all([
                axios.get(`${API_BASE}/bays`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/assets`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/maintenance`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true }),
                axios.get(`${API_BASE}/inventory`, { headers: authHeaders(), withCredentials: true }),
            ]);
            setBays(bayRes.data); setAssets(assetRes.data); setProjects(projRes.data);
            setEmployees(empRes.data?.employees || empRes.data || []);
            setInventoryItems(invRes.data || []);
        } catch (err) { console.error('Operations fetch error:', err); }
        setIsLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // KPI calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyMaintenanceTotal = projects
        .filter(p => p.status === 'Completed' && p.updatedAt)
        .filter(p => {
            const d = new Date(p.updatedAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => {
            const labor = Number(p.laborCost) || 0;
            const parts = (p.partsUsed || []).reduce((s, part) => s + (Number(part.costPerUnit) * Number(part.quantity)), 0);
            return sum + labor + parts;
        }, 0);

    const assetAvailability = assets.length > 0 ? Math.round((assets.filter(a => a.status === 'Active').length / assets.length) * 100) : 100;
    const degradedAssets = assets.filter(a => a.status === 'Degraded').length;
    const activeProjects = projects.filter(p => p.status === 'Pending' || p.status === 'In Progress').length;

    const kpiCards = [
        {
            title: 'Maint. Spend (Mo)',
            value: `₱${monthlyMaintenanceTotal.toLocaleString()}`,
            icon: '💰',
            color: '#10b981',
            bg: 'linear-gradient(135deg,#10b98115,#10b98105)',
            dot: '#10b981',
            desc: 'Total costs for this month'
        },
        {
            title: 'Equip. Availability',
            value: `${assetAvailability}%`,
            icon: '⚡',
            color: '#8b5cf6',
            bg: 'linear-gradient(135deg,#8b5cf615,#8b5cf605)',
            dot: '#8b5cf6',
            desc: 'Ratio of active assets'
        },
        {
            title: 'Critical Health',
            value: degradedAssets.toLocaleString(),
            icon: '⚠️',
            color: '#f59e0b',
            bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)',
            dot: '#f59e0b',
            desc: 'Assets needing intervention'
        },
        {
            title: 'Active Projects',
            value: activeProjects.toLocaleString(),
            icon: '📋',
            color: '#3b82f6',
            bg: 'linear-gradient(135deg,#3b82f615,#3b82f605)',
            dot: '#3b82f6',
            desc: 'Ongoing service requests'
        },
    ];
    return (
        <div className="animate-fade-in ">
            {/* Header with Nav Tabs at the Top Right */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div>
                    <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>Project & Operations</h4>
                    <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Bay scheduling, asset tracking & maintenance management</p>
                </div>

                {/* Tab Navigation matching HRIS design */}
                <div className="d-flex gap-2 p-1 rounded-3" style={{ background: 'var(--theme-input-bg)' }}>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'bays' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('bays')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'bays' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'bays' ? 'var(--theme-content-text)' : 'inherit' }}
                    >
                        <img src={bayIcon} alt="" style={{ width: 14 }} />
                        Bays
                    </button>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'assets' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('assets')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'assets' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'assets' ? 'var(--theme-content-text)' : 'inherit' }}
                    >
                        <img src={assetIcon} alt="" style={{ width: 14, filter: 'grayscale(1)' }} />
                        Assets
                    </button>
                    <button
                        className={`btn btn-sm px-3 border-0 d-flex align-items-center gap-2 rounded-2 ${activeTab === 'maintenance' ? 'shadow-sm fw-bold' : 'text-muted'}`}
                        onClick={() => setActiveTab('maintenance')}
                        style={{ fontSize: '0.85rem', background: activeTab === 'maintenance' ? 'var(--theme-card-bg)' : 'transparent', color: activeTab === 'maintenance' ? 'var(--theme-content-text)' : 'inherit' }}
                    >
                        <img src={maintenanceIcon} alt="" style={{ width: 14 }} />Maintenance
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {isLoading ? (
                <div className="row g-3 mb-4">{[1, 2, 3, 4].map(i => <div className="col-md-3" key={i}><KPICardSkeleton /></div>)}</div>
            ) : (
                <div className="row g-3 mb-4">
                    {kpiCards.map((card, idx) => (
                        <div className="col-6 col-md-3" key={idx}>
                            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ background: 'var(--theme-card-bg)' }}>
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
            )}

            {/* Tab Content */}
            {isLoading ? <TableSkeleton /> : (
                <div className="animate-fade-in">
                    {activeTab === 'bays' && <BayManager bays={bays} onRefresh={fetchAll} isDark={isDark} />}
                    {activeTab === 'assets' && <AssetTracker assets={assets} bays={bays} onRefresh={fetchAll} isDark={isDark} />}
                    {activeTab === 'maintenance' && <MaintenanceProjects projects={projects} assets={assets} bays={bays} employees={employees} inventoryItems={inventoryItems} onRefresh={fetchAll} isDark={isDark} />}
                </div>
            )}
        </div>
    );
};

export default OperationsModule;
