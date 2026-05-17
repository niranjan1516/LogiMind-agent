
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.12.123.200:8000';
// Your existing HTTP URL
//export const API_BASE_URL = process.env.DEFAULT_API_BASE_URL || 'http://192.168.1.x:8000';

// NEW: The WebSocket URL (Notice the ws:// instead of http://)
// If you are using HTTPS in production, this becomes wss://
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');