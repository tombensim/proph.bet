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
              <Ionicons name="person" size={16} color="#64748b" />
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
          <Ionicons name="diamond" size={14} color="#6366f1" />
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
      <Stack.Screen options={{ title: `${arena?.name || 'Arena'} Leaderboard` }} />

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
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No rankings yet</Text>
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
    backgroundColor: '#0f172a',
  },
  yourRank: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  yourRankText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  yourRankInfo: {
    alignItems: 'flex-end',
  },
  yourRankNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  yourRankPoints: {
    fontSize: 12,
    color: '#64748b',
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentUser: {
    backgroundColor: '#6366f120',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  medal: {
    fontSize: 24,
  },
  rank: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  topThreeName: {
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: '#6366f140',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '500',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  points: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  topThreePoints: {
    color: '#6366f1',
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
});
