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

export const unstable_settings = { anchor: '(tabs)' };

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [budgetAlert, setBudgetAlert] = useState(null);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  useEffect(() => {
    if (user) {
      socketService.onBudgetAlert((alert) => setBudgetAlert(alert));
      return () => socketService.offBudgetAlert();
    }
  }, [user]);

  const colorScheme = useColorScheme();

  return (
    <>
      <BudgetAlertBanner alert={budgetAlert} onDismiss={() => setBudgetAlert(null)} />
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