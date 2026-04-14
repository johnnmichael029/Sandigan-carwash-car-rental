import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import BookingDetailModal from '../components/BookingDetailModal';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import { io } from 'socket.io-client';

const FILTER_TABS = ['All', 'Pending', 'Confirmed', 'Queued', 'In-Progress', 'Completed', 'Cancelled'];
const PAGE_LIMIT = 15; // items per page per source

// ── Status Stepper ────────────────────────────────────────────────────────────
const WASH_STEPS = ['Pending', 'Confirmed', 'Queued', 'In-Progress', 'Completed'];

const StatusStepper = ({ status, COLORS }) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'cancelled') {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View style={{ backgroundColor: '#ef444420', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ef444450' }}>
                    <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>✕  Cancelled</Text>
                </View>
            </View>
        );
    }

    const steps = WASH_STEPS;
    const currentStep = steps.findIndex(s => s.toLowerCase() === statusLower);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            {steps.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const stepColor = isDone || isActive ? COLORS.primary : COLORS.border;
                return (
                    <React.Fragment key={step}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 20, height: 20, borderRadius: 10,
                                backgroundColor: isDone ? COLORS.primary : isActive ? COLORS.primary + '20' : COLORS.cardBackground,
                                borderWidth: 2, borderColor: stepColor,
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isDone && <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>✓</Text>}
                                {isActive && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                            </View>
                            <Text style={{ fontSize: 7.5, color: isActive ? COLORS.primary : COLORS.textMuted, fontWeight: isActive ? '700' : '500', marginTop: 3, textAlign: 'center' }}>
                                {step}
                            </Text>
                        </View>
                        {idx < steps.length - 1 && (
                            <View style={{ flex: 1, height: 2, backgroundColor: isDone ? COLORS.primary : COLORS.border, marginBottom: 14 }} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
};


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
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

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
            case 'in-progress': return '#23A0CE';
            case 'confirmed': return '#3b82f6';
            case 'queued': return '#c023ce';
            case 'cancelled': return '#ef4444';
            case 'returned': return '#9ca3af';
            default: return COLORS.textMuted;
        }
    };

    const handleCancel = async (item) => {
        Alert.alert(
            "Cancel Request?",
            "Are you sure you want to cancel? Any applied vouchers will be returned to your account.",
            [
                { text: "No, Keep it", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        setIsCancelling(true);
                        try {
                            const endpoint = item.type === 'rental'
                                ? `${API_BASE}/car-rentals/${item._id}/cancel`
                                : `${API_BASE}/booking/${item._id}/cancel`;

                            const response = await fetch(endpoint, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${userToken}`
                                }
                            });

                            const data = await response.json();
                            if (response.ok) {
                                setDetailsModalVisible(false);
                                Alert.alert("Cancelled", "Your request has been successfully cancelled.");
                                onRefresh(); // Refresh the list
                            } else {
                                Alert.alert("Error", data.error || "Failed to cancel.");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Check your internet connection.");
                        } finally {
                            setIsCancelling(false);
                        }
                    }
                }
            ]
        );
    };

    // ONLY show WASH types in this screen now
    const washOnly = bookings.filter(b => b.type === 'wash');

    const filtered = activeFilter === 'All'
        ? washOnly
        : washOnly.filter(b => (b.status || '').toLowerCase() === activeFilter.toLowerCase());

    // ─── Render helpers ───────────────────────────────────────────────────────
    const renderBooking = ({ item, index }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setSelectedBooking(item); setDetailsModalVisible(true); }}
            style={[styles.bookingCard, index === 0 && { marginTop: 4 }]}
        >
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
                    ) : (
                        <Text style={styles.metaText}>
                            {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {item.bookingTime ? `  ·  ${item.bookingTime}:00` : ''}
                        </Text>
                    )}
                    <Text style={styles.metaText}>
                        {item.type === 'rental' ? 'Requested ' : 'Booked '}
                        {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                </View>
                {/* Status Stepper - only show for active/in progress */}
                {!['completed', 'returned', 'cancelled'].includes((item.status || '').toLowerCase()) && (
                    <StatusStepper status={item.status} type={item.type} COLORS={COLORS} />
                )}
            </View>
        </TouchableOpacity>
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
                <Text style={styles.pageTitle}>My Carwash</Text>
                <Text style={styles.pageSubtitle}>Your carwash history</Text>
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

            {/* Loading More Indicator */}
            {renderFooter()}

            <BookingDetailModal
                visible={detailsModalVisible}
                onClose={() => setDetailsModalVisible(false)}
                item={selectedBooking}
                onCancel={handleCancel}
                isCancelling={isCancelling}
                COLORS={COLORS}
                getStatusColor={getStatusColor}
            />
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

    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});

export default BookingsScreen;
