import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { authAPI, authEvents } from '../services/api';
import socketService from '../../services/socketService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadUserFromStorage();

    // Listen for 401 unauthorized events from API interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      socketService.disconnect();
      router.replace('/(auth)/login');
    };

    authEvents.on('unauthorized', handleUnauthorized);
    return () => authEvents.off('unauthorized', handleUnauthorized);
  }, []);

  const loadUserFromStorage = async () => {
    try {
      // TEMPORARY: Force clear expired token once
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('🧹 Cleared stored session');
    } catch (e) {}
    finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.data.status === 'success') {
        const { user: userData, token: userToken } = response.data.data;
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await socketService.connect();
        return { success: true, data: response.data };
      }
      return { success: false, message: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register({ name, email, password });
      if (response.data.status === 'success') {
        const { user: userData, token: userToken } = response.data.data;
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await socketService.connect();
        return { success: true, data: response.data };
      }
      return { success: false, message: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      socketService.disconnect();
      setUser(null);
      setToken(null);
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