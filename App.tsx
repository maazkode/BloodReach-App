import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import UnifiedRegistrationScreen from './src/screens/UnifiedRegistrationScreen';
import DonorDashboard from './src/screens/DonorDashboardScreen';
import RequesterDashboard from './src/screens/RequesterDashboardScreen';
import CreateRequestScreen from './src/screens/CreateRequestScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';
import DonorHelpDetailScreen from './src/screens/DonorHelpDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {
  navigationRef,
  subscribeToForegroundMessages,
  setupNotificationHandlers
} from './src/services/notificationService';
import { useEffect } from 'react';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Home: undefined;
  UnifiedRegistration: undefined;
  DonorDashboard: undefined;
  RequesterDashboard: undefined;
  CreateRequest: undefined;
  Profile: undefined;
  RequestDetail: { requestId: string };
  DonorHelpDetail: { requestId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Initialize Notification Listeners
    const unsubscribe = subscribeToForegroundMessages();
    setupNotificationHandlers();

    // Register FCM Token
    const registerToken = async () => {
      if (user) {
        const { getFCMToken } = require('./src/services/notificationService');
        const { saveUserFCMToken } = require('./src/services/firestoreService');
        const token = await getFCMToken();
        if (token) {
          await saveUserFCMToken(user.uid, token);
        }
      }
    };
    registerToken();

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="UnifiedRegistration" component={UnifiedRegistrationScreen} />
            <Stack.Screen name="DonorDashboard" component={DonorDashboard} />
            <Stack.Screen name="RequesterDashboard" component={RequesterDashboard} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
            <Stack.Screen name="DonorHelpDetail" component={DonorHelpDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
