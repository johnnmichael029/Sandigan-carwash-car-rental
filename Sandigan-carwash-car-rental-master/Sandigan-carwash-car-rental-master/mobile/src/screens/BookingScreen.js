import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Modal, Pressable, Animated, PanResponder, Dimensions, DeviceEventEmitter, Image
} from 'react-native';
import axios from 'axios';
import useSWR from 'swr';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE } from '../api/config';
import Toast from 'react-native-toast-message';
import Skeleton from '../components/Skeleton';
import * as Location from 'expo-location';
import { TextInput } from 'react-native';
import BookingDetailModal from '../components/BookingDetailModal';
import CustomAlertModal from '../components/CustomAlertModal';

const inStoreIcon = require('../../assets/icon/store.png');
const homeServiceIcon = require('../../assets/icon/house.png');
const mapPinIcon = require('../../assets/icon/map-pin.png');

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

import { useFocusEffect } from '@react-navigation/native';

const BookingScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    // ── SWR: Pricing (vehicle types & services) ── cached 60s
    const { data: pricingData, mutate: mutatePricing } = useSWR(
        PRICING_URL,
        fetcher,
        { revalidateOnFocus: true, dedupingInterval: 60000 }
    );

    // ── SWR: Availability ── revalidates every 30s (slots fill fast)
    const { data: availability = {}, mutate: mutateAvail } = useSWR(
        `${BOOKING_URL}/availability`,
        fetcher,
        { revalidateOnFocus: true, refreshInterval: 30000 }
    );

    // ── Form state ──
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [serviceLocationType, setServiceLocationType] = useState('In-Store');
    const [homeAddress, setHomeAddress] = useState('');
    const [homeCoords, setHomeCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [step, setStep] = useState(1); // 1=Loc, 2=Vehicle, 3=Service, 4=Time, 5=Confirm
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModalData, setSuccessModalData] = useState(null);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    // ── Voucher State ──
    const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountValue, discountType }
    const [myVouchers, setMyVouchers] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isModalFull, setIsModalFull] = useState(false);

    // ── Reset Form & Refresh Data on Focus ──
    useFocusEffect(
        React.useCallback(() => {
            // Refresh data
            mutatePricing();
            mutateAvail();

            // Reset form state for a fresh start
            setStep(1);
            setServiceLocationType('In-Store');
            setHomeAddress('');
            setHomeCoords(null);
            setSelectedServices([]);
            setSelectedAddons([]);
            setSelectedVehicle(null);
            setSelectedTime('');
            setAppliedPromo(null);

            return () => { };
        }, [mutatePricing, mutateAvail])
    );


    const rawPricing = pricingData?.dynamicPricing || [];
    const vehicleTypes = rawPricing.map(p => ({ _id: p._id, name: p.vehicleType }));
    const isLoadingData = !pricingData;


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

    // ── Animated Bottom Sheet Logic ──
    const screenHeight = Dimensions.get('window').height;
    const initialHeight = 450;
    const fullHeight = screenHeight * 0.9;
    const animatedHeight = useRef(new Animated.Value(initialHeight)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                // Only allow sliding UP (negative dy)
                const newHeight = initialHeight - gestureState.dy;
                if (newHeight >= initialHeight && newHeight <= fullHeight) {
                    animatedHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    // Slide UP to full
                    Animated.spring(animatedHeight, {
                        toValue: fullHeight,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: false
                    }).start(() => setIsModalFull(true));
                } else {
                    // Snap BACK to initial
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

    // ── Future Time Slots Calculation ──
    const availableFutureHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;
        const isHome = serviceLocationType === 'Home Service';

        let slots = allHours.filter(hour => {
            const hourInt = parseInt(hour);
            if (isHome) return hourInt > currentHour;

            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;
            // ONLY keep the hour if it's in the future (or current hour) AND not full
            return hourInt > currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            const hourKey = hour.toString().padStart(2, '0');
            const bookedCount = availability[hourKey] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            const slotText = (!isHome && slotsLeft <= 3) ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : '';

            return {
                raw: hour, // Sent to backend
                label: `${formatTo12Hour(hour)}${slotText}` // Shown in UI
            };
        });

        if (isHome) {
            slots.unshift({ raw: 'ASAP', label: 'Now / ASAP' });
        }

        return slots;
    }, [availability, serviceLocationType]);


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
        if (step === 5) fetchMyVouchers();
    }, [step]);

    const handleApplyPromo = async (promoData) => {
        if (!promoData) return;

        // Check min spend locally first for better UX
        if (finalPrice < promoData.minSpend) {
            Toast.show({ type: 'error', text1: 'Min Spend Not Met', text2: `This voucher requires a minimum spend of ₱${promoData.minSpend}` });
            return;
        }

        setAppliedPromo(promoData);
        closeVoucherModal();
        Toast.show({ type: 'success', text1: 'Promo Applied!', text2: `Discount of ${promoData.discountType === 'Percentage' ? promoData.discountValue + '%' : '₱' + promoData.discountValue} applied.` });
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

    const handleSubmit = () => {
        if (selectedServices.length === 0 || !selectedVehicle || !selectedTime) {
            Toast.show({ type: 'error', text1: 'Incomplete booking', text2: 'Please fill in all fields.' });
            return;
        }

        setAlertData({
            visible: true,
            title: 'Confirm Booking?',
            message: `Are you sure you want to book this ${selectedVehicle.name} wash for ${selectedTime === 'ASAP' ? 'ASAP' : formatTo12Hour(selectedTime)}?`,
            type: 'confirm',
            onConfirm: handleConfirmedSubmit
        });
    };

    const handleConfirmedSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await axios.post(BOOKING_URL, {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                emailAddress: userInfo.email,
                phoneNumber: userInfo.phone || '00000000000',
                serviceType: [...selectedServices, ...selectedAddons],
                vehicleType: selectedVehicle.name,
                bookingTime: selectedTime,
                totalPrice: discountedPrice || 0,
                promoCode: appliedPromo?.code || null,
                promoDiscount: discountAmount || 0,
                status: 'Pending',
                source: 'Mobile App',
                isRental: false,
                serviceLocationType,
                homeServiceDetails: serviceLocationType === 'Home Service' ? {
                    address: homeAddress,
                    latitude: homeCoords?.latitude || null,
                    longitude: homeCoords?.longitude || null
                } : {}
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            const newBooking = res.data;

            if (newBooking) {
                newBooking.type = 'wash';
            }

            Toast.show({ type: 'success', text1: '🎉 Booking Submitted!', text2: 'We\'ll confirm your slot shortly.' });

            // Set data to open modal in place
            setSuccessModalData(newBooking);

            // Reset form behind the modal
            setStep(1);
            setServiceLocationType('In-Store');
            setHomeAddress('');
            setHomeCoords(null);
            setSelectedServices([]);
            setSelectedAddons([]);
            setSelectedVehicle(null);
            setSelectedTime('');
            setAppliedPromo(null);
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Booking Failed', text2: err.response?.data?.error || 'Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return (
            <View style={[styles.container, { paddingTop: 56 }]}>
                <Skeleton width={180} height={28} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                <Skeleton width={240} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 30 }} />

                {/* Steps Skeleton */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                    {[1, 2, 3, 4, 5].map(k => (
                        <View key={k} style={{ alignItems: 'center' }}>
                            <Skeleton width={32} height={32} borderRadius={16} isDarkMode={isDarkMode} style={{ marginBottom: 4 }} />
                            <Skeleton width={50} height={10} isDarkMode={isDarkMode} />
                        </View>
                    ))}
                </View>

                {/* Cards Skeleton */}
                <Text style={[styles.stepTitle, { marginBottom: 16 }]}>Select Your Vehicle</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                </View>
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
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                onScrollBeginDrag={() => DeviceEventEmitter.emit('toggleTabBar', true)}
                onScrollEndDrag={() => DeviceEventEmitter.emit('toggleTabBar', false)}
                onMomentumScrollBegin={() => DeviceEventEmitter.emit('toggleTabBar', true)}
                onMomentumScrollEnd={() => DeviceEventEmitter.emit('toggleTabBar', false)}
            >
                {/* ── Header ── */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Book a Wash</Text>
                    <Text style={styles.pageSubtitle}>Choose your vehicle and service details</Text>
                </View>

                {/* ── Step Indicator ── */}
                <View style={styles.stepBar}>
                    {['Location', 'Vehicle', 'Services', 'Schedule', 'Confirm'].map((label, idx) => {
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

                {/* ── STEP 1: Service Location ── */}
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Where do you want the service?</Text>

                        <TouchableOpacity
                            style={[styles.vehicleCard, { width: '100%', marginBottom: 16, flexDirection: 'row', alignItems: 'center' }, serviceLocationType === 'In-Store' && styles.vehicleCardSelected]}
                            onPress={() => setServiceLocationType('In-Store')}
                        >
                            <Image source={inStoreIcon} style={styles.actionIcon} />
                            <View>
                                <Text style={[styles.vehicleName, { textAlign: 'left', fontSize: 16 }, serviceLocationType === 'In-Store' && { color: COLORS.primary }]}>In-Store (Sandigan Carwash)</Text>
                                <Text style={styles.mutedText}>Visit our physical shop for your service.</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.vehicleCard, { width: '100%', marginBottom: 16, flexDirection: 'row', alignItems: 'center' }, serviceLocationType === 'Home Service' && styles.vehicleCardSelected]}
                            onPress={() => setServiceLocationType('Home Service')}
                        >
                            <Image source={homeServiceIcon} style={styles.actionIcon} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.vehicleName, { textAlign: 'left', fontSize: 16 }, serviceLocationType === 'Home Service' && { color: COLORS.primary }]}>Home Service</Text>
                                <Text style={styles.mutedText}>We come directly to your location!</Text>
                            </View>
                        </TouchableOpacity>

                        {serviceLocationType === 'Home Service' && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 8, marginTop: 10 }]}>Your Detailed Address</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput
                                        style={[styles.modalInput, { flex: 1, backgroundColor: COLORS.cardBackground, color: COLORS.text }]}
                                        placeholder="e.g. 123 Main St, Manila"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={homeAddress}
                                        onChangeText={setHomeAddress}
                                    />
                                    <TouchableOpacity
                                        style={{ justifyContent: 'center', alignItems: 'center' }}
                                        onPress={async () => {
                                            setIsLocating(true);
                                            try {
                                                const { status } = await Location.requestForegroundPermissionsAsync();
                                                if (status !== 'granted') {
                                                    Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required.' });
                                                    setIsLocating(false);
                                                    return;
                                                }
                                                const location = await Location.getCurrentPositionAsync({});
                                                setHomeCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });

                                                const geocode = await Location.reverseGeocodeAsync({
                                                    latitude: location.coords.latitude,
                                                    longitude: location.coords.longitude
                                                });
                                                if (geocode.length > 0) {
                                                    const place = geocode[0];
                                                    const addressString = `${place.streetNumber || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''}`.trim();
                                                    setHomeAddress(addressString);
                                                }
                                                Toast.show({ type: 'success', text1: 'Location Found!' });
                                            } catch (err) {
                                                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch location.' });
                                            } finally {
                                                setIsLocating(false);
                                            }
                                        }}
                                        disabled={isLocating}
                                    >
                                        {isLocating ? <ActivityIndicator color={COLORS.text} size="small" /> : <Image source={mapPinIcon} style={styles.mapPinAction} />}
                                    </TouchableOpacity>

                                </View>
                                <Text style={{ color: COLORS.textMuted, marginTop: 5, fontSize: 12 }}>Tip: Use the map pin button to automatically fill in your current address.</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.nextButton, (serviceLocationType === 'Home Service' && !homeAddress.trim()) && styles.nextButtonDisabled]}
                            onPress={() => {
                                if (serviceLocationType === 'Home Service' && !homeAddress.trim()) return;
                                setStep(2);
                            }}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 2: Vehicle Type ── */}
                {step === 2 && (
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
                            onPress={() => selectedVehicle && setStep(3)}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.backButton, { marginTop: 10 }]} onPress={() => setStep(1)}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 3: Service Selection ── */}
                {step === 3 && (
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
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextButton, { flex: 1 }, selectedServices.length === 0 && styles.nextButtonDisabled]}
                                onPress={() => selectedServices.length > 0 && setStep(4)}
                            >
                                <Text style={styles.nextButtonText}>Continue →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 4: Time Selection ── */}
                {step === 4 && (
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
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextButton, { flex: 1 }, (!selectedTime) && styles.nextButtonDisabled]}
                                onPress={() => selectedTime && setStep(5)}
                            >
                                <Text style={styles.nextButtonText}>Review →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 5: Review & Confirm ── */}
                {step === 5 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review Your Booking</Text>
                        <View style={styles.summaryCard}>
                            <SummaryRow label="Vehicle:" value={selectedVehicle?.name} />
                            <SummaryRow label="Services:" value={[...selectedServices, ...selectedAddons].join(', ')} />
                            <SummaryRow label="Date:" value={new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
                            <SummaryRow label="Time:" value={selectedTime ? (selectedTime === 'ASAP' ? 'As soon as possible' : formatTo12Hour(selectedTime)) : ''} />
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
                                <Text style={styles.summaryLabelTotal}>Total Estimate</Text>
                                <Text style={styles.summaryValueTotal}>
                                    {discountedPrice !== null ? `₱${discountedPrice.toLocaleString()}` : 'TBD'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(4)}>
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

            {/* ── Voucher Selection Modal ── */}
            <Modal visible={isVoucherModalVisible} animationType="slide" transparent={true} onRequestClose={closeVoucherModal}>
                <Pressable style={styles.modalOverlay} onPress={closeVoucherModal}>
                    <Animated.View
                        style={[styles.modalContent, { height: animatedHeight }]}
                        onPress={() => { }}
                    >
                        <View
                            style={{ paddingVertical: 12, width: '100%', alignItems: 'center', cursor: 'pointer' }}
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
    stepNumActive: { color: COLORS.text },
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
    summaryValueTotal: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

    // Summary Label Total
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabelTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },

    // Promo & Voucher Styles
    promoInputWrapper: {
        flexDirection: 'column',
        gap: 8,
        marginTop: 4,
    },
    voucherTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: COLORS.primary + '40',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    voucherTriggerActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    voucherTriggerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    voucherTriggerIcon: {
        fontSize: 12,
        color: COLORS.primary,
    },
    removePromoBtn: {
        alignSelf: 'center',
        paddingVertical: 4,
    },
    removePromoBtnText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '700',
    },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    voucherItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    voucherCode: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
    voucherDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
    voucherMinSpend: { fontSize: 11, color: COLORS.textMuted },
    voucherDiscountBadge: { alignItems: 'center', backgroundColor: '#22c55e15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#22c55e40', minWidth: 56 },
    voucherDiscount: { fontSize: 18, fontWeight: '900', color: '#22c55e' },
    voucherDiscountLabel: { fontSize: 9, fontWeight: '700', color: '#22c55e', letterSpacing: 1 },

    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '700',
    },


    // Buttons
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    nextButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    nextButtonDisabled: { opacity: 0.4 },
    nextButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    backButton: { backgroundColor: COLORS.cardBackground, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    backButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    confirmButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15 },
    inputLabel: { fontSize: 12, fontWeight: '700' },
    actionIcon: {
        width: 16,
        height: 16,
        resizeMode: 'contain',
        marginRight: 12,
        tintColor: COLORS.text,
    },
    mapPinAction: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: COLORS.text,
    }
});

export default BookingScreen;
