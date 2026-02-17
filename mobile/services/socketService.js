import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://192.168.12.195:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found, cannot connect socket');
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected:', this.socket.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.log('🔴 Connection error:', error.message);
      });

    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('Socket disconnected');
    }
  }

  // Subscribe to budget alerts
  onBudgetAlert(callback) {
    if (!this.socket) {
      console.log('Socket not connected');
      return;
    }

    this.socket.on('budgetAlert', callback);
    console.log('📢 Subscribed to budget alerts');
  }

  // Remove budget alert listener
  offBudgetAlert() {
    if (this.socket) {
      this.socket.off('budgetAlert');
      console.log('🔇 Unsubscribed from budget alerts');
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();