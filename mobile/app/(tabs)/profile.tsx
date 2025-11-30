import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBets } from '@/hooks/useBets';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: bets } = useBets();

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  }

  const totalBets = bets?.length || 0;
  const wonBets = bets?.filter((b: { won: boolean }) => b.won).length || 0;
  const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100).toFixed(1) : '0';

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {user?.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={40} color={theme.colors.mutedForeground} />
          </View>
        )}
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.role === 'ADMIN' && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalBets}</Text>
          <Text style={styles.statLabel}>Total Bets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.successValue]}>{wonBets}</Text>
          <Text style={styles.statLabel}>Won</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.primaryValue]}>{winRate}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      {/* Recent Bets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bets</Text>
          {bets && bets.length > 5 && (
            <Pressable>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          )}
        </View>
        
        {bets?.slice(0, 5).map((bet: {
          id: string;
          market: { title: string; status: string };
          option?: { text: string };
          amount: number;
          won: boolean;
        }) => (
          <View key={bet.id} style={styles.betItem}>
            <View style={styles.betInfo}>
              <Text style={styles.betMarket} numberOfLines={1}>
                {bet.market.title}
              </Text>
              <Text style={styles.betDetails}>
                {bet.option?.text || 'N/A'} • {bet.amount} pts
              </Text>
            </View>
            {bet.market.status === 'RESOLVED' && (
              <View style={[
                styles.resultBadge,
                bet.won ? styles.wonBadge : styles.lostBadge
              ]}>
                <Ionicons
                  name={bet.won ? 'checkmark' : 'close'}
                  size={14}
                  color={bet.won ? theme.colors.success : theme.colors.destructive}
                />
                <Text style={[
                  styles.resultText,
                  bet.won ? styles.wonText : styles.lostText
                ]}>
                  {bet.won ? 'Won' : 'Lost'}
                </Text>
              </View>
            )}
          </View>
        ))}
        
        {(!bets || bets.length === 0) && (
          <View style={styles.emptyBets}>
            <Ionicons name="document-outline" size={32} color={theme.colors.mutedForeground} />
            <Text style={styles.emptyText}>No bets yet</Text>
            <Text style={styles.emptySubtext}>Your betting history will appear here</Text>
          </View>
        )}
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <Pressable 
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.foreground} />
          </View>
          <Text style={styles.menuText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.foreground} />
          </View>
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.foreground} />
          </View>
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [
            styles.menuItem, 
            styles.signOutItem,
            pressed && styles.menuItemPressed
          ]} 
          onPress={handleSignOut}
        >
          <View style={[styles.menuIconContainer, styles.signOutIcon]}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.destructive} />
          </View>
          <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
        </Pressable>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>proph.bet v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: theme.spacing.md,
    borderWidth: 3,
    borderColor: theme.colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  roleBadge: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  roleText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  successValue: {
    color: theme.colors.success,
  },
  primaryValue: {
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  betItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  betInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  betMarket: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  betDetails: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  wonBadge: {
    backgroundColor: theme.colors.successLight,
  },
  lostBadge: {
    backgroundColor: theme.colors.destructiveLight,
  },
  resultText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  wonText: {
    color: theme.colors.success,
  },
  lostText: {
    color: theme.colors.destructive,
  },
  emptyBets: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginTop: theme.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.muted,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
  },
  signOutItem: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  signOutIcon: {
    backgroundColor: theme.colors.destructiveLight,
  },
  signOutText: {
    color: theme.colors.destructive,
  },
  footer: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
  },
  versionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
});
