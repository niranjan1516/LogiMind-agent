
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://logimind-api.onrender.com';
// Your existing HTTP URL
//export const API_BASE_URL = process.env.DEFAULT_API_BASE_URL || 'http://192.168.1.x:8000';

// NEW: The WebSocket URL (Notice the ws:// instead of http://)
// If you are using HTTPS in production, this becomes wss://
export const WS_BASE_URL = 'ws://logimind-api.onrender.com';