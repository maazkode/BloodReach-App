/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import notifee, { AndroidImportance } from '@notifee/react-native';

// Register background handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('[FCM] Background Message Received:', JSON.stringify(remoteMessage, null, 2));
    
    // Manually display notification for data-only messages using Notifee.
    // If remoteMessage.notification exists, the OS automatically displays one, so we don't need to.
    if (remoteMessage.data && !remoteMessage.notification) {
        await notifee.displayNotification({
            title: remoteMessage.notification?.title || remoteMessage.data.title || 'Urgent Update',
            body: remoteMessage.notification?.body || remoteMessage.data.body || 'New notification',
            data: remoteMessage.data,
            android: {
                channelId: 'default',
                importance: AndroidImportance.HIGH,
                pressAction: {
                    id: 'default',
                },
            },
        });
    }
});

// Register background handler for Notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[Notifee] Background Event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);
