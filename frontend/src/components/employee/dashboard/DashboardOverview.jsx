import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { API_BASE, authHeaders } from '../../../api/config';
import TopHeader from './TopHeader';

// Icons from local assets
import bookingsIcon from '../../../assets/icon/order.png';
import bookingsCompleted from '../../../assets/icon/order-completed.png';
import bookingsPending from '../../../assets/icon/order-pending.png';

const DashboardOverview = ({ employee, onNavigate }) => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartFilter, setChartFilter] = useState('daily');

    // Attendance State
    const [attendanceStatus, setAttendanceStatus] = useState('Not Clocked In');
    const [clockInTime, setClockInTime] = useState(null);
    const [clockOutTime, setClockOutTime] = useState(null);
    const [isClocking, setIsClocking] = useState(false);

    // Fetch all bookings for analytics
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await axios.get(`${API_BASE}/booking`, { headers: authHeaders(), withCredentials: true });
                setBookings(response.data);
            } catch (err) {
                console.error("Failed to fetch dashboard analytics data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();

        const fetchAttendance = async () => {
            try {
                const res = await axios.get(`${API_BASE}/attendance/today`, { headers: authHeaders(), withCredentials: true });
                setAttendanceStatus(res.data.status);
                if (res.data.status === 'Clocked In') {
                    setClockInTime(res.data.time);
                } else if (res.data.status === 'Clocked Out') {
                    setClockInTime(res.data.inTime);
                    setClockOutTime(res.data.outTime);
                }
            } catch (err) { console.error('Error fetching attendance', err); }
        };
        fetchAttendance();

        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_booking', (newBooking) => {
            setBookings(prev => [newBooking, ...prev]);
        });
        socket.on('update_booking', (updatedBooking) => {
            setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        });

        return () => {
            socket.off('new_booking');
            socket.off('update_booking');
            socket.disconnect();
        };
    }, []);

    const handleClockToggle = async () => {
        setIsClocking(true);
        try {
            const res = await axios.post(`${API_BASE}/attendance/clock`, {}, { headers: authHeaders(), withCredentials: true });

            Swal.fire({
                title: res.data.message,
                icon: 'success',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
                background: '#002525',
                color: '#FAFAFA'
            });

            setAttendanceStatus(res.data.status);
            if (res.data.status === 'Clocked In') {
                setClockInTime(res.data.record.clockInTime);
            } else if (res.data.status === 'Clocked Out') {
                setClockOutTime(res.data.record.clockOutTime);
            }
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to clock time.', 'error');
        } finally {
            setIsClocking(false);
        }
    };

    // Calculate Real-Time Metrics
    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBookings = bookings.filter(b => {
            const d = new Date(b.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        const activePending = bookings.filter(b => b.status === 'Pending' || b.status === 'Processing').length;
        const completedToday = todayBookings.filter(b => b.status === 'Completed').length;
        const todayRevenue = todayBookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        return {
            todayCount: todayBookings.length,
            completedToday,
            activePending,
            todayRevenue
        };
    }, [bookings]);

    // Data Transformers for Charts
    const chartData = useMemo(() => {
        if (!bookings.length) return { historical: [], services: [] };

        const historicalMap = {};
        const now = new Date();

        if (chartFilter === 'daily') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                historicalMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
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
                    if (bTime >= w.startTs && bTime < w.endTs) {
                        w.revenue += (b.totalPrice || 0);
                        w.count++;
                    }
                });
            });
        } else if (chartFilter === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                historicalMap[d.toLocaleDateString('en-US', { month: 'short' })] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short' });
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
            });
        } else if (chartFilter === 'yearly') {
            for (let i = 4; i >= 0; i--) {
                const d = new Date();
                d.setFullYear(d.getFullYear() - i);
                historicalMap[d.getFullYear().toString()] = { revenue: 0, count: 0 };
            }
            bookings.forEach(b => {
                if (b.status !== 'Completed') return;
                const dateKey = new Date(b.createdAt).getFullYear().toString();
                if (historicalMap[dateKey]) {
                    historicalMap[dateKey].revenue += (b.totalPrice || 0);
                    historicalMap[dateKey].count++;
                }
            });
        }

        const historical = Object.keys(historicalMap).map(key => ({
            name: key,
            revenue: historicalMap[key].revenue || 0,
            volume: historicalMap[key].count || 0
        }));

        /* 2. Service Popularity */
        const serviceCounts = { Wash: 0, Wax: 0, Engine: 0, Armor: 0 };
        bookings.forEach(b => {
            if (Array.isArray(b.serviceType)) {
                b.serviceType.forEach(s => {
                    const trimmed = s.trim();
                    if (serviceCounts[trimmed] !== undefined) serviceCounts[trimmed]++;
                });
            } else if (b.serviceType) {
                const trimmed = b.serviceType.trim();
                if (serviceCounts[trimmed] !== undefined) serviceCounts[trimmed]++;
            }
        });

        const services = Object.keys(serviceCounts).map(key => ({
            name: key, value: serviceCounts[key]
        })).filter(s => s.value > 0);

        return { historical, services };
    }, [bookings, chartFilter]);

    const PIE_COLORS = ['#23A0CE', '#f59e0b', '#22c55e', '#f43f5e'];

    const stats = [
        { label: 'Bookings Today', value: metrics.todayCount, icon: <img src={bookingsIcon} alt="Bookings Icon" />, color: '#23A0CE' },
        { label: 'Completed Today', value: metrics.completedToday, icon: <img src={bookingsCompleted} alt="Bookings Completed" />, color: '#22c55e' },
        { label: 'Pending / Action Req.', value: metrics.activePending, icon: <img src={bookingsPending} alt="Bookings Pending" />, color: '#f59e0b' },
        { label: "Today's Revenue", value: `₱${metrics.todayRevenue.toLocaleString()}`, icon: <h4 className="m-0" style={{ color: '#a855f7' }}>₱</h4>, color: '#a855f7' },
    ];

    const todayDate = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Header */}
            <TopHeader
                employee={employee}
                title="System Overview"
                subtitle={todayDate}
                onNavigate={onNavigate}
            />

            {/* ATTENDANCE WIDGET */}
            <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #0d1b1b, #153232)' }}>
                <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', background: 'rgba(35,160,206,0.15)', color: '#23A0CE' }}>
                            {employee?.fullName?.charAt(0)?.toUpperCase() ?? 'J'}
                        </div>
                        <div>
                            <h5 className="mb-1 text-white fw-bold">Daily Attendance</h5>
                            <p className="mb-0 text-white-50" style={{ fontSize: '0.9rem' }}>
                                Status: <strong style={{ color: attendanceStatus === 'Clocked In' ? '#22c55e' : attendanceStatus === 'Not Clocked In' ? '#f59e0b' : '#9ca3af' }}>{attendanceStatus}</strong>
                                {clockInTime && ` • In: ${new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                {clockOutTime && ` • Out: ${new Date(clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                        </div>
                    </div>
                    <div>
                        <button
                            className="btn rounded-pill px-4 fw-bold"
                            style={{
                                background: attendanceStatus === 'Not Clocked In' ? '#22c55e' : attendanceStatus === 'Clocked In' ? '#ef4444' : '#374151',
                                color: '#fff',
                                boxShadow: attendanceStatus === 'Clocked Out' ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                            onClick={handleClockToggle}
                            disabled={isClocking || attendanceStatus === 'Clocked Out'}
                        >
                            {isClocking ? <span className="spinner-border spinner-border-sm" /> : attendanceStatus === 'Not Clocked In' ? 'Clock In' : attendanceStatus === 'Clocked In' ? 'Clock Out' : 'Shift Completed'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {stats.map((stat) => (
                    <div className="col-sm-6 col-xl-3" key={stat.label}>
                        <div
                            className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between position-relative overflow-hidden"
                            style={{
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.07)',
                                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s',
                            }}
                        >
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: stat.color, filter: 'blur(30px)', opacity: 0.15 }}></div>

                            <div className="d-flex justify-content-between align-items-start mb-3 position-relative z-1">
                                <span style={{ fontSize: '1.6rem' }}>{stat.icon}</span>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: stat.color, display: 'inline-block', marginTop: 6 }} />
                            </div>
                            <div className="position-relative z-1">
                                <p className="mb-1 text-dark-gray400 font-poppins" style={{ fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {stat.label}
                                </p>
                                <h3 className="mb-0 text-dark-secondary font-poppins" style={{ fontWeight: 700, color: stat.color }}>
                                    {isLoading ? '...' : stat.value}
                                </h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── CHARTS SECTION ─── */}
            <div className="row g-4 mb-4">
                {/* 1. Bar Chart: Revenue */}
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
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(35,160,206,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [`₱${value.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#23A0CE" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Pie Chart: Service Popularity */}
                <div className="col-12 col-xl-4">
                    <div className="p-4 rounded-4 h-100 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-2">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Service Popularity</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Lifetime distribution</p>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : chartData.services.length === 0 ? (
                            <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250, fontSize: '0.9rem' }}>No service data yet</div>
                        ) : (
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData.services}
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {chartData.services.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '0.8rem' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Line Chart: Booking Volume */}
                <div className="col-12">
                    <div className="p-4 rounded-4 shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <div className="mb-4">
                            <h6 className="fw-bold mb-1 text-dark-secondary font-poppins">Booking Volume</h6>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Tracks number of completed car wash bookings</p>
                        </div>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}><div className="spinner-border text-primary" /></div>
                        ) : (
                            <div style={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData.historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [value, 'Cars Washed']}
                                        />
                                        <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
