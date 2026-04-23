import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { LearnerDashboardProvider } from '@/hooks/use-learner-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';

function AuthRedirector() {
  const { loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    const topSegment = segments[0];
    const inTabs = topSegment === '(tabs)';
    const inLogin = topSegment === 'login';
    const inAdmin = topSegment === 'admin';
    const inLesson = topSegment === 'lesson';
    const inPractice = topSegment === 'practice';

    if (!user && !inLogin) {
      router.replace('/login');
      return;
    }

    if (user?.role === 'admin' && !inAdmin) {
      router.replace('/admin');
      return;
    }

    if (user?.role === 'student' && !inTabs && !inLesson && !inPractice) {
      router.replace('/(tabs)');
    }
  }, [loading, router, user, segments]);

  return null;
}

function RootNavigator() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthRedirector />
      <LearnerDashboardProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="lesson" />
          <Stack.Screen name="practice" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </LearnerDashboardProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
