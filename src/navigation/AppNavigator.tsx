import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import UnifiedRegistrationScreen from '../screens/UnifiedRegistrationScreen';
import DonorDashboard from '../screens/DonorDashboardScreen';
import RequesterDashboard from '../screens/RequesterDashboardScreen';
import CreateRequestScreen from '../screens/CreateRequestScreen';
import RequestDetailScreen from '../screens/RequestDetailScreen';
import DonorHelpDetailScreen from '../screens/DonorHelpDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { useSmartLocation } from '../hooks/useSmartLocation';
import { useAppNotificationListener } from '../hooks/useAppNotificationListener';
import {
  navigationRef,
  subscribeToForegroundMessages,
  setupNotificationHandlers
} from '../api/notificationService';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Home: undefined;
  UnifiedRegistration: undefined;
  DonorDashboard: { tab?: string };
  RequesterDashboard: { tab?: string };
  CreateRequest: { editMode?: boolean; requestData?: any } | undefined;
  RequestDetail: { requestId: string };
  DonorHelpDetail: { requestId: string };
  Settings: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuth();
  
  useSmartLocation();
  useAppNotificationListener();

  useEffect(() => {
    // Initialize Notification Channels (Notifee)
    const { initializeNotificationChannel } = require('../api/notificationService');
    initializeNotificationChannel();

    // Initialize Notification Listeners
    const unsubscribe = subscribeToForegroundMessages();
    setupNotificationHandlers();

    // Register FCM Token
    const registerToken = async () => {
      if (user) {
        const { getFCMToken } = require('../api/notificationService');
        const { saveUserFCMToken } = require('../api/firestoreService');
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
            <Stack.Screen name="DonorDashboard" component={DonorDashboard} options={{ animation: 'none' }} />
            <Stack.Screen name="RequesterDashboard" component={RequesterDashboard} options={{ animation: 'none' }} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
            <Stack.Screen name="DonorHelpDetail" component={DonorHelpDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'none' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
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
};

export default AppNavigator;
