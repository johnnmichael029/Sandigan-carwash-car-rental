import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE, authHeaders } from '../../../api/config';
import SharedSearchBar from '../../admin/shared/SharedSearchBar';

// Leaflet custom emoji icons
const carIcon = new L.divIcon({
    html: '<div style="font-size: 24px; display:flex; align-items:center; justify-content:center; text-shadow: 0 0 5px rgba(0,0,0,0.5);">🚗</div>',
    className: 'leaflet-emoji-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const houseIcon = new L.divIcon({
    html: '<div style="font-size: 24px; display:flex; align-items:center; justify-content:center; text-shadow: 0 0 5px rgba(0,0,0,0.5);">🏡</div>',
    className: 'leaflet-emoji-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

/* ─────────────────────────────────────────────
   HOME SERVICE OPS Panel
   Real-time dispatch map for Home Service bookings.
   Shows: Customer pins (green house) + Detailer pins (red car)
   ───────────────────────────────────────────── */

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%', zIndex: 1 };
const DEFAULT_CENTER = [14.5995, 120.9842]; // Metro Manila (Leaflet uses arrays [lat, lng])

const STATUS_COLORS = {
    'Pending': '#f59e0b',
    'Confirmed': '#3b82f6',
    'Queued': '#a855f7',
    'On the Way': '#f97316',
    'In-progress': '#23A0CE',
    'Completed': '#22c55e',
    'Cancelled': '#ef4444',
};

const statusBadge = (status) => {
    const color = STATUS_COLORS[status] || '#94a3b8';
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 20,
            fontSize: '0.7rem',
            fontWeight: 700,
            background: color + '22',
            border: `1px solid ${color}55`,
            color,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        }}>
            {status}
        </span>
    );
};

