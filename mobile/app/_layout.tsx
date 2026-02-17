import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import socketService from '../services/socketService';
import BudgetAlertBanner from '../components/BudgetAlertBanner';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // 🚨 Global Budget Alert State
  const [budgetAlert, setBudgetAlert] = useState(null);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // 🚨 Setup Global Budget Alert Listener
  useEffect(() => {
    if (user) {
      console.log('🔔 Setting up GLOBAL budget alert listener...');
      
      socketService.onBudgetAlert((alert) => {
        console.log('📢 GLOBAL Budget alert received:', JSON.stringify(alert, null, 2));
        setBudgetAlert(alert);
      });

      console.log('✅ GLOBAL Budget alert listener setup complete');

      return () => {
        socketService.offBudgetAlert();
      };
    }
  }, [user]);

  const colorScheme = useColorScheme();

  return (
    <>
      {/* 🚨 GLOBAL Budget Alert Banner */}
      <BudgetAlertBanner 
        alert={budgetAlert} 
        onDismiss={() => setBudgetAlert(null)} 
      />

      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}