import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../../api/config';
import { ChartSkeleton, KPICardSkeleton } from '../../SkeletonLoaders';
import TopHeader from '../TopHeader';
import revenueIcon from '../../../assets/icon/revenue.png';
import allTimeRevenueIcon from '../../../assets/icon/all-time-revenue.png';
import bookingsIcon from '../../../assets/icon/order.png';
import topPerformerIcon from '../../../assets/icon/top-performer.png';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

const AdminOverview = ({ user, onNavigate }) => {
    const [bookings, setBookings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartFilter, setChartFilter] = useState('daily');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bookingsRes, employeesRes] = await Promise.all([
                    axios.get(`${API_BASE}/booking`, { headers: authHeaders(), withCredentials: true }),
                    axios.get(`${API_BASE}/employees`, { headers: authHeaders(), withCredentials: true }),
                ]);
                setBookings(bookingsRes.data);
                setEmployees(employeesRes.data);
            } catch (err) {
                console.error('Failed to fetch admin overview data', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', (newBooking) => setBookings(prev => [newBooking, ...prev]));
        socket.on('update_booking', (updated) => setBookings(prev => prev.map(b => b._id === updated._id ? updated : b)));
        return () => socket.disconnect();
    }, []);

    /* ── KPI Metrics ── */
    const metrics = useMemo(() => {
        const completed = bookings.filter(b => b.status === 'Completed');
        const allTimeRevenue = completed.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayBookings = bookings.filter(b => {
            const d = new Date(b.createdAt); d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });
        const todayRevenue = todayBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const activeStaff = employees.filter(e => e.role === 'employee').length;

        // Calculate Top Performer for current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const detailerStats = {};
        bookings.forEach(b => {
            if (b.status !== 'Completed' || !b.assignedTo) return;
            const bDate = new Date(b.createdAt);
            if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                const did = typeof b.assignedTo === 'object' ? b.assignedTo._id : b.assignedTo;
                detailerStats[did] = (detailerStats[did] || 0) + 1;
            }
        });
        let topPerformerId = null;
        let maxBookings = 0;
        Object.keys(detailerStats).forEach(id => {
            if (detailerStats[id] > maxBookings) {
                maxBookings = detailerStats[id];
                topPerformerId = id;
            }
        });

        let topPerformerName = 'No Data';
        if (topPerformerId) {
            const emp = employees.find(e => e._id === topPerformerId);
            topPerformerName = emp?.fullName || 'Unknown';
            // Extract first name for brevity on dashboard widget if possible
            if (topPerformerName.includes(' ')) topPerformerName = topPerformerName.split(' ')[0];
        }

        return {
            todayRevenue,
            allTimeRevenue,
            totalBookings: bookings.length,
            activeStaff,
            topPerformerName,
            maxBookings
        };
    }, [bookings, employees]);

    /* ── Chart Data ── */
    const chartData = useMemo(() => {
        if (!bookings.length) return { historical: [], services: [], statusBreakdown: [] };

        const historicalMap = {};
        const now = new Date();

        if (chartFilter === 'daily') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                historicalMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
            });
        } else if (chartFilter === 'weekly') {
            for (let i = 3; i >= 0; i--) {
                const sd = new Date(now.getTime() - ((i + 1) * 7 * 86400000));
                const ed = new Date(now.getTime() - (i * 7 * 86400000));
                historicalMap[`Wk ${4 - i}`] = { revenue: 0, count: 0, startTs: sd.getTime(), endTs: ed.getTime() };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const bTime = new Date(b.createdAt).getTime();
                Object.keys(historicalMap).forEach(key => {
                    const w = historicalMap[key];
                    if (bTime >= w.startTs && bTime < w.endTs) { w.revenue += (b.totalPrice || 0); w.count++; }
                });
            });
        } else if (chartFilter === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                historicalMap[d.toLocaleDateString('en-US', { month: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short' });
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
            });
        } else if (chartFilter === 'yearly') {
            for (let i = 4; i >= 0; i--) {
                const d = new Date(); d.setFullYear(d.getFullYear() - i);
                historicalMap[d.getFullYear().toString()] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const key = new Date(b.createdAt).getFullYear().toString();
                if (historicalMap[key]) { historicalMap[key].revenue += (b.totalPrice || 0); historicalMap[key].count++; }
            });
        }

        const historical = Object.keys(historicalMap).map(key => ({
            name: key,
            revenue: historicalMap[key].revenue || 0,
            volume: historicalMap[key].count || 0,
        }));

        /* Service Popularity */
        const serviceCounts = { Wash: 0, Wax: 0, Engine: 0, Armor: 0 };
        bookings.forEach(b => {
            if (Array.isArray(b.serviceType)) {
                b.serviceType.forEach(s => { const t = s.trim(); if (serviceCounts[t] !== undefined) serviceCounts[t]++; });
            } else if (b.serviceType) {
                const t = b.serviceType.trim(); if (serviceCounts[t] !== undefined) serviceCounts[t]++;
            }
        });
        const services = Object.keys(serviceCounts).map(k => ({ name: k, value: serviceCounts[k] })).filter(s => s.value > 0);

        /* Booking Status Breakdown */
        const statusMap = {};
        bookings.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
        const statusBreakdown = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

        return { historical, services, statusBreakdown };
    }, [bookings, chartFilter]);

    const PIE_COLORS = ['#23A0CE', '#f59e0b', '#22c55e', '#f43f5e'];
    const STATUS_COLORS = { 'Pending': '#f59e0b', 'Confirmed': '#23A0CE', 'Queued': '#a855f7', 'In-progress': '#f97316', 'Completed': '#22c55e', 'Cancelled': '#f43f5e' };

    const stats = [
        {
            label: "Today's Revenue",
            value: `₱${metrics.todayRevenue.toLocaleString()}`,
            desc: "Revenue earned today",
            icon: <img src={revenueIcon} alt="Revenue Icon" style={{ width: '24px' }} />,
            color: '#a855f7',
            dot: '#a855f7',
            bg: 'linear-gradient(135deg,#a855f715,#a855f705)',
        },
        {
            label: 'All-Time Revenue',
            value: `₱${metrics.allTimeRevenue.toLocaleString()}`,
            desc: "Total from all completed bookings",
            icon: <img src={allTimeRevenueIcon} alt="All Time Revenue Icon" style={{ width: '24px' }} />,
            color: '#22c55e',
            dot: '#22c55e',
            bg: 'linear-gradient(135deg,#22c55e15,#22c55e05)',
        },
        {
            label: 'Total Bookings',
            value: metrics.totalBookings,
            desc: "All bookings recorded",
            icon: <img src={bookingsIcon} alt="Bookings" />,
            color: '#23A0CE',
            dot: '#23A0CE',
            bg: 'linear-gradient(135deg,#23A0CE15,#23A0CE05)',
        },
        {
            label: 'Top Performer',
            value: metrics.topPerformerName,
            desc: metrics.maxBookings ? `${metrics.maxBookings} vehicles washed` : "Monthly highlight",
            icon: <img src={topPerformerIcon} alt="Top Performer Icon" style={{ width: '24px' }} />,
            color: '#f59e0b',
            dot: '#f59e0b',
            bg: 'linear-gradient(135deg,#f59e0b15,#f59e0b05)',
        },
    ];

    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Header */}
            <TopHeader user={user} title="Admin Portal" subtitle={todayDate} onNavigate={onNavigate} />

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div className="col-sm-6 col-xl-3" key={i}><KPICardSkeleton /></div>
                    ))
                    : stats.map((stat) => (
                        <div className="col-sm-6 col-xl-3" key={stat.label}>
                            <div
                                className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden"
                                style={{ background: '#fff', transition: 'transform 0.2s' }}
                            >
                                {/* Decorative soft glow */}
                                <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: stat.color, filter: 'blur(30px)', opacity: 0.15 }} />
                                <div className="p-3 position-relative">
                                    {/* Dot indicator */}
                                    <div className="position-absolute top-0 end-0 p-3">
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                                    </div>
                                    {/* Icon */}
                                    <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                        style={{ width: '40px', height: '40px', background: stat.bg, color: stat.color, fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        {stat.icon}
                                    </div>
                                    {/* Label */}
                                    <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>
                                        {stat.label}
                                    </p>
                                    {/* Value */}
                                    <h3 className="mb-1 font-poppins fw-bold" style={{ color: stat.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                        {stat.value}
                                    </h3>
                                    {/* Description */}
                                    <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{stat.desc}</small>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* ─── CHARTS SECTION ─── */}
            <div className="row g-4 mb-4">

                {/* 1. Revenue Bar Chart */}
                <div className="col-12 col-xl-8">
                    <div className="p-4 rounded-4 h-100 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
                            <div>
                                <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Historical Revenue</h6>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Tracks combined car wash earnings</p>
                            </div>
                            <div className="btn-group shadow-sm">
                                {['daily', 'weekly', 'monthly', 'yearly'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setChartFilter(filter)}
                                        className={`btn btn-sm ${chartFilter === filter ? 'btn-primary text-white' : 'btn-light border'} text-capitalize`}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(35,160,206,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(v) => [`₱${v.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#23A0CE" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Service Popularity Pie Chart */}
                <div className="col-12 col-xl-4">
                    <div className="p-4 rounded-4 h-100 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-2">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Service Popularity</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Lifetime distribution</p>
                        </div>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : chartData.services.length === 0 ? (
                            <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250, fontSize: '0.9rem' }}>No service data yet</div>
                        ) : (
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartData.services} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {chartData.services.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Booking Volume Line Chart */}
                <div className="col-12 col-xl-8">
                    <div className="p-4 rounded-4 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-4">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Booking Volume</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Tracks number of completed car wash bookings</p>
                        </div>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(v) => [v, 'Jobs Completed']}
                                        />
                                        <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Booking Status Breakdown Pie */}
                <div className="col-12 col-xl-4">
                    <div className="p-4 rounded-4 shadow-sm h-100" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-2">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Booking Status Breakdown</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Distribution across all statuses</p>
                        </div>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : chartData.statusBreakdown.length === 0 ? (
                            <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250 }}>No data yet</div>
                        ) : (
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartData.statusBreakdown} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                                            {chartData.statusBreakdown.map((entry, i) => (
                                                <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;