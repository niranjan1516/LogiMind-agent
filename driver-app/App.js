import React from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import ManifestScreen from './screens/ManifestScreen';
import { API_BASE_URL } from './config/api';

const Stack = createNativeStackNavigator();

// 1. EXPORT this so ManifestScreen.js can import it
export const LOCATION_TASK_NAME = 'background-location-task';

// 2. Define the background task globally
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background Task Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        // Retrieve the actual ID saved during login
        const driverId = await AsyncStorage.getItem('driver_id');
        if (!driverId) return;

        await axios.post(`${API_BASE_URL}/telemetry`, {
          driver_id: driverId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0
        });
      } catch (err) {
        console.log("Telemetry sync failed:", err.message);
      }
    }
  }
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen 
          name="Manifest" 
          component={ManifestScreen} 
          options={{ 
            title: 'Active Dispatch',
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#fff',
            headerBackVisible: false 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
