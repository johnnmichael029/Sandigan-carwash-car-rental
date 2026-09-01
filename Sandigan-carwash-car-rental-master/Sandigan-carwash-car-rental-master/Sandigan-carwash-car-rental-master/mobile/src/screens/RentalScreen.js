import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Platform, Modal, Pressable, Animated, PanResponder, Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import useSWR from 'swr';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import Toast from 'react-native-toast-message';
import Skeleton from '../components/Skeleton';
import BookingDetailModal from '../components/BookingDetailModal';
import CustomAlertModal from '../components/CustomAlertModal';

const RENTAL_URL = `${API_BASE}/rental-fleet`;
const CAR_RENTAL_URL = `${API_BASE}/car-rentals`;

const fetcher = (url) => axios.get(url).then(r => r.data);

import { useFocusEffect } from '@react-navigation/native';

const RentalScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    // ── SWR cached fetch — instant on re-navigation ──
    const { data: rentalFleet = [], isLoading: isLoadingData, mutate: mutateFleet } = useSWR(
        RENTAL_URL,
        fetcher,
        { revalidateOnFocus: true, dedupingInterval: 60000 }
    );

    // ── Form state ──
    const [selectedRentalVehicle, setSelectedRentalVehicle] = useState(null);
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalDurationDays, setRentalDurationDays] = useState('1');
    const [destination, setDestination] = useState('');
    const [address, setAddress] = useState('');
    const [step, setStep] = useState(1); // 1=Details, 2=Requirements, 3=Confirm
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickupDate, setPickupDate] = useState(new Date());

    // ── Promo / Voucher State ──
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isModalFull, setIsModalFull] = useState(false);
    const [successModalData, setSuccessModalData] = useState(null);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    // ── Reset Form & Refresh Data on Focus ──
    useFocusEffect(
        React.useCallback(() => {
            // Refresh fleet list
            mutateFleet();

            // Reset form state for a fresh start
            setStep(1);
            setSelectedRentalVehicle(null);
            setRentalStartDate('');
            setRentalDurationDays('1');
            setDestination('');
            setAddress('');
            setAppliedPromo(null);

            return () => { };
        }, [mutateFleet])
    );


    // ── Socket.IO: live fleet + booking updates ──
    useEffect(() => {
        const socketBase = API_BASE.replace('/api', '');
        const socket = io(socketBase);

        // Admin changed a vehicle (availability, price, etc.) → refresh list
        socket.on('fleet_updated', () => mutateFleet());

        return () => socket.disconnect();
    }, [mutateFleet]);

    // ── Animated Bottom Sheet Logic ──
    const screenHeight = Dimensions.get('window').height;
    const initialHeight = 450;
    const fullHeight = screenHeight * 0.9;
    const animatedHeight = useRef(new Animated.Value(initialHeight)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const newHeight = initialHeight - gestureState.dy;
                if (newHeight >= initialHeight && newHeight <= fullHeight) {
                    animatedHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    Animated.spring(animatedHeight, {
                        toValue: fullHeight,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: false
                    }).start(() => setIsModalFull(true));
                } else {
                    Animated.spring(animatedHeight, {
                        toValue: initialHeight,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: false
                    }).start(() => setIsModalFull(false));
                }
            }
        })
    ).current;

    const openVoucherModal = () => {
        setIsVoucherModalVisible(true);
        animatedHeight.setValue(initialHeight);
        setIsModalFull(false);
    };

    const closeVoucherModal = () => {
        setIsVoucherModalVisible(false);
        setIsModalFull(false);
        animatedHeight.setValue(initialHeight);
    };


    // ── Derived: Price ──
    const getPrice = () => {
        if (!selectedRentalVehicle || !rentalDurationDays) return null;
        const days = parseInt(rentalDurationDays) || 1;
        return selectedRentalVehicle.pricePerDay * days;
    };

    const finalPrice = getPrice();

    const handleVehicleSelect = (vt) => {
        setSelectedRentalVehicle(vt);
    };

    const handleSubmit = () => {
        if (!selectedRentalVehicle || !rentalStartDate || !rentalDurationDays || !destination || !address) {
            Toast.show({ type: 'error', text1: 'Incomplete', text2: 'Please fill in all fields including your address.' });
            return;
        }

        setAlertData({
            visible: true,
            title: 'Confirm Rental?',
            message: `Do you want to request a ${selectedRentalVehicle.vehicleName} for ${rentalDurationDays} day${rentalDurationDays > 1 ? 's' : ''} starting ${rentalStartDate}?`,
            type: 'confirm',
            onConfirm: handleConfirmedSubmit
        });
    };

    const handleConfirmedSubmit = async () => {
        // Compute returnDate = startDate + duration days
        const start = new Date(rentalStartDate);
        const returnDateObj = new Date(start);
        returnDateObj.setDate(returnDateObj.getDate() + parseInt(rentalDurationDays));
        const returnDate = returnDateObj.toISOString().split('T')[0];

        setIsSubmitting(true);
        try {
            const res = await axios.post(CAR_RENTAL_URL, {
                fullName: `${userInfo.firstName} ${userInfo.lastName}`,
                contactNumber: userInfo.phone || '00000000000',
                emailAddress: userInfo.email,
                address: address.trim(),
                vehicleId: selectedRentalVehicle._id,
                rentalStartDate,
                returnDate,
                destination: destination.trim(),
                totalPrice: discountedPrice || 0,
                promoCode: appliedPromo?.code || null,
                promoDiscount: discountAmount || 0,
                notes: `Mobile App booking`,
                requirementsAcknowledged: true,  // Step 2 enforces acknowledgment
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            const newRental = res.data?.rental;
            if (newRental) {
                newRental.type = 'rental';
            }

            Toast.show({ type: 'success', text1: '🎉 Rental Submitted!', text2: 'We\'ll confirm your reservation shortly.' });

            // Set data to open modal in place
            setSuccessModalData(newRental);

            // Reset and stay on the screen underneath
            setStep(1);
            setSelectedRentalVehicle(null);
            setRentalStartDate('');
            setRentalDurationDays('1');
            setDestination('');
            setAppliedPromo(null);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Booking Failed', text2: err.response?.data?.error || 'Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchMyVouchers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/promotions/mine`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setMyVouchers(res.data || []);
        } catch (err) {
            console.error('Failed to fetch vouchers', err);
        }
    };

    useEffect(() => {
        if (step === 3) fetchMyVouchers();
    }, [step]);

    const handleApplyPromo = (promoData) => {
        if (!promoData) return;
        if (finalPrice < (promoData.minSpend || 0)) {
            Toast.show({ type: 'error', text1: 'Min Spend Not Met', text2: `This voucher requires a minimum spend of ₱${promoData.minSpend}` });
            return;
        }
        setAppliedPromo(promoData);
        closeVoucherModal();
        Toast.show({ type: 'success', text1: 'Voucher Applied! 🎟️', text2: `${promoData.discountType === 'Percentage' ? promoData.discountValue + '%' : '₱' + promoData.discountValue} discount applied.` });
    };

    const discountAmount = useMemo(() => {
        if (!appliedPromo || !finalPrice) return 0;
        if (appliedPromo.discountType === 'Percentage') {
            return (finalPrice * appliedPromo.discountValue) / 100;
        } else {
            return appliedPromo.discountValue;
        }
    }, [appliedPromo, finalPrice]);

    const discountedPrice = Math.max(0, finalPrice - discountAmount);

    if (isLoadingData) {
        return (
            <View style={[styles.container, { paddingTop: 46 }]}>
                {/* Back Link */}
                <Skeleton width={50} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 16 }} />

                {/* Title */}
                <Skeleton width={180} height={28} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                <Skeleton width={240} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 30 }} />

                {/* Steps Skeleton - Rental has 3 steps */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 4 }}>
                    {[1, 2, 3].map(k => (
                        <View key={k} style={{ alignItems: 'center', flex: 1 }}>
                            <Skeleton width={32} height={32} borderRadius={16} isDarkMode={isDarkMode} style={{ marginBottom: 4 }} />
                            <Skeleton width={60} height={10} isDarkMode={isDarkMode} />
                        </View>
                    ))}
                </View>

                {/* Vertical Cards Skeleton */}
                <Text style={[styles.stepTitle, { marginBottom: 16 }]}>Select Your Vehicle</Text>
                <View style={{ flexDirection: 'column', gap: 10 }}>
                    <Skeleton width="100%" height={90} borderRadius={14} isDarkMode={isDarkMode} />
                    <Skeleton width="100%" height={90} borderRadius={14} isDarkMode={isDarkMode} />
                    <Skeleton width="100%" height={90} borderRadius={14} isDarkMode={isDarkMode} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container}>
                {/* ── Header ── */}
                <View style={styles.pageHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
                        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>Rent a Vehicle</Text>
                    <Text style={styles.pageSubtitle}>Flexible rentals for your journey</Text>
                </View>

                {/* ── Step Indicator ── */}
                <View style={styles.stepBar}>
                    {['Details', 'Requirements', 'Confirm'].map((label, idx) => {
                        const sNum = idx + 1;
                        const isActive = step === sNum;
                        const isDone = step > sNum;
                        return (
                            <View key={label} style={styles.stepItem}>
                                <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isDone && styles.stepCircleDone]}>
                                    <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>
                                        {isDone ? '✓' : sNum}
                                    </Text>
                                </View>
                                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* ── STEP 1: Details ── */}
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Select Your Vehicle</Text>
                        {rentalFleet.length === 0 ? (
                            <Text style={styles.mutedText}>No rental vehicles currently available.</Text>
                        ) : (
                            <View style={styles.vehicleGrid}>
                                {rentalFleet.map(vt => (
                                    <TouchableOpacity
                                        key={vt._id}
                                        style={[styles.vehicleCard, selectedRentalVehicle?._id === vt._id && styles.vehicleCardSelected]}
                                        onPress={() => handleVehicleSelect(vt)}
                                    >
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={[styles.vehicleName, selectedRentalVehicle?._id === vt._id && { color: COLORS.primary }]}>
                                                {vt.vehicleName}
                                            </Text>
                                            <Text style={styles.vehicleDesc}>{vt.seats}-Seater | {vt.transmission}</Text>
                                            <Text style={styles.vehiclePrice}>₱{vt.pricePerDay?.toLocaleString()} / day</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {selectedRentalVehicle && (
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Pick-up Date</Text>
                                <TouchableOpacity
                                    style={[styles.inputField, { justifyContent: 'center' }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: rentalStartDate ? COLORS.text : COLORS.textMuted, fontSize: 14 }}>
                                        {rentalStartDate || 'Tap to select a date...'}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={pickupDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        minimumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setPickupDate(selectedDate);
                                                const y = selectedDate.getFullYear();
                                                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                                const d = String(selectedDate.getDate()).padStart(2, '0');
                                                setRentalStartDate(`${y}-${m}-${d}`);
                                            }
                                        }}
                                    />
                                )}

                                <Text style={styles.inputLabel}>Duration (Days)</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="1"
                                    keyboardType="numeric"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={rentalDurationDays}
                                    onChangeText={setRentalDurationDays}
                                />

                                <Text style={styles.inputLabel}>Destination</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="e.g. Tagaytay City, Metro Manila"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={destination}
                                    onChangeText={setDestination}
                                />

                                <Text style={styles.inputLabel}>Your Address</Text>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="e.g. 123 Rizal St., Quezon City"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>
                        )}

                        {selectedRentalVehicle && rentalDurationDays && rentalStartDate && destination && address && (
                            <View style={styles.pricePreview}>
                                <Text style={styles.pricePreviewLabel}>Estimated Total</Text>
                                <Text style={styles.pricePreviewValue}>
                                    {finalPrice !== null ? `₱${finalPrice.toLocaleString()}` : 'Contact for price'}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.nextButton, (!selectedRentalVehicle || !rentalDurationDays || !rentalStartDate || !destination || !address) && styles.nextButtonDisabled]}
                            onPress={() => {
                                if (selectedRentalVehicle && rentalStartDate && rentalDurationDays && destination && address) setStep(2)
                            }}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 2: Requirements ── */}
                {step === 2 && (
                    <View style={styles.stepContent}>
                        <View style={styles.reqCard}>
                            <Text style={styles.reqTitle}>📋 Rental Requirements</Text>
                            <Text style={styles.reqSubtitle}>Please bring the original and photocopies of the following documents upon vehicle pick-up:</Text>

                            <View style={styles.reqItem}>
                                <Text style={styles.reqCheck}>✓</Text>
                                <Text style={styles.reqText}>Valid Professional Driver's License</Text>
                            </View>
                            <View style={styles.reqItem}>
                                <Text style={styles.reqCheck}>✓</Text>
                                <Text style={styles.reqText}>1 Additional Valid Government ID</Text>
                            </View>
                            <View style={styles.reqItem}>
                                <Text style={styles.reqCheck}>✓</Text>
                                <Text style={styles.reqText}>Latest Proof of Billing (Must match ID address)</Text>
                            </View>
                            <View style={styles.reqItem}>
                                <Text style={styles.reqCheck}>✓</Text>
                                <Text style={styles.reqText}>Security Deposit (₱5,000 - Refundable)</Text>
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextButton, { flex: 1 }]}
                                onPress={() => setStep(3)}
                            >
                                <Text style={styles.nextButtonText}>Continue →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 3: Review & Confirm ── */}
                {step === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review Your Rental</Text>
                        <View style={styles.summaryCard}>
                            <SummaryRow label="Vehicle:" value={selectedRentalVehicle?.vehicleName} />
                            <SummaryRow label="Pick-up Date:" value={rentalStartDate} />
                            <SummaryRow label="Duration:" value={`${rentalDurationDays} day${rentalDurationDays > 1 ? 's' : ''}`} />
                            <SummaryRow label="Destination:" value={destination} />
                            <SummaryRow label="Address:" value={address} />
                            <SummaryRow label="Name:" value={`${userInfo?.firstName} ${userInfo?.lastName}`} />
                            <SummaryRow label="Email:" value={userInfo?.email} />

                            <View style={styles.summaryDivider} />

                            <View style={styles.promoInputWrapper}>
                                <TouchableOpacity
                                    style={[styles.voucherTrigger, appliedPromo && styles.voucherTriggerActive]}
                                    onPress={openVoucherModal}
                                >
                                    <Text style={[styles.voucherTriggerLabel, appliedPromo && { color: '#fff' }]}>
                                        {appliedPromo ? `🎟️  ${appliedPromo.code}` : 'Select a Discount Voucher'}
                                    </Text>
                                    <Text style={[styles.voucherTriggerIcon, appliedPromo && { color: '#fff' }]}>
                                        {appliedPromo ? '✓' : '▼'}
                                    </Text>
                                </TouchableOpacity>
                                {appliedPromo && (
                                    <TouchableOpacity style={styles.removePromoBtn} onPress={() => setAppliedPromo(null)}>
                                        <Text style={styles.removePromoBtnText}>✕ Remove Voucher</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {appliedPromo && (
                                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                    <Text style={styles.summaryLabel}>Discount ({appliedPromo.code})</Text>
                                    <Text style={[styles.summaryValue, { color: '#22c55e' }]}>-₱{discountAmount.toLocaleString()}</Text>
                                </View>
                            )}

                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryRowTotal}>
                                <Text style={styles.summaryLabelTotal}>Total Amount</Text>
                                <Text style={styles.summaryValueTotal}>
                                    {discountedPrice !== null ? `₱${discountedPrice.toLocaleString()}` : 'TBD'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { flex: 1 }, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.confirmButtonText}>✓ Confirm Rental</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Voucher Selection Modal ── */}
            <Modal visible={isVoucherModalVisible} animationType="slide" transparent={true} onRequestClose={closeVoucherModal}>
                <Pressable style={styles.modalOverlay} onPress={closeVoucherModal}>
                    <Animated.View
                        style={[styles.modalContent, { height: animatedHeight }]}
                        onPress={() => { }}
                    >
                        <View
                            style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }}
                            {...panResponder.panHandlers}
                        >
                            <View style={styles.modalHandle} />
                        </View>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🎟️ My Vouchers</Text>
                            <TouchableOpacity onPress={closeVoucherModal}>
                                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {myVouchers.length === 0 ? (
                                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 36, marginBottom: 12 }}>🎫</Text>
                                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 6 }}>No Vouchers Yet</Text>
                                    <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>Claim exclusive offers from the Home screen to use them here.</Text>
                                </View>
                            ) : (
                                myVouchers.map(v => {
                                    const isMinMet = (finalPrice || 0) >= (v.minSpend || 0);
                                    const isDisabled = v.isUsed || v.isExpired || !isMinMet;
                                    return (
                                        <TouchableOpacity
                                            key={v._id}
                                            style={[styles.voucherItem, isDisabled && { opacity: 0.5 }]}
                                            disabled={isDisabled}
                                            onPress={() => handleApplyPromo(v)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <View style={{ backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                                        <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 11 }}>{v.code}</Text>
                                                    </View>
                                                    {v.isUsed && <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>ALREADY USED</Text>}
                                                    {v.isExpired && <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>EXPIRED</Text>}
                                                    {!v.isUsed && !v.isExpired && !isMinMet && <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '600' }}>Min ₱{v.minSpend} required</Text>}
                                                </View>
                                                <Text style={styles.voucherDesc}>{v.name}</Text>
                                                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Valid until: {new Date(v.validUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                            </View>
                                            <View style={styles.voucherDiscountBadge}>
                                                <Text style={styles.voucherDiscount}>
                                                    {v.discountType === 'Percentage' ? `${v.discountValue}%` : `₱${v.discountValue}`}
                                                </Text>
                                                <Text style={styles.voucherDiscountLabel}>OFF</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* ── SUCCESS MODAL ── */}
            <BookingDetailModal
                visible={!!successModalData}
                item={successModalData}
                isSuccessAnimation={true}
                onClose={() => {
                    setSuccessModalData(null);
                    navigation.navigate('MainTabs', { screen: 'Bookings' });
                }}
                COLORS={COLORS}
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

const SummaryRow = ({ label, value }) => {
    const { COLORS } = useContext(ThemeContext);
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>{label}</Text>
            <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 12 }}>{value}</Text>
        </View>
    );
};

const getStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
    pageHeader: { marginTop: 46, marginBottom: 20 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    pageSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
    mutedText: { color: COLORS.textMuted, fontSize: 13 },

    // Step Bar
    stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingHorizontal: 4 },
    stepItem: { alignItems: 'center', flex: 1 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.cardBackground, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    stepCircleActive: { borderColor: COLORS.primary },
    stepCircleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
    stepNumActive: { color: COLORS.text },
    stepLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
    stepLabelActive: { color: COLORS.primary },

    // Step Content
    stepContent: { paddingBottom: 8 },
    stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

    // Vehicle Cards
    vehicleGrid: { flexDirection: 'column', gap: 10, marginBottom: 20 },
    vehicleCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
    vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    vehicleName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    vehicleDesc: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
    vehiclePrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

    // Inputs
    inputSection: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12 },
    inputField: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.text },

    // Price Preview
    pricePreview: { backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '30', marginTop: 10 },
    pricePreviewLabel: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    pricePreviewValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

    // Requirements
    reqCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    reqTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
    reqSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },
    reqItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
    reqCheck: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
    reqText: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1 },

    // Summary Label Total
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    summaryLabelTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    summaryValueTotal: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

    // Promo & Voucher Styles
    promoInputWrapper: { flexDirection: 'column', gap: 8, marginTop: 4 },
    voucherTrigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: COLORS.background, borderWidth: 1.5,
        borderColor: COLORS.primary + '40', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    voucherTriggerActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    voucherTriggerLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    voucherTriggerIcon: { fontSize: 12, color: COLORS.primary },
    removePromoBtn: { alignSelf: 'center', paddingVertical: 4 },
    removePromoBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    voucherItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: COLORS.background, borderRadius: 14,
        marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    voucherDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    voucherDiscountBadge: { alignItems: 'center', backgroundColor: '#22c55e15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#22c55e40', minWidth: 56 },
    voucherDiscount: { fontSize: 18, fontWeight: '900', color: '#22c55e' },
    voucherDiscountLabel: { fontSize: 9, fontWeight: '700', color: '#22c55e', letterSpacing: 1 },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
    summaryValue: { fontSize: 13, color: COLORS.text, fontWeight: '700' },

    // Buttons
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    nextButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    nextButtonDisabled: { opacity: 0.4 },
    nextButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    backButton: { backgroundColor: COLORS.cardBackground, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    backButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    confirmButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default RentalScreen;
