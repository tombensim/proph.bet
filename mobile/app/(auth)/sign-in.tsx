import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoogleAuth, authManager, isDevMode } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';

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
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.devButton, isLoading && styles.disabled]}
              onPress={handleDevSignIn}
              disabled={isLoading}
            >
              <Ionicons name="code-slash" size={20} color="#fff" />
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
    backgroundColor: '#0f172a',
  },
  container: {
    flexGrow: 1,
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
  devSection: {
    width: '100%',
    marginTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  devInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
  },
});
