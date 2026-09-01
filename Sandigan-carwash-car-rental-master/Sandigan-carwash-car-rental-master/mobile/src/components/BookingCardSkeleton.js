import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { ThemeContext } from '../context/ThemeContext';

const BookingCardSkeleton = ({ compact = false, detailer = false, earnings = false }) => {
    const { COLORS, isDarkMode } = useContext(ThemeContext);

    // ── Detailer Dashboard Task Card Skeleton ──────────────────────────────
    if (detailer) {
        return (
            <View style={[styles.detailerCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                {/* Left Status Stripe */}
                <View style={[styles.detailerStripe, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
                <View style={styles.detailerContent}>
                    {/* Header Row: ref + status pill */}
                    <View style={styles.headerRow}>
                        <Skeleton width={100} height={12} isDarkMode={isDarkMode} />
                        <Skeleton width={70} height={22} borderRadius={20} isDarkMode={isDarkMode} />
                    </View>

                    {/* Customer Name */}
                    <Skeleton width={180} height={20} isDarkMode={isDarkMode} style={{ marginBottom: 6, marginTop: 14 }} />
                    {/* Vehicle */}
                    <Skeleton width={120} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                    {/* Service Name */}
                    <Skeleton width={150} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 14 }} />

                    {/* Time + Bay row */}
                    <View style={styles.headerRow}>
                        <Skeleton width={110} height={12} isDarkMode={isDarkMode} />
                        <Skeleton width={60} height={12} isDarkMode={isDarkMode} />
                    </View>

                    {/* Action Button */}
                    <View style={[styles.actionRow, { borderTopColor: COLORS.border }]}>
                        <Skeleton width={'100%'} height={42} borderRadius={12} isDarkMode={isDarkMode} />
                    </View>
                </View>
            </View>
        );
    }

    // ── Earnings Commission Card Skeleton ────────────────────────────────
    if (earnings) {
        return (
            <View style={[styles.earningsCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                {/* Header: batchId + status badge */}
                <View style={styles.headerRow}>
                    <Skeleton width={130} height={13} isDarkMode={isDarkMode} />
                    <Skeleton width={70} height={22} borderRadius={6} isDarkMode={isDarkMode} />
                </View>
                {/* Service + vehicle */}
                <Skeleton width={160} height={16} isDarkMode={isDarkMode} style={{ marginTop: 12, marginBottom: 6 }} />
                <Skeleton width={100} height={13} isDarkMode={isDarkMode} style={{ marginBottom: 14 }} />
                {/* Footer: date + commission */}
                <View style={[styles.headerRow, { paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                    <Skeleton width={120} height={12} isDarkMode={isDarkMode} />
                    <Skeleton width={70} height={18} isDarkMode={isDarkMode} />
                </View>
            </View>
        );
    }

    if (compact) {
        // Layout for HomeScreen recent activity cards
        return (
            <View style={[styles.compactCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                <View style={styles.compactLeft}>
                    <Skeleton width={140} height={16} isDarkMode={isDarkMode} style={{ marginBottom: 8 }} />
                    <Skeleton width={90} height={12} isDarkMode={isDarkMode} />
                </View>
                <View style={styles.compactRight}>
                    <Skeleton width={60} height={18} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                    <Skeleton width={70} height={18} borderRadius={20} isDarkMode={isDarkMode} />
                </View>
            </View>
        );
    }

    // Layout for BookingsScreen and RentalsScreen large cards
    return (
        <View style={[styles.largeCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
            <View style={[styles.stripe, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
            <View style={styles.cardContent}>
                {/* Top Row */}
                <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                        <Skeleton width={180} height={18} isDarkMode={isDarkMode} style={{ marginBottom: 8 }} />
                        <Skeleton width={100} height={14} isDarkMode={isDarkMode} />
                    </View>
                    <View style={styles.rightBox}>
                        <Skeleton width={70} height={20} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                        <Skeleton width={65} height={18} borderRadius={20} isDarkMode={isDarkMode} />
                    </View>
                </View>

                {/* Date Row */}
                <View style={styles.dateRow}>
                    <Skeleton width={150} height={12} isDarkMode={isDarkMode} />
                    <Skeleton width={60} height={12} isDarkMode={isDarkMode} />
                </View>

                {/* Stepper Fake Line */}
                <View style={styles.stepperContainer}>
                    <Skeleton width="100%" height={24} isDarkMode={isDarkMode} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    detailerCard: {
        borderRadius: 16, marginBottom: 16,
        borderWidth: 1, overflow: 'hidden', flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    detailerStripe: { width: 4 },
    detailerContent: { flex: 1, padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionRow: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
    earningsCard: {
        borderRadius: 12, padding: 15,
        borderWidth: 1, marginBottom: 12,
    },
    compactCard: {
        borderRadius: 14, padding: 16, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
    },
    compactLeft: { flex: 1 },
    compactRight: { alignItems: 'flex-end' },
    
    largeCard: {
        borderRadius: 16, marginBottom: 14,
        borderWidth: 1, overflow: 'hidden', flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    stripe: { width: 4 },
    cardContent: { flex: 1, padding: 16 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    cardInfo: { flex: 1, marginRight: 12 },
    rightBox: { alignItems: 'flex-end' },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    stepperContainer: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f910' }
});

export default BookingCardSkeleton;
