import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useAuth } from '../hooks/use-auth';

SplashScreen.preventAutoHideAsync();

async function applyUpdateIfAvailable() {
  if (!Updates.isEnabled) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    // Expected in development (Expo Go has no update support)
    if (!__DEV__) console.warn('Update check failed:', e);
  }
}

export default function RootLayout() {
  const { session, loading } = useAuth();
  const signedIn = !!session;

  useEffect(() => { applyUpdateIfAvailable(); }, []);
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Keep the splash screen up until we know whether the user is signed in
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn} redirectTo="/auth/sign-in">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="dish/[id]" />
        <Stack.Screen
          name="search"
          options={{
            headerShown: true,
            headerTransparent: false,
            title: 'Search Restaurants',
            presentation: 'modal',
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/(tabs)/eat-list">
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
      </Stack.Protected>
    </Stack>
  );
}
