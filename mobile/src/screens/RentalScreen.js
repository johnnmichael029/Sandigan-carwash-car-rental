import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Platform, Modal, Pressable,
    Animated, PanResponder, Dimensions, Image
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
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import BookingDetailModal from '../components/BookingDetailModal';
import CustomAlertModal from '../components/CustomAlertModal';
import RentalTermsModal from '../components/RentalTermsModal';
import { useFocusEffect } from '@react-navigation/native';

const RENTAL_URL = `${API_BASE}/rental-fleet`;
const CAR_RENTAL_URL = `${API_BASE}/car-rentals`;
const fetcher = (url) => axios.get(url).then(r => r.data);

const RentalScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    const { data: rentalFleet = [], isLoading: isLoadingData, mutate: mutateFleet } = useSWR(RENTAL_URL, fetcher, { revalidateOnFocus: true, dedupingInterval: 60000 });

    // ── Form state ──
    const [selectedRentalVehicle, setSelectedRentalVehicle] = useState(null);
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalDurationDays, setRentalDurationDays] = useState('1');
    const [destination, setDestination] = useState('');
    const [address, setAddress] = useState('');
    // Steps: 1=Details, 2=Requirements+Terms, 3=Payment, 4=Confirm
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickupDate, setPickupDate] = useState(new Date());

    // ── Terms State ──
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [reqAck, setReqAck] = useState(false);
    const [depositAck, setDepositAck] = useState(false);

    // ── Promo / Voucher State ──
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isModalFull, setIsModalFull] = useState(false);
    const [successModalData, setSuccessModalData] = useState(null);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    // ── Payment State ──
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [proofImage, setProofImage] = useState(null);
    const [proofImageUri, setProofImageUri] = useState(null);
    const [downPaymentPct, setDownPaymentPct] = useState(50);

    // ── Reset on Focus ──
    useFocusEffect(
        React.useCallback(() => {
            mutateFleet();
            setStep(1);
            setSelectedRentalVehicle(null);
            setRentalStartDate('');
            setRentalDurationDays('1');
            setDestination('');
            setAddress('');
            setAppliedPromo(null);
            setTermsAccepted(false);
            setReqAck(false);
            setDepositAck(false);
            setProofImage(null);
            setProofImageUri(null);
            setReferenceNumber('');
            setSelectedPaymentMethod(null);
            return () => {};
        }, [mutateFleet])
    );

    useEffect(() => {
        const socketBase = API_BASE.replace('/api', '');
        const socket = io(socketBase);
        socket.on('fleet_updated', () => mutateFleet());
        return () => socket.disconnect();
    }, [mutateFleet]);

    // ── Voucher Bottom Sheet ──
    const screenHeight = Dimensions.get('window').height;
    const initialHeight = 450;
    const fullHeight = screenHeight * 0.9;
    const animatedHeight = useRef(new Animated.Value(initialHeight)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, g) => {
                const newH = initialHeight - g.dy;
                if (newH >= initialHeight && newH <= fullHeight) animatedHeight.setValue(newH);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy < -50) {
                    Animated.spring(animatedHeight, { toValue: fullHeight, tension: 50, friction: 8, useNativeDriver: false }).start(() => setIsModalFull(true));
                } else {
                    Animated.spring(animatedHeight, { toValue: initialHeight, tension: 50, friction: 8, useNativeDriver: false }).start(() => setIsModalFull(false));
                }
            }
        })
    ).current;

    const openVoucherModal = () => { setIsVoucherModalVisible(true); animatedHeight.setValue(initialHeight); setIsModalFull(false); };
    const closeVoucherModal = () => { setIsVoucherModalVisible(false); setIsModalFull(false); animatedHeight.setValue(initialHeight); };

    // ── Price ──
    const getPrice = () => {
        if (!selectedRentalVehicle || !rentalDurationDays) return null;
        return selectedRentalVehicle.pricePerDay * (parseInt(rentalDurationDays) || 1);
    };
    const finalPrice = getPrice();

    const discountAmount = useMemo(() => {
        if (!appliedPromo || !finalPrice) return 0;
        if (appliedPromo.discountType === 'Percentage') return (finalPrice * appliedPromo.discountValue) / 100;
        return appliedPromo.discountValue;
    }, [appliedPromo, finalPrice]);
    const discountedPrice = Math.max(0, (finalPrice || 0) - discountAmount);
    const downPaymentAmount = Math.round(discountedPrice * (downPaymentPct / 100));

    // ── Handlers ──
    const handleVehicleSelect = (vt) => setSelectedRentalVehicle(vt);

    const fetchMyVouchers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/promotions/mine`, { headers: { Authorization: `Bearer ${userToken}` } });
            setMyVouchers(res.data || []);
        } catch (err) { console.error('Failed to fetch vouchers', err); }
    };

    useEffect(() => { if (step === 4) fetchMyVouchers(); }, [step]);

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

    // ── Load payment methods ──
    const loadPaymentMethods = async () => {
        setIsLoadingPaymentMethods(true);
        try {
            const [methodsRes, dpRes] = await Promise.all([
                axios.get(`${API_BASE}/settings/payment-methods`),
                axios.get(`${API_BASE}/settings/rental-downpayment`).catch(() => ({ data: { percent: 50 } }))
            ]);
            // Rentals exclude counter payments (must pay deposit online)
            const methods = (methodsRes.data || []).filter(m => m.type !== 'counter');
            setPaymentMethods(methods);
            if (methods.length > 0) setSelectedPaymentMethod(methods[0]);
            if (dpRes.data?.percent !== undefined) setDownPaymentPct(dpRes.data.percent);
        } catch (err) {
            console.error('Failed to load payment methods', err);
        } finally { setIsLoadingPaymentMethods(false); }
    };

    const handleGoToPayment = () => {
        setStep(3);
        loadPaymentMethods();
    };

    // ── GCash proof pick ──
    const handlePickProofImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Gallery access is required to upload proof.' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setProofImageUri(asset.uri);
            setProofImage(`data:image/jpeg;base64,${asset.base64}`);
        }
    };

    // ── Download QR to gallery ──
    const handleDownloadQR = async (qrUrl) => {
        try {
            if (!qrUrl) return;
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Media library access is required to save the QR.' });
                return;
            }
            Toast.show({ type: 'info', text1: 'Saving QR...', text2: 'Please wait.' });
            const fileName = `sandigan-qr-${Date.now()}.png`;
            const fileUri = FileSystem.documentDirectory + fileName;
            if (qrUrl.startsWith('data:')) {
                const base64Code = qrUrl.replace(/^data:image\/\w+;base64,/, '');
                await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: FileSystem.EncodingType.Base64 });
            } else {
                await FileSystem.downloadAsync(qrUrl, fileUri);
            }
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Toast.show({ type: 'success', text1: '✅ QR Saved!', text2: 'Payment QR has been saved to your gallery.' });
        } catch (err) {
            console.error('Save QR error:', err);
            Toast.show({ type: 'error', text1: 'Save Failed', text2: 'Could not save the QR code.' });
        }
    };

    // ── Submit ──
    const handleSubmit = () => {
        if (!selectedRentalVehicle || !rentalStartDate || !rentalDurationDays || !destination || !address) {
            Toast.show({ type: 'error', text1: 'Incomplete', text2: 'Please fill in all fields including your address.' });
            return;
        }
        setAlertData({
            visible: true,
            title: 'Confirm Rental?',
            message: `Request a ${selectedRentalVehicle.vehicleName} for ${rentalDurationDays} day${rentalDurationDays > 1 ? 's' : ''} starting ${rentalStartDate}?`,
            type: 'confirm',
            onConfirm: handleConfirmedSubmit
        });
    };

    const handleConfirmedSubmit = async () => {
        const start = new Date(rentalStartDate);
        const returnDateObj = new Date(start);
        returnDateObj.setDate(returnDateObj.getDate() + parseInt(rentalDurationDays));
        const returnDate = returnDateObj.toISOString().split('T')[0];

        const isCounter = selectedPaymentMethod?.type === 'counter';
        const paymentPayload = selectedPaymentMethod ? {
            method: selectedPaymentMethod.label,
            status: isCounter ? 'Unpaid' : 'Pending Verification',
            referenceNumber: referenceNumber.trim() || null,
            proofImageBase64: proofImage || null,
            amountPaid: downPaymentAmount,
        } : null;

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
                notes: 'Mobile App booking',
                requirementsAcknowledged: true,
                downPaymentAmount,
                downPaymentPercent: downPaymentPct,
                payment: paymentPayload,
            }, { headers: { Authorization: `Bearer ${userToken}` } });

            const newRental = res.data?.rental;
            if (newRental) newRental.type = 'rental';
            Toast.show({ type: 'success', text1: '🎉 Rental Submitted!', text2: 'We\'ll confirm your reservation shortly.' });
            setSuccessModalData(newRental);
            setStep(1);
            setSelectedRentalVehicle(null);
            setRentalStartDate('');
            setRentalDurationDays('1');
            setDestination('');
            setAppliedPromo(null);
            setTermsAccepted(false);
            setReqAck(false);
            setDepositAck(false);
            setProofImage(null);
            setProofImageUri(null);
            setReferenceNumber('');
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Booking Failed', text2: err.response?.data?.error || 'Please try again.' });
        } finally { setIsSubmitting(false); }
    };

    if (isLoadingData) {
        return (
            <View style={[styles.container, { paddingTop: 46 }]}>
                <Skeleton width={50} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 16 }} />
                <Skeleton width={180} height={28} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                <Skeleton width={240} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 30 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 4 }}>
                    {[1,2,3,4].map(k => (
                        <View key={k} style={{ alignItems: 'center', flex: 1 }}>
                            <Skeleton width={32} height={32} borderRadius={16} isDarkMode={isDarkMode} style={{ marginBottom: 4 }} />
                            <Skeleton width={60} height={10} isDarkMode={isDarkMode} />
                        </View>
                    ))}
                </View>
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
                    {['Details', 'Terms', 'Payment', 'Confirm'].map((label, idx) => {
                        const sNum = idx + 1;
                        const isActive = step === sNum;
                        const isDone = step > sNum;
                        return (
                            <View key={label} style={styles.stepItem}>
                                <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isDone && styles.stepCircleDone]}>
                                    <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>{isDone ? '✓' : sNum}</Text>
                                </View>
                                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* ── STEP 1: Vehicle Details ── */}
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
                                        {/* Vehicle Image */}
                                        {vt.vehicleImage ? (
                                            <Image source={{ uri: vt.vehicleImage }} style={styles.vehicleImage} resizeMode="cover" />
                                        ) : (
                                            <View style={[styles.vehicleImagePlaceholder, { backgroundColor: COLORS.primary + '15' }]}>
                                                <Text style={{ fontSize: 32 }}>🚗</Text>
                                            </View>
                                        )}
                                        <View style={{ flex: 1, paddingLeft: 14 }}>
                                            <Text style={[styles.vehicleName, selectedRentalVehicle?._id === vt._id && { color: COLORS.primary }]}>
                                                {vt.vehicleName}
                                            </Text>
                                            <Text style={styles.vehicleDesc}>{vt.seats}-Seater | {vt.transmission}</Text>
                                            {vt.brand && <Text style={styles.vehicleDesc}>{vt.brand} · {vt.year || ''}</Text>}
                                            <Text style={styles.vehiclePrice}>₱{vt.pricePerDay?.toLocaleString()} / day</Text>
                                            {selectedRentalVehicle?._id === vt._id && (
                                                <View style={[styles.selectedBadge, { backgroundColor: COLORS.primary }]}>
                                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>✓ SELECTED</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {selectedRentalVehicle && (
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Pick-up Date</Text>
                                <TouchableOpacity style={[styles.inputField, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
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
                                <TextInput style={styles.inputField} placeholder="1" keyboardType="numeric" placeholderTextColor={COLORS.textMuted} value={rentalDurationDays} onChangeText={setRentalDurationDays} />

                                <Text style={styles.inputLabel}>Destination</Text>
                                <TextInput style={styles.inputField} placeholder="e.g. Tagaytay City, Metro Manila" placeholderTextColor={COLORS.textMuted} value={destination} onChangeText={setDestination} />

                                <Text style={styles.inputLabel}>Your Address</Text>
                                <TextInput style={styles.inputField} placeholder="e.g. 123 Rizal St., Quezon City" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />
                            </View>
                        )}

                        {selectedRentalVehicle && rentalDurationDays && rentalStartDate && destination && address && (
                            <View style={styles.pricePreview}>
                                <Text style={styles.pricePreviewLabel}>Estimated Total</Text>
                                <Text style={styles.pricePreviewValue}>{finalPrice !== null ? `₱${finalPrice.toLocaleString()}` : 'Contact for price'}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.nextButton, (!selectedRentalVehicle || !rentalDurationDays || !rentalStartDate || !destination || !address) && styles.nextButtonDisabled]}
                            onPress={() => {
                                if (selectedRentalVehicle && rentalStartDate && rentalDurationDays && destination && address) setStep(2);
                            }}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 2: Requirements & Terms ── */}
                {step === 2 && (
                    <View style={styles.stepContent}>
                        {/* Requirements Card */}
                        <View style={styles.reqCard}>
                            <Text style={styles.reqTitle}>📋 Rental Requirements</Text>
                            <Text style={styles.reqSubtitle}>Please bring the original and photocopies of the following documents upon vehicle pick-up:</Text>
                            {[
                                'Valid Professional Driver\'s License',
                                '1 Additional Valid Government ID',
                                'Latest Proof of Billing (Must match ID address)',
                                'Security Deposit (₱5,000 - Refundable)'
                            ].map((req, i) => (
                                <View key={i} style={styles.reqItem}>
                                    <Text style={styles.reqCheck}>✓</Text>
                                    <Text style={styles.reqText}>{req}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Agreement Checkboxes */}
                        <View style={[styles.agreementCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                            <Text style={[styles.agreementTitle, { color: COLORS.text }]}>✅ Acknowledgments</Text>

                            {/* Terms & Conditions */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => {
                                if (termsAccepted) { setTermsAccepted(false); }
                                else { setShowTermsModal(true); }
                            }}>
                                <View style={[styles.checkboxSquare, termsAccepted && styles.checkboxSquareSelected]}>
                                    {termsAccepted && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>
                                    I have read and agree to the{' '}
                                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Terms & Conditions</Text>
                                </Text>
                            </TouchableOpacity>

                            {/* Requirements Ack */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => setReqAck(!reqAck)}>
                                <View style={[styles.checkboxSquare, reqAck && styles.checkboxSquareSelected]}>
                                    {reqAck && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>I understand and will present all required documents upon vehicle pick-up.</Text>
                            </TouchableOpacity>

                            {/* Deposit Ack */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => setDepositAck(!depositAck)}>
                                <View style={[styles.checkboxSquare, depositAck && styles.checkboxSquareSelected]}>
                                    {depositAck && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>I acknowledge that the security deposit of ₱5,000 is refundable upon safe return of the vehicle.</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextButton, { flex: 1 }, (!termsAccepted || !reqAck || !depositAck) && styles.nextButtonDisabled]}
                                onPress={() => { if (termsAccepted && reqAck && depositAck) handleGoToPayment(); }}
                            >
                                <Text style={styles.nextButtonText}>Continue →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 3: Payment Method ── */}
                {step === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Select Payment Method</Text>
                        <View style={[styles.infoCard, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30' }]}>
                            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                                💡 Down Payment Required: {downPaymentPct}% (₱{downPaymentAmount.toLocaleString()})
                            </Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                                A {downPaymentPct}% down payment is required to confirm your reservation. The remaining balance is due upon pick-up.
                            </Text>
                        </View>

                        {isLoadingPaymentMethods ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator color={COLORS.primary} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Loading payment options...</Text>
                            </View>
                        ) : paymentMethods.length === 0 ? (
                            <View style={[styles.infoCard, { borderColor: COLORS.border }]}>
                                <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontSize: 14 }}>No online payment methods available. Please contact us to arrange payment.</Text>
                            </View>
                        ) : (
                            paymentMethods.map(method => {
                                const isSelected = selectedPaymentMethod?._id === method._id || selectedPaymentMethod?.label === method.label;
                                return (
                                    <TouchableOpacity
                                        key={method._id || method.label}
                                        style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
                                        onPress={() => setSelectedPaymentMethod(method)}
                                    >
                                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                            {isSelected && <View style={styles.radioInner} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.paymentLabel, isSelected && { color: COLORS.primary }]}>{method.label}</Text>
                                            <Text style={styles.paymentNote}>Send ₱{downPaymentAmount.toLocaleString()} as down payment</Text>
                                        </View>
                                        <Text style={{ fontSize: 20 }}>📱</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        {/* GCash Details */}
                        {selectedPaymentMethod && (
                            <View style={[styles.gcashPanel, { borderColor: COLORS.primary + '40', backgroundColor: COLORS.primary + '08' }]}>
                                <Text style={[styles.gcashTitle, { color: COLORS.text }]}>💙 {selectedPaymentMethod.label} Payment</Text>

                                {/* QR Code */}
                                {(() => {
                                    const qrSrc = selectedPaymentMethod.qrImageBase64 || selectedPaymentMethod.qrImage;
                                    if (!qrSrc) return null;
                                    return (
                                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                            <Image source={{ uri: qrSrc }} style={styles.qrImage} resizeMode="contain" />
                                            <TouchableOpacity style={[styles.downloadQrBtn, { borderColor: COLORS.primary }]} onPress={() => handleDownloadQR(qrSrc)}>
                                                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>⬇ Save QR to Gallery</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })()}

                                {selectedPaymentMethod.accountName && (
                                    <View style={[styles.gcashInfo, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                                        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Account Name</Text>
                                        <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>{selectedPaymentMethod.accountName}</Text>
                                        {selectedPaymentMethod.accountNumber && (
                                            <>
                                                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>Account Number</Text>
                                                <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>{selectedPaymentMethod.accountNumber}</Text>
                                            </>
                                        )}
                                    </View>
                                )}

                                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 8, marginBottom: 12, lineHeight: 18 }}>
                                    Send exactly ₱{downPaymentAmount.toLocaleString()} and screenshot the transaction. Enter the reference number and upload the screenshot below.
                                </Text>

                                <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 6 }]}>Reference Number</Text>
                                <TextInput
                                    style={[styles.modalInput, { backgroundColor: COLORS.cardBackground, color: COLORS.text, marginBottom: 12 }]}
                                    placeholder="e.g. 1234567890"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={referenceNumber}
                                    onChangeText={setReferenceNumber}
                                    keyboardType="numeric"
                                />

                                <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 6 }]}>Upload Payment Screenshot</Text>
                                <TouchableOpacity style={[styles.uploadBtn, { borderColor: COLORS.primary + '60' }]} onPress={handlePickProofImage}>
                                    <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                                        {proofImageUri ? '✓ Screenshot Selected — Tap to Change' : '📎 Choose Screenshot from Gallery'}
                                    </Text>
                                </TouchableOpacity>
                                {proofImageUri && (
                                    <Image source={{ uri: proofImageUri }} style={styles.proofPreview} resizeMode="cover" />
                                )}
                            </View>
                        )}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.nextButton, { flex: 1 }]} onPress={() => setStep(4)}>
                                <Text style={styles.nextButtonText}>Review →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 4: Review & Confirm ── */}
                {step === 4 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review Your Rental</Text>
                        <View style={styles.summaryCard}>
                            <SummaryRow label="Vehicle:" value={selectedRentalVehicle?.vehicleName} />
                            <SummaryRow label="Pick-up Date:" value={rentalStartDate} />
                            <SummaryRow label="Duration:" value={`${rentalDurationDays} day${rentalDurationDays > 1 ? 's' : ''}`} />
                            <SummaryRow label="Destination:" value={destination} />
                            <SummaryRow label="Address:" value={address} />
                            <SummaryRow label="Name:" value={`${userInfo?.firstName} ${userInfo?.lastName}`} />
                            {selectedPaymentMethod && <SummaryRow label="Payment:" value={selectedPaymentMethod.label} />}

                            <View style={styles.summaryDivider} />

                            {/* Voucher */}
                            <View style={styles.promoInputWrapper}>
                                <TouchableOpacity style={[styles.voucherTrigger, appliedPromo && styles.voucherTriggerActive]} onPress={openVoucherModal}>
                                    <Text style={[styles.voucherTriggerLabel, appliedPromo && { color: '#fff' }]}>{appliedPromo ? `🎟️  ${appliedPromo.code}` : 'Select a Discount Voucher'}</Text>
                                    <Text style={[styles.voucherTriggerIcon, appliedPromo && { color: '#fff' }]}>{appliedPromo ? '✓' : '▼'}</Text>
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
                                <Text style={styles.summaryValueTotal}>₱{discountedPrice.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: 6 }]}>
                                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Down Payment Due ({downPaymentPct}%)</Text>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>₱{downPaymentAmount.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { flex: 1 }, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>✓ Confirm Rental</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Voucher Modal ── */}
            <Modal visible={isVoucherModalVisible} animationType="slide" transparent onRequestClose={closeVoucherModal}>
                <Pressable style={styles.modalOverlay} onPress={closeVoucherModal}>
                    <Animated.View style={[styles.modalContent, { height: animatedHeight }]}>
                        <View style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }} {...panResponder.panHandlers}>
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
                                        <TouchableOpacity key={v._id} style={[styles.voucherItem, isDisabled && { opacity: 0.5 }]} disabled={isDisabled} onPress={() => handleApplyPromo(v)} activeOpacity={0.7}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <View style={{ backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                                        <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 11 }}>{v.code}</Text>
                                                    </View>
                                                    {v.isUsed && <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>ALREADY USED</Text>}
                                                    {v.isExpired && <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>EXPIRED</Text>}
                                                    {!v.isUsed && !v.isExpired && !isMinMet && <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '600' }}>Min ₱{v.minSpend} required</Text>}
                                                </View>
                                                <Text style={styles.voucherDesc}>{v.description || v.code}</Text>
                                                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Valid until: {new Date(v.validUntil).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                            </View>
                                            <View style={styles.voucherDiscountBadge}>
                                                <Text style={styles.voucherDiscount}>{v.discountType === 'Percentage' ? `${v.discountValue}%` : `₱${v.discountValue}`}</Text>
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

            {/* ── Rental Terms Modal ── */}
            <RentalTermsModal
                visible={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                onAccept={() => { setTermsAccepted(true); setShowTermsModal(false); }}
            />

            {/* ── Success Modal ── */}
            <BookingDetailModal
                visible={!!successModalData}
                item={successModalData}
                isSuccessAnimation={true}
                onClose={() => { setSuccessModalData(null); navigation.navigate('MainTabs', { screen: 'Bookings' }); }}
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

    stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingHorizontal: 4 },
    stepItem: { alignItems: 'center', flex: 1 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.cardBackground, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    stepCircleActive: { borderColor: COLORS.primary },
    stepCircleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
    stepNumActive: { color: COLORS.text },
    stepLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
    stepLabelActive: { color: COLORS.primary },

    stepContent: { paddingBottom: 8 },
    stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

    // Vehicle Cards with Image
    vehicleGrid: { flexDirection: 'column', gap: 12, marginBottom: 20 },
    vehicleCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '06' },
    vehicleImage: { width: 110, height: 95, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
    vehicleImagePlaceholder: { width: 110, height: 95, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, justifyContent: 'center', alignItems: 'center' },
    vehicleName: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    vehicleDesc: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
    vehiclePrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
    selectedBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },

    // Inputs
    inputSection: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12 },
    inputField: { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.text },

    // Price Preview
    pricePreview: { backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '30', marginTop: 10 },
    pricePreviewLabel: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    pricePreviewValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

    // Requirements
    reqCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
    reqTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
    reqSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },
    reqItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
    reqCheck: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
    reqText: { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1 },

    // Agreements
    agreementCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
    agreementTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
    agreementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    agreementText: { fontSize: 13, flex: 1, lineHeight: 20 },
    checkboxSquare: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    checkboxSquareSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

    // Payment
    paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border },
    paymentCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    radioCircleSelected: { borderColor: COLORS.primary },
    radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },
    paymentLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    paymentNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    gcashPanel: { borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1 },
    gcashTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
    gcashInfo: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
    qrImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 10 },
    downloadQrBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5 },
    uploadBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', marginBottom: 10 },
    proofPreview: { width: '100%', height: 180, borderRadius: 12, marginTop: 8 },
    infoCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },

    // Summary
    summaryCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
    summaryValue: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    summaryLabelTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    summaryValueTotal: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

    // Voucher
    promoInputWrapper: { flexDirection: 'column', gap: 8, marginTop: 4 },
    voucherTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.primary + '40', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
    voucherTriggerActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    voucherTriggerLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    voucherTriggerIcon: { fontSize: 12, color: COLORS.primary },
    removePromoBtn: { alignSelf: 'center', paddingVertical: 4 },
    removePromoBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    voucherItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.background, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
    voucherDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    voucherDiscountBadge: { alignItems: 'center', backgroundColor: '#22c55e15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#22c55e40', minWidth: 56 },
    voucherDiscount: { fontSize: 18, fontWeight: '900', color: '#22c55e' },
    voucherDiscountLabel: { fontSize: 9, fontWeight: '700', color: '#22c55e', letterSpacing: 1 },

    // Buttons
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    nextButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    nextButtonDisabled: { opacity: 0.4 },
    nextButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    backButton: { backgroundColor: COLORS.cardBackground, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    backButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    confirmButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
});

export default RentalScreen;
