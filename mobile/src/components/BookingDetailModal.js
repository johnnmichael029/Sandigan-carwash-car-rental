import React from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
    ActivityIndicator, Dimensions
} from 'react-native';

const BookingDetailModal = ({ 
    visible, 
    onClose, 
    item, 
    onCancel, 
    isCancelling, 
    COLORS,
    getStatusColor 
}) => {
    if (!item) return null;

    const isRental = item.type === 'rental';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: COLORS.cardBackground }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                                {isRental ? 'Rental Details' : 'Booking Details'}
                            </Text>
                            <Text style={styles.modalIdText}>
                                Ref: {item.batchId || item.rentalId || '—'}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={styles.closeBtn}
                        >
                            <Text style={{ color: COLORS.textMuted, fontSize: 18, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                        {/* Status Section */}
                        <View style={[styles.detailSection, { borderBottomWidth: 0 }]}>
                            <View style={[styles.statusBanner, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                                <Text style={[styles.statusBannerText, { color: getStatusColor(item.status) }]}>
                                    {item.status?.toUpperCase() || 'PENDING'}
                                </Text>
                            </View>
                        </View>

                        {/* Info Section */}
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionLabel}>SERVICE</Text>
                            <Text style={[styles.sectionValue, { color: COLORS.text }]}>
                                {isRental
                                    ? item.vehicleName
                                    : (Array.isArray(item.serviceType) ? item.serviceType.join(', ') : item.serviceType)}
                            </Text>
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.sectionLabel}>{isRental ? 'DESTINATION' : 'VEHICLE TYPE'}</Text>
                                <Text style={[styles.sectionValue, { color: COLORS.text }]}>
                                    {isRental ? item.destination : item.vehicleType || '—'}
                                </Text>
                            </View>
                        </View>

                        {/* Date/Time Section */}
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionLabel}>{isRental ? 'RENTAL PERIOD' : 'SCHEDULE'}</Text>
                            {isRental ? (
                                <View>
                                    <Text style={[styles.sectionValue, { color: COLORS.text }]}>
                                        {new Date(item.rentalStartDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                    <Text style={[styles.sectionValue, { color: COLORS.text, fontSize: 14, marginTop: 2 }]}>
                                        to {new Date(item.returnDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                    <Text style={[styles.sectionValue, { color: COLORS.primary, fontSize: 13, marginTop: 4, fontWeight: '600' }]}>
                                        Total: {item.rentalDays} Day{item.rentalDays !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    <Text style={[styles.sectionValue, { color: COLORS.text }]}>
                                        {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                    <Text style={[styles.sectionValue, { color: COLORS.text, fontSize: 14, marginTop: 2 }]}>
                                        at {item.bookingTime ? `${item.bookingTime}:00` : '—'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Pricing Section */}
                        <View style={[styles.detailSection, { borderBottomWidth: 0 }]}>
                            <Text style={styles.sectionLabel}>BILLING SUMMARY</Text>
                            <View style={styles.priceRow}>
                                <Text style={{ color: COLORS.textMuted }}>Base Amount</Text>
                                <Text style={{ color: COLORS.text, fontWeight: '600' }}>
                                    ₱{(isRental 
                                        ? (item.estimatedTotal + (item.promoDiscount || 0))
                                        : (item.totalPrice + (item.promoDiscount || 0))
                                    ).toLocaleString()}
                                </Text>
                            </View>
                            {item.promoCode && (
                                <View style={styles.priceRow}>
                                    <Text style={{ color: '#22c55e', fontWeight: '500' }}>Discount ({item.promoCode})</Text>
                                    <Text style={{ color: '#22c55e', fontWeight: '600' }}>-₱{item.promoDiscount?.toLocaleString()}</Text>
                                </View>
                            )}
                            <View style={[styles.priceRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border + '30' }]}>
                                <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16 }}>Total Payable</Text>
                                <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 18 }}>
                                    ₱{(item.totalPrice || item.estimatedTotal || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[styles.modalFooter, { borderTopColor: COLORS.border + '50' }]}>
                        {item.status === 'Pending' && (
                            <TouchableOpacity 
                                style={[styles.cancelBtn, isCancelling && { opacity: 0.6 }]}
                                onPress={() => onCancel(item)}
                                disabled={isCancelling}
                            >
                                {isCancelling ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.doneBtn, { backgroundColor: COLORS.primary }]}
                            onPress={onClose}
                        >
                            <Text style={styles.doneBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: Dimensions.get('window').height * 0.85,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    modalIdText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f920',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        paddingHorizontal: 25,
    },
    detailSection: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f915',
    },
    statusBanner: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    statusBannerText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 8,
    },
    sectionValue: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 24,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalFooter: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12,
    },
    doneBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelBtn: {
        flex: 0.6,
        height: 56,
        backgroundColor: '#ef4444',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default BookingDetailModal;
