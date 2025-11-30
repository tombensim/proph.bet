import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoogleAuth, authManager } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const router = useRouter();
  const { request, response, promptAsync, isReady } = useGoogleAuth();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🔮</Text>
        <Text style={styles.title}>Proph.bet</Text>
        <Text style={styles.subtitle}>Prediction Markets for Everyone</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Create and bet on prediction markets within your community. Track
          your predictions, compete on leaderboards, and prove your forecasting
          skills.
        </Text>

        <Pressable
          style={[styles.googleButton, !isReady && styles.disabled]}
          onPress={() => promptAsync()}
          disabled={!isReady}
        >
          <Ionicons name="logo-google" size={24} color="#fff" />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </Pressable>

        <Text style={styles.terms}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
  },
});
