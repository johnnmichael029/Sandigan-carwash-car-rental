import React, { useState, useContext, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
    ActivityIndicator, Dimensions, TextInput, Alert, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../api/config';
import MapView, { Marker } from 'react-native-maps';
import { io } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from './CustomAlertModal';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// ── Status Stepper Component ──────────────────────────────────────────────────
const WASH_STEPS = ['Pending', 'Confirmed', 'Queued', 'In-Progress', 'Completed'];
const HOME_STEPS = ['Pending', 'Confirmed', 'Queued', 'On the Way', 'In-Progress', 'Completed'];
const RENTAL_STEPS = ['Pending', 'Confirmed', 'Active', 'Returned'];

const StatusStepper = ({ status, isHomeService, isRental, COLORS }) => {
    const statusLower = (status || '').toLowerCase();

    if (statusLower === 'cancelled') {
        return (
            <View style={styles.cancelledBadge}>
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.cancelledText}>Booking Cancelled</Text>
            </View>
        );
    }

    const steps = isRental ? RENTAL_STEPS : (isHomeService ? HOME_STEPS : WASH_STEPS);
    const currentStep = steps.findIndex(s => s.toLowerCase() === statusLower);

    return (
        <View style={styles.stepperContainer}>
            {steps.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const stepColor = isDone || isActive ? COLORS.primary : '#e2e8f0';

                return (
                    <React.Fragment key={step}>
                        <View style={{ alignItems: 'center', zIndex: 1, minWidth: 50 }}>
                            <View style={[
                                styles.stepDot,
                                { backgroundColor: isDone ? COLORS.primary : (isActive ? COLORS.primary + '20' : COLORS.cardBackground), borderColor: stepColor }
                            ]}>
                                {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                                {isActive && <View style={[styles.activeInnerDot, { backgroundColor: COLORS.primary }]} />}
                            </View>
                            <Text style={[styles.stepLabelText, { color: isActive ? COLORS.primary : '#94a3b8', fontWeight: isActive ? '700' : '500' }]}>
                                {step}
                            </Text>
                        </View>
                        {idx < steps.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: isDone ? COLORS.primary : '#e2e8f0' }]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

const BookingDetailModal = ({
    visible,
    onClose,
    item,
    onCancel,
    isCancelling,
    COLORS,
    getStatusColor,
    onReviewSuccess,
    isSuccessAnimation
}) => {
    const { userToken, userInfo } = useContext(AuthContext);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info' });
    const [localReviewed, setLocalReviewed] = useState(false);
    const [detailerCoords, setDetailerCoords] = useState(null);
    const socketRef = useRef(null);
    const mapRef = useRef(null);
    const bounceAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible && item) {
            // Trigger bounce animation if this is right after a successful booking
            if (isSuccessAnimation) {
                bounceAnim.setValue(0.4);
                Animated.spring(bounceAnim, {
                    toValue: 1,
                    friction: 5, // Allows a smooth overshoot and settling "2 bounces"
                    tension: 100,
                    useNativeDriver: true,
                }).start();
            } else {
                bounceAnim.setValue(1);
            }

            setRating(0);
            setReviewText('');
            setIsSubmitting(false);
            setLocalReviewed(!!item.isReviewed);

            if (item.detailerLocation?.latitude) {
                setDetailerCoords({
                    latitude: item.detailerLocation.latitude,
                    longitude: item.detailerLocation.longitude
                });
            } else {
                setDetailerCoords(null);
            }

            const isTracking = item.serviceLocationType === 'Home Service' &&
                ['on the way', 'in-progress'].includes((item.status || '').toLowerCase());

            if (isTracking && item._id) {
                const socket = io(API_BASE.replace('/api', ''));
                socketRef.current = socket;
                socket.emit('join_booking_room', item._id);
                socket.on('detailer_location_update', (data) => {
                    if (data.bookingId === item._id) {
                        const newCoords = { latitude: data.latitude, longitude: data.longitude };
                        setDetailerCoords(newCoords);
                        if (mapRef.current) {
                            mapRef.current.animateCamera({ center: newCoords, zoom: 16 }, { duration: 1000 });
                        }
                    }
                });
                return () => {
                    socket.emit('leave_booking_room', item._id);
                    socket.disconnect();
                    socketRef.current = null;
                };
            }
        }
    }, [visible, item]);

    if (!item) return null;

    const isRental = item.type === 'rental';
    const isCompleted = (item.status || '').toLowerCase() === 'completed' || (item.status || '').toLowerCase() === 'returned';
    const isCancelled = (item.status || '').toLowerCase() === 'cancelled';
    const isHomeService = item.serviceLocationType === 'Home Service';

    const getDynamicTitle = () => {
        if (isCancelled) return isRental ? 'Rental Cancelled' : 'Booking Cancelled';
        const st = (item.status || '').toLowerCase();
        if (st === 'pending') return isRental ? 'Rental Pending' : 'Booking Pending';
        if (st === 'confirmed') return isRental ? 'Rental Confirmed' : 'Booking Confirmed';
        if (st === 'on the way') return 'Staff On the Way';
        if (st === 'in-progress') return 'Service In-Progress';
        if (st === 'completed') return 'Service Completed!';
        if (st === 'active') return 'Rental Active';
        if (st === 'returned') return 'Rental Returned';
        return isRental ? 'Rental Details' : 'Booking Details';
    };

    const submitReview = async () => {
        if (rating === 0) {
            setAlertData({ visible: true, title: 'Rating Required', message: 'Please select a star rating first.', type: 'warning' });
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/customer-auth/booking/${item._id}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`
                },
                body: JSON.stringify({ rating, comment: reviewText })
            });
            const data = await res.json();
            if (res.ok) {
                setLocalReviewed(true);
                setAlertData({ visible: true, title: 'Success', message: 'Thank you for your feedback! Your review has been published.', type: 'success' });
                if (onReviewSuccess) {
                    onReviewSuccess(item._id);
                }
            } else {
                setAlertData({ visible: true, title: 'Error', message: data.error || 'Failed to submit review.', type: 'error' });
            }
        } catch (err) {
            setAlertData({ visible: true, title: 'Connection Error', message: 'Please check your internet connection and try again.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const DetailRow = ({ icon, label, value, subValue }) => (
        <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.background }]}>
                <Ionicons name={icon} size={18} color={COLORS.text} />
            </View>
            <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, { color: COLORS.text }]}>{value}</Text>
                {subValue && <Text style={styles.detailSubValue}>{subValue}</Text>}
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType={isSuccessAnimation ? "fade" : "slide"}
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <Animated.View style={[styles.modalContent, { backgroundColor: COLORS.cardBackground, transform: [{ scale: bounceAnim }] }]}>
                    <View style={styles.pullBar} />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* HEADER SECTION */}
                        <View style={styles.header}>
                            <View style={[styles.successCircle, { backgroundColor: isCancelled ? '#fee2e2' : '#f0fdf4' }]}>
                                <Ionicons
                                    name={isCancelled ? "close" : (isCompleted ? "checkmark" : "time-outline")}
                                    size={32}
                                    color={isCancelled ? '#ef4444' : '#22c55e'}
                                />
                            </View>
                            <Text style={[styles.headerTitle, { color: COLORS.text }]}>
                                {getDynamicTitle()}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {isCancelled ? 'We hope to see you again soon.' : 'See you soon ✨'}
                            </Text>
                        </View>

                        {/* STATUS STEPPER */}
                        <StatusStepper
                            status={item.status}
                            isHomeService={isHomeService}
                            isRental={isRental}
                            COLORS={COLORS}
                        />

                        {/* DETAILS LIST BOX */}
                        <View style={[styles.detailsBox, { backgroundColor: COLORS.background + '50' }]}>
                            <DetailRow
                                icon="car-sport-outline"
                                label="SERVICE"
                                value={isRental ? item.vehicleName : (Array.isArray(item.serviceType) ? item.serviceType.join(', ') : item.serviceType)}
                                subValue={isRental ? item.destination : item.vehicleType}
                            />

                            {!isRental && (
                                <DetailRow
                                    icon="person-outline"
                                    label="Detailer"
                                    value={item.detailer || 'Assigning soon...'}
                                />
                            )}

                            <DetailRow
                                icon="calendar-outline"
                                label="DATE"
                                value={isRental
                                    ? new Date(item.rentalStartDate).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' })
                                    : new Date(item.createdAt).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' })
                                }
                                subValue={isRental ? `Until ${new Date(item.returnDate).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}` : undefined}
                            />

                            {!isRental && item.bookingTime && (
                                <DetailRow
                                    icon="time-outline"
                                    label="TIME"
                                    value={`${item.bookingTime}:00`}
                                />
                            )}

                            <DetailRow
                                icon="pricetag-outline"
                                label="TOTAL"
                                value={`₱${(item.totalPrice || item.estimatedTotal || 0).toLocaleString()}`}
                                subValue={item.promoCode ? `Promo applied: ${item.promoCode}` : undefined}
                            />
                        </View>

                        {/* MAP SECTION (If applicable) */}
                        {item.serviceLocationType === 'Home Service' && ['on the way', 'in-progress'].includes((item.status || '').toLowerCase()) && (
                            <View style={styles.mapSection}>
                                <Text style={styles.sectionLabel}>LIVE TRACKING</Text>
                                <View style={styles.mapContainer}>
                                    <MapView
                                        ref={mapRef}
                                        style={StyleSheet.absoluteFillObject}
                                        initialRegion={{
                                            latitude: item.homeServiceDetails?.latitude || 14.5995,
                                            longitude: item.homeServiceDetails?.longitude || 120.9842,
                                            latitudeDelta: 0.01, longitudeDelta: 0.01
                                        }}
                                    >
                                        {item.homeServiceDetails?.latitude && (
                                            <Marker coordinate={{ latitude: item.homeServiceDetails.latitude, longitude: item.homeServiceDetails.longitude }} pinColor="green" />
                                        )}
                                        {detailerCoords && <Marker coordinate={detailerCoords} pinColor="#ef4444" />}
                                    </MapView>
                                </View>
                            </View>
                        )}

                        {/* REVIEW SECTION */}
                        {isCompleted && !isRental && onReviewSuccess && (
                            <View style={styles.reviewSection}>
                                <Text style={styles.sectionLabel}>REVIEW & FEEDBACK</Text>
                                {localReviewed ? (
                                    <View style={styles.reviewDone}>
                                        <Text style={styles.reviewDoneText}>🌟 Review Submitted! Thank you.</Text>
                                    </View>
                                ) : (
                                    <View>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                                    <Ionicons name={s <= rating ? "star" : "star-outline"} size={32} color={s <= rating ? "#fbbf24" : COLORS.border} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput
                                            style={[styles.reviewInput, { backgroundColor: COLORS.background, color: COLORS.text, borderColor: COLORS.border }]}
                                            placeholder="Tell us about your experience..."
                                            placeholderTextColor={COLORS.textMuted}
                                            multiline
                                            value={reviewText}
                                            onChangeText={setReviewText}
                                        />
                                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.primary }]} onPress={submitReview} disabled={isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={styles.refCode}>Ref: {item.batchId || item.rentalId || item._id?.slice(-8).toUpperCase()}</Text>
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* ACTIONS */}
                    <View style={styles.footer}>
                        {item.status === 'Pending' && onCancel && (
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item)} disabled={isCancelling}>
                                {isCancelling ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Cancel Request</Text>}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.closeBtnFooter} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>

            <CustomAlertModal 
                visible={alertData.visible}
                title={alertData.title}
                message={alertData.message}
                type={alertData.type}
                onClose={() => setAlertData({ ...alertData, visible: false })}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: WINDOW_HEIGHT * 0.88, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
    pullBar: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    scrollContent: { paddingHorizontal: 25, paddingTop: 20 },

    header: { alignItems: 'center', marginBottom: 25 },
    successCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', marginBottom: 5 },
    headerSubtitle: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

    detailsBox: { borderRadius: 24, padding: 20, marginBottom: 20 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    detailTextContainer: { flex: 1 },
    detailLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 2 },
    detailValue: { fontSize: 16, fontWeight: '700' },
    detailSubValue: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    mapContainer: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },

    reviewSection: { marginTop: 10 },
    starsRow: { flexDirection: 'row', gap: 12, marginBottom: 15, justifyContent: 'center' },
    reviewInput: { borderRadius: 16, padding: 15, height: 90, borderWidth: 1, textAlignVertical: 'top', fontSize: 14, marginBottom: 12 },
    submitBtn: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700' },
    reviewDone: { backgroundColor: '#f0fdf4', padding: 15, borderRadius: 16 },
    reviewDoneText: { color: '#16a34a', fontWeight: '700', textAlign: 'center' },

    refCode: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 20 },

    footer: { padding: 20, paddingBottom: 40, alignItems: 'center', gap: 15 },
    closeBtnFooter: { paddingVertical: 12, paddingHorizontal: 30 },
    closeBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 16 },
    cancelBtn: { width: '100%', height: 56, backgroundColor: '#ef4444', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Stepper Styles
    stepperContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 30, marginTop: 5 },
    stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6, zIndex: 2 },
    activeInnerDot: { width: 8, height: 8, borderRadius: 4 },
    stepLine: { flex: 1, height: 2, marginTop: 10, marginHorizontal: -10, zIndex: 0 },
    stepLabelText: { fontSize: 7, textAlign: 'center' },
    cancelledBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'center', marginBottom: 25, gap: 6 },
    cancelledText: { color: '#ef4444', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});

export default BookingDetailModal;
