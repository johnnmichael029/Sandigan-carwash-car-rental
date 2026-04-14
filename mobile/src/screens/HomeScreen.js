import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, RefreshControl, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { API_BASE } from '../api/config';
import { io } from 'socket.io-client';

const darkThemeIcon = require('../../assets/icon/dark-theme.png');
const lightThemeIcon = require('../../assets/icon/light-theme.png');

const HomeScreen = ({ navigation }) => {
    const { userInfo, userToken, logout } = useContext(AuthContext);
    const { COLORS, isDarkMode, toggleTheme } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    const [recentBookings, setRecentBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRecentBookings = useCallback(async () => {
        if (!userInfo?.email) return;
        try {
            const [washRes, rentRes] = await Promise.all([
                axios.get(`${API_BASE}/customer-auth/my-bookings`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${API_BASE}/customer-auth/my-rentals`, { headers: { Authorization: `Bearer ${userToken}` } }).catch(() => ({ data: [] }))
            ]);
            const washes = (Array.isArray(washRes.data) ? washRes.data : (washRes.data.bookings || [])).map(b => ({ ...b, _type: 'wash' }));
            const rentals = (Array.isArray(rentRes.data) ? rentRes.data : []).map(r => ({ ...r, _type: 'rental' }));
            const combined = [...washes, ...rentals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentBookings(combined.slice(0, 3));
        } catch (err) {
            setRecentBookings([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [userInfo?.email, userToken]);

    useEffect(() => { fetchRecentBookings(); }, [fetchRecentBookings]);

    // ── Live Socket Updates ──
    useEffect(() => {
        if (!userInfo?.email) return;
        const socketBase = API_BASE.replace('/api', '');
        const socket = io(socketBase);

        socket.on('update_booking', (booking) => {
            if (booking.emailAddress === userInfo.email) fetchRecentBookings();
        });
        socket.on('new_booking', (booking) => {
            if (booking.emailAddress === userInfo.email) fetchRecentBookings();
        });
        // Rental real-time events
        socket.on('new_rental', (rental) => {
            if (rental.emailAddress === userInfo.email) fetchRecentBookings();
        });
        socket.on('update_rental', (rental) => {
            if (rental.emailAddress === userInfo.email) fetchRecentBookings();
        });

        return () => socket.disconnect();
    }, [fetchRecentBookings, userInfo?.email]);

    const onRefresh = () => { setRefreshing(true); fetchRecentBookings(); };

    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'completed':   return '#22c55e';
            case 'active':      return '#22c55e';
            case 'pending':     return '#f59e0b';
            case 'confirmed':   return '#3b82f6';
            case 'queued':      return '#c023ce';
            case 'cancelled':   return '#ef4444';
            case 'in progress': return '#23A0CE';
            case 'in-progress': return '#ce6723'; // Specific color for backend legacy
            case 'returned':    return '#9ca3af';
            default:            return COLORS.textMuted;
        }
    };


    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            {/* ── Header ── */}
            <View style={styles.headerRow}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.greetingText}>Hello, {userInfo?.firstName} 👋</Text>
                    <Text style={styles.subtitle}>Welcome to Sandigan</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                        <Image
                            source={isDarkMode ? lightThemeIcon : darkThemeIcon}
                            style={styles.themeIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Hero Banner ── */}
            <View style={styles.heroBanner}>
                <Text style={styles.heroTitle}>Premium Car Wash</Text>
                <Text style={styles.heroSubtitle}>Book your wash in seconds. We come to you.</Text>
                <TouchableOpacity
                    style={styles.heroButton}
                    onPress={() => navigation.navigate('Book')}
                >
                    <Text style={styles.heroButtonText}>Book a Wash →</Text>
                </TouchableOpacity>
            </View>

            {/* ── Quick Actions ── */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Book')}
                >
                    <Text style={styles.actionIcon}>🚗</Text>
                    <Text style={styles.actionTitle}>Book a Wash</Text>
                    <Text style={styles.actionSubtitle}>View services & prices</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCard]}
                    onPress={() => navigation.navigate('Rental')}
                >
                    <Text style={styles.actionIcon}>🔑</Text>
                    <Text style={styles.actionTitle}>Car Rental</Text>
                    <Text style={styles.actionSubtitle}>Rent a vehicle</Text>
                </TouchableOpacity>
            </View>

            {/* ── Recent Bookings ── */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
                    <Text style={styles.linkText}>View All →</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
            ) : recentBookings.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🚿</Text>
                    <Text style={styles.emptyStateTitle}>No bookings yet</Text>
                    <Text style={styles.emptyStateText}>Book your first wash and it'll show up here.</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Book')}>
                        <Text style={styles.emptyButtonText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                recentBookings.map((booking, idx) => (
                    <View key={booking._id || idx} style={styles.bookingCard}>
                        <View style={styles.bookingLeft}>
                            <Text style={styles.bookingService}>
                                {booking._type === 'rental'
                                    ? `Car Rental — ${booking.vehicleName || 'Vehicle'}`
                                    : (Array.isArray(booking.serviceType) ? booking.serviceType.join(', ') : booking.serviceType || 'Car Wash')}
                            </Text>
                            <Text style={styles.bookingDate}>
                                {new Date(booking.createdAt).toLocaleDateString('en-PH', {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </Text>
                        </View>
                        <View style={styles.bookingRight}>
                            <Text style={styles.bookingAmount}>₱{(booking.totalPrice || booking.estimatedTotal || 0).toLocaleString()}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20', borderColor: getStatusColor(booking.status) + '40' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                                    {booking.status || 'Pending'}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))
            )}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
    headerRow: { marginTop: 56, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTextContainer: { flex: 1 },
    headerActions: { flexDirection: 'row', gap: 10 },
    greetingText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
    themeToggle: { padding: 8, backgroundColor: COLORS.cardBackground, borderRadius: 50, borderWidth: 1, borderColor: COLORS.border },
    themeIcon: { width: 20, height: 20, tintColor: COLORS.text },
    heroBanner: {
        backgroundColor: '#23A0CE',
        borderRadius: 20, padding: 24, marginBottom: 28,
        shadowColor: '#23A0CE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8
    },
    heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
    heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 18 },
    heroButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    heroButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    linkText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    actionCard: {
        flex: 1, backgroundColor: COLORS.cardBackground, padding: 20, borderRadius: 16,
        borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
    },
    actionCardSecondary: { borderColor: COLORS.primary + '30', backgroundColor: COLORS.primary + '08' },
    actionIcon: { fontSize: 28, marginBottom: 10 },
    actionTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
    actionSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
    emptyState: { backgroundColor: COLORS.cardBackground, padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: 24 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyStateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
    emptyStateText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
    emptyButton: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
    emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    bookingCard: {
        backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
    },
    bookingLeft: { flex: 1 },
    bookingService: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    bookingDate: { fontSize: 12, color: COLORS.textMuted },
    bookingRight: { alignItems: 'flex-end', gap: 6 },
    bookingAmount: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

export default HomeScreen;
