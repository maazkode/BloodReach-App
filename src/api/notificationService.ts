import {
    getMessaging,
    requestPermission,
    getToken,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Creates the required Android notification channels
 */
export const initializeNotificationChannel = async () => {
    if (Platform.OS === 'android') {
        await notifee.createChannel({
            id: 'default',
            name: 'Urgent Notifications',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
        });
        console.log('[FCM] Notification channel "default" created/verified.');
    }
};

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
    
    // Notifee permission request (Android 13+)
    await notifee.requestPermission();
    
    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

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

        const messaging = getMessaging();
        const token = await getToken(messaging);
        if (token) {
            console.log('[FCM] Token Retrieved:', token);
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
    const messaging = getMessaging();
    return onMessage(messaging, async remoteMessage => {
        console.log('[FCM] Foreground Message Received:', JSON.stringify(remoteMessage, null, 2));
        
        // Display a real notification using Notifee
        await notifee.displayNotification({
            title: remoteMessage.notification?.title || 'Urgent Update',
            body: remoteMessage.notification?.body || 'Matching blood request found nearby.',
            android: {
                channelId: 'default',
                importance: AndroidImportance.HIGH,
                pressAction: {
                    id: 'default',
                },
            },
            data: remoteMessage.data,
        });
    });
};

/**
 * Handles notification clicks when app is in background or quit state
 */
export const setupNotificationHandlers = () => {
    const messaging = getMessaging();

    // 1. App in Background
    onNotificationOpenedApp(messaging, remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        if (remoteMessage.data?.requestId) {
            navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
        }
    });

    // 2. App was Quit (Initial Notification)
    getInitialNotification(messaging)
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log('Notification caused app to open from quit state:', remoteMessage);
                if (remoteMessage.data?.requestId) {
                    navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
                }
            }
        });
};

/**
 * Triggers a local notification alert (Foreground)
 */
export const triggerLocalNotification = (title: string, body: string, requestId?: string) => {
    console.log('[FCM] Triggering Local Notification:', { title, body, requestId });
    Alert.alert(
        title,
        body,
        [
            {
                text: 'View Details',
                onPress: () => {
                    if (requestId) {
                        navigate('RequestDetail', { requestId });
                    }
                }
            },
            {
                text: 'Dismiss',
                style: 'cancel'
            }
        ]
    );
};

