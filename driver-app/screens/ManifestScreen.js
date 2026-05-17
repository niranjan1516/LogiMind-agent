import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { LOCATION_TASK_NAME } from '../App';
import * as Location from 'expo-location';
import { API_BASE_URL } from '../config/api';

export default function ManifestScreen({ route }) {
  const { driverId, driverName } = route.params;
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchActiveOrder();
  }, []);

  const fetchActiveOrder = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/driver/${driverId}/active-order`);
      setOrderData(response.data);
    } catch (error) {
      console.log("Fetch Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // The Phase 2.2 State Machine
  const getNextAction = (currentStatus) => {
    switch (currentStatus) {
      case 'PENDING': return { next: 'ACCEPTED', label: 'Accept Order' };
      case 'ACCEPTED': return { next: 'ARRIVED_AT_PICKUP', label: 'Arrived at Pickup' };
      case 'ARRIVED_AT_PICKUP': return { next: 'CARGO_LOADED', label: 'Cargo Loaded (Start Route)' };
      case 'CARGO_LOADED': return { next: 'DELIVERED', label: 'Mark as Delivered' };
      default: return null;
    }
  };

  // const handleStatusUpdate = async () => {
  //   if (!orderData?.order) return;
    
  //   const action = getNextAction(orderData.order.status);
  //   if (!action) return;

  //   setUpdating(true);
  //   try {
  //     await axios.put(`${API_URL}/orders/${orderData.order.order_id}/status`, {
  //       status: action.next
  //     });
      
  //     // PHASE 2.3 PREPARATION: If status is now CARGO_LOADED, we will trigger GPS here later.
  //     if (action.next === 'CARGO_LOADED') {
  //       Alert.alert("Route Started", "GPS Telemetry will now begin transmitting.");
  //     }
      
  //     if (action.next === 'DELIVERED') {
  //       setOrderData({ has_order: false, order: null });
  //       Alert.alert("Success", "Delivery confirmed and logged.");
  //     } else {
  //       fetchActiveOrder(); // Refresh UI for the next stage
  //     }
  //   } catch (error) {
  //     Alert.alert("Update Failed", "Could not reach dispatch servers.");
  //     console.log(error);
  //   } finally {
  //     setUpdating(false);
  //   }
  // };

  const startTracking = async () => {
    // 1. MUST request Foreground first
    const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
    if (foreStatus !== 'granted') {
      Alert.alert("Permission Denied", "Foreground location is required.");
      return;
    }

    // 2. Then request Background
    const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backStatus !== 'granted') {
      Alert.alert("Permission Denied", "Please set Location to 'Always Allow' in your phone settings.");
      return;
    }

    // 3. Start the task
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000, 
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: "LogiMind Live Tracking",
        notificationBody: "Reporting location to Dispatch...",
      },
    });
    console.log("Tracking started successfully");
  };

  const handleStatusUpdate = async () => {
    if (!orderData?.order) return;
    
    const action = getNextAction(orderData.order.status);
    if (!action) return;

    setUpdating(true);
    try {
      await axios.put(`${API_BASE_URL}/orders/${orderData.order.order_id}/status`, {
        status: action.next
      });
      
      // CRITICAL FIX: Actually CALL the functions here!
      if (action.next === 'CARGO_LOADED') {
        await startTracking(); // Start GPS
        Alert.alert("Route Started", "GPS Tracking is now ACTIVE.");
      }
      
      if (action.next === 'DELIVERED') {
        await stopTracking(); // Stop GPS
        setOrderData({ has_order: false, order: null });
        Alert.alert("Success", "Delivery confirmed.");
      } else {
        fetchActiveOrder(); 
      }
    } catch (error) {
      Alert.alert("Update Failed", "Check server connection.");
    } finally {
      setUpdating(false);
    }
  };



const stopTracking = async () => {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
};


if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const actionDetails = orderData?.order ? getNextAction(orderData.order.status) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {driverName}</Text>
      
      {!orderData?.has_order ? (
        <View style={styles.noOrderCard}>
          <Text style={styles.noOrderText}>No active routes assigned.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{orderData.order.status.replace(/_/g, ' ')}</Text>
          </View>
          
          <Text style={styles.label}>PICKUP</Text>
          <Text style={styles.value}>{orderData.order.pickup_location}</Text>
          
          <Text style={styles.label}>DROP-OFF</Text>
          <Text style={styles.value}>{orderData.order.drop_location}</Text>
          
          <Text style={styles.label}>CARGO WEIGHT</Text>
          <Text style={styles.value}>{orderData.order.weight_kg} KG</Text>
          
          {actionDetails && (
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                updating && { opacity: 0.7 },
                // Make the "Cargo Loaded" button a distinct color since it starts GPS tracking
                actionDetails.next === 'CARGO_LOADED' && { backgroundColor: '#f59e0b' }
              ]} 
              onPress={handleStatusUpdate}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {updating ? 'Transmitting...' : actionDetails.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Keep your existing styles at the bottom
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  noOrderCard: { backgroundColor: '#1e293b', padding: 30, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  noOrderText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#334155' },
  statusBadge: { backgroundColor: '#3b82f620', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginBottom: 15 },
  statusText: { color: '#60a5fa', fontWeight: 'bold' },
  label: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  value: { color: '#fff', fontSize: 16, fontWeight: '500' },
  actionButton: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
