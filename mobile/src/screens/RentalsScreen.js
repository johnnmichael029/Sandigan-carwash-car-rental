import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated, Alert, DeviceEventEmitter
} from 'react-native';
import { FlashList } from "@shopify/flash-list";
import BookingDetailModal from '../components/BookingDetailModal';
import CustomAlertModal from '../components/CustomAlertModal';
import BookingCardSkeleton from '../components/BookingCardSkeleton';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import { io } from 'socket.io-client';

const FILTER_TABS = ['All', 'Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled'];
const PAGE_LIMIT = 15;

// ── Status Stepper ────────────────────────────────────────────────────────────
const RENTAL_STEPS = ['Pending', 'Confirmed', 'Active', 'Returned'];

const StatusStepper = ({ status, COLORS }) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'cancelled') {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <View style={{ backgroundColor: '#ef444420', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ef444450' }}>
                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>✕  Rental Cancelled</Text>
                </View>
            </View>
        );
    }

    const currentStep = RENTAL_STEPS.findIndex(s => s.toLowerCase() === statusLower);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            {RENTAL_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const stepColor = isDone || isActive ? '#23A0CE' : COLORS.border;
                return (
                    <React.Fragment key={step}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 22, height: 22, borderRadius: 11,
                                backgroundColor: isDone ? '#23A0CE' : isActive ? '#23A0CE20' : COLORS.cardBackground,
                                borderWidth: 2, borderColor: stepColor,
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isDone && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                                {isActive && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#23A0CE' }} />}
                            </View>
                            <Text style={{ fontSize: 8, color: isActive ? '#23A0CE' : COLORS.textMuted, fontWeight: isActive ? '700' : '500', marginTop: 3, textAlign: 'center' }}>
                                {step}
                            </Text>
                        </View>
                        {idx < RENTAL_STEPS.length - 1 && (
                            <View style={{ flex: 1, height: 2, backgroundColor: isDone ? '#23A0CE' : COLORS.border, marginBottom: 14 }} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const RentalsScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    const [rentals, setRentals] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [selectedRental, setSelectedRental] = useState(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const rentalPage = useRef(1);
    const hasMore = useRef(true);
    const isLoadingMore = useRef(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchPage = useCallback(async (reset = false) => {
        if (!userInfo?.email) return;
        const rPage = reset ? 1 : rentalPage.current;
        if (!reset && !hasMore.current) return;

        try {
            const headers = { Authorization: `Bearer ${userToken}` };
            const res = await axios.get(
                `${API_BASE}/customer-auth/my-rentals?page=${rPage}&limit=${PAGE_LIMIT}`,
                { headers }
            );
            const newRentals = (res.data.rentals || []);
            hasMore.current = !!res.data.hasMore;
            if (reset) {
                rentalPage.current = 2;
            } else {
                if (newRentals.length) rentalPage.current += 1;
            }

            setRentals(prev => {
                const base = reset ? [] : prev;
                const merged = [...base, ...newRentals];
                const seen = new Set();
                return merged.filter(item => {
                    if (seen.has(item._id)) return false;
                    seen.add(item._id);
                    return true;
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });
        } catch (err) {
            // Keep existing data
        } finally {
            setIsLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
            isLoadingMore.current = false;
        }
    }, [userInfo?.email, userToken]);

    useFocusEffect(useCallback(() => {
        hasMore.current = true;
        rentalPage.current = 1;
        setIsLoading(true);
        fetchPage(true);
    }, [fetchPage]));

    const onRefresh = useCallback(() => {
        hasMore.current = true;
        rentalPage.current = 1;
        setRefreshing(true);
        fetchPage(true);
    }, [fetchPage]);

    const onEndReached = useCallback(() => {
        if (isLoadingMore.current || !hasMore.current) return;
        isLoadingMore.current = true;
        setIsFetchingMore(true);
        fetchPage(false);
    }, [fetchPage]);

    // ── Real-time socket updates ──────────────────────────────────────────────
    useEffect(() => {
        if (!userInfo?.email) return;
        const socket = io(API_BASE.replace('/api', ''));

        socket.on('new_rental', (rental) => {
            if (rental.emailAddress !== userInfo.email) return;
            setRentals(prev => {
                const exists = prev.some(r => r._id === rental._id);
                if (exists) return prev;
                return [rental, ...prev];
            });
        });

        socket.on('update_rental', (rental) => {
            if (rental.emailAddress !== userInfo.email) return;
            setRentals(prev => prev.map(r => r._id === rental._id ? rental : r));
        });

        return () => socket.disconnect();
    }, [userInfo?.email]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'active': return '#22c55e';
            case 'confirmed': return '#3b82f6';
            case 'pending': return '#f59e0b';
            case 'returned': return '#9ca3af';
            case 'cancelled': return '#ef4444';
            default: return COLORS.textMuted;
        }
    };

    const handleCancel = async (item) => {
        setAlertData({
            visible: true,
            title: "Cancel Rental Request?",
            message: "Are you sure you want to cancel this car rental? Any applied vouchers will be returned to you.",
            type: 'confirm',
            onConfirm: async () => {
                setIsCancelling(true);
                try {
                    const response = await fetch(`${API_BASE}/car-rentals/${item._id}/cancel`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        }
                    });

                    const data = await response.json();
                    if (response.ok) {
                        setDetailsModalVisible(false);
                        setAlertData({
                            visible: true,
                            title: "Success",
                            message: "Your rental request has been successfully cancelled.",
                            type: 'success'
                        });
                        onRefresh(); // Refresh the list
                    } else {
                        setAlertData({
                            visible: true,
                            title: "Error",
                            message: data.error || "Failed to cancel.",
                            type: 'error'
                        });
                    }
                } catch (err) {
                    setAlertData({
                        visible: true,
                        title: "Error",
                        message: "Check your internet connection.",
                        type: 'error'
                    });
                } finally {
                    setIsCancelling(false);
                }
            }
        });
    };

    const filtered = activeFilter === 'All'
        ? rentals
        : rentals.filter(r => (r.status || '').toLowerCase() === activeFilter.toLowerCase());

    // ── Render Item ───────────────────────────────────────────────────────────
    const renderRental = ({ item, index }) => {
        const color = getStatusColor(item.status);
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setSelectedRental({ ...item, type: 'rental' }); setDetailsModalVisible(true); }}
                style={[styles.card, index === 0 && { marginTop: 4 }]}
            >
                <View style={[styles.stripe, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                    {/* Top Row */}
                    <View style={styles.cardTop}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.vehicleName}>
                                {item.vehicleName || 'Car Rental'}
                            </Text>
                            <Text style={styles.destination}>{item.destination || '—'}</Text>
                        </View>
                        <View style={styles.rightBox}>
                            <Text style={styles.amount}>
                                ₱{(item.estimatedTotal || 0).toLocaleString()}
                            </Text>
                            <View style={[styles.statusPill, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                                <Text style={[styles.statusPillText, { color }]}>
                                    {item.status || 'Pending'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Date Info */}
                    <View style={styles.dateRow}>
                        <Text style={styles.metaText}>
                            {new Date(item.rentalStartDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' – '}
                            {new Date(item.returnDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text style={styles.metaText}>
                            {item.rentalDays || 1} day{(item.rentalDays || 1) !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {/* Status Stepper */}
                    <StatusStepper status={item.status} COLORS={COLORS} />
                </View>
            </TouchableOpacity>
        );
    };

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
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>
                {activeFilter === 'All' ? 'No rentals yet' : `No ${activeFilter.toLowerCase()} rentals`}
            </Text>
            <Text style={styles.emptyText}>
                {activeFilter === 'All'
                    ? 'Book a car rental and it will appear here.'
                    : 'Try a different filter.'}
            </Text>
            {activeFilter === 'All' && (
                <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => navigation.navigate('Rental')}
                >
                    <Text style={styles.ctaBtnText}>Browse Available Cars →</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // ── UI ────────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>My Rentals</Text>
                <Text style={styles.pageSubtitle}>Your car rental history</Text>
            </View>

            {/* Filter Tabs */}
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

            {/* Count */}
            <Text style={styles.countText}>
                {filtered.length} {activeFilter === 'All' ? 'total' : activeFilter.toLowerCase()} rental{filtered.length !== 1 ? 's' : ''}
                {hasMore.current && activeFilter === 'All' ? ' · scroll to load more' : ''}
            </Text>

            {isLoading ? (
                <View style={{ marginTop: 10 }}>
                    {[1, 2, 3, 4].map((key) => (
                        <BookingCardSkeleton key={key} />
                    ))}
                </View>
            ) : (
                <FlashList
                    data={filtered}
                    renderItem={renderRental}
                    keyExtractor={(item, idx) => item._id || String(idx)}
                    estimatedItemSize={160}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    onEndReached={activeFilter === 'All' ? onEndReached : null}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    onScrollBeginDrag={() => DeviceEventEmitter.emit('toggleTabBar', true)}
                    onScrollEndDrag={() => DeviceEventEmitter.emit('toggleTabBar', false)}
                    onMomentumScrollBegin={() => DeviceEventEmitter.emit('toggleTabBar', true)}
                    onMomentumScrollEnd={() => DeviceEventEmitter.emit('toggleTabBar', false)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
                />
            )}

            <BookingDetailModal
                visible={detailsModalVisible}
                onClose={() => setDetailsModalVisible(false)}
                item={selectedRental}
                onCancel={handleCancel}
                isCancelling={isCancelling}
                COLORS={COLORS}
                getStatusColor={getStatusColor}
            />

            <CustomAlertModal 
                visible={alertData.visible}
                title={alertData.title}
                message={alertData.message}
                type={alertData.type}
                onConfirm={alertData.onConfirm}
                onClose={() => setAlertData({ ...alertData, visible: false })}
            />
        </View>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
    pageHeader: { marginTop: 56, marginBottom: 16 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    pageSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },

    filterRow: { flexDirection: 'row', marginBottom: 14, height: 40 },
    filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
    filterTabActive: { backgroundColor: '#23A0CE', borderColor: '#23A0CE' },
    filterTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    filterTabTextActive: { color: '#fff' },

    countText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12, fontWeight: '500' },

    card: {
        backgroundColor: COLORS.cardBackground, borderRadius: 16, marginBottom: 14,
        borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    stripe: { width: 4 },
    cardContent: { flex: 1, padding: 16 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    cardInfo: { flex: 1, marginRight: 12 },
    vehicleName: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    destination: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
    rightBox: { alignItems: 'flex-end', gap: 6 },
    amount: { fontSize: 17, fontWeight: '800', color: '#23A0CE' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

    footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
    footerText: { fontSize: 12, color: COLORS.textMuted },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
    emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32, marginBottom: 20 },
    ctaBtn: { backgroundColor: '#23A0CE', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, shadowColor: '#23A0CE', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
    ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default RentalsScreen;
