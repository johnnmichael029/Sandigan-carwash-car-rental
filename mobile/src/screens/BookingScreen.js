import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import axios from 'axios';
import useSWR from 'swr';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import Toast from 'react-native-toast-message';

const PRICING_URL = `${API_BASE}/pricing`;
const BOOKING_URL = `${API_BASE}/booking`;

const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

const formatTo12Hour = (hourStr) => {
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 && hour !== 24 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // 0, 12, 24 -> 12
    return `${displayHour}:00 ${ampm}`;
};

const fetcher = (url) => axios.get(url).then(r => r.data);

const BookingScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    // ── SWR: Pricing (vehicle types & services) ── cached 60s
    const { data: pricingData, mutate: mutatePricing } = useSWR(
        PRICING_URL,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    // ── SWR: Availability ── revalidates every 30s (slots fill fast)
    const { data: availability = {}, mutate: mutateAvail } = useSWR(
        `${BOOKING_URL}/availability`,
        fetcher,
        { revalidateOnFocus: true, refreshInterval: 30000 }
    );

    const rawPricing = pricingData?.dynamicPricing || [];
    const vehicleTypes = rawPricing.map(p => ({ _id: p._id, name: p.vehicleType }));
    const isLoadingData = !pricingData;
    const [refreshing, setRefreshing] = useState(false);

    // ── Socket: live pricing updates (same as web portal) ──
    useEffect(() => {
        const socketBase = API_BASE.replace('/api', '');
        const socket = io(socketBase);
        socket.on('pricing_updated', () => {
            mutatePricing();
            mutateAvail();
        });
        return () => socket.disconnect();
    }, [mutatePricing, mutateAvail]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([mutatePricing(), mutateAvail()]);
        setRefreshing(false);
    };

    // ── Form state ──
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [step, setStep] = useState(1); // 1=Vehicle, 2=Service, 3=Time, 4=Confirm
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Future Time Slots Calculation ──
    const availableFutureHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;

        return allHours.filter(hour => {
            const hourInt = parseInt(hour);
            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;
            // ONLY keep the hour if it's in the future AND not full
            return hourInt > currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            const hourKey = hour.toString().padStart(2, '0');
            const bookedCount = availability[hourKey] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            const slotText = slotsLeft <= 3 ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : '';

            return {
                raw: hour, // Sent to backend
                label: `${formatTo12Hour(hour)}${slotText}` // Shown in UI
            };
        });
    }, [availability]);


    // ── Derived: Price for selected combo ──
    const getPrice = () => {
        if (selectedServices.length === 0 || !selectedVehicle) return null;

        const vehicleConfig = rawPricing.find(p => p.vehicleType.toLowerCase() === selectedVehicle.name.toLowerCase());
        if (!vehicleConfig) return 0;

        let total = 0;
        selectedServices.forEach(name => {
            const mainSvc = vehicleConfig.services?.find(s => s.name === name);
            if (mainSvc) total += mainSvc.price;
        });

        selectedAddons.forEach(name => {
            const addonSvc = vehicleConfig.addons?.find(a => a.name === name);
            if (addonSvc) total += addonSvc.price;
        });

        return total;
    };

    const finalPrice = getPrice();

    const handleVehicleSelect = (vt) => {
        if (selectedVehicle?._id !== vt._id) {
            setSelectedServices([]);
            setSelectedAddons([]);
        }
        setSelectedVehicle(vt);
    };

    const toggleService = (svc) => {
        if (selectedServices.includes(svc.name)) {
            setSelectedServices(prev => prev.filter(name => name !== svc.name));
        } else {
            setSelectedServices(prev => [...prev, svc.name]);
        }
    };

    const toggleAddon = (addon) => {
        if (selectedAddons.includes(addon.name)) {
            setSelectedAddons(prev => prev.filter(name => name !== addon.name));
        } else {
            setSelectedAddons(prev => [...prev, addon.name]);
        }
    };

    // ── Submit booking ──
    const handleSubmit = async () => {
        if (selectedServices.length === 0 || !selectedVehicle || !selectedTime) {
            Toast.show({ type: 'error', text1: 'Incomplete booking', text2: 'Please fill in all fields.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.post(BOOKING_URL, {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                emailAddress: userInfo.email,
                phoneNumber: userInfo.phone || '00000000000',
                serviceType: [...selectedServices, ...selectedAddons],
                vehicleType: selectedVehicle.name,
                bookingTime: selectedTime,
                totalPrice: finalPrice || 0,
                status: 'Pending',
                source: 'Mobile App',
                isRental: false
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            Toast.show({ type: 'success', text1: '🎉 Booking Submitted!', text2: 'We\'ll confirm your slot shortly.' });
            // Reset form
            setStep(1);
            setSelectedServices([]);
            setSelectedAddons([]);
            setSelectedVehicle(null);
            setSelectedTime('');
            navigation.navigate('MainTabs', { screen: 'Bookings' });
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Booking Failed', text2: err.response?.data?.error || 'Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.mutedText, { marginTop: 12 }]}>Loading configuration...</Text>
            </View>
        );
    }

    const vehicleConfig = selectedVehicle ? rawPricing.find(p => p.vehicleType.toLowerCase() === selectedVehicle.name.toLowerCase()) : null;

    const mainServices = vehicleConfig?.services?.map(s => ({
        _id: s.name,
        name: s.name,
        price: s.price,
        description: `Professional ${s.name} service`
    })) || [];

    const addOnServices = vehicleConfig?.addons?.map(a => ({
        _id: a.name,
        name: a.name,
        price: a.price,
        description: `Add-on: ${a.name}`
    })) || [];

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            {/* ── Header ── */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Book a Wash</Text>
                <Text style={styles.pageSubtitle}>Choose your vehicle and service details</Text>
            </View>

            {/* ── Step Indicator ── */}
            <View style={styles.stepBar}>
                {['Vehicle', 'Services', 'Schedule', 'Confirm'].map((label, idx) => {
                    const sNum = idx + 1;
                    const isActive = step === sNum;
                    const isDone = step > sNum;
                    return (
                        <View key={label} style={styles.stepItem}>
                            <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isDone && styles.stepCircleDone]}>
                                <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>
                                    {isDone ? '✓' : <Text style={{ color: COLORS.primary }}>{sNum}</Text>}
                                </Text>
                            </View>
                            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
                        </View>
                    );
                })}
            </View>

            {/* ── STEP 1: Vehicle Type ── */}
            {step === 1 && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Select Your Vehicle</Text>
                    {vehicleTypes.length === 0 ? (
                        <Text style={styles.mutedText}>No vehicle configurations available.</Text>
                    ) : (
                        <View style={styles.vehicleGrid}>
                            {vehicleTypes.map(vt => (
                                <TouchableOpacity
                                    key={vt._id}
                                    style={[styles.vehicleCard, selectedVehicle?._id === vt._id && styles.vehicleCardSelected]}
                                    onPress={() => handleVehicleSelect(vt)}
                                >
                                    <Text style={[styles.vehicleName, selectedVehicle?._id === vt._id && { color: COLORS.primary }]}>
                                        {vt.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.nextButton, !selectedVehicle && styles.nextButtonDisabled]}
                        onPress={() => selectedVehicle && setStep(2)}
                    >
                        <Text style={styles.nextButtonText}>Continue →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── STEP 2: Service Selection ── */}
            {step === 2 && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Select a Service</Text>
                    {mainServices.length === 0 ? (
                        <Text style={styles.mutedText}>No services available for this vehicle. Please go back and select another one.</Text>
                    ) : (
                        mainServices.map(svc => {
                            const isSelected = selectedServices.includes(svc.name);
                            return (
                                <TouchableOpacity
                                    key={svc._id}
                                    style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                                    onPress={() => toggleService(svc)}
                                >
                                    <View style={styles.serviceCardContent}>
                                        <Text style={[styles.serviceCardName, isSelected && { color: COLORS.primary }]}>
                                            {svc.name}
                                        </Text>
                                        <Text style={styles.serviceCardDesc}>{svc.description}</Text>
                                    </View>
                                    <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                                        {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {addOnServices.length > 0 && (
                        <>
                            <Text style={[styles.stepTitle, { marginTop: 20 }]}>Select Add-ons (Opt)</Text>
                            {addOnServices.map(addon => {
                                const isSelected = selectedAddons.includes(addon.name);
                                return (
                                    <TouchableOpacity
                                        key={addon._id}
                                        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                                        onPress={() => toggleAddon(addon)}
                                    >
                                        <View style={styles.serviceCardContent}>
                                            <Text style={[styles.serviceCardName, isSelected && { color: COLORS.primary }]}>
                                                {addon.name}
                                            </Text>
                                            <Text style={styles.serviceCardDesc}>{addon.description}</Text>
                                        </View>
                                        <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                                            {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </>
                    )}

                    {selectedServices.length > 0 && (
                        <View style={styles.pricePreview}>
                            <Text style={styles.pricePreviewLabel}>Estimated Price</Text>
                            <Text style={styles.pricePreviewValue}>
                                {finalPrice !== null ? `₱${finalPrice.toLocaleString()}` : 'Contact for price'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.nextButton, { flex: 1 }, selectedServices.length === 0 && styles.nextButtonDisabled]}
                            onPress={() => selectedServices.length > 0 && setStep(3)}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── STEP 3: Time Selection ── */}
            {step === 3 && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Pick a Time Slot</Text>
                    {availableFutureHours.length === 0 ? (
                        <Text style={styles.mutedText}>No slots available for the rest of today. Please try again tomorrow!</Text>
                    ) : (
                        <View style={styles.timeGrid}>
                            {availableFutureHours.map(slot => (
                                <TouchableOpacity
                                    key={slot.raw}
                                    style={[styles.timeChip, selectedTime === slot.raw && styles.timeChipSelected]}
                                    onPress={() => setSelectedTime(slot.raw)}
                                >
                                    <Text style={[styles.timeChipText, selectedTime === slot.raw && styles.timeChipTextSelected]}>{slot.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.nextButton, { flex: 1 }, (!selectedTime) && styles.nextButtonDisabled]}
                            onPress={() => selectedTime && setStep(4)}
                        >
                            <Text style={styles.nextButtonText}>Review →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── STEP 4: Review & Confirm ── */}
            {step === 4 && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Review Your Booking</Text>
                    <View style={styles.summaryCard}>
                        <SummaryRow label="Vehicle:" value={selectedVehicle?.name} />
                        <SummaryRow label="Services:" value={[...selectedServices, ...selectedAddons].join(', ')} />
                        <SummaryRow label="Date:" value={new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
                        {selectedTime && (
                            <SummaryRow label="Time:" value={formatTo12Hour(selectedTime)} />
                        )}
                        <SummaryRow label="Name:" value={`${userInfo?.firstName} ${userInfo?.lastName}`} />
                        <SummaryRow label="Email:" value={userInfo?.email} />
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRowTotal}>
                            <Text style={styles.summaryLabelTotal}>Total Estimate</Text>
                            <Text style={styles.summaryValueTotal}>
                                {finalPrice !== null ? `₱${finalPrice.toLocaleString()}` : 'TBD'}
                            </Text>
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
                            {isSubmitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.confirmButtonText}>✓ Confirm Booking</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={{ height: 32 }} />
        </ScrollView>
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
    pageHeader: { marginTop: 56, marginBottom: 20 },
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
    stepNumActive: { color: '#fff' },
    stepLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
    stepLabelActive: { color: COLORS.primary },

    stepContent: { paddingBottom: 8 },
    stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

    // Service Cards
    serviceCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
    serviceCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    serviceCardContent: { flex: 1 },
    serviceCardName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    serviceCardDesc: { fontSize: 12, color: COLORS.textMuted },
    checkboxSquare: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    checkboxSquareSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

    // Vehicle Grid
    vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    vehicleCard: { paddingVertical: 10, paddingHorizontal: 15, width: '30%', borderRadius: 10, backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border },
    vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    vehicleEmoji: { fontSize: 28, marginBottom: 8 },
    vehicleName: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

    // Price Preview
    pricePreview: { backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '30', marginTop: 10 },
    pricePreviewLabel: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    pricePreviewValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

    // Time slots
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    timeChip: { paddingVertical: 10, paddingHorizontal: 15, width: '48%', borderRadius: 10, backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border },
    timeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    timeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
    timeChipTextSelected: { color: '#fff' },

    // Summary Card
    summaryCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabelTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    summaryValueTotal: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

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

export default BookingScreen;
