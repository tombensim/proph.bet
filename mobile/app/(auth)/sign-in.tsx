import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoogleAuth, authManager, isDevMode } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { request, response, promptAsync, isReady } = useGoogleAuth();
  const [devEmail, setDevEmail] = useState('dev@genoox.com');
  const [isLoading, setIsLoading] = useState(false);
  const showDevLogin = isDevMode();

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      handleGoogleSignIn(response.params.id_token);
    }
  }, [response]);

  async function handleGoogleSignIn(idToken: string) {
    const success = await authManager.signInWithGoogle(idToken);
    if (success) {
      router.replace('/(tabs)');
    }
  }

  async function handleDevSignIn() {
    setIsLoading(true);
    const success = await authManager.signInAsDev(devEmail);
    setIsLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🔮</Text>
        </View>
        <Text style={styles.title}>proph.bet</Text>
        <Text style={styles.subtitle}>Prediction Markets for Everyone</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Create and bet on prediction markets within your community. Track
          your predictions, compete on leaderboards, and prove your forecasting
          skills.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton, 
            !isReady && styles.disabled,
            pressed && styles.googleButtonPressed
          ]}
          onPress={() => promptAsync()}
          disabled={!isReady}
        >
          <Ionicons name="logo-google" size={22} color="#fff" />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </Pressable>

        {showDevLogin && (
          <View style={styles.devSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Dev Mode</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.devInput}
              value={devEmail}
              onChangeText={setDevEmail}
              placeholder="dev@genoox.com"
              placeholderTextColor={theme.colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={({ pressed }) => [
                styles.devButton, 
                isLoading && styles.disabled,
                pressed && styles.devButtonPressed
              ]}
              onPress={handleDevSignIn}
              disabled={isLoading}
            >
              <Ionicons name="code-slash" size={18} color="#fff" />
              <Text style={styles.devButtonText}>
                {isLoading ? 'Signing in...' : 'Dev Login'}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.terms}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: theme.spacing['2xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['4xl'],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  logoEmoji: {
    fontSize: 56,
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.mutedForeground,
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: theme.spacing['3xl'],
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    maxWidth: 320,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    gap: theme.spacing.md,
    ...theme.shadows.md,
  },
  googleButtonPressed: {
    backgroundColor: '#3367d6',
  },
  disabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  devSection: {
    width: '100%',
    marginTop: theme.spacing['2xl'],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginHorizontal: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.base,
    marginBottom: theme.spacing.md,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing['2xl'],
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  devButtonPressed: {
    backgroundColor: '#e08900',
  },
  devButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  terms: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginTop: theme.spacing['2xl'],
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
});
