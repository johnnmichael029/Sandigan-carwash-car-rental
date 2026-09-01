import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookingDetailModal from '../components/BookingDetailModal';
import BookingCardSkeleton from '../components/BookingCardSkeleton';

const { width } = Dimensions.get('window');

const EarningsScreen = ({ navigation }) => {
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const { userInfo, userToken } = useContext(AuthContext);

    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const styles = getStyles(COLORS, isDarkMode);

    const getStatusColor = (status) => {
        if (!status) return COLORS.textMuted;
        switch (status.toLowerCase()) {
            case 'pending': return '#f59e0b';
            case 'approved': return '#06b6d4';
            case 'in-progress': return '#3b82f6';
            case 'on the way': return '#f97316';
            case 'completed': return '#22c55e';
            case 'cancelled': return '#ef4444';
            case 'rescheduled': return '#8b5cf6';
            default: return COLORS.textMuted;
        }
    };

    const fetchEarnings = async (pageNumber = 1) => {
        if (pageNumber === 1) setLoading(true);
        else setIsFetchingMore(true);

        try {
            const res = await axios.get(`${API_BASE}/employees/my-earnings?page=${pageNumber}&limit=10`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            if (pageNumber === 1) {
                setEarningsData(res.data);
                setBookings(res.data.bookings || []);
            } else {
                setBookings(prev => {
                    const incoming = res.data.bookings || [];
                    const merged = [...prev, ...incoming];
                    const seen = new Set();
                    return merged.filter(item => {
                        if (seen.has(item._id)) return false;
                        seen.add(item._id);
                        return true;
                    });
                });
            }

            setHasMore(res.data.hasMore);
            setPage(pageNumber);
        } catch (err) {
            console.error('Failed to fetch earnings:', err);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        fetchEarnings(1);
    }, []);

    const handleLoadMore = () => {
        if (hasMore && !isFetchingMore && !loading) {
            fetchEarnings(page + 1);
        }
    };

    const renderFooter = () => {
        if (!isFetchingMore) return null;
        return (
            <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    };

    const renderBookingItem = ({ item }) => {
        const isPaid = (item.commissionStatus || '').toLowerCase() === 'paid';
        const dateStr = new Date(item.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

        return (
            <TouchableOpacity
                style={styles.bookingCard}
                activeOpacity={0.7}
                onPress={() => {
                    setSelectedItem(item);
                    setModalVisible(true);
                }}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.batchId}>Ref: {item.batchId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#22c55e20' : '#f59e0b20' }]}>
                        <Text style={[styles.statusText, { color: isPaid ? '#22c55e' : '#f59e0b' }]}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.serviceText}>{Array.isArray(item.serviceType) ? item.serviceType.join(', ') : item.serviceType}</Text>
                    <Text style={styles.vehicleText}>{item.vehicleType}</Text>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>{dateStr}</Text>
                    <Text style={styles.commissionText}>+₱{item.commissionEarned?.toFixed(2)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                {/* Skeleton Header */}
                <View style={styles.header}>
                    <View style={{ width: 60, height: 32, backgroundColor: COLORS.border, borderRadius: 8 }} />
                    <View style={{ width: 100, height: 20, backgroundColor: COLORS.border, borderRadius: 6 }} />
                    <View style={{ width: 60 }} />
                </View>

                {/* Skeleton Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={[styles.summaryBox, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                        <View style={{ width: 70, height: 11, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: 10 }} />
                        <View style={{ width: 100, height: 28, backgroundColor: COLORS.border, borderRadius: 6, marginBottom: 6 }} />
                        <View style={{ width: 80, height: 11, backgroundColor: COLORS.border, borderRadius: 4 }} />
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                        <View style={{ width: 70, height: 11, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: 10 }} />
                        <View style={{ width: 100, height: 28, backgroundColor: COLORS.border, borderRadius: 6, marginBottom: 6 }} />
                        <View style={{ width: 80, height: 11, backgroundColor: COLORS.border, borderRadius: 4 }} />
                    </View>
                </View>

                {/* Skeleton Section Header */}
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                    <View style={{ width: 140, height: 16, backgroundColor: COLORS.border, borderRadius: 6 }} />
                    <View style={{ width: 80, height: 13, backgroundColor: COLORS.border, borderRadius: 6 }} />
                </View>

                {/* Skeleton Earnings Cards */}
                <View style={{ paddingHorizontal: 20 }}>
                    <BookingCardSkeleton earnings />
                    <BookingCardSkeleton earnings />
                    <BookingCardSkeleton earnings />
                    <BookingCardSkeleton earnings />
                    <BookingCardSkeleton earnings />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Earnings</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryBox, { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' }]}>
                    <Text style={styles.summaryBoxTitle}>Total Earned</Text>
                    {/* Add a comma for total earned */}
                    <Text style={[styles.summaryBoxValue, { color: COLORS.primary }]}>₱{(earningsData?.totalEarned || 0).toFixed(2)}</Text>
                    <Text style={styles.summaryBoxSubtitle}>{earningsData?.bookingCount || 0} Cars completed</Text>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b40' }]}>
                    <Text style={styles.summaryBoxTitle}>Unpaid Pool</Text>
                    <Text style={[styles.summaryBoxValue, { color: '#f59e0b' }]}>₱{(earningsData?.unpaidPool || 0).toFixed(2)}</Text>
                    <Text style={styles.summaryBoxSubtitle}>Pending payout</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Commission History</Text>
                <Text style={styles.rateText}>Earn {((earningsData?.commissionRate || 0.3) * 100).toFixed(0)}% per car</Text>
            </View>

            <FlashList
                data={bookings}
                keyExtractor={item => item._id}
                renderItem={renderBookingItem}
                estimatedItemSize={120}
                contentContainerStyle={styles.listContainer}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>💸</Text>
                        <Text style={styles.emptyText}>No commissions earned yet.</Text>
                    </View>
                }
            />

            <BookingDetailModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                COLORS={COLORS}
                getStatusColor={getStatusColor}
            />
        </SafeAreaView>
    );
};

const getStyles = (COLORS, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    backBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: COLORS.border,
        borderRadius: 8,
    },
    backBtnText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    summaryBox: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    summaryBoxTitle: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    summaryBoxValue: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    summaryBoxSubtitle: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    rateText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22c55e',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 12,
    },
    bookingCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    batchId: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cardBody: {
        marginBottom: 10,
    },
    serviceText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    vehicleText: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 10,
    },
    dateText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    commissionText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#22c55e',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
    }
});

export default EarningsScreen;
