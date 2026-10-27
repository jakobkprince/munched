import { Stack } from 'expo-router';
import { TagFilterProvider } from '../../../hooks/use-shared-tag-filter';

export default function MunchedLayout() {
  return (
    <TagFilterProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TagFilterProvider>
  );
}
