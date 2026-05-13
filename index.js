/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import notifee from '@notifee/react-native';

// Register background handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('[FCM] Background Message Received:', JSON.stringify(remoteMessage, null, 2));
    // Notifee automatically handles system notifications if notification payload is present,
    // but we can add extra logic here if needed.
});

AppRegistry.registerComponent(appName, () => App);
