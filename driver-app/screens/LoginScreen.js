import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber) return Alert.alert('Error', 'Please enter your phone number.');
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/driver/login`, {
        phone_number: phoneNumber,
        otp: otp
      });
      
      await AsyncStorage.setItem('driver_id', String(response.data.driver_id));
      
      // If login is successful, navigate to the Manifest screen and pass the driver_id
      navigation.replace('Manifest', { 
        driverId: response.data.driver_id,
        driverName: response.data.name 
      });
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Unable to reach dispatch server.';
      Alert.alert('Login Failed', message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LogiMind Driver</Text>
      <Text style={styles.subtitle}>Enter your registered mobile number</Text>
      
      <TextInput
        style={styles.input}
        placeholder="+91 9876543210"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        placeholderTextColor="#64748b"
        keyboardType="number-pad"
        secureTextEntry={true} // Hide the OTP
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#60a5fa', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 15, borderRadius: 10, fontSize: 18, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#475569' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
