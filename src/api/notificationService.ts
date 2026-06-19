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
import forge from 'node-forge';
import { FIREBASE_SERVICE_ACCOUNT } from '../config/firebaseServiceAccount';

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
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                {
                    title: 'BloodReach Notification Permission',
                    message: 'BloodReach needs permission to send you push notifications for urgent blood requests and updates.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
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
            title: remoteMessage.notification?.title || (remoteMessage.data?.title as string) || 'Urgent Update',
            body: remoteMessage.notification?.body || (remoteMessage.data?.body as string) || 'Matching blood request found nearby.',
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

const base64UrlEncode = (str: string): string => {
    const base64 = forge.util.encode64(forge.util.createBuffer(str, 'utf8').getBytes());
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const getAccessToken = async (): Promise<string> => {
    const { client_email, private_key } = FIREBASE_SERVICE_ACCOUNT;
    if (!client_email || !private_key || client_email.includes('CLIENT_EMAIL') || private_key.includes('PRIVATE_KEY')) {
        throw new Error('Firebase Service Account is not configured.');
    }

    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    const tokenInput = base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(claim));

    const md = forge.md.sha256.create();
    md.update(tokenInput, 'utf8');

    const cleanKey = private_key.replace(/\\n/g, '\n');
    const privateKey = forge.pki.privateKeyFromPem(cleanKey);
    const signatureBytes = privateKey.sign(md);

    const signatureBase64 = forge.util.encode64(signatureBytes);
    const signatureBase64Url = signatureBase64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const assertion = tokenInput + '.' + signatureBase64Url;

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to obtain OAuth2 token: ${errText}`);
    }

    const resData = await response.json() as { access_token: string };
    return resData.access_token;
};

/**
 * Sends a push notification to a specific device token using FCM v1 REST API.
 */
export const sendPushNotification = async (
    targetToken: string,
    title: string,
    body: string,
    data: any = {}
) => {
    const { project_id } = FIREBASE_SERVICE_ACCOUNT;
    try {
        console.log('[FCM v1] Preparing to send push notification to token:', targetToken);
        const accessToken = await getAccessToken();

        const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    message: {
                        token: targetToken,
                        data: {
                            ...data,
                            title: title,
                            body: body,
                            requestId: data.requestId || '',
                            type: data.type || '',
                        },
                        android: {
                            priority: 'HIGH',
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            const errResponse = await response.text();
            console.error('[FCM v1] Error response:', errResponse);
        } else {
            const resJSON = await response.json();
            console.log('[FCM v1] Push notification sent successfully:', resJSON);
        }
    } catch (error) {
        console.error('[FCM v1] Failed to send push notification:', error);
    }
};

/**
 * Helper to route users when they click a notification
 */
export const handleNotificationClick = (notification: any) => {
    const requestId = notification?.data?.requestId as string | undefined;
    const type = notification?.data?.type as string | undefined;

    console.log('[NotificationService] Handling notification click:', { requestId, type });
    if (!requestId) return;

    if (type === 'new_request' || type === 'match_accepted' || type === 'donation_in_progress') {
        navigate('DonorHelpDetail', { requestId });
    } else {
        navigate('RequestDetail', { requestId });
    }
};

/**
 * Handles notification clicks when app is in background or quit state
 */
export const setupNotificationHandlers = () => {
    const messaging = getMessaging();

    // 1. App in Background (FCM)
    onNotificationOpenedApp(messaging, remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        if (remoteMessage.data?.requestId) {
            navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
        }
    });

    // 2. App was Quit (Initial FCM Notification)
    getInitialNotification(messaging)
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log('Notification caused app to open from quit state:', remoteMessage);
                if (remoteMessage.data?.requestId) {
                    navigate('RequestDetail', { requestId: remoteMessage.data.requestId as string });
                }
            }
        });

    // 3. Notifee Foreground click listener
    notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification) {
            console.log('[Notifee] Foreground notification click:', detail.notification);
            handleNotificationClick(detail.notification);
        }
    });

    // 4. Notifee Initial Notification (App was Quit via Notifee click)
    notifee.getInitialNotification()
        .then(initialNotification => {
            if (initialNotification?.notification) {
                console.log('[Notifee] App opened from quit state via notification click:', initialNotification.notification);
                handleNotificationClick(initialNotification.notification);
            }
        })
        .catch(error => {
            console.error('[Notifee] getInitialNotification error:', error);
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

