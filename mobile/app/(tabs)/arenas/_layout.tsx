import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function ArenasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.semibold,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    />
  );
}