const HomeServiceOps = ({ isDark }) => {
    const [homeBookings, setHomeBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailerLocations, setDetailerLocations] = useState({}); // { bookingId: { lat, lng } }
    const [activeInfoWindow, setActiveInfoWindow] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const socketRef = useRef(null);

    // ── Fetch Home Service Bookings ──
    const fetchHomeBookings = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/booking?serviceLocationType=Home Service`, {
                headers: authHeaders(),
                withCredentials: true
            });
            const allBookings = Array.isArray(res.data) ? res.data : (res.data.bookings || []);
            const home = allBookings.filter(b => b.serviceLocationType === 'Home Service');
            setHomeBookings(home.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

            // Seed detailer locations from DB
            const seedLocations = {};
            home.forEach(b => {
                if (b.detailerLocation?.latitude) {
                    seedLocations[b._id] = {
                        lat: b.detailerLocation.latitude,
                        lng: b.detailerLocation.longitude
                    };
                }
            });
            setDetailerLocations(prev => ({ ...prev, ...seedLocations }));
        } catch (err) {
            console.error('[HomeServiceOps] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeBookings();

        // ── Socket for live GPS updates ──
        const socket = io(API_BASE.replace('/api', ''));
        socketRef.current = socket;

        // General booking update
        socket.on('new_booking', (booking) => {
            if (booking.serviceLocationType === 'Home Service') {
                setHomeBookings(prev => {
                    const exists = prev.some(b => b._id === booking._id);
                    return exists ? prev : [booking, ...prev];
                });
            }
        });

        socket.on('update_booking', (booking) => {
            if (booking.serviceLocationType === 'Home Service') {
                setHomeBookings(prev => prev.map(b => b._id === booking._id ? booking : b));
            }
        });

        // Live GPS updates from detailers
        socket.on('detailer_location_update', (data) => {
            setDetailerLocations(prev => ({
                ...prev,
                [data.bookingId]: { lat: data.latitude, lng: data.longitude }
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, [fetchHomeBookings]);

    const formatTo12Hour = (hourStr) => {
        if (!hourStr || hourStr === 'ASAP') return 'ASAP';
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${hour % 12 || 12}:00 ${ampm}`;
    };

    const filtered = homeBookings.filter(b => {
        const s = searchTerm.toLowerCase();
        return (
            `${b.firstName} ${b.lastName}`.toLowerCase().includes(s) ||
            (b.batchId || '').toLowerCase().includes(s) ||
            (b.homeServiceDetails?.address || '').toLowerCase().includes(s)
        );
    });

    const activeOps = filtered.filter(b => !['Completed', 'Cancelled'].includes(b.status));
    const completedOps = filtered.filter(b => ['Completed', 'Cancelled'].includes(b.status));

    const bookingsWithCoords = homeBookings.filter(b => b.homeServiceDetails?.latitude);

    const kpiCards = [
        {
            title: 'Total HS Today',
            value: homeBookings.length,
            icon: '🚐',
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.15)',
            dot: '#3b82f6',
            desc: 'Total home service tasks'
        },
        {
            title: 'Active Ops',
            value: activeOps.length,
            icon: '⚡',
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.15)',
            dot: '#f59e0b',
            desc: 'Ongoing or pending'
        },
        {
            title: 'Live GPS',
            value: Object.keys(detailerLocations).length,
            icon: '📍',
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.15)',
            dot: '#22c55e',
            desc: 'Broadcasting location'
        },
        {
            title: 'Completed',
            value: completedOps.length,
            icon: '✅',
            color: '#a855f7',
            bg: 'rgba(168,85,247,0.15)',
            dot: '#a855f7',
            desc: 'Finished or Cancelled'
        }
    ];

    return (
        <div className="d-flex flex-column gap-3" style={{ minHeight: '80vh' }}>

            {/* ── TOP STATS ── */}
            <div className="row g-3 mb-2">
                {kpiCards.map((card, idx) => (
                    <div className="col-12 col-sm-6 col-md-3" key={idx}>
                        <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden position-relative" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-content-border)' }}>
                            {/* Decorative soft glow */}
                            <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '80px', height: '80px', background: card.color, filter: 'blur(30px)', opacity: 0.15 }} />
                            <div className="p-3 position-relative">
                                {/* Dot indicator */}
                                <div className="position-absolute top-0 end-0 p-3">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, display: 'inline-block' }} />
                                </div>
                                {/* Icon */}
                                <div className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                                    style={{ width: '40px', height: '40px', background: card.bg, color: card.color, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {card.icon}
                                </div>
                                {/* Label */}
                                <p className="font-poppins mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--theme-content-text-secondary)' }}>
                                    {card.title}
                                </p>
                                {/* Value */}
                                <h3 className="mb-1 font-poppins fw-bold" style={{ color: card.color, fontSize: '1.6rem', lineHeight: 1 }}>
                                    {isLoading ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ color: card.color }}></span>
                                    ) : card.value}
                                </h3>
                                {/* Description */}
                                <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{card.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── MAIN LAYOUT: LIST + MAP ── */}
            <div className="d-flex gap-3" style={{ flex: 1 }}>

                {/* ─ LEFT: Booking List ─ */}
                <div className="d-flex flex-column" style={{
                    width: '40%', minWidth: 280, background: 'var(--theme-card-bg)',
                    border: '1px solid var(--theme-content-border)', borderRadius: 16, overflow: 'hidden'
                }}>
                    {/* Search */}
                    <div className="p-3" style={{ borderBottom: '1px solid var(--theme-content-border)' }}>
                        <SharedSearchBar
                            placeholder="Search name, ID or address..."
                            onDebouncedSearch={(val) => setSearchTerm(val)}
                            debounceDelay={400}
                            width='100%'
                        />
                    </div>

                    {/* Active Ops */}
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        {isLoading ? (
                            <div className="d-flex justify-content-center align-items-center p-5">
                                <div className="spinner-border text-primary" role="status" />
                            </div>
                        ) : activeOps.length === 0 ? (
                            <div className="text-center p-5" style={{ color: '#94a3b8' }}>
                                <div style={{ fontSize: '2.5rem' }}>🏡</div>
                                <div style={{ fontSize: '0.85rem', marginTop: 8 }}>No active Home Service bookings</div>
                            </div>
                        ) : (
                            activeOps.map(b => {
                                const hasGps = !!detailerLocations[b._id];
                                const isOnTheWay = (b.status || '').toLowerCase() === 'on the way';
                                const isSel = selectedBooking?._id === b._id;

                                return (
                                    <div key={b._id}
                                        onClick={() => setSelectedBooking(isSel ? null : b)}
                                        style={{
                                            padding: '14px 16px',
                                            borderBottom: '1px solid var(--theme-content-border)',
                                            cursor: 'pointer',
                                            background: isSel ? '#23A0CE11' : 'transparent',
                                            borderLeft: isSel ? '3px solid #23A0CE' : '3px solid transparent',
                                            transition: 'all 0.15s ease'
                                        }}>
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#23A0CE' }}>
                                                {b.batchId}
                                            </span>
                                            <div className="d-flex align-items-center gap-1">
                                                {isOnTheWay && hasGps && (
                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} title="Live GPS Active" />
                                                )}
                                                {statusBadge(b.status)}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--theme-content-text)' }}>
                                            {b.firstName} {b.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            📍 {b.homeServiceDetails?.address || 'No address set'}
                                        </div>
                                        <div className="d-flex gap-2 mt-2">
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                🕐 {formatTo12Hour(b.bookingTime)}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                • {Array.isArray(b.serviceType) ? b.serviceType.join(', ') : b.serviceType}
                                            </span>
                                        </div>
                                        {b.detailer && (
                                            <div style={{ fontSize: '0.72rem', marginTop: 4, color: '#23A0CE', fontWeight: 600 }}>
                                                👤 {b.detailer}
                                                {hasGps && <span style={{ color: '#22c55e', marginLeft: 4 }}>• GPS Live 🟢</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {/* Completed logs section */}
                        {completedOps.length > 0 && (
                            <>
                                <div style={{ padding: '8px 16px', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--theme-content-border)' }}>
                                    Completed / Cancelled
                                </div>
                                {completedOps.map(b => (
                                    <div key={b._id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--theme-content-border)', opacity: 0.6 }}>
                                        <div className="d-flex justify-content-between">
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{b.batchId}</span>
                                            {statusBadge(b.status)}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--theme-content-text)', marginTop: 2 }}>
                                            {b.firstName} {b.lastName}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* ─ RIGHT: Live Dispatch Map ─ */}
                <div style={{
                    flex: 1, borderRadius: 16, overflow: 'hidden',
                    border: '1px solid var(--theme-content-border)',
                    background: '#1a1a2e',
                    minHeight: 500,
                    position: 'relative'
                }}>
                    {/* Map header */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                        padding: '12px 16px',
                        pointerEvents: 'none'
                    }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
                            Live Dispatch Map
                            {Object.keys(detailerLocations).length > 0 && (
                                <span style={{ marginLeft: 10, fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>
                                    ● {Object.keys(detailerLocations).length} Detailer{Object.keys(detailerLocations).length > 1 ? 's' : ''} Broadcasting
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{
                        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                        borderRadius: 10, padding: '8px 12px', pointerEvents: 'none'
                    }}>
                        <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>Legend</div>
                        <div style={{ color: '#4ade80', fontSize: '0.68rem' }}>🟢 Customer Location</div>
                        <div style={{ color: '#f87171', fontSize: '0.68rem' }}>🔴 Detailer (Live)</div>
                    </div>

                    <MapContainer
                        center={
                            bookingsWithCoords[0]
                                ? [bookingsWithCoords[0].homeServiceDetails.latitude, bookingsWithCoords[0].homeServiceDetails.longitude]
                                : DEFAULT_CENTER
                        }
                        zoom={bookingsWithCoords.length > 0 ? 13 : 11}
                        style={MAP_CONTAINER_STYLE}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Customer house markers */}
                        {bookingsWithCoords.map(b => (
                            <Marker
                                key={`cust-${b._id}`}
                                position={[b.homeServiceDetails.latitude, b.homeServiceDetails.longitude]}
                                icon={houseIcon}
                            >
                                <Popup>
                                    <div style={{ minWidth: 160 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                                            {b.firstName} {b.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3 }}>
                                            📍 {b.homeServiceDetails.address}
                                        </div>
                                        <div style={{ marginTop: 4 }}>{statusBadge(b.status)}</div>
                                        <div style={{ fontSize: '0.7rem', marginTop: 4, color: '#777' }}>
                                            {Array.isArray(b.serviceType) ? b.serviceType.join(', ') : b.serviceType}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Detailer moving markers */}
                        {Object.entries(detailerLocations).map(([bookingId, coords]) => {
                            const booking = homeBookings.find(b => b._id === bookingId);
                            return (
                                <Marker
                                    key={`det-${bookingId}`}
                                    position={[coords.lat, coords.lng]}
                                    icon={carIcon}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 140 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                                                🚗 {booking?.detailer || 'Detailer'}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3 }}>
                                                Going to: {booking?.firstName} {booking?.lastName}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700, marginTop: 4 }}>
                                                ● Live GPS Active
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default HomeServiceOps;
