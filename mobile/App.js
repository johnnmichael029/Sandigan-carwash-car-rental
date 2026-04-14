import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { ActivityIndicator, View, Text, Image } from 'react-native';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingsScreen from './src/screens/BookingsScreen';
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


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component — simple emoji labels or custom image icons
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

// ── Authenticated Tab Navigator ──────────────────────────────────────────────
const MainTabs = () => {
  const { COLORS, isDarkMode } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.cardBackground,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
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
        name="Book"
        component={BookingScreen}
        options={{
          tabBarLabel: 'Book a Wash',
          tabBarIcon: ({ focused, color }) => {
            const iconSource = focused ? carwashActiveIcon : (isDarkMode ? carwashDarkIcon : carwashLightIcon);
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

// ── Root Navigator: decides auth vs main app ─────────────────────────────────
const AppNav = () => {
  const { isSplashLoading, userToken } = useContext(AuthContext);
  const { COLORS, isDarkMode } = useContext(ThemeContext);

  if (isSplashLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
          {userToken !== null ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Rental" component={RentalScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
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
