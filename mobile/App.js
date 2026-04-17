import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { ActivityIndicator, View, Text, Image, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';
import { API_BASE } from './src/api/config';
import { registerForPushNotificationsAsync } from './src/utils/pushNotifications';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DetailerDashboard from './src/screens/DetailerDashboard';
import EarningsScreen from './src/screens/EarningsScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import RentalsScreen from './src/screens/RentalsScreen';
import RentalScreen from './src/screens/RentalScreen';
import MeScreen from './src/screens/MeScreen';

import homeDarkIcon from './assets/icon/home-dark.png';
import homeLightIcon from './assets/icon/home-light.png';
import homeActiveIcon from './assets/icon/home-active.png';
import carwashDarkIcon from './assets/icon/carwash-dark.png';
import carwashLightIcon from './assets/icon/carwash-light.png';
import carwashActiveIcon from './assets/icon/carwash-active.png';
import bookingsLightIcon from './assets/icon/bookings-light.png';
import bookingsDarkIcon from './assets/icon/bookings-dark.png';
import bookingsActiveIcon from './assets/icon/bookings-active.png';
import meDarkIcon from './assets/icon/me-dark.png';
import meLightIcon from './assets/icon/me-light.png';
import meActiveIcon from './assets/icon/me-active.png';
import carRentDarkIcon from './assets/icon/car-rent-dark.png';
import carRentLightIcon from './assets/icon/car-rent-light.png';
import carRentActiveIcon from './assets/icon/car-rent-active.png';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Push Notification Setup ───────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Removed local registerForPushNotificationsAsync, using centralized util

// ── Tab Icon Component ────────────────────────────────────────────────────────
const TabIcon = ({ emoji, icon, focused, color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>
    {icon ? (
      <Image
        source={icon}
        style={{ width: focused ? 26 : 24, height: focused ? 26 : 24, tintColor: color }}
        resizeMode="contain"
      />
    ) : (
      <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>
    )}
  </View>
);

import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { DeviceEventEmitter, Animated } from 'react-native';

const AnimatedTabBar = (props) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('toggleTabBar', (hide) => {
      Animated.timing(translateY, {
        toValue: hide ? 150 : 0, // 150 pushes it completely off the screen
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    return () => sub.remove();
  }, [translateY]);

  return (
    <Animated.View style={{
      transform: [{ translateY }],
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      elevation: 0, // remove elevation here to prevent shadow conflicts
      zIndex: 100 // ensure it stays on top
    }}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
};

// ── Authenticated Tab Navigator ──
const MainTabs = () => {
  const { COLORS, isDarkMode } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 15,
          left: 15,
          right: 15,
          borderRadius: 25,
          backgroundColor: COLORS.cardBackground,
          borderTopWidth: 0,
          height: 65,
          marginRight: 10,
          marginLeft: 10,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 15,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => {
            const iconSource = focused ? homeActiveIcon : (isDarkMode ? homeDarkIcon : homeLightIcon);
            return <TabIcon icon={iconSource} focused={focused} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'My Bookings',
          tabBarIcon: ({ focused, color }) => {
            const iconSource = focused ? bookingsActiveIcon : (isDarkMode ? bookingsDarkIcon : bookingsLightIcon);
            return <TabIcon icon={iconSource} focused={focused} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="MyRentals"
        component={RentalsScreen}
        options={{
          tabBarLabel: 'My Rentals',
          tabBarIcon: ({ focused, color }) => {
            const iconSource = focused ? carRentActiveIcon : (isDarkMode ? carRentDarkIcon : carRentLightIcon);
            return <TabIcon icon={iconSource} focused={focused} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{
          tabBarLabel: 'Me',
          tabBarIcon: ({ focused, color }) => {
            const iconSource = focused ? meActiveIcon : (isDarkMode ? meDarkIcon : meLightIcon);
            return <TabIcon icon={iconSource} focused={focused} color={color} />;
          },
        }}
      />
    </Tab.Navigator>
  );
};

// ── Root Navigator ────────────────────────────────────────────────────────────
const AppNav = () => {
  const { isSplashLoading, userToken, userInfo } = useContext(AuthContext);
  const { COLORS, isDarkMode } = useContext(ThemeContext);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Register for push notifications once logged in
  useEffect(() => {
    if (!userToken) return;

    // Automatically get the token and upload to the server
    const initPushData = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        try {
          await axios.post(
            `${API_BASE}/customer-auth/push-token`,
            { pushToken: token },
            { headers: { Authorization: `Bearer ${userToken}` } }
          );
          console.log("Uploaded Push Token successfully");
        } catch (err) {
          console.log('Push token upload failed:', err.message);
        }
      }
    };
    initPushData();

    // Listener: notification received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Toast is already shown by the system — no extra action needed
      console.log('Notification received:', notification.request.content.title);
    });

    // Listener: user tapped on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Future: navigate to booking detail if data.bookingId exists
      console.log('Notification tapped, data:', data);
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [userToken]);

  if (isSplashLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const navTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: COLORS.background,
      card: COLORS.background,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background }, animation: 'slide_from_right' }}>
            {userToken !== null ? (
              userInfo?.isEmployee ? (
                // DETAILER / EMPLOYEE STACK
                <>
                  <Stack.Screen name="DetailerDashboard" component={DetailerDashboard} />
                  <Stack.Screen name="EarningsScreen" component={EarningsScreen} />
                </>
              ) : (
                // CUSTOMER STACK
                <>
                  <Stack.Screen name="MainTabs" component={MainTabs} />
                  <Stack.Screen name="Book" component={BookingScreen} />
                  <Stack.Screen name="Rental" component={RentalScreen} />
                </>
              )
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Stack.Navigator>
        </View>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
