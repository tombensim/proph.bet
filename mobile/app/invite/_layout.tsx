import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function InviteLayout() {
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
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="[token]"
        options={{
          title: 'Invitation',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

