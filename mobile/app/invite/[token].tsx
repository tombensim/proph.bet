import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { invitationApi, InvitationDetails } from '@/lib/api';
import { theme } from '@/lib/theme';

export default function InvitePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ arenaId: string; arenaName: string } | null>(null);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    setLoading(true);
    setError(null);

    const response = await invitationApi.getInvitation(token!);

    if (response.success && response.data) {
      setInvitation(response.data);
    } else {
      setError(response.error || 'Invalid or expired invitation');
    }

    setLoading(false);
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Navigate to sign in with a callback to this invite
      router.push({
        pathname: '/(auth)/sign-in',
        params: { inviteToken: token },
      });
      return;
    }

    setAccepting(true);
    setError(null);

    const response = await invitationApi.acceptInvitation(token!);

    if (response.success && response.data) {
      setSuccess({
        arenaId: response.data.arena.id,
        arenaName: response.data.arena.name,
      });
    } else {
      setError(response.error || 'Failed to accept invitation');
    }

    setAccepting(false);
  };

  const handleGoToArena = () => {
    if (success) {
      router.replace({
        pathname: '/(tabs)/arenas/[arenaId]',
        params: { arenaId: success.arenaId },
      });
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  if (loading || authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading invitation...</Text>
      </View>
    );
  }

  if (error && !invitation) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>✕</Text>
        </View>
        <Text style={styles.errorTitle}>Invalid Invitation</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
          <Text style={styles.secondaryButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Welcome!</Text>
        <Text style={styles.successMessage}>
          You've successfully joined {success.arenaName}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToArena}>
          <Text style={styles.primaryButtonText}>Go to Arena</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Arena Cover Image */}
      {invitation?.arena.coverImage && (
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: invitation.arena.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />
        </View>
      )}

      {/* Invitation Card */}
      <View style={styles.card}>
        {/* Arena Info */}
        <View style={styles.arenaInfo}>
          {invitation?.arena.logo && (
            <Image
              source={{ uri: invitation.arena.logo }}
              style={styles.arenaLogo}
              resizeMode="cover"
            />
          )}
          <Text style={styles.arenaName}>{invitation?.arena.name}</Text>
          {invitation?.arena.description && (
            <Text style={styles.arenaDescription} numberOfLines={3}>
              {invitation.arena.description}
            </Text>
          )}
        </View>

        {/* Inviter Info */}
        <View style={styles.inviterContainer}>
          {invitation?.inviter.image ? (
            <Image
              source={{ uri: invitation.inviter.image }}
              style={styles.inviterAvatar}
            />
          ) : (
            <View style={styles.inviterAvatarPlaceholder}>
              <Text style={styles.inviterAvatarText}>
                {invitation?.inviter.name?.[0] || '?'}
              </Text>
            </View>
          )}
          <View style={styles.inviterTextContainer}>
            <Text style={styles.inviterName}>{invitation?.inviter.name}</Text>
            <Text style={styles.inviterLabel}>invited you to join</Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={[styles.primaryButton, accepting && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>Accept Invitation</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>
                Please sign in to accept this invitation.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAccept}>
                <Text style={styles.primaryButtonText}>Sign In / Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['6'],
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing['4'],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.mutedForeground,
  },
  coverContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginTop: -20,
    padding: theme.spacing['6'],
  },
  arenaInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing['6'],
  },
  arenaLogo: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing['4'],
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  arenaName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginBottom: theme.spacing['2'],
  },
  arenaDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.muted,
    padding: theme.spacing['4'],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing['6'],
  },
  inviterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing['3'],
  },
  inviterAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing['3'],
  },
  inviterAvatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryForeground,
  },
  inviterTextContainer: {
    flex: 1,
  },
  inviterName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
  },
  inviterLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  actions: {
    marginTop: 'auto',
  },
  loginPrompt: {
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing['4'],
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing['4'],
    paddingHorizontal: theme.spacing['6'],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 52,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing['4'],
    paddingHorizontal: theme.spacing['6'],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing['4'],
    minWidth: 150,
  },
  secondaryButtonText: {
    color: theme.colors.secondaryForeground,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing['4'],
  },
  errorIconText: {
    fontSize: 32,
    color: '#fff',
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing['2'],
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
  },
  errorBanner: {
    backgroundColor: theme.colors.destructiveLight || '#fee2e2',
    padding: theme.spacing['3'],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing['4'],
  },
  errorBannerText: {
    color: theme.colors.destructive,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing['4'],
  },
  successIconText: {
    fontSize: 32,
    color: '#fff',
  },
  successTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing['2'],
  },
  successMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: theme.spacing['6'],
  },
});

