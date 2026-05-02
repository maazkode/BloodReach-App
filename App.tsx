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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Initialize Notification Listeners
    const unsubscribe = subscribeToForegroundMessages();
    setupNotificationHandlers();

    return unsubscribe;
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
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
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
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
