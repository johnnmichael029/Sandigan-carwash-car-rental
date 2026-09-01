import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, RefreshControl, ActivityIndicator, Alert, DeviceEventEmitter
} from 'react-native';
import Toast from 'react-native-toast-message';
import BookingCardSkeleton from '../components/BookingCardSkeleton';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { API_BASE } from '../api/config';
import { io } from 'socket.io-client';
import carwashActiveIcon from '../../assets/icon/carwash-active.png';
import carRentActiveIcon from '../../assets/icon/car-rent-active.png';
const carWashIcon = require('../../assets/icon/wash.png');
const carRentIcon = require('../../assets/icon/car-key.png');

const darkThemeIcon = require('../../assets/icon/dark-theme.png');
const lightThemeIcon = require('../../assets/icon/light-theme.png');

const HomeScreen = ({ navigation }) => {
    const { userInfo, userToken, logout } = useContext(AuthContext);
    const { COLORS, isDarkMode, toggleTheme } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    const [recentBookings, setRecentBookings] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [myVouchers, setMyVouchers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRecentBookings = useCallback(async () => {
        if (!userInfo?.email) return;
        try {
            const [washRes, rentRes, promoRes, mineRes] = await Promise.all([
                axios.get(`${API_BASE}/customer-auth/my-bookings`, { headers: { Authorization: `Bearer ${userToken}` } }),
                axios.get(`${API_BASE}/customer-auth/my-rentals`, { headers: { Authorization: `Bearer ${userToken}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/promotions/all`).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/promotions/mine`, { headers: { Authorization: `Bearer ${userToken}` } }).catch(() => ({ data: [] }))
            ]);

            const washes = (Array.isArray(washRes.data) ? washRes.data : (washRes.data.bookings || [])).map(b => ({ ...b, _type: 'wash' }));
            const rentals = (Array.isArray(rentRes.data) ? rentRes.data : []).map(r => ({ ...r, _type: 'rental' }));
            const combined = [...washes, ...rentals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentBookings(combined.slice(0, 3));

            const now = new Date();
            const activePromos = (promoRes.data || []).filter(p =>
                p.isActive &&
                new Date(p.validFrom) <= now &&
                new Date(p.validUntil) >= now
            );
            setPromotions(activePromos);
            setMyVouchers(mineRes.data || []);
        } catch (err) {
            setRecentBookings([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [userInfo?.email, userToken]);

    const handleClaimPromo = async (promoId) => {
        try {
            await axios.post(`${API_BASE}/promotions/claim`, { promoId }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            Toast.show({ type: 'success', text1: 'Voucher Claimed! 🎟️', text2: 'You can now use this on your next booking.' });
            fetchRecentBookings(); // Refresh to update claimed status
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Oops!', text2: err.response?.data?.error || 'Could not claim voucher.' });
        }
    };

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
            case 'completed': return '#22c55e';
            case 'active': return '#22c55e';
            case 'pending': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'queued': return '#c023ce';
            case 'cancelled': return '#ef4444';
            case 'in progress': return '#23A0CE';
            case 'in-progress': return '#ce6723'; // Specific color for backend legacy
            case 'returned': return '#9ca3af';
            default: return COLORS.textMuted;
        }
    };


    return (
        <ScrollView
            style={styles.container}
            onScrollBeginDrag={() => DeviceEventEmitter.emit('toggleTabBar', true)}
            onScrollEndDrag={() => DeviceEventEmitter.emit('toggleTabBar', false)}
            onMomentumScrollBegin={() => DeviceEventEmitter.emit('toggleTabBar', true)}
            onMomentumScrollEnd={() => DeviceEventEmitter.emit('toggleTabBar', false)}
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
                <Text style={styles.heroSubtitle}>Book your wash in seconds.</Text>
                <TouchableOpacity
                    style={styles.heroButton}
                    onPress={() => navigation.navigate('Book')}
                >
                    <Text style={styles.heroButtonText}>Book a Wash →</Text>
                </TouchableOpacity>
            </View>

            {/* ── Active Promotions ── */}
            {promotions.length > 0 && (
                <View style={styles.promoSection}>
                    <Text style={styles.sectionTitle}>Exclusive Offers</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                        {promotions.map((promo) => (
                            <View key={promo._id} style={styles.promoCard}>
                                <View style={styles.promoHeader}>
                                    <View style={styles.promoBadge}>
                                        <Text style={styles.promoBadgeText}>{promo.discountType === 'Percentage' ? `${promo.discountValue}% OFF` : `₱${promo.discountValue} OFF`}</Text>
                                    </View>
                                    <Text style={styles.promoCode}>CODE: {promo.code}</Text>
                                </View>
                                <Text style={styles.promoName}>{promo.name}</Text>

                                <View style={styles.promoFooter}>
                                    {promo.minSpend > 0 ? (
                                        <View>
                                            <Text style={styles.promoMinSpend}>Min Spend: ₱{promo.minSpend}</Text>
                                            <Text style={styles.promoValidity}>Valid until: {new Date(promo.validUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                        </View>
                                    ) : <View />}
                                    <TouchableOpacity
                                        style={[styles.claimBtn, myVouchers.some(v => v._id === promo._id) && styles.claimBtnDisabled]}
                                        onPress={() => handleClaimPromo(promo._id)}
                                        disabled={myVouchers.some(v => v._id === promo._id)}
                                    >
                                        <Text style={styles.claimBtnText}>
                                            {myVouchers.some(v => v._id === promo._id) ? 'Claimed' : 'Claim'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Quick Actions ── */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Book')}
                >
                    <Image source={carWashIcon} style={styles.actionIcon} />
                    <Text style={styles.actionTitle}>Book a Wash</Text>
                    <Text style={styles.actionSubtitle}>View services & prices</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCard]}
                    onPress={() => navigation.navigate('Rental')}
                >
                    <Image source={carRentIcon} style={styles.actionIcon} />
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
                <View style={{ marginTop: 10 }}>
                    {[1, 2, 3].map((key) => <BookingCardSkeleton key={key} compact={true} />)}
                </View>
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
    actionIcon: { fontSize: 28, marginBottom: 10, width: 28, height: 28, tintColor: COLORS.primary },
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
    // Promo Styles
    promoSection: { marginBottom: 20 },
    promoCard: {
        backgroundColor: '#23A0CE15',
        borderWidth: 1, borderColor: 'rgba(35, 160, 206, 0.3)',
        borderRadius: 16, padding: 16, marginRight: 12, width: 250,
    },
    promoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    promoBadge: { backgroundColor: '#23A0CE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    promoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    promoCode: {
        color: COLORS.text, fontSize: 11, fontWeight: '700', letterSpacing: 1,
        backgroundColor: COLORS.cardBackground, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, overflow: 'hidden'
    },
    promoName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
    promoValidity: { fontSize: 10, color: COLORS.textMuted },
    promoMinSpend: { fontSize: 11, color: COLORS.textMuted },
    promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
    claimBtn: { backgroundColor: '#23A0CE', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
    claimBtnDisabled: { backgroundColor: COLORS.cardBackground },
    claimBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
});

export default HomeScreen;
