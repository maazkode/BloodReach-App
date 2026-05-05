import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/features/shared/context/AuthContext';
import { ModalProvider } from './src/features/shared/context/ModalContext';
import SplashScreen from './src/features/shared/screens/SplashScreen';
import AuthScreen from './src/features/auth/screens/AuthScreen';
import HomeScreen from './src/features/shared/screens/HomeScreen';
import UnifiedRegistrationScreen from './src/features/auth/screens/UnifiedRegistrationScreen';
import DonorDashboard from './src/features/donor/screens/DonorDashboardScreen';
import RequesterDashboard from './src/features/requester/screens/RequesterDashboardScreen';
import CreateRequestScreen from './src/features/requester/screens/CreateRequestScreen';
import ProfileScreen from './src/features/shared/screens/ProfileScreen';
import RequestDetailScreen from './src/features/requester/screens/RequestDetailScreen';
import DonorHelpDetailScreen from './src/features/donor/screens/DonorHelpDetailScreen';
import SettingsScreen from './src/features/shared/screens/SettingsScreen';
import {
  navigationRef,
  subscribeToForegroundMessages,
  setupNotificationHandlers
} from './src/features/shared/services/notificationService';

import { useEffect } from 'react';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Home: undefined;
  UnifiedRegistration: undefined;
  DonorDashboard: { tab?: string };
  RequesterDashboard: { tab?: string };
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
        const { getFCMToken } = require('./src/features/shared/services/notificationService');
        const { saveUserFCMToken } = require('./src/features/shared/services/firestoreService');
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
        <ModalProvider>
          <RootNavigator />
        </ModalProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
