import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#23A0CE',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return null; // The user refused notification permissions
        }
        
        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                console.warn('No Expo Project ID found in app.json. Push notifications might not work correctly.');
            }
             // getExpoPushTokenAsync() is specific to Expo push service (required for exp.host routing)
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            console.log("Expo Push Token:", token);
        } catch(e) {
            console.error("Error fetching push token:", e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
