import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { useAuth } from '../hooks/use-auth';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/eat-list');
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

async function applyUpdateIfAvailable() {
  if (__DEV__) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    Alert.alert('Update check', `Available: ${check.isAvailable}`);
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    Alert.alert('Update error', String(e));
  }
}

export default function RootLayout() {
  useEffect(() => { applyUpdateIfAvailable(); }, []);

  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dish/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="search"
          options={{
            headerShown: true,
            title: 'Search Restaurants',
            presentation: 'modal',
          }}
        />
      </Stack>
    </AuthGate>
  );
}
