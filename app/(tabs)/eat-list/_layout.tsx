import { Stack } from 'expo-router';
import { TagFilterProvider } from '../../../hooks/use-shared-tag-filter';

export default function EatListLayout() {
  return (
    <TagFilterProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TagFilterProvider>
  );
}
