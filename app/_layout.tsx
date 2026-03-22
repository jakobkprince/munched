import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/sign-in" />
      <Stack.Screen name="auth/sign-up" />
      <Stack.Screen name="restaurant/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="dish/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="search" options={{ headerShown: true, title: 'Search Restaurants', presentation: 'modal' }} />
    </Stack>
  );
}
