import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import DonorRegistrationScreen from './src/screens/DonorRegistrationScreen';
import RecipientRegistrationScreen from './src/screens/RecipientRegistrationScreen';
import DonorDashboard from './src/screens/DonorDashboardScreen';
import RequesterDashboard from './src/screens/RequesterDashboardScreen';

export type RootStackParamList = {
  Splash: undefined;
  RoleSelection: undefined;
  Auth: { role: 'donor' | 'requester' };
  Home: undefined;
  DonorRegistration: undefined;
  DonorDashboard: undefined;
  RequesterDashboard: undefined;
  RecipientRegistration: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  // 1. Splash Screen Branding & Auth Initialization
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {user ? (
          // 2. Authenticated Stack: Direct to Dashboard
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="DonorDashboard" component={DonorDashboard} />
            <Stack.Screen name="RequesterDashboard" component={RequesterDashboard} />
            <Stack.Screen name="DonorRegistration" component={DonorRegistrationScreen} />
            <Stack.Screen name="RecipientRegistration" component={RecipientRegistrationScreen} />
            {/* Allow access to role selection if profile is missing */}
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          // 3. Unauthenticated Stack: Direct to Role Selection
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
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

