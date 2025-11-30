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
      <View style={styles.header}>
        {user?.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={40} color="#64748b" />
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

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalBets}</Text>
          <Text style={styles.statLabel}>Total Bets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{wonBets}</Text>
          <Text style={styles.statLabel}>Won</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{winRate}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bets</Text>
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
              <Text style={styles.betOption}>
                {bet.option?.text || 'N/A'} • {bet.amount} pts
              </Text>
            </View>
            {bet.market.status === 'RESOLVED' && (
              <Ionicons
                name={bet.won ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={bet.won ? '#22c55e' : '#ef4444'}
              />
            )}
          </View>
        ))}
        {(!bets || bets.length === 0) && (
          <Text style={styles.noBets}>No bets yet</Text>
        )}
      </View>

      <View style={styles.section}>
        <Pressable style={styles.menuItem} onPress={() => {}}>
          <Ionicons name="settings-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => {}}>
          <Ionicons name="help-circle-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </Pressable>
        <Pressable style={[styles.menuItem, styles.signOut]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  betItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  betInfo: {
    flex: 1,
    marginRight: 12,
  },
  betMarket: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  betOption: {
    fontSize: 12,
    color: '#64748b',
  },
  noBets: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  signOut: {
    marginTop: 8,
  },
  signOutText: {
    color: '#ef4444',
  },
});
