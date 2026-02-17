import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import socketService from '../../services/socketService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Connect socket if user was already logged in
        await socketService.connect();
        console.log('🔌 Socket connected on app start');
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.data.status === 'success') {
        const { user: userData, token: userToken } = response.data.data;
        
        // Save to state
        setUser(userData);
        setToken(userToken);
        
        // Save to storage
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        // Connect WebSocket after successful login
        await socketService.connect();
        console.log('🔌 Socket connected after login');
        
        return { success: true, data: response.data };
      }
      
      return { success: false, message: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register({ name, email, password });
      
      if (response.data.status === 'success') {
        const { user: userData, token: userToken } = response.data.data;
        
        // Save to state
        setUser(userData);
        setToken(userToken);
        
        // Save to storage
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        // Connect WebSocket after successful registration
        await socketService.connect();
        console.log('🔌 Socket connected after registration');
        
        return { success: true, data: response.data };
      }
      
      return { success: false, message: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Disconnect WebSocket before logout
      socketService.disconnect();
      console.log('🔌 Socket disconnected on logout');
      
      // Clear state
      setUser(null);
      setToken(null);
      
      // Clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;