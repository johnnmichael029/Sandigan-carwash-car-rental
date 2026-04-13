import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, authHeaders } from '../../../api/config';

// Replace with the actual generated mascot path
import sandiMascot from '../../../assets/sandi_front.png';

const SandiAssistant = ({ isDark }) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");


    useEffect(() => {
        fetchInsights();
        const interval = setInterval(fetchInsights, 300000); // Refresh every 5 mins
        return () => clearInterval(interval);
    }, []);

    const fetchInsights = async () => {
        try {
            const res = await axios.get(`${API_BASE}/sandi/insights`, { headers: authHeaders(), withCredentials: true });
            setInsights(res.data);
            generateMessage(res.data);
        } catch (err) {
            console.error('Sandi fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateMessage = (data) => {
        const { finance, operations, hr, inventory } = data;
        let pieces = [];

        // 1. Finance Piece
        if (finance.profitMonth > 0) {
            pieces.push(`We've made ₱${Math.round(finance.profitMonth).toLocaleString()} in profit so far this month!`);
        } else {
            pieces.push(`Expenses are a bit high this month. We're currently ₱${Math.round(Math.abs(finance.profitMonth)).toLocaleString()} in the red, but we can catch up!`);
        }

        // 2. Operational Load
        if (operations.todayBookings > 0) {
            pieces.push(`We have ${operations.todayBookings} bookings scheduled for today.`);
        }

        if (operations.capacityAlert) {
            pieces.push(`Heads up! We have high traffic today but staffing is looking light (${hr.clockedIn} present).`);
        }

        // 3. Inventory
        if (inventory.lowStockCount > 0) {
            pieces.push(`Note: ${inventory.urgentItems[0]}${inventory.lowStockCount > 1 ? ' and others are' : ' is'} running low in stock.`);
        }

        // 4. Greeting/Closing
        const finalMsg = `${data.greeting} ${pieces.join(' ')}`;
        setMessage(finalMsg);
    };

    if (loading || !insights) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
        >
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden position-relative"
                style={{
                    background: isDark ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #ffffff, #f0f9ff)',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(35,160,206,0.1)',
                    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)'
                }}>

                {/* Decorative background elements */}
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '150px', height: '150px', background: '#23A0CE', filter: 'blur(80px)', opacity: isDark ? 0.07 : 0.05 }} />

                <div className="card-body p-4 d-flex align-items-center gap-4">
                    {/* Sandi Avatar Container */}
                    <div className="position-relative" style={{ flexShrink: 0 }}>
                        <div className="rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                            style={{
                                width: '85px',
                                height: '85px',
                                background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(35,160,206,0.1)',
                                border: `2px solid ${isDark ? 'rgba(35,160,206,0.3)' : 'rgba(35,160,206,0.2)'}`,
                                backdropFilter: 'blur(10px)'
                            }}>
                            <img
                                src={sandiMascot}
                                alt="Sandi"
                                style={{ width: '68px', height: '68px', objectFit: 'contain' }}
                                onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' }}
                            />
                        </div>
                        {/* Status Indicator */}
                        <div className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-3" style={{ width: '18px', height: '18px', borderColor: isDark ? '#1e293b' : '#fff' }} />
                    </div>

                    {/* Speech Content */}
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <h5 className="fw-bold mb-0" style={{ color: '#23A0CE', letterSpacing: '0.2px' }}>Sandi Assistant</h5>
                            <span className="badge rounded-pill" style={{ fontSize: '0.6rem', background: 'rgba(35, 160, 206, 0.15)', color: '#23A0CE', border: '1px solid rgba(35, 160, 206, 0.2)' }}>EXECUTIVE AI</span>
                        </div>

                        <div className="position-relative">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={message}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="mb-0"
                                    style={{
                                        fontSize: '1.05rem',
                                        lineHeight: '1.6',
                                        fontWeight: '500',
                                        color: isDark ? '#e2e8f0' : '#334155'
                                    }}
                                >
                                    {message}
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        {/* Quick Action Hints */}
                        <div className="mt-3 d-flex gap-2 flex-wrap">
                            <small className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                                style={{
                                    fontSize: '0.75rem',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    color: isDark ? '#94a3b8' : '#64748b',
                                    border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                                }}>
                                <i className="bi bi-clock-history text-primary"></i>
                                Next Booking: <span className={isDark ? 'text-light' : 'text-dark'}>{insights.operations.tomorrowBookings > 0 ? 'Tomorrow morning' : 'Available'}</span>
                            </small>
                            <small className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                                style={{
                                    fontSize: '0.75rem',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    color: isDark ? '#94a3b8' : '#64748b',
                                    border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                                }}>
                                <i className="bi bi-person-check text-success"></i>
                                Active Staff: <span className={isDark ? 'text-light' : 'text-dark'}>{insights.hr.clockedIn}/{insights.hr.totalStaff}</span>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SandiAssistant;
