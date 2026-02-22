import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import DonorRegistrationScreen from './src/screens/DonorRegistrationScreen';
import RecipientRegistrationScreen from './src/screens/RecipientRegistrationScreen';

export type RootStackParamList = {
  Splash: undefined;
  RoleSelection: undefined;
  Auth: { role: 'donor' | 'requester' };
  Home: undefined;
  DonorRegistration: undefined;
  RecipientRegistration: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DonorRegistration" component={DonorRegistrationScreen} />
          <Stack.Screen name="RecipientRegistration" component={RecipientRegistrationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
