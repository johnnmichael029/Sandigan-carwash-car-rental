import { useState, useEffect } from 'react';
import '../../../css/style.css';
import useSWR from 'swr';
import { io } from 'socket.io-client';
import { API_BASE } from '../../../api/config';
import { swrFetcher, SWR_CONFIG } from '../../../api/swrFetcher';
import { ChartSkeleton, KPICardSkeleton } from '../../SkeletonLoaders';
import TopHeader from '../TopHeader';
import SandiAssistant from './SandiAssistant';
import revenueIcon from '../../../assets/icon/revenue.png';
import allTimeRevenueIcon from '../../../assets/icon/all-time-revenue.png';
import bookingsIcon from '../../../assets/icon/order.png';
import topPerformerIcon from '../../../assets/icon/top-performer.png';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

const AdminOverview = ({ user, onNavigate, isDark }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // ── Fetch aggregated analytics data from dedicated backend endpoint ────────
    const { data: analyticsData, isLoading, mutate } = useSWR('/analytics/dashboard', swrFetcher, SWR_CONFIG);

    // ── Real-time Socket Updates ───────────────────────────────────────────────
    useEffect(() => {
        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', () => mutate());
        socket.on('update_booking', () => mutate());
        socket.on('new_rental', () => mutate());
        return () => socket.disconnect();
    }, [mutate]);

    const kpis = analyticsData?.kpis || {};
    const revenue = analyticsData?.revenue || { trend: [], byCategory: [] };
    const carwash = analyticsData?.carwash || { servicePopularity: [], vehicleTypeDistribution: [], bookingFunnel: [], locationSplit: [] };
    const carRental = analyticsData?.carRental || { trend: [], topVehicles: [], durationDistribution: [], statusBreakdown: [], fleetUtilization: {} };
    const customer = analyticsData?.customer || { growthTrend: [], memberships: {}, repeatVsFirstTime: [] };
    const workforce = analyticsData?.workforce || { leaderboard: [], busyHours: [] };
    const finance = analyticsData?.finance || { monthlyOverview: [], expenseCategories: [] };

    // Colors
    const COLORS = ['#23A0CE', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#3b82f6', '#10b981'];
    const STATUS_COLORS = { 'Pending': '#f59e0b', 'Confirmed': '#23A0CE', 'Queued': '#a855f7', 'In-Progress': '#f97316', 'Completed': '#22c55e', 'Cancelled': '#f43f5e', 'Active': '#10b981', 'Returned': '#06b6d4' };

    // KPI Cards Data
    const statCards = [
        {
            label: "Today's Revenue",
            value: `₱${(kpis.todayRevenue || 0).toLocaleString()}`,
            desc: "Carwash & Rentals today",
            icon: <img src={revenueIcon} alt="Today Revenue" style={{ width: '22px' }} />,
            color: '#a855f7',
            bg: 'linear-gradient(135deg,#a855f715,#a855f705)'
        },
        {
            label: 'This Month Revenue',
            value: `₱${(kpis.monthRevenue || 0).toLocaleString()}`,
            desc: "Total gross this month",
            icon: <i className="bi bi-calendar-check-fill text-success" style={{ fontSize: '1.2rem' }}></i>,
            color: '#22c55e',
            bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)'
        },
        {
            label: 'All-Time Revenue',
            value: `₱${(kpis.allTimeRevenue || 0).toLocaleString()}`,
            desc: "Cumulative total revenue",
            icon: <img src={allTimeRevenueIcon} alt="All Time Revenue" style={{ width: '22px' }} />,
            color: '#23A0CE',
            bg: 'linear-gradient(135deg,#23A0CE15,#23A0CE05)'
        },
        {
            label: "Today's Washes",
            value: kpis.todayCarwashBookings || 0,
            desc: "Carwash bookings today",
            icon: <img src={bookingsIcon} alt="Carwash Bookings" style={{ width: '22px' }} />,
            color: '#06b6d4',
            bg: 'linear-gradient(135deg,#06b6d415,#06b6d405)'
        },
        {
            label: 'Active Car Rentals',
            value: kpis.activeCarRentals || 0,
            desc: "Current vehicles on rent",
            icon: <i className="bi bi-car-front-fill text-warning" style={{ fontSize: '1.2rem' }}></i>,
            color: '#f59e0b',
            bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)'
        },
        {
            label: 'Month Net Profit',
            value: `₱${(kpis.netProfitMonth || 0).toLocaleString()}`,
            desc: "Revenue minus expenses",
            icon: <i className="bi bi-cash-stack text-success" style={{ fontSize: '1.2rem' }}></i>,
            color: kpis.netProfitMonth >= 0 ? '#22c55e' : '#ef4444',
            bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)'
        },
        {
            label: 'Active Memberships',
            value: kpis.activeMemberships || 0,
            desc: "SMC & Loyalty cardholders",
            icon: <i className="bi bi-card-heading text-primary" style={{ fontSize: '1.2rem' }}></i>,
            color: '#3b82f6',
            bg: 'linear-gradient(135deg,#3b82f615,#3b82f605)'
        },
        {
            label: 'Top Detailer',
            value: kpis.topDetailer ? kpis.topDetailer.name : 'No Data',
            desc: kpis.topDetailer ? `${kpis.topDetailer.jobs} jobs completed` : "Monthly detailer highlight",
            icon: <img src={topPerformerIcon} alt="Top Detailer" style={{ width: '22px' }} />,
            color: '#ec4899',
            bg: 'linear-gradient(135deg,#ec489915,#ec489905)'
        }
    ];

    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload, label, currency = false }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 rounded-3 shadow-lg" style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: '1px solid var(--theme-content-border)',
                    color: isDark ? '#f8fafc' : '#0f172a'
                }}>
                    <p className="fw-bold mb-1 font-poppins" style={{ fontSize: '0.85rem' }}>{label}</p>
                    {payload.map((item, idx) => (
                        <div key={idx} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '0.8rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color || item.fill }}></span>
                            <span className="text-muted">{item.name}:</span>
                            <span className="fw-semibold">
                                {currency ? `₱${(item.value || 0).toLocaleString()}` : (item.value || 0).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="pb-5">
            {/* Top Navigation Header */}
            <TopHeader user={user} title="Analytics & Business Dashboard" subtitle={todayDate} onNavigate={onNavigate} isDark={isDark} />

            {/* Sandi Assistant Greeting */}
            <SandiAssistant isDark={isDark} />

            {/* 8-Card Business Overview KPI Row */}
            <div className="row g-3 mb-4">
                {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div className="col-12 col-sm-6 col-lg-3" key={i}><KPICardSkeleton /></div>
                    ))
                    : statCards.map((stat, idx) => (
                        <div className="col-12 col-sm-6 col-lg-3" key={idx}>
                            <div className="card border-0 shadow-sm rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                                <div style={{ position: 'absolute', top: '-20%', right: '-15%', width: '90px', height: '90px', background: stat.color, filter: 'blur(35px)', opacity: 0.12 }} />
                                <div className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, background: stat.bg }}>
                                            {stat.icon}
                                        </div>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }}></span>
                                    </div>
                                    <p className="text-uppercase mb-1 fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px', color: 'var(--theme-content-text-secondary)' }}>
                                        {stat.label}
                                    </p>
                                    <h4 className="fw-bold mb-1 font-poppins text-truncate" style={{ color: stat.color, fontSize: '1.45rem' }}>
                                        {stat.value}
                                    </h4>
                                    <small style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.72rem' }}>{stat.desc}</small>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* Modern Tab Header */}
            <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                <div className="card-body p-2">
                    <div className="d-flex flex-wrap gap-2">
                        {[
                            { id: 'overview', label: 'Executive Overview', icon: 'bi-grid-1x2-fill' },
                            { id: 'revenue', label: 'Revenue Analytics', icon: 'bi-graph-up-arrow' },
                            { id: 'carwash', label: 'Carwash Operations', icon: 'bi-droplet-fill' },
                            { id: 'carRental', label: 'Car Rental Fleet', icon: 'bi-car-front-fill' },
                            { id: 'customers', label: 'Customers & SMC', icon: 'bi-people-fill' },
                            { id: 'workforce', label: 'Workforce Leaderboard', icon: 'bi-person-badge-fill' },
                            { id: 'finance', label: 'Financial Health', icon: 'bi-wallet2' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 border-0 transition-all dashboard-tab ${activeTab === tab.id ? 'dashboard-tab-active' : ''}`}
                                style={{
                                    fontSize: '0.85rem',
                                    color: activeTab === tab.id ? undefined : 'var(--theme-content-text)'
                                }}
                            >
                                <i className={`bi ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TAB CONTENT SECTIONS */}

            {/* 1. EXECUTIVE OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="row g-4">
                    {/* Revenue Trend Overview */}
                    <div className="col-12 col-xl-8">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>6-Month Revenue Trend</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Combined earnings across Carwash & Car Rentals</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={revenue.trend}>
                                            <defs>
                                                <linearGradient id="totalRevGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#23A0CE" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#23A0CE" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `₱${v}`} axisLine={false} />
                                            <Tooltip content={<CustomTooltip currency={true} />} />
                                            <Area type="monotone" dataKey="total" name="Total Revenue" stroke="#23A0CE" strokeWidth={3} fillOpacity={1} fill="url(#totalRevGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Carwash vs Rental Revenue Split */}
                    <div className="col-12 col-xl-4">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Revenue Sources Split</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Distribution of current month earnings</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={revenue.byCategory} dataKey="total" nameKey="category" innerRadius={60} outerRadius={90} paddingAngle={4}>
                                                {revenue.byCategory.map((entry, index) => (
                                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip currency={true} />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. REVENUE ANALYTICS TAB */}
            {activeTab === 'revenue' && (
                <div className="row g-4">
                    <div className="col-12 col-xl-8">
                        <div className="p-4 rounded-4 shadow-sm" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Carwash vs Car Rental vs Retail Breakdown</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Detailed breakdown of revenue by division</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 320, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={revenue.trend}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `₱${v}`} axisLine={false} />
                                            <Tooltip content={<CustomTooltip currency={true} />} />
                                            <Legend verticalAlign="top" height={36} />
                                            <Bar dataKey="carwash" name="Carwash Service" stackId="a" fill="#23A0CE" />
                                            <Bar dataKey="rental" name="Car Rental" stackId="a" fill="#f59e0b" />
                                            <Bar dataKey="retail" name="Retail & Memberships" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-12 col-xl-4">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-3" style={{ color: 'var(--theme-content-text)' }}>Revenue Categories</h6>
                            <div className="d-flex flex-column gap-3">
                                {revenue.byCategory.map((cat, idx) => (
                                    <div key={idx} className="p-3 rounded-3 border" style={{ borderColor: 'var(--theme-content-border)' }}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="fw-semibold font-poppins" style={{ fontSize: '0.9rem', color: 'var(--theme-content-text)' }}>{cat.category}</span>
                                            <span className="fw-bold text-success" style={{ fontSize: '0.95rem' }}>₱{(cat.total || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="progress" style={{ height: 6 }}>
                                            <div className="progress-bar" style={{ backgroundColor: COLORS[idx % COLORS.length], width: `${Math.min(100, (cat.total / (kpis.monthRevenue || 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. CARWASH OPERATIONS TAB */}
            {activeTab === 'carwash' && (
                <div className="row g-4">
                    {/* Service Popularity */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Top Washes & Packages (This Month vs Last Month)</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Volume of services requested</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={carwash.servicePopularity} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <YAxis type="category" dataKey="service" width={110} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="thisMonth" name="This Month" fill="#23A0CE" radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="lastMonth" name="Last Month" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vehicle Type Distribution */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Vehicle Type Distribution</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Sedans vs SUVs vs Motorcycles vs Vans</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={carwash.vehicleTypeDistribution} dataKey="count" nameKey="type" innerRadius={55} outerRadius={85} paddingAngle={4}>
                                                {carwash.vehicleTypeDistribution.map((entry, index) => (
                                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Booking Funnel */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Booking Pipeline & Status Breakdown</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Pending to Completed conversion</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={carwash.bookingFunnel}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="status" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" name="Bookings" fill="#22c55e" radius={[4, 4, 0, 0]}>
                                                {carwash.bookingFunnel.map((entry, index) => (
                                                    <Cell key={index} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location Split */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>In-Store vs Home Service Split</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Service location breakdown</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={carwash.locationSplit} dataKey="count" nameKey="location" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                                {carwash.locationSplit.map((entry, index) => (
                                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. CAR RENTAL FLEET TAB */}
            {activeTab === 'carRental' && (
                <div className="row g-4">
                    {/* Fleet Stats Banner */}
                    <div className="col-12">
                        <div className="p-4 rounded-4 shadow-sm bg-gradient text-white d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                            <div>
                                <h5 className="fw-bold mb-1 font-poppins">Fleet Utilization Overview</h5>
                                <p className="mb-0 text-white-50" style={{ fontSize: '0.85rem' }}>Active fleet monitoring and occupancy analytics</p>
                            </div>
                            <div className="d-flex gap-4">
                                <div>
                                    <span className="d-block text-white-50" style={{ fontSize: '0.75rem' }}>Active Rentals</span>
                                    <span className="fw-bold fs-4 font-poppins text-warning">{carRental.fleetUtilization.activeRentals || 0}</span>
                                </div>
                                <div>
                                    <span className="d-block text-white-50" style={{ fontSize: '0.75rem' }}>Total Fleet Vehicles</span>
                                    <span className="fw-bold fs-4 font-poppins text-info">{carRental.fleetUtilization.totalFleet || 0}</span>
                                </div>
                                <div>
                                    <span className="d-block text-white-50" style={{ fontSize: '0.75rem' }}>Utilization Rate</span>
                                    <span className="fw-bold fs-4 font-poppins text-success">{carRental.fleetUtilization.utilizationRate || 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rental Revenue Trend */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Rental Revenue Trend</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Monthly earnings from car rentals</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={carRental.trend}>
                                            <defs>
                                                <linearGradient id="rentalRevGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `₱${v}`} />
                                            <Tooltip content={<CustomTooltip currency={true} />} />
                                            <Area type="monotone" dataKey="revenue" name="Rental Revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#rentalRevGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Rented Fleet Vehicles */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Most Popular Fleet Vehicles</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Ranked by number of rentals</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={carRental.topVehicles}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="rentals" name="Total Rentals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Duration Distribution */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Rental Duration Distribution</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>1 Day vs 2-3 Days vs 4-7 Days vs 8+ Days</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={carRental.durationDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="duration" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" name="Bookings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rental Status Breakdown */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Rental Booking Statuses</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Pending, Confirmed, Active, Returned</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={carRental.statusBreakdown} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                                {carRental.statusBreakdown.map((entry, index) => (
                                                    <Cell key={index} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. CUSTOMERS & LOYALTY TAB */}
            {activeTab === 'customers' && (
                <div className="row g-4">
                    {/* Customer Acquisition Trend */}
                    <div className="col-12 col-xl-8">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>New Customer Registrations</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Monthly growth over the past 6 months</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={customer.growthTrend}>
                                            <defs>
                                                <linearGradient id="custGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="newCustomers" name="New Customers" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#custGrowthGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Membership & Stamp Cards Stat Boxes */}
                    <div className="col-12 col-xl-4">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-3" style={{ color: 'var(--theme-content-text)' }}>SMC & Loyalty Stats</h6>
                            <div className="d-flex flex-column gap-3">
                                <div className="p-3 rounded-3 border" style={{ borderColor: 'var(--theme-content-border)' }}>
                                    <span className="text-muted d-block" style={{ fontSize: '0.78rem' }}>SMC Memberships Issued</span>
                                    <h4 className="fw-bold text-primary mb-0 font-poppins">{customer.memberships.smcCount || 0}</h4>
                                </div>
                                <div className="p-3 rounded-3 border" style={{ borderColor: 'var(--theme-content-border)' }}>
                                    <span className="text-muted d-block" style={{ fontSize: '0.78rem' }}>Loyalty Stamp Cards</span>
                                    <h4 className="fw-bold text-success mb-0 font-poppins">{customer.memberships.loyaltyCount || 0}</h4>
                                </div>
                                <div className="p-3 rounded-3 border" style={{ borderColor: 'var(--theme-content-border)' }}>
                                    <span className="text-muted d-block" style={{ fontSize: '0.78rem' }}>Total Stamps Earned</span>
                                    <h4 className="fw-bold text-warning mb-0 font-poppins">{customer.memberships.totalStamps || 0}</h4>
                                </div>
                                <div className="p-3 rounded-3 border" style={{ borderColor: 'var(--theme-content-border)' }}>
                                    <span className="text-muted d-block" style={{ fontSize: '0.78rem' }}>Free Rewards Redeemed</span>
                                    <h4 className="fw-bold text-danger mb-0 font-poppins">{customer.memberships.rewardsRedeemed || 0}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* First-time vs Repeat Customers */}
                    <div className="col-12 col-xl-8">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>First-Time vs Repeat Customers</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Retention analytics from booking history</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 260, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={customer.repeatVsFirstTime} dataKey="count" nameKey="type" innerRadius={55} outerRadius={85} paddingAngle={4}>
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#10b981" />
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 6. WORKFORCE LEADERBOARD TAB */}
            {activeTab === 'workforce' && (
                <div className="row g-4">
                    {/* Detailer Performance Ranking Table */}
                    <div className="col-12 col-xl-7">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Detailer Leaderboard (This Month)</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Ranked by completed jobs and revenue contribution</p>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ color: 'var(--theme-content-text)' }}>
                                    <thead>
                                        <tr className="text-muted text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                                            <th>Rank</th>
                                            <th>Detailer Name</th>
                                            <th className="text-center">Jobs Completed</th>
                                            <th className="text-end">Revenue Contributed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workforce.leaderboard.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center text-muted py-4">No completed detailer jobs recorded this month</td>
                                            </tr>
                                        ) : workforce.leaderboard.map((d) => (
                                            <tr key={d.rank}>
                                                <td>
                                                    <span className={`badge rounded-circle p-2 ${d.rank === 1 ? 'bg-warning text-dark' : d.rank === 2 ? 'bg-secondary text-white' : d.rank === 3 ? 'bg-danger text-white' : 'bg-light text-dark'}`} style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {d.rank}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold font-poppins">{d.name}</td>
                                                <td className="text-center fw-bold">{d.jobs}</td>
                                                <td className="text-end fw-bold text-success">₱{(d.revenue || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Peak Hours Heatmap / Bar Chart */}
                    <div className="col-12 col-xl-5">
                        <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Peak Booking Hours</h6>
                            <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Volume of bookings by time slot</p>
                            {isLoading ? <ChartSkeleton /> : (
                                <div style={{ height: 320, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={workforce.busyHours}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" name="Bookings" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 7. FINANCIAL HEALTH TAB */}
            {activeTab === 'finance' && (() => {
                const finRev = kpis.monthRevenue || 0;
                const finExp = kpis.monthExpense || 0;
                const finNet = kpis.netProfitMonth || 0;

                const profitMargin = finRev > 0 ? Math.round((finNet / finRev) * 100) : 0;
                const expenseRatio = finRev > 0 ? Math.round((finExp / finRev) * 100) : 0;

                let healthScore = 50;
                if (finRev > 0) {
                    if (profitMargin >= 50) healthScore = 90 + Math.min(10, Math.round((profitMargin - 50) / 5));
                    else if (profitMargin >= 30) healthScore = 75 + Math.round((profitMargin - 30) * 0.75);
                    else if (profitMargin >= 10) healthScore = 55 + Math.round((profitMargin - 10) * 1);
                    else healthScore = Math.max(0, 50 + Math.round(profitMargin));
                }
                healthScore = Math.min(100, Math.max(0, healthScore));

                let healthGrade = 'Strong';
                let healthColor = '#22c55e';
                let healthBg = 'rgba(34, 197, 94, 0.12)';
                let healthDesc = 'Optimal financial stability. Revenue comfortably covers operating expenses.';

                if (healthScore >= 80) {
                    healthGrade = 'Excellent & Strong';
                    healthColor = '#22c55e';
                    healthBg = 'rgba(34, 197, 94, 0.12)';
                    healthDesc = 'Highly profitable month! Operating overhead is very low compared to total earnings.';
                } else if (healthScore >= 60) {
                    healthGrade = 'Stable & Healthy';
                    healthColor = '#06b6d4';
                    healthBg = 'rgba(6, 182, 212, 0.12)';
                    healthDesc = 'Good financial condition. Revenue stream is consistent and operational costs are balanced.';
                } else if (healthScore >= 40) {
                    healthGrade = 'Moderate Margin';
                    healthColor = '#f59e0b';
                    healthBg = 'rgba(245, 158, 11, 0.12)';
                    healthDesc = 'Operating margins are tight. Keep an eye on recurring expenses.';
                } else {
                    healthGrade = 'Critical Overhead';
                    healthColor = '#ef4444';
                    healthBg = 'rgba(239, 68, 68, 0.12)';
                    healthDesc = 'Expenses are exceeding revenue. Immediate cost reduction is recommended.';
                }

                return (
                    <div className="row g-4">
                        {/* Overall Financial Health Indicator Banner */}
                        <div className="col-12">
                            <div className="p-4 rounded-4 shadow-sm position-relative overflow-hidden" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                                    <div>
                                        <h5 className="fw-bold font-poppins mb-1 d-flex align-items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
                                            <i className="bi bi-heart-pulse-fill text-danger"></i>
                                            Overall Financial Health Score & Indicator
                                        </h5>
                                        <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>Calculated based on monthly profit margins, operating expense ratios, and net cashflow.</p>
                                    </div>
                                    <div className="badge px-3 py-2 rounded-pill font-poppins fw-bold d-flex align-items-center gap-2" style={{ backgroundColor: healthBg, color: healthColor, fontSize: '0.88rem' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: healthColor }}></span>
                                        {healthGrade} ({healthScore}/100)
                                    </div>
                                </div>

                                {/* Multi-Color Gradient Health Bar */}
                                <div className="p-3 rounded-3 mb-4 border" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: 'var(--theme-content-border)' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.78rem' }}>
                                        <span className="fw-semibold text-danger">Critical (&lt;40)</span>
                                        <span className="fw-semibold text-warning">Moderate (40-59)</span>
                                        <span className="fw-semibold text-info">Stable (60-79)</span>
                                        <span className="fw-semibold text-success">Excellent (80-100)</span>
                                    </div>

                                    {/* Gradient Bar with Animated Cursor */}
                                    <div className="position-relative my-2" style={{ height: 16, borderRadius: 8, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #06b6d4 70%, #22c55e 100%)' }}>
                                        <div
                                            className="position-absolute shadow-lg"
                                            style={{
                                                left: `calc(${healthScore}% - 10px)`,
                                                top: -6,
                                                width: 20,
                                                height: 28,
                                                borderRadius: 6,
                                                backgroundColor: '#ffffff',
                                                border: `3px solid ${healthColor}`,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                                transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                            title={`Health Score: ${healthScore}/100`}
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: '0.75rem', color: 'var(--theme-content-text-secondary)' }}>
                                        <span>0% Profit Margin</span>
                                        <span>Current Health Rating: <strong style={{ color: healthColor }}>{healthScore} PTS</strong></span>
                                        <span>100% Margin</span>
                                    </div>
                                </div>

                                {/* 3 Metric Micro-Cards */}
                                <div className="row g-3">
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 rounded-3 border h-100" style={{ borderColor: 'var(--theme-content-border)', background: isDark ? '#1e293b' : '#ffffff' }}>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="text-muted font-poppins" style={{ fontSize: '0.78rem' }}>Net Profit Margin</span>
                                                <i className="bi bi-percent text-success"></i>
                                            </div>
                                            <h4 className="fw-bold font-poppins mb-1 text-success">{profitMargin}%</h4>
                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Net profit retained from gross earnings</small>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 rounded-3 border h-100" style={{ borderColor: 'var(--theme-content-border)', background: isDark ? '#1e293b' : '#ffffff' }}>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="text-muted font-poppins" style={{ fontSize: '0.78rem' }}>Operating Expense Ratio</span>
                                                <i className="bi bi-pie-chart text-warning"></i>
                                            </div>
                                            <h4 className="fw-bold font-poppins mb-1 text-warning">{expenseRatio}%</h4>
                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>Share of revenue spent on expenses</small>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 rounded-3 border h-100" style={{ borderColor: 'var(--theme-content-border)', background: isDark ? '#1e293b' : '#ffffff' }}>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="text-muted font-poppins" style={{ fontSize: '0.78rem' }}>Net Monthly Inflow</span>
                                                <i className="bi bi-graph-up-arrow text-primary"></i>
                                            </div>
                                            <h4 className="fw-bold font-poppins mb-1 text-primary">₱{finNet.toLocaleString()}</h4>
                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>{healthDesc}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Revenue vs Expenses Grouped Bar Chart */}
                        <div className="col-12 col-xl-8">
                            <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                                <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Revenue vs Expenses (Past 6 Months)</h6>
                                <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Comparing monthly inflow vs outflow & net profit line</p>
                                {isLoading ? <ChartSkeleton /> : (
                                    <div style={{ height: 320, width: '100%' }}>
                                        <ResponsiveContainer>
                                            <BarChart data={finance.monthlyOverview}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#eee'} />
                                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `₱${v}`} />
                                                <Tooltip content={<CustomTooltip currency={true} />} />
                                                <Legend verticalAlign="top" height={36} />
                                                <Bar dataKey="revenue" name="Total Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="expense" name="Total Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Expense Breakdown Pie Chart */}
                        <div className="col-12 col-xl-4">
                            <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                                <h6 className="fw-bold font-poppins mb-1" style={{ color: 'var(--theme-content-text)' }}>Expense Categories (This Month)</h6>
                                <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>Operational spending distribution</p>
                                {isLoading ? <ChartSkeleton /> : (
                                    <div style={{ height: 320, width: '100%' }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={finance.expenseCategories} dataKey="total" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={4}>
                                                    {finance.expenseCategories.map((entry, index) => (
                                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip currency={true} />} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminOverview;