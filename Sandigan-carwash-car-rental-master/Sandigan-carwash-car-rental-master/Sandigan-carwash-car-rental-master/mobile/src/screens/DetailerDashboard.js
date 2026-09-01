import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, Image, Linking, Dimensions, Modal } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE } from '../api/config';
import BookingCardSkeleton from '../components/BookingCardSkeleton';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
const darkThemeIcon = require('../../assets/icon/dark-theme.png');
const lightThemeIcon = require('../../assets/icon/light-theme.png');
import MapView, { Marker } from 'react-native-maps';
import BookingDetailModal from '../components/BookingDetailModal';
import LogoutModal from '../components/LogoutModal';
import CustomAlertModal from '../components/CustomAlertModal';
import mapIcon from '../../assets/icon/map.png';
import homeIcon from '../../assets/icon/house.png';
import storeIcon from '../../assets/icon/store.png';
import completedIcon from '../../assets/icon/completed.png';
import logOutIcon from '../../assets/icon/log-out.png';
const { width } = Dimensions.get('window');

// Helper to calculate distance in km between two coords
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const DetailerDashboard = ({ navigation }) => {
    const [todayEarnings, setTodayEarnings] = useState(0);
    const { COLORS, isDarkMode, toggleTheme } = useContext(ThemeContext);
    const { userInfo, userToken, logout } = useContext(AuthContext);

    // active tasks state
    const [activeTasks, setActiveTasks] = useState([]);
    // completed tasks state
    const [completedTasks, setCompletedTasks] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [selectedTask, setSelectedTask] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [activeTab, setActiveTab] = useState('In-Store'); // 'In-Store', 'Home Ops', 'Completed'

    // Pagination refs for Completed tab
    const completedPage = useRef(1);
    const hasMoreCompleted = useRef(true);
    const isLoadingMore = useRef(false);

    // GPS Tracking state
    const [activeGpsBookingId, setActiveGpsBookingId] = useState(null); // which booking is currently broadcasting
    const [autoArrivedIds, setAutoArrivedIds] = useState(new Set()); // IDs of bookings where detailer is within 50m
    const locationWatcher = useRef(null); // holds the expo-location subscription

    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [alertData, setAlertData] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const styles = getStyles(COLORS);

    // Fetch Active (Pending, In-progress) Tasks all at once
    const fetchActiveTasks = async () => {
        if (!userInfo?.id && !userInfo?._id) return;
        const empId = userInfo.id || userInfo._id;

        try {
            const res = await axios.get(`${API_BASE}/booking?assignedTo=${empId}&status=Pending,Confirmed,Queued,On the Way,In-progress`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            // Admin backend returns array when no page/limit is provided
            const fetched = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setActiveTasks(fetched);
        } catch (err) {
            console.error('Failed to fetch active tasks:', err);
        }
    };

    // Fetch Completed Tasks (Paginated)
    const fetchCompletedTasks = async (reset = false) => {
        if (!userInfo?.id && !userInfo?._id) return;
        const empId = userInfo.id || userInfo._id;

        const page = reset ? 1 : completedPage.current;
        if (!reset && !hasMoreCompleted.current) return;

        try {
            const res = await axios.get(`${API_BASE}/booking?assignedTo=${empId}&status=Completed&page=${page}&limit=15`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            const fetchedList = res.data.bookings || [];
            hasMoreCompleted.current = res.data.hasMore;

            if (reset) {
                setCompletedTasks(fetchedList);
                completedPage.current = 2;
            } else {
                setCompletedTasks(prev => {
                    const merged = [...prev, ...fetchedList];
                    // deduplicate
                    const seen = new Set();
                    return merged.filter(item => {
                        if (seen.has(item._id)) return false;
                        seen.add(item._id);
                        return true;
                    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                });
                if (fetchedList.length > 0) completedPage.current += 1;
            }
        } catch (err) {
            console.error('Failed to fetch completed tasks:', err);
        } finally {
            setIsFetchingMore(false);
            isLoadingMore.current = false;
        }
    };

    const fetchEarnings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/employees/my-earnings`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let todaySum = 0;
            res.data.bookings.forEach(b => {
                if (new Date(b.updatedAt) >= today) {
                    todaySum += b.commissionEarned || 0;
                }
            });
            setTodayEarnings(todaySum);
        } catch (e) {
            console.warn('Failed to fetch today earnings:', e.message);
        }
    };

    const fetchAllData = async (resetCompleted = true) => {
        setIsLoading(true);
        await Promise.all([
            fetchActiveTasks(),
            fetchCompletedTasks(resetCompleted),
            fetchEarnings()
        ]);
        setIsLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchAllData(true);
    }, [userInfo]);

    const onRefresh = () => {
        setRefreshing(true);
        hasMoreCompleted.current = true;
        fetchAllData(true);
    };

    const onEndReached = () => {
        if (activeTab === 'Completed') {
            if (isLoadingMore.current || !hasMoreCompleted.current) return;
            isLoadingMore.current = true;
            setIsFetchingMore(true);
            fetchCompletedTasks(false);
        }
    };

    // Live Socket Updates
    useEffect(() => {
        const socket = io(API_BASE.replace('/api', ''));
        const empId = userInfo?.id || userInfo?._id;

        const handleUpsert = (updatedBooking) => {
            if (updatedBooking.assignedTo === empId) {
                const s = (updatedBooking.status || '').toLowerCase();
                if (s === 'completed') {
                    // It's completed
                    setCompletedTasks(prev => {
                        const exists = prev.some(t => t._id === updatedBooking._id);
                        if (exists) return prev.map(t => t._id === updatedBooking._id ? updatedBooking : t);
                        return [updatedBooking, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    });
                    // remove from active if it was there
                    setActiveTasks(prev => prev.filter(t => t._id !== updatedBooking._id));

                    // Trigger real-time earnings update!
                    fetchEarnings();
                } else {
                    // It's active
                    setActiveTasks(prev => {
                        const exists = prev.some(t => t._id === updatedBooking._id);
                        if (exists) return prev.map(t => t._id === updatedBooking._id ? updatedBooking : t);
                        return [updatedBooking, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    });
                    // remove from completed if it was there
                    setCompletedTasks(prev => prev.filter(t => t._id !== updatedBooking._id));
                }
            } else {
                // If reassigned to someone else, remove it from our lists
                setActiveTasks(prev => prev.filter(t => t._id !== updatedBooking._id));
                setCompletedTasks(prev => prev.filter(t => t._id !== updatedBooking._id));
            }
        };

        socket.on('update_booking', handleUpsert);
        socket.on('new_booking', handleUpsert);

        return () => socket.disconnect();
    }, [userInfo]);

    // ── GPS Broadcaster ──
    const stopGpsBroadcast = async () => {
        if (locationWatcher.current) {
            locationWatcher.current.remove();
            locationWatcher.current = null;
        }
        setActiveGpsBookingId(null);
    };

    const handleOnTheWay = async (bookingId, custLat, custLng) => {
        setAlertData({
            visible: true,
            title: '🚗 Start Driving?',
            message: 'This will notify the customer that you are on your way and start broadcasting your live location.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    // 1. Request location permission
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        setAlertData({
                            visible: true,
                            title: 'Permission Denied',
                            message: 'Location permission is required to broadcast your location to the customer.',
                            type: 'error'
                        });
                        return;
                    }

                    // 2. Update booking status to 'On the Way'
                    await axios.patch(`${API_BASE}/booking/${bookingId}`, { status: 'On the Way' }, {
                        headers: { Authorization: `Bearer ${userToken}` }
                    });

                    // 3. Optimistic UI update
                    setActiveTasks(prev => prev.map(t =>
                        t._id === bookingId ? { ...t, status: 'On the Way', isOnTheWay: true } : t
                    ));
                    setActiveGpsBookingId(bookingId);

                    // 4. Start GPS watcher - broadcasts every ~5 seconds
                    locationWatcher.current = await Location.watchPositionAsync(
                        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
                        async (loc) => {
                            const { latitude, longitude } = loc.coords;

                            // Check if we arrived automatically! (within 50 meters, i.e. 0.05 km)
                            if (custLat && custLng) {
                                const dist = getDistanceFromLatLonInKm(latitude, longitude, custLat, custLng);
                                if (dist <= 0.05) {
                                    setAutoArrivedIds(prev => new Set(prev).add(bookingId));
                                } else {
                                    setAutoArrivedIds(prev => {
                                        const next = new Set(prev);
                                        next.delete(bookingId);
                                        return next;
                                    });
                                }
                            }

                            try {
                                await axios.patch(
                                    `${API_BASE}/booking/${bookingId}/location`,
                                    { latitude, longitude },
                                    { headers: { Authorization: `Bearer ${userToken}` } }
                                );
                            } catch (e) {
                                console.warn('[GPS] Failed to send location:', e.message);
                            }
                        }
                    );
                } catch (err) {
                    setAlertData({
                        visible: true,
                        title: 'Error',
                        message: 'Failed to start driving mode.',
                        type: 'error'
                    });
                    console.error('[ON_THE_WAY_ERR]', err);
                }
            }
        });
    };

    // Stop GPS when job is marked Completed
    const handleUpdateStatus = async (bookingId, newStatus) => {
        const actionText = newStatus === 'In-progress' ? 'Arrived' : 'Complete';
        const msg = newStatus === 'In-progress'
            ? 'Mark yourself as arrived and start the service?'
            : 'Mark this job as completed?';

        setAlertData({
            visible: true,
            title: `${actionText} Job`,
            message: msg,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    // If completing/arriving, stop GPS broadcast
                    if (activeGpsBookingId === bookingId) await stopGpsBroadcast();

                    // Optimistic update locally
                    const taskToMove = activeTasks.find(t => t._id === bookingId);
                    if (taskToMove) {
                        const updatedTask = { ...taskToMove, status: newStatus };
                        if (newStatus === 'Completed') {
                            setActiveTasks(prev => prev.filter(t => t._id !== bookingId));
                            setCompletedTasks(prev => [updatedTask, ...prev]);
                        } else {
                            setActiveTasks(prev => prev.map(t => t._id === bookingId ? updatedTask : t));
                        }
                    }

                    // Network request
                    await axios.patch(`${API_BASE}/booking/${bookingId}`, { status: newStatus }, {
                        headers: { Authorization: `Bearer ${userToken}` }
                    });

                    if (newStatus === 'Completed') {
                        fetchEarnings();
                    }
                } catch (err) {
                    setAlertData({
                        visible: true,
                        title: 'Error',
                        message: 'Failed to update status. Reverting changes.',
                        type: 'error'
                    });
                    fetchAllData(true);
                }
            }
        });
    };


    const handleSignOut = () => {
        setLogoutModalVisible(true);
    };

    const getDisplayData = () => {
        if (activeTab === 'Completed') return completedTasks;

        if (activeTab === 'In-Store') {
            return activeTasks.filter(t => t.serviceLocationType !== 'Home Service');
        }

        if (activeTab === 'Home Ops') {
            return activeTasks.filter(t => t.serviceLocationType === 'Home Service');
        }

        return [];
    };

    const handleNavigate = (lat, lng) => {
        if (!lat || !lng) {
            setAlertData({
                visible: true,
                title: 'No Coordinates',
                message: 'This booking has no valid GPS coordinates to navigate to.',
                type: 'warning'
            });
            return;
        }
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url).catch(err => console.error("Couldn't open map", err));
    };

    // Calculate count for the badge
    const homeOpsCount = activeTasks.filter(t => t.serviceLocationType === 'Home Service').length;

    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'completed': return '#22c55e';
            case 'in-progress': return '#23A0CE';
            case 'on the way': return '#f59e0b';
            case 'pending': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'queued': return '#c023ce';
            case 'cancelled': return '#ef4444';
            default: return COLORS.textMuted;
        }
    };

    const renderFooter = () => {
        if (!isFetchingMore || activeTab !== 'Completed') return null;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>Loading older tasks...</Text>
            </View>
        );
    };

    const renderTaskCard = ({ item }) => {
        const isReadyToStart = ['pending', 'confirmed', 'queued'].includes((item.status || '').toLowerCase());
        const isInProgress = (item.status || '').toLowerCase() === 'in-progress';
        const isOnTheWay = (item.status || '').toLowerCase() === 'on the way';
        const isHome = item.serviceLocationType === 'Home Service';
        const isGpsActive = activeGpsBookingId === item._id;

        const statusColor = getStatusColor(item.status);
        const serviceNames = Array.isArray(item.serviceType) ? item.serviceType.join(', ') : item.serviceType;
        const timeFormat = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        const totalPrice = item.totalPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });


        return (
            <TouchableOpacity
                style={styles.taskCard}
                activeOpacity={0.9}
                onPress={() => {
                    setSelectedTask(item);
                    setModalVisible(true);
                }}
            >
                <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.batchId}>Ref: {item.batchId}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {isGpsActive && (
                                <View style={styles.gpsPill}>
                                    <ActivityIndicator size="small" color="#22c55e" style={{ marginRight: 4 }} />
                                    <Text style={styles.gpsPillText}>GPS Live</Text>
                                </View>
                            )}
                            <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {item.status || 'Pending'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <Text style={styles.customerName}>{item.firstName} {item.lastName}</Text>
                        <Text style={styles.vehicleType}>{item.vehicleType}</Text>
                        <Text style={styles.serviceName}>{serviceNames}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                            <Text style={styles.timeInfo}>Created: {timeFormat}</Text>
                            {item.bayId && item.bayId.name && item.serviceLocationType !== 'Home Service' && (
                                <Text style={styles.bayInfo}>Bay: {item.bayId.name}</Text>
                            )}
                            {item.serviceLocationType === 'Home Service' && (
                                <Text style={[styles.bayInfo, { color: '#ef4444' }]}>Home Service</Text>
                            )}
                        </View>

                        {item.serviceLocationType === 'Home Service' && item.homeServiceDetails && item.homeServiceDetails.address && (
                            <View style={{ marginTop: 8, padding: 8, backgroundColor: COLORS.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
                                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Delivery Address:</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.text }}>{item.homeServiceDetails.address}</Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.cardFooter}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                            <Text style={styles.dateText}>{dateStr}</Text>
                            <Text style={styles.totalPriceText}>{totalPrice}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                            {/* Navigate button - always shown for HS with coords */}
                            {isHome && item.homeServiceDetails?.latitude && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { flex: 1, minWidth: 100, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                                    onPress={() => handleNavigate(item.homeServiceDetails.latitude, item.homeServiceDetails.longitude)}
                                >
                                    <Image source={mapIcon} style={{ width: 16, height: 16, tintColor: COLORS.text }} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Navigate</Text>
                                </TouchableOpacity>
                            )}

                            {/* ON THE WAY button - only for HS that is ready to start and not yet driving */}
                            {isHome && isReadyToStart && !isGpsActive && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { flex: 1, minWidth: 120, backgroundColor: '#f59e0b' }]}
                                    onPress={() => handleOnTheWay(item._id, item.homeServiceDetails?.latitude, item.homeServiceDetails?.longitude)}
                                >
                                    <Text style={styles.actionBtnText}>🚗 On the Way</Text>
                                </TouchableOpacity>
                            )}

                            {/* GPS broadcasting indicator OR Auto-Arrived Button */}
                            {isGpsActive && (
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        {
                                            flex: 1,
                                            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
                                            backgroundColor: autoArrivedIds.has(item._id) ? '#23A0CE' : '#22c55e15',
                                            borderWidth: autoArrivedIds.has(item._id) ? 0 : 1,
                                            borderColor: autoArrivedIds.has(item._id) ? 'transparent' : '#22c55e40',
                                        }
                                    ]}
                                    onPress={() => {
                                        if (autoArrivedIds.has(item._id)) {
                                            handleUpdateStatus(item._id, 'In-progress');
                                        } else {
                                            setAlertData({
                                                visible: true,
                                                title: "Force Arrived?",
                                                message: "Are you sure you have arrived at the customer's location?",
                                                type: 'confirm',
                                                onConfirm: () => handleUpdateStatus(item._id, 'In-progress')
                                            });
                                        }
                                    }}
                                >
                                    {!autoArrivedIds.has(item._id) && <ActivityIndicator size="small" color="#22c55e" />}
                                    <Text style={[styles.actionBtnText, { color: autoArrivedIds.has(item._id) ? '#fff' : '#22c55e' }]}>
                                        {autoArrivedIds.has(item._id) ? 'I Arrived' : 'Broadcasting...'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Start Working button - In-Store jobs OR HS after arriving non-GPS scenario */}
                            {((isReadyToStart && !isHome) || (isOnTheWay && !isGpsActive)) && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { flex: 1, minWidth: 120, backgroundColor: '#23A0CE' }]}
                                    onPress={() => handleUpdateStatus(item._id, 'In-progress')}
                                >
                                    <Text style={styles.actionBtnText}>{isOnTheWay ? 'I Arrived' : 'Start Working'}</Text>
                                </TouchableOpacity>
                            )}

                            {/* Finish Job */}
                            {isInProgress && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { flex: 1, backgroundColor: '#22c55e' }]}
                                    onPress={() => handleUpdateStatus(item._id, 'Completed')}
                                >
                                    <Text style={styles.actionBtnText}>Finish Job ✓</Text>
                                </TouchableOpacity>
                            )}
                        </View>


                        {!isReadyToStart && !isInProgress && !isOnTheWay && (
                            <View style={styles.completedState}>
                                <Text style={styles.completedText}>Task completed.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeText}>Hello, {userInfo?.fullName || 'Detailer'}</Text>
                        <Text style={styles.subtitle}>Ready for today's tasks?</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                            <Image
                                source={isDarkMode ? lightThemeIcon : darkThemeIcon}
                                style={styles.themeIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
                            <Image
                                source={logOutIcon}
                                style={styles.logoutIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Modern Todays Revenue Card */}
                <View style={[styles.revenueCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4', borderColor: isDarkMode ? '#334155' : '#bbf7d0' }]}>
                    <View>
                        <Text style={[styles.revenueLabel, { color: isDarkMode ? '#94a3b8' : '#166534' }]}>Today's Earnings</Text>
                        <Text style={[styles.revenueValue, { color: isDarkMode ? '#4ade80' : '#15803d' }]}>₱{todayEarnings.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('EarningsScreen')} style={[styles.viewDetailsBtn, { backgroundColor: isDarkMode ? '#22c55e' : '#16a34a' }]}>
                        <Text style={styles.viewDetailsText}>View Details →</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
                {['In-Store', 'Home Ops', 'Completed'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Image
                                source={
                                    tab === 'In-Store' ? storeIcon :
                                        tab === 'Home Ops' ? homeIcon :
                                            completedIcon
                                }
                                style={[styles.tabIcon, { width: 16, height: 16 }, { tintColor: COLORS.text }]}
                                resizeMode="contain"
                            />
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab === 'In-Store' ? 'In-Store' : tab === 'Home Ops' ? 'Home Ops' : 'Completed'}
                            </Text>
                            {tab === 'Home Ops' && homeOpsCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{homeOpsCount}</Text>
                                </View>
                            )}
                        </View>
                        {activeTab === tab && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <View style={{ padding: 20 }}>
                    <BookingCardSkeleton detailer />
                    <BookingCardSkeleton detailer />
                    <BookingCardSkeleton detailer />
                </View>
            ) : (
                <FlashList
                    data={getDisplayData()}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    renderItem={renderTaskCard}
                    estimatedItemSize={200}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    onEndReached={activeTab === 'Completed' ? onEndReached : null}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        (activeTab === 'Home Ops' && getDisplayData().some(t => t.homeServiceDetails?.latitude)) ? (
                            <View style={styles.mapContainer}>
                                <MapView
                                    style={StyleSheet.absoluteFillObject}
                                    initialRegion={{
                                        latitude: getDisplayData().find(t => t.homeServiceDetails?.latitude)?.homeServiceDetails.latitude || 14.5995,
                                        longitude: getDisplayData().find(t => t.homeServiceDetails?.longitude)?.homeServiceDetails.longitude || 120.9842,
                                        latitudeDelta: 0.0922,
                                        longitudeDelta: 0.0421,
                                    }}
                                >
                                    {getDisplayData().map(t => {
                                        if (!t.homeServiceDetails?.latitude) return null;
                                        return (
                                            <Marker
                                                key={t._id}
                                                coordinate={{
                                                    latitude: t.homeServiceDetails.latitude,
                                                    longitude: t.homeServiceDetails.longitude
                                                }}
                                                title={t.firstName + " " + t.lastName}
                                                description={t.serviceType?.join(', ') || t.serviceType}
                                                pinColor="#ef4444"
                                            />
                                        )
                                    })}
                                </MapView>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} tasks assigned to you right now.</Text>
                        </View>
                    }
                />
            )}

            <BookingDetailModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedTask(null);
                }}
                item={selectedTask}
                COLORS={COLORS}
                getStatusColor={getStatusColor}
            />

            <LogoutModal
                visible={logoutModalVisible}
                onClose={() => setLogoutModalVisible(false)}
                onConfirm={logout}
                cancelText="No, I'm working"
                confirmText="Yes, I'm done"
            />

            <CustomAlertModal
                visible={alertData.visible}
                title={alertData.title}
                message={alertData.message}
                type={alertData.type}
                onConfirm={alertData.onConfirm}
                onClose={() => setAlertData({ ...alertData, visible: false })}
            />
        </SafeAreaView>
    );
};


const getStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: 24, paddingBottom: 16 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    welcomeText: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    themeToggle: {
        padding: 8,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    themeIcon: {
        width: 18,
        height: 18,
        tintColor: COLORS.text
    },
    logoutBtn: { padding: 8, backgroundColor: '#ef444415', borderRadius: 20, borderWidth: 1, borderColor: '#ef444430' },
    logoutText: { fontSize: 16, color: '#ef4444' },
    revenueCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
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
    totalPriceText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#22c55e',
    },

    revenueLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
    revenueValue: { fontSize: 28, fontWeight: '900' },
    viewDetailsBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    viewDetailsText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, justifyContent: 'space-around', marginBottom: 10 },
    tab: { paddingVertical: 12, alignItems: 'center', flex: 1 },
    tabText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    activeTab: {},
    activeTabText: { color: COLORS.primary, fontWeight: '800' },
    activeIndicator: { position: 'absolute', bottom: -1, left: 20, right: 20, height: 3, backgroundColor: COLORS.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    listContent: { padding: 20, paddingBottom: 80 },
    taskCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statusStripe: { width: 4 },
    cardContent: { flex: 1, padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    batchId: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    cardBody: { marginBottom: 16 },
    customerName: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    vehicleType: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
    serviceName: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
    timeInfo: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
    bayInfo: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
    cardFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
    actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    completedState: { paddingVertical: 8, alignItems: 'center' },
    completedText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
    emptyContainer: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 30 },
    emptyIcon: { fontSize: 40, marginBottom: 16 },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
    badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    mapContainer: { height: 200, width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
    gpsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e15', borderWidth: 1, borderColor: '#22c55e40', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    gpsPillText: { color: '#22c55e', fontSize: 10, fontWeight: '800' },
    logoutIcon: { width: 16, height: 16, tintColor: COLORS.danger }
});

export default DetailerDashboard;
