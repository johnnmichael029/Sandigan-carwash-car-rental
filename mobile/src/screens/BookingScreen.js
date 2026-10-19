import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Modal, Pressable, Animated, PanResponder,
    Dimensions, DeviceEventEmitter, Image, TextInput, Alert
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
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import BookingDetailModal from '../components/BookingDetailModal';
import CustomAlertModal from '../components/CustomAlertModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { GCASH_QR_FALLBACK_BASE64 } from '../constants/fallbackQr';
import { useFocusEffect } from '@react-navigation/native';

const inStoreIcon = require('../../assets/icon/store.png');
const homeServiceIcon = require('../../assets/icon/house.png');
const mapPinIcon = require('../../assets/icon/map-pin.png');

const PRICING_URL = `${API_BASE}/pricing`;
const BOOKING_URL = `${API_BASE}/booking`;
const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

// ── Brand Grouping (mirrors website vehicleGrouping.js) ───────────────────────
const BRAND_MAP = {
    'Fortuner': { brand: 'Toyota', fullName: 'Toyota Fortuner' },
    'Innova': { brand: 'Toyota', fullName: 'Toyota Innova' },
    'Veloz': { brand: 'Toyota', fullName: 'Toyota Veloz' },
    'Vios': { brand: 'Toyota', fullName: 'Toyota Vios' },
    'Wigo': { brand: 'Toyota', fullName: 'Toyota Wigo' },
    'Avanza': { brand: 'Toyota', fullName: 'Toyota Avanza' },
    'Montero': { brand: 'Mitsubishi', fullName: 'Mitsubishi Montero Sport' },
    'Adventure': { brand: 'Mitsubishi', fullName: 'Mitsubishi Adventure' },
    'L300': { brand: 'Mitsubishi', fullName: 'Mitsubishi L300' },
    'X-pander Cross': { brand: 'Mitsubishi', fullName: 'Mitsubishi Xpander Cross' },
    'Mirage C4': { brand: 'Mitsubishi', fullName: 'Mitsubishi Mirage G4' },
    'Crosswind': { brand: 'Isuzu', fullName: 'Isuzu Crosswind' },
    'Everest': { brand: 'Ford', fullName: 'Ford Everest' },
    'Ertiga': { brand: 'Suzuki', fullName: 'Suzuki Ertiga' },
    'Honda Civic': { brand: 'Honda', fullName: 'Honda Civic' },
    'Changan': { brand: 'Changan', fullName: 'Changan Cars' },
    'Travis': { brand: 'Foton / Chevrolet', fullName: 'Travis / Foton Gratour' },
    'Hatchback': { brand: 'General Categories', fullName: 'Hatchback' },
    'Sedan': { brand: 'General Categories', fullName: 'Sedan' },
    'Compact': { brand: 'General Categories', fullName: 'Compact' },
    'MVP': { brand: 'General Categories', fullName: 'MPV' },
    'MPV': { brand: 'General Categories', fullName: 'MPV / Multi-Purpose Vehicle' },
    'SUV': { brand: 'General Categories', fullName: 'SUV' },
    'Midsize SUV': { brand: 'General Categories', fullName: 'Midsize SUV' },
    'Pick Up': { brand: 'General Categories', fullName: 'Pick-Up Truck' },
    'Van': { brand: 'General Categories', fullName: 'Van' },
    'Jeep': { brand: 'General Categories', fullName: 'Jeep / Utility' },
    'Big Bike': { brand: 'Motorcycles & Bikes', fullName: 'Big Bike (400cc+)' },
    '150cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 150cc' },
    '125cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 125cc' },
    '100cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 100cc' },
    '1000cc': { brand: 'Motorcycles & Bikes', fullName: 'Motorcycle 1000cc' },
    'Tricycle': { brand: 'Motorcycles & Bikes', fullName: 'Tricycle' },
};

const DEFAULT_BRAND_ORDER = ['Toyota', 'Mitsubishi', 'Isuzu', 'Ford', 'Suzuki', 'Honda', 'Changan', 'Foton / Chevrolet', 'Other Brands', 'General Categories', 'Motorcycles & Bikes'];

const BRAND_ICONS = {
    'Toyota': '🚗',
    'Mitsubishi': '🚘',
    'Isuzu': '🚛',
    'Ford': '🚙',
    'Suzuki': '🚗',
    'Honda': '🚘',
    'Changan': '🚗',
    'Foton / Chevrolet': '🚐',
    'Other Brands': '🏷️',
    'General Categories': '🚘',
    'Motorcycles & Bikes': '🏍️',
};

const groupVehiclesByBrand = (pricingItems) => {
    if (!pricingItems || !Array.isArray(pricingItems)) return [];
    const groups = {};
    pricingItems.forEach(p => {
        const typeName = p.vehicleType || '';
        if (!typeName) return;
        const adminGroup = (p.brandGroup || '').trim();
        const meta = BRAND_MAP[typeName] || null;
        let brand = 'General Categories';
        let displayName = typeName;
        if (adminGroup) {
            brand = adminGroup;
            displayName = meta && meta.fullName && typeName !== meta.fullName ? `${typeName} (${meta.fullName})` : typeName;
        } else if (meta) {
            brand = meta.brand;
            displayName = typeName === meta.fullName ? typeName : `${typeName} (${meta.fullName})`;
        } else if (/toyota/i.test(typeName)) {
            brand = 'Toyota';
        } else if (/mitsubishi/i.test(typeName)) {
            brand = 'Mitsubishi';
        } else if (/isuzu/i.test(typeName)) {
            brand = 'Isuzu';
        } else if (/ford/i.test(typeName)) {
            brand = 'Ford';
        } else if (/suzuki/i.test(typeName)) {
            brand = 'Suzuki';
        } else if (/honda/i.test(typeName)) {
            brand = 'Honda';
        } else if (/bike|cc|tricycle/i.test(typeName)) {
            brand = 'Motorcycles & Bikes';
        } else {
            brand = 'Other Brands';
        }
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push({ _id: p._id, name: typeName, displayName });
    });
    const present = Object.keys(groups);
    const ordered = [
        ...DEFAULT_BRAND_ORDER.filter(b => present.includes(b)),
        ...present.filter(b => !DEFAULT_BRAND_ORDER.includes(b))
    ];
    return ordered.map(b => ({ brand: b, vehicles: groups[b] })).filter(g => g.vehicles.length > 0);
};

// ── Package Data (mirrors Book.jsx) ──────────────────────────────────────────
const WASH_PACKAGES_DATA = {
    premium: [
        {
            name: 'Regular Wash',
            description: 'Essential wash & vacuum clean',
            rates: { S: 150, M: 200, L: 250, XL: 300, Motorcycle: 150 },
            inclusions: ['Vacuum Cleaning', 'Body Wash', 'Tire Black Dressing', 'Glass Cleaning'],
            category: 'premium'
        },
        {
            name: 'Premium Wash',
            badge: 'BEST VALUE',
            description: 'Deep clean + hydrophobic spray wax protection',
            rates: { S: 230, M: 300, L: 350, XL: 500, Motorcycle: 200 },
            inclusions: ['Deep Vacuum Cleaning', 'Body Wash', 'Tire Black Dressing', 'Glass Cleaning', 'Spray Wax Protection', 'Full Interior Dressing', 'Air Freshener'],
            category: 'premium'
        },
        {
            name: 'Motorcycle Wash',
            description: 'Full bike degrease & wheel/chain wash',
            rates: { Motorcycle: 140, S: 140, M: 140, L: 140, XL: 140 },
            savings: '20 MINS',
            inclusions: ['Full Body Wash & Degrease', 'Chain & Wheel Cleaning', 'Tire Shine Dressing', 'Glass & Mirror Wipe'],
            category: 'premium',
            motorcycleOnly: true
        }
    ],
    restore: [
        {
            name: 'Saver Package',
            savings: 'SAVES ₱600',
            rates: { S: 1550, M: 1650, L: 1750, XL: 1950, Motorcycle: 1550 },
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Spray Wax, Tire Black)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal (Glass)',
                'Engine Wash'
            ],
            category: 'restore'
        },
        {
            name: 'Standard Package',
            badge: 'MOST POPULAR',
            savings: 'SAVES ₱800',
            rates: { S: 2150, M: 2250, L: 2350, XL: 2550, Motorcycle: 2150 },
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Tire Black)',
                'Hand Wax (Hydrophobic Wax)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal (Glass)',
                'Back to Back (Plastic Trim Restore)',
                'Engine Wash'
            ],
            category: 'restore'
        },
        {
            name: 'Supreme Package',
            badge: 'BEST VALUE',
            savings: 'SAVES ₱1,350',
            rates: { S: 3550, M: 3850, L: 4150, XL: 4550, Motorcycle: 3550 },
            inclusions: [
                'Premium Carwash (Body Wash, Vacuum, Interior Dressing, Tire Black)',
                'Fogging Sanitation (Back to Zero)',
                'Acid Rain Removal',
                'Engine Wash',
                'Machine Wax (Buffing)',
                'Back to Black',
                'Headlight Restoration w/ Coating',
                'Under Wash'
            ],
            category: 'restore'
        }
    ]
};

const WASH_PACKAGES_FLAT = {};
[...WASH_PACKAGES_DATA.premium, ...WASH_PACKAGES_DATA.restore].forEach(pkg => {
    WASH_PACKAGES_FLAT[pkg.name] = pkg;
});

// ── Vehicle Size Tier Helper ──────────────────────────────────────────────────
const getVehicleSizeTier = (vehicleName) => {
    if (!vehicleName) return 'S';
    const lower = vehicleName.toLowerCase();
    if (lower.includes('motorcycle') || lower.includes('bike') || lower.includes('125cc') ||
        lower.includes('150cc') || lower.includes('500cc') || lower.includes('1000cc') ||
        lower.includes('100cc') || lower.includes('tricycle')) return 'Motorcycle';
    if (lower.includes('van') || lower.includes('hiace') || lower.includes('urvan') ||
        lower.includes('alphard') || lower.includes('xl') || lower.includes('extra large')) return 'XL';
    if (lower.includes('suv') || lower.includes('pickup') || lower.includes('pick-up') ||
        lower.includes('pick up') || lower.includes('fortuner') || lower.includes('montero') ||
        lower.includes('everest') || lower.includes('large')) return 'L';
    if (lower.includes('innova') || lower.includes('crossover') || lower.includes('cuv') ||
        lower.includes('mpv') || lower.includes('ertiga') || lower.includes('veloz') ||
        lower.includes('crosswind') || lower.includes('adventure') || lower.includes('medium')) return 'M';
    return 'S';
};

const formatTo12Hour = (hourStr) => {
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 && hour !== 24 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
};

const fetcher = (url) => axios.get(url).then(r => r.data);

const BookingScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const { COLORS, isDarkMode } = useContext(ThemeContext);
    const styles = getStyles(COLORS);

    // SWR
    const { data: pricingData, mutate: mutatePricing } = useSWR(PRICING_URL, fetcher, { revalidateOnFocus: true, dedupingInterval: 60000 });
    const { data: availability = {}, mutate: mutateAvail } = useSWR(`${BOOKING_URL}/availability`, fetcher, { revalidateOnFocus: true, refreshInterval: 30000 });

    // ── Form state ──
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [serviceLocationType, setServiceLocationType] = useState('In-Store');
    const [homeAddress, setHomeAddress] = useState('');
    const [homeCoords, setHomeCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    // Steps: 1=Location, 2=Vehicle, 3=Services(Packages), 4=Time, 5=Payment, 6=Confirm
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModalData, setSuccessModalData] = useState(null);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    // ── Package sub-category ──
    const [washSubCategory, setWashSubCategory] = useState('premium'); // 'premium' | 'restore'

    // ── Vehicle Picker Modal ──
    const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
    const [vehicleSearch, setVehicleSearch] = useState('');

    // ── Voucher State ──
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]);
    const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
    const [isModalFull, setIsModalFull] = useState(false);

    // ── Payment State ──
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [proofImage, setProofImage] = useState(null); // base64 string
    const [proofImageUri, setProofImageUri] = useState(null);

    // ── Agreement State ──
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [timeAgreementChecked, setTimeAgreementChecked] = useState(false);
    const [punctualityChecked, setPunctualityChecked] = useState(false);

    // ── Reset on Focus ──
    useFocusEffect(
        React.useCallback(() => {
            mutatePricing();
            mutateAvail();
            setStep(1);
            setServiceLocationType('In-Store');
            setHomeAddress('');
            setHomeCoords(null);
            setSelectedServices([]);
            setSelectedAddons([]);
            setSelectedVehicle(null);
            setSelectedTime('');
            setAppliedPromo(null);
            setPrivacyChecked(false);
            setTimeAgreementChecked(false);
            setPunctualityChecked(false);
            setProofImage(null);
            setProofImageUri(null);
            setReferenceNumber('');
            setSelectedPaymentMethod(null);
            return () => { };
        }, [mutatePricing, mutateAvail])
    );

    useEffect(() => {
        const socketBase = API_BASE.replace('/api', '');
        const socket = io(socketBase);
        socket.on('pricing_updated', () => { mutatePricing(); mutateAvail(); });
        return () => socket.disconnect();
    }, [mutatePricing, mutateAvail]);

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

    // ── Available Time Slots ──
    const availableFutureHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;
        const isHome = serviceLocationType === 'Home Service';
        let slots = allHours.filter(hour => {
            const hourInt = parseInt(hour);
            if (isHome) return hourInt > currentHour;
            const count = availability[hour.padStart(2, '0')] || 0;
            return hourInt > currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            const bookedCount = availability[hour.padStart(2, '0')] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            const slotText = (!isHome && slotsLeft <= 3) ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : '';
            return { raw: hour, label: `${formatTo12Hour(hour)}${slotText}` };
        });
        if (isHome) slots.unshift({ raw: 'ASAP', label: 'Now / ASAP' });
        return slots;
    }, [availability, serviceLocationType]);

    // ── Price Calculation ──
    const rawPricing = pricingData?.dynamicPricing || [];
    const vehicleTypes = rawPricing.map(p => ({ _id: p._id, name: p.vehicleType }));
    const groupedVehicles = useMemo(() => groupVehiclesByBrand(rawPricing), [rawPricing]);
    const isLoadingData = !pricingData;

    const vehicleConfig = selectedVehicle ? rawPricing.find(p => p.vehicleType.toLowerCase() === selectedVehicle.name.toLowerCase()) : null;
    const addOnServices = vehicleConfig?.addons?.map(a => ({ name: a.name, price: a.price })) || [];

    const isMotorcycle = selectedVehicle?.name?.toLowerCase().includes('motorcycle') || selectedVehicle?.name?.toLowerCase().includes('bike');

    const getPrice = () => {
        if (selectedServices.length === 0 || !vehicleConfig) return null;
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

    const discountAmount = useMemo(() => {
        if (!appliedPromo || !finalPrice) return 0;
        if (appliedPromo.discountType === 'Percentage') return (finalPrice * appliedPromo.discountValue) / 100;
        return appliedPromo.discountValue;
    }, [appliedPromo, finalPrice]);
    const discountedPrice = Math.max(0, (finalPrice || 0) - discountAmount);

    // ── Handlers ──
    const handleVehicleSelect = (vt) => {
        if (selectedVehicle?._id !== vt._id) { setSelectedServices([]); setSelectedAddons([]); }
        setSelectedVehicle(vt);
    };

    const handleSelectPackage = (pkgName) => {
        // Only one main package at a time
        const existingAddons = selectedServices.filter(s => !WASH_PACKAGES_FLAT[s]);
        setSelectedServices([pkgName, ...existingAddons]);
    };

    const toggleAddon = (addon) => {
        if (selectedAddons.includes(addon.name)) {
            setSelectedAddons(prev => prev.filter(n => n !== addon.name));
        } else {
            setSelectedAddons(prev => [...prev, addon.name]);
        }
    };

    const fetchMyVouchers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/promotions/mine`, { headers: { Authorization: `Bearer ${userToken}` } });
            setMyVouchers(res.data || []);
        } catch (err) { console.error('Failed to fetch vouchers', err); }
    };

    useEffect(() => { if (step === 6) fetchMyVouchers(); }, [step]);

    const handleApplyPromo = (promoData) => {
        if (!promoData) return;
        if (finalPrice < promoData.minSpend) {
            Toast.show({ type: 'error', text1: 'Min Spend Not Met', text2: `This voucher requires a minimum spend of ₱${promoData.minSpend}` });
            return;
        }
        setAppliedPromo(promoData);
        closeVoucherModal();
        Toast.show({ type: 'success', text1: 'Promo Applied!', text2: `${promoData.discountType === 'Percentage' ? promoData.discountValue + '%' : '₱' + promoData.discountValue} discount applied.` });
    };

    // ── Load payment methods when entering Step 5 ──
    const loadPaymentMethods = async () => {
        setIsLoadingPaymentMethods(true);
        try {
            const res = await axios.get(`${API_BASE}/settings/payment-methods`);
            const methods = res.data || [];
            setPaymentMethods(methods);
            const counterMethod = methods.find(m => m.type === 'counter') || methods[0];
            if (counterMethod) setSelectedPaymentMethod(counterMethod);
        } catch (err) {
            console.error('Failed to load payment methods', err);
            setPaymentMethods([]);
        } finally { setIsLoadingPaymentMethods(false); }
    };

    const handleGoToPayment = () => {
        setStep(5);
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

    // ── Download GCash QR to gallery ──
    const handleDownloadQR = async (qrUrl) => {
        try {
            const targetQr = qrUrl || GCASH_QR_FALLBACK_BASE64;

            // Check if permission is already granted, otherwise request it
            let granted = false;
            try {
                const curPerm = await MediaLibrary.getPermissionsAsync();
                if (curPerm.status === 'granted' || curPerm.granted) {
                    granted = true;
                }
            } catch (_) { }

            if (!granted) {
                try {
                    const writePerm = await MediaLibrary.requestPermissionsAsync(true);
                    granted = writePerm.status === 'granted' || writePerm.granted;
                } catch (_) { }
            }

            if (!granted) {
                try {
                    const fullPerm = await MediaLibrary.requestPermissionsAsync(false);
                    granted = fullPerm.status === 'granted' || fullPerm.granted;
                } catch (_) { }
            }

            if (!granted) {
                Toast.show({
                    type: 'error',
                    text1: 'Permission Denied',
                    text2: 'Gallery permission is required to save the QR code.'
                });
                return;
            }

            Toast.show({ type: 'info', text1: 'Saving QR...', text2: 'Please wait.' });
            const fileName = `sandigan-qr-${Date.now()}.png`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

            if (typeof targetQr === 'string' && targetQr.startsWith('data:')) {
                const base64Code = targetQr.replace(/^data:image\/\w+;base64,/, '');
                if (!base64Code) throw new Error('QR image data is empty.');
                await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: 'base64' });
            } else if (typeof targetQr === 'string' && targetQr.startsWith('http')) {
                await FileSystem.downloadAsync(targetQr, fileUri);
            } else {
                const base64Code = GCASH_QR_FALLBACK_BASE64.replace(/^data:image\/\w+;base64,/, '');
                await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: 'base64' });
            }

            // Save to device library (with fallback to createAssetAsync)
            try {
                if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
                    await MediaLibrary.saveToLibraryAsync(fileUri);
                } else {
                    await MediaLibrary.createAssetAsync(fileUri);
                }
            } catch (saveErr) {
                if (typeof MediaLibrary.createAssetAsync === 'function') {
                    await MediaLibrary.createAssetAsync(fileUri);
                } else {
                    throw saveErr;
                }
            }

            Toast.show({ type: 'success', text1: '✅ QR Saved!', text2: 'Payment QR has been saved to your gallery.' });
        } catch (err) {
            console.error('Save QR error:', err);
            Toast.show({ type: 'error', text1: 'Save Failed', text2: err.message || 'Could not save the QR code.' });
        }
    };

    const isPaymentIncomplete = Boolean(selectedPaymentMethod && selectedPaymentMethod.type !== 'counter' && (!referenceNumber.trim() || !proofImage));

    const handleProceedToReview = () => {
        if (!selectedPaymentMethod) {
            Toast.show({ type: 'error', text1: 'Payment Method Required', text2: 'Please select a payment method.' });
            return;
        }
        if (selectedPaymentMethod.type !== 'counter') {
            if (!referenceNumber.trim()) {
                Toast.show({ type: 'error', text1: 'Reference Number Required', text2: 'Please enter your payment reference number.' });
                return;
            }
            if (!proofImage) {
                Toast.show({ type: 'error', text1: 'Payment Proof Required', text2: 'Please upload your payment screenshot.' });
                return;
            }
        }
        setStep(6);
    };

    // ── Submit ──
    const handleSubmit = () => {
        if (selectedPaymentMethod?.type !== 'counter') {
            if (!referenceNumber.trim()) {
                Toast.show({ type: 'error', text1: 'Reference Number Required', text2: 'Please enter your payment reference number.' });
                return;
            }
            if (!proofImage) {
                Toast.show({ type: 'error', text1: 'Payment Proof Required', text2: 'Please upload your payment screenshot.' });
                return;
            }
        }
        if (!privacyChecked) {
            Toast.show({ type: 'error', text1: 'Agreement Required', text2: 'Please accept the Privacy Policy to continue.' });
            return;
        }
        if (!timeAgreementChecked || !punctualityChecked) {
            Toast.show({ type: 'error', text1: 'Agreement Required', text2: 'Please acknowledge all service agreements.' });
            return;
        }
        setAlertData({
            visible: true,
            title: 'Confirm Booking?',
            message: `Book ${selectedVehicle.name} wash at ${selectedTime === 'ASAP' ? 'ASAP' : formatTo12Hour(selectedTime)}?`,
            type: 'confirm',
            onConfirm: handleConfirmedSubmit
        });
    };

    const handleConfirmedSubmit = async () => {
        setIsSubmitting(true);
        const isCounter = selectedPaymentMethod?.type === 'counter';
        const paymentPayload = selectedPaymentMethod ? {
            method: selectedPaymentMethod.label,
            status: isCounter ? 'Unpaid' : 'Pending Verification',
            referenceNumber: referenceNumber.trim() || null,
            proofImageBase64: proofImage || null,
            amountPaid: discountedPrice,
        } : null;

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
                homeServiceDetails: serviceLocationType === 'Home Service' ? { address: homeAddress, latitude: homeCoords?.latitude || null, longitude: homeCoords?.longitude || null } : {},
                payment: paymentPayload,
            }, { headers: { Authorization: `Bearer ${userToken}` } });

            const newBooking = res.data;
            if (newBooking) newBooking.type = 'wash';
            Toast.show({ type: 'success', text1: '🎉 Booking Submitted!', text2: 'We\'ll confirm your slot shortly.' });
            setSuccessModalData(newBooking);
            setStep(1);
            setServiceLocationType('In-Store');
            setHomeAddress('');
            setHomeCoords(null);
            setSelectedServices([]);
            setSelectedAddons([]);
            setSelectedVehicle(null);
            setSelectedTime('');
            setAppliedPromo(null);
            setPrivacyChecked(false);
            setTimeAgreementChecked(false);
            setPunctualityChecked(false);
            setProofImage(null);
            setProofImageUri(null);
            setReferenceNumber('');
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Booking Failed', text2: err.response?.data?.error || 'Please try again.' });
        } finally { setIsSubmitting(false); }
    };

    if (isLoadingData) {
        return (
            <View style={[styles.container, { paddingTop: 56 }]}>
                <Skeleton width={180} height={28} isDarkMode={isDarkMode} style={{ marginBottom: 6 }} />
                <Skeleton width={240} height={14} isDarkMode={isDarkMode} style={{ marginBottom: 30 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                    {[1, 2, 3, 4, 5, 6].map(k => (
                        <View key={k} style={{ alignItems: 'center' }}>
                            <Skeleton width={32} height={32} borderRadius={16} isDarkMode={isDarkMode} style={{ marginBottom: 4 }} />
                            <Skeleton width={40} height={10} isDarkMode={isDarkMode} />
                        </View>
                    ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                    <Skeleton width="31%" height={90} borderRadius={10} isDarkMode={isDarkMode} />
                </View>
            </View>
        );
    }

    const selectedPackageName = selectedServices.find(s => WASH_PACKAGES_FLAT[s]);
    const packagesForTab = isMotorcycle
        ? WASH_PACKAGES_DATA.premium.filter(p => p.motorcycleOnly)
        : WASH_PACKAGES_DATA[washSubCategory].filter(p => !p.motorcycleOnly);

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
                    {['Location', 'Vehicle', 'Services', 'Schedule', 'Payment', 'Confirm'].map((label, idx) => {
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

                {/* ── STEP 1: Service Location ── */}
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Where do you want the service?</Text>
                        <TouchableOpacity style={[styles.locationCard, serviceLocationType === 'In-Store' && styles.locationCardSelected]} onPress={() => setServiceLocationType('In-Store')}>
                            <Image source={inStoreIcon} style={styles.actionIcon} />
                            <View>
                                <Text style={[styles.vehicleName, { textAlign: 'left', fontSize: 16 }, serviceLocationType === 'In-Store' && { color: COLORS.primary }]}>In-Store (Sandigan Carwash)</Text>
                                <Text style={styles.mutedText}>Visit our physical shop for your service.</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.locationCard, serviceLocationType === 'Home Service' && styles.locationCardSelected]} onPress={() => setServiceLocationType('Home Service')}>
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
                                                if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required.' }); return; }
                                                const location = await Location.getCurrentPositionAsync({});
                                                setHomeCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                                                const geocode = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                                                if (geocode.length > 0) {
                                                    const place = geocode[0];
                                                    setHomeAddress(`${place.streetNumber || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''}`.trim());
                                                }
                                                Toast.show({ type: 'success', text1: 'Location Found!' });
                                            } catch { Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch location.' }); }
                                            finally { setIsLocating(false); }
                                        }}
                                        disabled={isLocating}
                                    >
                                        {isLocating ? <ActivityIndicator color={COLORS.text} size="small" /> : <Image source={mapPinIcon} style={styles.mapPinAction} />}
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ color: COLORS.textMuted, marginTop: 5, fontSize: 12 }}>Tip: Use the map pin to fill in your current address.</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.nextButton, (serviceLocationType === 'Home Service' && !homeAddress.trim()) && styles.nextButtonDisabled]}
                            onPress={() => { if (serviceLocationType === 'Home Service' && !homeAddress.trim()) return; setStep(2); }}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 2: Vehicle Type (Modal Picker) ── */}
                {step === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Select Your Vehicle</Text>
                        <Text style={styles.mutedText}>Choose the vehicle you want to have washed.</Text>

                        {/* Trigger Button */}
                        <TouchableOpacity
                            style={[
                                styles.vehiclePickerTrigger,
                                selectedVehicle && styles.vehiclePickerTriggerSelected
                            ]}
                            onPress={() => { setVehicleSearch(''); setVehiclePickerVisible(true); }}
                        >
                            <View style={{ flex: 1 }}>
                                {selectedVehicle ? (
                                    <>
                                        <Text style={styles.vehiclePickerTriggerLabel}>Selected Vehicle</Text>
                                        <Text style={[styles.vehiclePickerTriggerValue, { color: COLORS.primary }]}>
                                            {selectedVehicle.displayName || selectedVehicle.name}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.vehiclePickerTriggerPlaceholder}>
                                        🚗  Tap to choose your vehicle...
                                    </Text>
                                )}
                            </View>
                            <Text style={{ fontSize: 18, color: COLORS.primary, marginLeft: 8 }}>▾</Text>
                        </TouchableOpacity>



                        <TouchableOpacity
                            style={[styles.nextButton, { marginTop: 24 }, !selectedVehicle && styles.nextButtonDisabled]}
                            onPress={() => selectedVehicle && setStep(3)}
                        >
                            <Text style={styles.nextButtonText}>Continue →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.backButton, { marginTop: 10 }]} onPress={() => setStep(1)}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Vehicle Picker Modal ── */}
                <Modal
                    visible={vehiclePickerVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setVehiclePickerVisible(false)}
                >
                    <Pressable
                        style={styles.vpOverlay}
                        onPress={() => setVehiclePickerVisible(false)}
                    >
                        <Pressable style={[styles.vpSheet, { backgroundColor: COLORS.cardBackground }]} onPress={() => {}}>
                            {/* Header */}
                            <View style={styles.vpHeader}>
                                <Text style={[styles.vpTitle, { color: COLORS.text }]}>Select Your Vehicle</Text>
                                <TouchableOpacity onPress={() => setVehiclePickerVisible(false)}>
                                    <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>Done</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search */}
                            <View style={[styles.vpSearchBar, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
                                <Text style={{ fontSize: 14, color: COLORS.textMuted, marginRight: 8 }}>🔍</Text>
                                <TextInput
                                    style={{ flex: 1, fontSize: 14, color: COLORS.text }}
                                    placeholder="Search vehicle..."
                                    placeholderTextColor={COLORS.textMuted}
                                    value={vehicleSearch}
                                    onChangeText={setVehicleSearch}
                                />
                                {vehicleSearch.length > 0 && (
                                    <TouchableOpacity onPress={() => setVehicleSearch('')}>
                                        <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>✕</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Grouped List */}
                            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                                {isLoadingData ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                        <ActivityIndicator color={COLORS.primary} />
                                        <Text style={[styles.mutedText, { marginTop: 10 }]}>Loading vehicles...</Text>
                                    </View>
                                ) : (
                                    groupedVehicles
                                        .map(group => {
                                            const filtered = vehicleSearch.trim()
                                                ? group.vehicles.filter(v =>
                                                    (v.displayName || v.name).toLowerCase().includes(vehicleSearch.toLowerCase())
                                                )
                                                : group.vehicles;
                                            if (filtered.length === 0) return null;
                                            return (
                                                <View key={group.brand} style={{ marginBottom: 8 }}>
                                                    {/* Brand Header */}
                                                    <View style={styles.vpGroupHeader}>
                                                        <Text style={{ fontSize: 15 }}>{BRAND_ICONS[group.brand] || '🚗'}</Text>
                                                        <Text style={[styles.vpGroupTitle, { color: COLORS.primary }]}>{group.brand}</Text>
                                                        <View style={[styles.vehicleGroupBadge, { marginLeft: 'auto' }]}>
                                                            <Text style={styles.vehicleGroupBadgeText}>{filtered.length}</Text>
                                                        </View>
                                                    </View>
                                                    {/* Vehicle Rows */}
                                                    {filtered.map(vt => {
                                                        const isSelected = selectedVehicle?._id === vt._id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={vt._id}
                                                                style={[
                                                                    styles.vpVehicleRow,
                                                                    { borderColor: COLORS.border },
                                                                    isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }
                                                                ]}
                                                                onPress={() => {
                                                                    handleVehicleSelect(vt);
                                                                    setVehiclePickerVisible(false);
                                                                }}
                                                            >
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={[
                                                                        styles.vpVehicleName,
                                                                        { color: isSelected ? COLORS.primary : COLORS.text }
                                                                    ]}>
                                                                        {vt.displayName || vt.name}
                                                                    </Text>
                                                                </View>
                                                                {isSelected && (
                                                                    <View style={[styles.vehicleChipCheck, { width: 22, height: 22, borderRadius: 11 }]}>
                                                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            );
                                        })
                                )}
                                <View style={{ height: 24 }} />
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>

                {/* ── STEP 3: Package / Service Selection ── */}
                {step === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Select a Package</Text>

                        {/* Sub-category tabs — hidden for motorcycle */}
                        {!isMotorcycle && (
                            <View style={styles.tabRow}>
                                <TouchableOpacity
                                    style={[styles.tabBtn, washSubCategory === 'premium' && styles.tabBtnActive]}
                                    onPress={() => { setWashSubCategory('premium'); setSelectedServices([]); }}
                                >
                                    <Text style={[styles.tabBtnText, washSubCategory === 'premium' && styles.tabBtnTextActive]}>✨ Premium Shine & Care</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabBtn, washSubCategory === 'restore' && styles.tabBtnActive]}
                                    onPress={() => { setWashSubCategory('restore'); setSelectedServices([]); }}
                                >
                                    <Text style={[styles.tabBtnText, washSubCategory === 'restore' && styles.tabBtnTextActive]}>🌸 Restore & Shine</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Package Cards */}
                        {packagesForTab.map(pkg => {
                            const isSelected = selectedPackageName === pkg.name;
                            // ── Dynamic pricing for selected vehicle ──
                            const tier = getVehicleSizeTier(selectedVehicle?.name);
                            const pkgPrice = vehicleConfig
                                ? (vehicleConfig.services?.find(s => s.name === pkg.name)?.price ||
                                   vehicleConfig.restorePackages?.find(s => s.name === pkg.name)?.price || null)
                                : (selectedVehicle && pkg.rates
                                    ? (pkg.rates[tier] ?? pkg.rates.S ?? null)
                                    : null);
                            return (
                                <View key={pkg.name} style={[styles.packageCard, isSelected && styles.packageCardSelected]}>
                                    {/* Package Header */}
                                    <View style={styles.packageHeader}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <Text style={[styles.packageName, isSelected && { color: COLORS.primary }]}>{pkg.name}</Text>
                                                {pkg.badge && (
                                                    <View style={styles.badgeContainer}>
                                                        <Text style={styles.badgeText}>{pkg.badge}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {pkg.description && <Text style={styles.packageDesc}>{pkg.description}</Text>}
                                        </View>
                                        {/* Price (top-right) */}
                                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                                            <Text style={styles.pkgPriceText}>
                                                {pkgPrice != null ? `₱${pkgPrice.toLocaleString()}` : '—'}
                                            </Text>
                                            {pkg.savings && (
                                                <View style={styles.pkgSavingsBadge}>
                                                    <Text style={styles.pkgSavingsText}>{pkg.savings}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Inclusions */}
                                    <View style={styles.inclusionsList}>
                                        {pkg.inclusions.map((inc, i) => (
                                            <View key={i} style={styles.inclusionRow}>
                                                <View style={[styles.inclusionCheck, isSelected && { backgroundColor: COLORS.primary }]}>
                                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                                                </View>
                                                <Text style={[styles.inclusionText, { color: COLORS.text }]}>{inc}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Select Button */}
                                    <TouchableOpacity
                                        style={[styles.selectPkgBtn, isSelected && styles.selectPkgBtnSelected]}
                                        onPress={() => handleSelectPackage(pkg.name)}
                                    >
                                        <Text style={[styles.selectPkgBtnText, isSelected && { color: '#fff' }]}>
                                            {isSelected ? '✓ Selected' : '+ Select Package'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {/* Add-ons */}
                        {addOnServices.length > 0 && (
                            <>
                                <Text style={[styles.stepTitle, { marginTop: 20 }]}>Add-ons (Optional)</Text>
                                {addOnServices.map(addon => {
                                    const isSelected = selectedAddons.includes(addon.name);
                                    return (
                                        <TouchableOpacity key={addon.name} style={[styles.serviceCard, isSelected && styles.serviceCardSelected]} onPress={() => toggleAddon(addon)}>
                                            <View style={styles.serviceCardContent}>
                                                <Text style={[styles.serviceCardName, isSelected && { color: COLORS.primary }]}>{addon.name}</Text>
                                                <Text style={styles.serviceCardDesc}>₱{addon.price?.toLocaleString()}</Text>
                                            </View>
                                            <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                                                {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}

                        {selectedPackageName && (
                            <View style={styles.pricePreview}>
                                <Text style={styles.pricePreviewLabel}>Estimated Price</Text>
                                <Text style={styles.pricePreviewValue}>{finalPrice !== null ? `₱${finalPrice.toLocaleString()}` : 'Contact for price'}</Text>
                            </View>
                        )}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.nextButton, { flex: 1 }, !selectedPackageName && styles.nextButtonDisabled]} onPress={() => selectedPackageName && setStep(4)}>
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
                                    <TouchableOpacity key={slot.raw} style={[styles.timeChip, selectedTime === slot.raw && styles.timeChipSelected]} onPress={() => setSelectedTime(slot.raw)}>
                                        <Text style={[styles.timeChipText, selectedTime === slot.raw && styles.timeChipTextSelected]}>{slot.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.nextButton, { flex: 1 }, !selectedTime && styles.nextButtonDisabled]} onPress={() => selectedTime && handleGoToPayment()}>
                                <Text style={styles.nextButtonText}>Continue →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 5: Payment Method ── */}
                {step === 5 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Select Payment Method</Text>
                        {isLoadingPaymentMethods ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator color={COLORS.primary} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Loading payment options...</Text>
                            </View>
                        ) : paymentMethods.length === 0 ? (
                            <View style={[styles.infoCard, { borderColor: COLORS.border }]}>
                                <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontSize: 14 }}>No payment methods configured. You may proceed and pay at the counter.</Text>
                            </View>
                        ) : (
                            paymentMethods.map(method => {
                                const isSelected = Boolean(selectedPaymentMethod) && (
                                    (Boolean(method._id) && selectedPaymentMethod._id === method._id) ||
                                    (Boolean(method.id) && selectedPaymentMethod.id === method.id) ||
                                    (Boolean(method.label) && selectedPaymentMethod.label === method.label)
                                );
                                return (
                                    <TouchableOpacity
                                        key={method._id || method.id || method.label}
                                        style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
                                        onPress={() => setSelectedPaymentMethod(method)}
                                    >
                                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                            {isSelected && <View style={styles.radioInner} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.paymentLabel, isSelected && { color: COLORS.primary }]}>{method.label}</Text>
                                            {method.type === 'counter' && <Text style={styles.paymentNote}>Pay at the counter upon arrival</Text>}
                                            {method.type !== 'counter' && <Text style={styles.paymentNote}>Online payment — upload proof after paying</Text>}
                                        </View>

                                    </TouchableOpacity>
                                );
                            })
                        )}

                        {/* GCash Details */}
                        {selectedPaymentMethod && selectedPaymentMethod.type !== 'counter' && (
                            <View style={[styles.gcashPanel, { borderColor: COLORS.primary + '40', backgroundColor: COLORS.primary + '08' }]}>
                                <Text style={[styles.gcashTitle, { color: COLORS.text }]}>💙 {selectedPaymentMethod.label} Payment</Text>

                                {/* QR Code */}
                                {(() => {
                                    const qrSrc = selectedPaymentMethod.qrImageBase64 || selectedPaymentMethod.qrImage || GCASH_QR_FALLBACK_BASE64;
                                    return (
                                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                            <Image source={{ uri: qrSrc }} style={styles.qrImage} resizeMode="contain" />
                                            <TouchableOpacity style={[styles.downloadQrBtn, { borderColor: COLORS.primary }]} onPress={() => handleDownloadQR(qrSrc)}>
                                                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>⬇ Save QR to Gallery</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })()}

                                {/* Account Info */}
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
                                    Please send the exact amount and take a screenshot of the transaction. Then enter your reference number and upload the screenshot below.
                                </Text>

                                {/* Reference Number */}
                                <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 6 }]}>
                                    Reference Number <Text style={{ color: '#ef4444' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={[styles.modalInput, { backgroundColor: COLORS.cardBackground, color: COLORS.text, marginBottom: 12 }]}
                                    placeholder="e.g. 1234567890"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={referenceNumber}
                                    onChangeText={setReferenceNumber}
                                    keyboardType="numeric"
                                />

                                {/* Proof Upload */}
                                <Text style={[styles.inputLabel, { color: COLORS.text, marginBottom: 6 }]}>
                                    Upload Payment Screenshot <Text style={{ color: '#ef4444' }}>*</Text>
                                </Text>
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
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(4)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextButton, { flex: 1 }, isPaymentIncomplete && styles.nextButtonDisabled]}
                                onPress={handleProceedToReview}
                            >
                                <Text style={styles.nextButtonText}>Review →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── STEP 6: Review & Confirm ── */}
                {step === 6 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review Your Booking</Text>
                        <View style={styles.summaryCard}>
                            <SummaryRow label="Vehicle:" value={selectedVehicle?.name} />
                            <SummaryRow label="Package:" value={selectedPackageName} />
                            {selectedAddons.length > 0 && <SummaryRow label="Add-ons:" value={selectedAddons.join(', ')} />}
                            <SummaryRow label="Date:" value={new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
                            <SummaryRow label="Time:" value={selectedTime === 'ASAP' ? 'As soon as possible' : formatTo12Hour(selectedTime)} />
                            <SummaryRow label="Location:" value={serviceLocationType === 'Home Service' ? `Home Service — ${homeAddress}` : 'In-Store (Sandigan Carwash)'} />
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
                                <Text style={styles.summaryLabelTotal}>Total Estimate</Text>
                                <Text style={styles.summaryValueTotal}>{discountedPrice !== null ? `₱${discountedPrice.toLocaleString()}` : 'TBD'}</Text>
                            </View>
                        </View>

                        {/* ── Agreements ── */}
                        <View style={[styles.agreementCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
                            <Text style={[styles.agreementTitle, { color: COLORS.text }]}>Service Agreements</Text>

                            {/* Privacy Policy */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => {
                                if (privacyChecked) { setPrivacyChecked(false); }
                                else { setShowPrivacyModal(true); }
                            }}>
                                <View style={[styles.checkboxSquare, privacyChecked && styles.checkboxSquareSelected]}>
                                    {privacyChecked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>
                                    I have read and agree to the{' '}
                                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Privacy Policy</Text>
                                </Text>
                            </TouchableOpacity>

                            {/* Time Agreement */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => setTimeAgreementChecked(!timeAgreementChecked)}>
                                <View style={[styles.checkboxSquare, timeAgreementChecked && styles.checkboxSquareSelected]}>
                                    {timeAgreementChecked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>I understand the estimated service time may vary depending on the queue.</Text>
                            </TouchableOpacity>

                            {/* Punctuality Agreement */}
                            <TouchableOpacity style={styles.agreementRow} onPress={() => setPunctualityChecked(!punctualityChecked)}>
                                <View style={[styles.checkboxSquare, punctualityChecked && styles.checkboxSquareSelected]}>
                                    {punctualityChecked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                                </View>
                                <Text style={[styles.agreementText, { color: COLORS.text }]}>I agree to be punctual. Late arrivals may result in rescheduling.</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setStep(5)}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { flex: 1 }, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>✓ Confirm Booking</Text>}
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
                                    <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>Claim exclusive offers from the Home screen.</Text>
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

            {/* ── Privacy Policy Modal ── */}
            <PrivacyPolicyModal
                visible={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                onAccept={() => { setPrivacyChecked(true); setShowPrivacyModal(false); }}
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
    pageHeader: { marginTop: 56, marginBottom: 20 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
    pageSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
    mutedText: { color: COLORS.textMuted, fontSize: 13 },

    stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingHorizontal: 2 },
    stepItem: { alignItems: 'center', flex: 1 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.cardBackground, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    stepCircleActive: { borderColor: COLORS.primary },
    stepCircleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    stepNum: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    stepNumActive: { color: COLORS.text },
    stepLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
    stepLabelActive: { color: COLORS.primary },

    stepContent: { paddingBottom: 8 },
    stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

    // Location
    locationCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
    locationCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },

    // Vehicle Grid (legacy kept for reference)
    vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    vehicleCard: { paddingVertical: 10, paddingHorizontal: 15, width: '30%', borderRadius: 10, backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border },
    vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    vehicleName: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

    // ── Vehicle Picker Trigger ──────────────────────────────────────────────────
    vehiclePickerTrigger: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18,
        backgroundColor: COLORS.cardBackground, marginTop: 16,
    },
    vehiclePickerTriggerSelected: {
        borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08',
    },
    vehiclePickerTriggerLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
    vehiclePickerTriggerValue: { fontSize: 16, fontWeight: '800' },
    vehiclePickerTriggerPlaceholder: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
    vehiclePickerSelectedInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
    vehiclePickerTierBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.primary + '40' },
    vehiclePickerTierBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },

    // ── Vehicle Picker Modal Sheet ──────────────────────────────────────────────
    vpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    vpSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 0, maxHeight: '88%', minHeight: '60%' },
    vpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    vpTitle: { fontSize: 18, fontWeight: '800' },
    vpSearchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
    vpGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60', marginBottom: 4 },
    vpGroupTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    vpVehicleRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: 12, borderWidth: 1,
        marginBottom: 6,
    },
    vpVehicleName: { fontSize: 15, fontWeight: '700' },

    // Grouped Vehicle Selector (legacy)
    vehicleGroup: { marginBottom: 20 },
    vehicleGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    vehicleGroupAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary },
    vehicleGroupTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.8 },
    vehicleGroupBadge: { backgroundColor: COLORS.border, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    vehicleGroupBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    vehicleGroupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vehicleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.border,
        backgroundColor: COLORS.cardBackground,
    },
    vehicleChipSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '12',
    },
    vehicleChipCheck: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    vehicleChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

    // Package Tabs
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tabBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.cardBackground },
    tabBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
    tabBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
    tabBtnTextActive: { color: '#fff' },

    // Package Cards
    packageCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.border },
    packageCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '06' },
    packageHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    packageName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    packageDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 4 },
    badgeContainer: { backgroundColor: '#f59e0b20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#f59e0b50' },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#f59e0b', letterSpacing: 0.5 },
    // Package price (top-right)
    pkgPriceText: { fontSize: 20, fontWeight: '900', color: COLORS.primary, textAlign: 'right' },
    pkgSavingsBadge: { backgroundColor: 'rgba(35, 160, 206, 0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, borderWidth: 1, borderColor: 'rgba(35, 160, 206, 0.3)' },
    pkgSavingsText: { fontSize: 10, fontWeight: '800', color: '#38bdf8', letterSpacing: 0.5 },
    inclusionsList: { marginBottom: 12 },
    inclusionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
    inclusionCheck: { width: 16, height: 16, borderRadius: 4, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    inclusionText: { fontSize: 12, flex: 1, lineHeight: 18 },
    selectPkgBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary + '60', backgroundColor: 'transparent' },
    selectPkgBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    selectPkgBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

    // Service Cards (Add-ons)
    serviceCard: { backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
    serviceCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
    serviceCardContent: { flex: 1 },
    serviceCardName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    serviceCardDesc: { fontSize: 12, color: COLORS.textMuted },
    checkboxSquare: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    checkboxSquareSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

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
    infoCard: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 16 },

    // Summary Card
    summaryCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
    summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
    summaryValue: { fontSize: 13, color: COLORS.text, fontWeight: '700' },
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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

    // Agreements
    agreementCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
    agreementTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
    agreementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    agreementText: { fontSize: 13, flex: 1, lineHeight: 20 },

    // Modal Voucher
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    voucherItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.background, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
    voucherDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
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
    inputLabel: { fontSize: 12, fontWeight: '700' },
    actionIcon: { width: 18, height: 18, resizeMode: 'contain', tintColor: COLORS.text },
    mapPinAction: { width: 24, height: 24, resizeMode: 'contain', tintColor: COLORS.text },
});

export default BookingScreen;
