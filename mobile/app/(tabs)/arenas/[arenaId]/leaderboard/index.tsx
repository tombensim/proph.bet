import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useArenaLeaderboard, useArena } from '@/hooks/useArenas';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: { id: string; name: string; image: string | null; email: string };
  points: number;
  role: string;
}

export default function LeaderboardScreen() {
  const { arenaId } = useLocalSearchParams<{ arenaId: string }>();
  const { user } = useAuth();
  const { data: arena } = useArena(arenaId);
  const { data: leaderboard, isLoading, refetch, isRefetching } = useArenaLeaderboard(arenaId);

  function renderItem({ item }: { item: LeaderboardEntry }) {
    const isCurrentUser = item.userId === user?.id;
    const isTopThree = item.rank <= 3;

    return (
      <View style={[styles.row, isCurrentUser && styles.currentUser]}>
        <View style={styles.rankContainer}>
          {item.rank === 1 && <Text style={styles.medal}>🥇</Text>}
          {item.rank === 2 && <Text style={styles.medal}>🥈</Text>}
          {item.rank === 3 && <Text style={styles.medal}>🥉</Text>}
          {item.rank > 3 && (
            <Text style={styles.rank}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          {item.user.image ? (
            <Image source={{ uri: item.user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={16} color={theme.colors.mutedForeground} />
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={[styles.name, isTopThree && styles.topThreeName]} numberOfLines={1}>
              {item.user.name || item.user.email}
            </Text>
            {item.role === 'ADMIN' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pointsContainer}>
          <Ionicons name="diamond" size={14} color={theme.colors.primary} />
          <Text style={[styles.points, isTopThree && styles.topThreePoints]}>
            {item.points.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  }

  const currentUserEntry = leaderboard?.find((e: LeaderboardEntry) => e.userId === user?.id);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `${arena?.name || 'Arena'} Leaderboard`,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.foreground,
        }} 
      />

      {currentUserEntry && (
        <View style={styles.yourRank}>
          <Text style={styles.yourRankText}>Your Rank</Text>
          <View style={styles.yourRankInfo}>
            <Text style={styles.yourRankNumber}>#{currentUserEntry.rank}</Text>
            <Text style={styles.yourRankPoints}>
              {currentUserEntry.points.toLocaleString()} points
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="trophy-outline" size={48} color={theme.colors.mutedForeground} />
              </View>
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>
                Rankings will appear as members place bets
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  yourRank: {
    backgroundColor: theme.colors.indigoLight,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  yourRankText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    fontWeight: theme.typography.fontWeight.medium,
  },
  yourRankInfo: {
    alignItems: 'flex-end',
  },
  yourRankNumber: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  yourRankPoints: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  list: {
    padding: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  currentUser: {
    backgroundColor: theme.colors.indigoLight,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  rankContainer: {
    width: 44,
    alignItems: 'center',
  },
  medal: {
    fontSize: 24,
  },
  rank: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.mutedForeground,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.foreground,
    flex: 1,
  },
  topThreeName: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  adminBadge: {
    backgroundColor: theme.colors.indigoLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  adminText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  points: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    fontWeight: theme.typography.fontWeight.medium,
  },
  topThreePoints: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});
