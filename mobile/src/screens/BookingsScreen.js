import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import { io } from 'socket.io-client';

const FILTER_TABS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Active', 'Completed', 'Cancelled', 'Returned'];
const PAGE_LIMIT = 15; // items per page per source

const BookingsScreen = () => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    // ─── State ───────────────────────────────────────────────────────────────
    const [bookings, setBookings] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Pagination cursors (one per source)
    const washPage = useRef(1);
    const rentalPage = useRef(1);
    const hasMoreWash = useRef(true);
    const hasMoreRental = useRef(true);
    const isLoadingMore = useRef(false); // guard against duplicate calls

    // ─── Core fetch function ─────────────────────────────────────────────────
    /**
     * Fetch the given page from both sources, tag them, merge into state.
     * @param {boolean} reset - true → replace list (pull-to-refresh / mount)
     *                          false → append (load-more)
     */
    const fetchPage = useCallback(async (reset = false) => {
        if (!userInfo?.email) return;

        const wPage = reset ? 1 : washPage.current;
        const rPage = reset ? 1 : rentalPage.current;

        // Nothing left to fetch
        if (!reset && !hasMoreWash.current && !hasMoreRental.current) return;

        try {
            const headers = { Authorization: `Bearer ${userToken}` };

            // Fetch both sources in parallel (only if they still have more)
            const [washRes, rentRes] = await Promise.all([
                hasMoreWash.current || reset
                    ? axios.get(`${API_BASE}/customer-auth/my-bookings?page=${wPage}&limit=${PAGE_LIMIT}`, { headers })
                    : Promise.resolve({ data: { bookings: [], hasMore: false } }),

                hasMoreRental.current || reset
                    ? axios.get(`${API_BASE}/customer-auth/my-rentals?page=${rPage}&limit=${PAGE_LIMIT}`, { headers })
                    : Promise.resolve({ data: { rentals: [], hasMore: false } }),
            ]);

            const newWashes = (washRes.data.bookings || []).map(b => ({ ...b, type: 'wash' }));
            const newRentals = (rentRes.data.rentals || []).map(r => ({ ...r, type: 'rental' }));

            // Update cursors
            hasMoreWash.current = !!washRes.data.hasMore;
            hasMoreRental.current = !!rentRes.data.hasMore;
            if (reset) {
                washPage.current = 2;
                rentalPage.current = 2;
            } else {
                if (newWashes.length) washPage.current += 1;
                if (newRentals.length) rentalPage.current += 1;
            }

            // Merge new items with existing, sort descending by date
            const incoming = [...newWashes, ...newRentals];
            setBookings(prev => {
                const base = reset ? [] : prev;
                const merged = [...base, ...incoming];
                // De-duplicate by _id then sort
                const seen = new Set();
                const dedup = merged.filter(item => {
                    if (seen.has(item._id)) return false;
                    seen.add(item._id);
                    return true;
                });
                return dedup.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });
        } catch (err) {
            // Keep existing data on error
        } finally {
            setIsLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
            isLoadingMore.current = false;
        }
    }, [userInfo?.email, userToken]);

    // ─── Reset + load first page on focus ────────────────────────────────────
    useFocusEffect(useCallback(() => {
        hasMoreWash.current = true;
        hasMoreRental.current = true;
        washPage.current = 1;
        rentalPage.current = 1;
        setIsLoading(true);
        fetchPage(true);
    }, [fetchPage]));

    // ─── Pull-to-refresh ─────────────────────────────────────────────────────
    const onRefresh = useCallback(() => {
        hasMoreWash.current = true;
        hasMoreRental.current = true;
        washPage.current = 1;
        rentalPage.current = 1;
        setRefreshing(true);
        fetchPage(true);
    }, [fetchPage]);

    // ─── Load more when user hits bottom ─────────────────────────────────────
    const onEndReached = useCallback(() => {
        if (isLoadingMore.current) return;
        if (!hasMoreWash.current && !hasMoreRental.current) return;
        isLoadingMore.current = true;
        setIsFetchingMore(true);
        fetchPage(false);
    }, [fetchPage]);

    // ─── Live Socket: prepend new items without resetting pagination ──────────
    useEffect(() => {
        if (!userInfo?.email) return;
        const socket = io(API_BASE.replace('/api', ''));

        const handleNewBooking = (booking) => {
            if (booking.emailAddress !== userInfo.email) return;
            setBookings(prev => {
                const exists = prev.some(b => b._id === booking._id);
                if (exists) return prev;
                return [{ ...booking, type: 'wash' }, ...prev];
            });
        };

        const handleUpdateBooking = (booking) => {
            if (booking.emailAddress !== userInfo.email) return;
            setBookings(prev => prev.map(b =>
                b._id === booking._id ? { ...booking, type: 'wash' } : b
            ));
        };

        const handleNewRental = (rental) => {
            if (rental.emailAddress !== userInfo.email) return;
            setBookings(prev => {
                const exists = prev.some(r => r._id === rental._id);
                if (exists) return prev;
                return [{ ...rental, type: 'rental' }, ...prev];
            });
        };

        const handleUpdateRental = (rental) => {
            if (rental.emailAddress !== userInfo.email) return;
            setBookings(prev => prev.map(r =>
                r._id === rental._id ? { ...rental, type: 'rental' } : r
            ));
        };

        socket.on('new_booking', handleNewBooking);
        socket.on('update_booking', handleUpdateBooking);
        socket.on('new_rental', handleNewRental);
        socket.on('update_rental', handleUpdateRental);

        return () => socket.disconnect();
    }, [userInfo?.email]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'completed': return '#22c55e';
            case 'active': return '#22c55e';
            case 'pending': return '#f59e0b';
            case 'in progress': return '#23A0CE';
            case 'confirmed': return '#3b82f6';
            case 'queued': return '#c023ce';
            case 'cancelled': return '#ef4444';
            case 'returned': return '#9ca3af';
            default: return COLORS.textMuted;
        }
    };

    const filtered = activeFilter === 'All'
        ? bookings
        : bookings.filter(b => (b.status || '').toLowerCase() === activeFilter.toLowerCase());

    // ─── Render helpers ───────────────────────────────────────────────────────
    const renderBooking = ({ item, index }) => (
        <View style={[styles.bookingCard, index === 0 && { marginTop: 4 }]}>
            <View style={[styles.statusStripe, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={styles.bookingContent}>
                <View style={styles.bookingTop}>
                    <View style={styles.bookingInfo}>
                        <Text style={styles.serviceText}>
                            {item.type === 'rental'
                                ? `Car Rental — ${item.vehicleName || 'Vehicle'}`
                                : (Array.isArray(item.serviceType) ? item.serviceType.join(', ') : item.serviceType || 'Car Wash Service')}
                        </Text>
                        <Text style={styles.vehicleText}>
                            {item.type === 'rental' ? `${item.destination || ''}` : (item.vehicleType || '—')}
                        </Text>
                    </View>
                    <View style={styles.amountBox}>
                        <Text style={styles.amountText}>₱{(item.totalPrice || item.estimatedTotal || 0).toLocaleString()}</Text>
                        <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) + '50' }]}>
                            <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>
                                {item.status || 'Pending'}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.bookingMeta}>
                    {item.type === 'rental' ? (
                        <Text style={styles.metaText}>
                            {new Date(item.rentalStartDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' – '}
                            {new Date(item.returnDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {`  ·  ${item.rentalDays || 1} day${(item.rentalDays || 1) !== 1 ? 's' : ''}`}
                        </Text>
                    ) : item.preferredDate && (
                        <Text style={styles.metaText}>
                            {new Date(item.preferredDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {item.preferredTime ? `  ·  ${item.preferredTime}` : ''}
                        </Text>
                    )}
                    <Text style={styles.metaText}>
                        {item.type === 'rental' ? 'Requested ' : 'Booked '}
                        {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.footerText}>Loading more...</Text>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
                {activeFilter === 'All' ? 'No bookings yet' : `No ${activeFilter.toLowerCase()} bookings`}
            </Text>
            <Text style={styles.emptyText}>
                {activeFilter === 'All'
                    ? 'Your booking history will appear here after your first wash or rental.'
                    : 'Try a different filter to see other bookings.'}
            </Text>
        </View>
    );

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>My Bookings</Text>
                <Text style={styles.pageSubtitle}>Your full booking history</Text>
            </View>

            {/* Filter Tabs — horizontal scroll, text never clipped */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                contentContainerStyle={{ gap: 8, paddingRight: 20, alignItems: 'center' }}
            >
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                        onPress={() => setActiveFilter(tab)}
                    >
                        <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Count badge */}
            <Text style={styles.countText}>
                {filtered.length} {activeFilter === 'All' ? 'total' : activeFilter.toLowerCase()} booking{filtered.length !== 1 ? 's' : ''}
                {(hasMoreWash.current || hasMoreRental.current) && activeFilter === 'All' ? ' · scroll to load more' : ''}
            </Text>

            {isLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} size="large" />
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderBooking}
                    keyExtractor={(item, idx) => item._id || String(idx)}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    onEndReached={activeFilter === 'All' ? onEndReached : null}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
                />
            )}
        </View>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
    pageHeader: { marginTop: 56, marginBottom: 16 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    pageSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, height: 40 },
    filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
    filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    filterTabTextActive: { color: '#fff' },

    countText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12, fontWeight: '500' },

    bookingCard: {
        backgroundColor: COLORS.cardBackground, borderRadius: 16, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    statusStripe: { width: 4 },
    bookingContent: { flex: 1, padding: 16 },
    bookingTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    bookingInfo: { flex: 1, marginRight: 12 },
    serviceText: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    vehicleText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
    amountBox: { alignItems: 'flex-end', gap: 6 },
    amountText: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    bookingMeta: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 4 },
    metaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

    footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
    footerText: { fontSize: 12, color: COLORS.textMuted },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});

export default BookingsScreen;
