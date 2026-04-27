import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: any) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name as any, params);
    }
}

/**
 * Requests notification permission from the user
 */
export const requestUserPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            return result === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    }
    
    const authStatus = await messaging().requestPermission();
    const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
};

/**
 * Retrieves the FCM token for the device
 */
export const getFCMToken = async (): Promise<string | null> => {
    try {
        // Ensure we have permissions first
        const hasPermission = await requestUserPermission();
        if (!hasPermission) return null;

        const token = await messaging().getToken();
        if (token) {
            console.log('FCM Token:', token);
            return token;
        }
        return null;
    } catch (error) {
        console.error('Error fetching FCM token:', error);
        return null;
    }
};

/**
 * Handles foreground notifications (shows an alert)
 */
export const subscribeToForegroundMessages = () => {
    return messaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived in foreground!', remoteMessage);
        Alert.alert(
            remoteMessage.notification?.title || 'Urgent Update',
            remoteMessage.notification?.body || 'Matching blood request found nearby.'
        );
    });
};

/**
 * Handles notification clicks when app is in background or quit state
 */
export const setupNotificationHandlers = () => {
    // 1. App in Background
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        if (remoteMessage.data?.requestId) {
            navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
        }
    });

    // 2. App was Quit (Initial Notification)
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log('Notification caused app to open from quit state:', remoteMessage);
                if (remoteMessage.data?.requestId) {
                    navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
                }
            }
        });
};
