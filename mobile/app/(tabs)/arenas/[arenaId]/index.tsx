import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useArena, useArenaMarkets } from '@/hooks/useArenas';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Market {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  resolutionDate: string;
  options: { id: string; text: string; liquidity: number }[];
  _count: { bets: number; comments: number };
  creator: { name: string };
}

export default function ArenaScreen() {
  const { arenaId } = useLocalSearchParams<{ arenaId: string }>();
  const router = useRouter();
  const { data: arena } = useArena(arenaId);
  const { data: markets, isLoading, refetch, isRefetching } = useArenaMarkets(arenaId);

  function calculateProbability(option: { liquidity: number }, allOptions: { liquidity: number }[]) {
    const inverseSum = allOptions.reduce((sum, o) => sum + 1 / o.liquidity, 0);
    return ((1 / option.liquidity) / inverseSum) * 100;
  }

  function renderMarket({ item }: { item: Market }) {
    const isResolved = item.status === 'RESOLVED';
    const resolutionDate = new Date(item.resolutionDate);
    const isExpired = resolutionDate < new Date();

    return (
      <Pressable
        style={styles.marketCard}
        onPress={() => router.push(`/(tabs)/arenas/${arenaId}/markets/${item.id}`)}
      >
        <View style={styles.marketHeader}>
          <View style={[styles.statusBadge, isResolved ? styles.resolved : isExpired ? styles.expired : styles.open]}>
            <Text style={styles.statusText}>
              {isResolved ? 'Resolved' : isExpired ? 'Pending' : 'Open'}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {formatDistanceToNow(resolutionDate, { addSuffix: true })}
          </Text>
        </View>

        <Text style={styles.marketTitle}>{item.title}</Text>

        {!isResolved && item.options.length > 0 && (
          <View style={styles.optionsPreview}>
            {item.options.slice(0, 2).map((option) => (
              <View key={option.id} style={styles.optionRow}>
                <Text style={styles.optionText} numberOfLines={1}>
                  {option.text}
                </Text>
                <Text style={styles.probability}>
                  {calculateProbability(option, item.options).toFixed(0)}%
                </Text>
              </View>
            ))}
            {item.options.length > 2 && (
              <Text style={styles.moreOptions}>
                +{item.options.length - 2} more options
              </Text>
            )}
          </View>
        )}

        <View style={styles.marketFooter}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color="#64748b" />
            <Text style={styles.footerText}>{item._count.bets} bets</Text>
          </View>
          <Text style={styles.creatorText}>by {item.creator.name}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: arena?.name || 'Arena',
          headerRight: () => (
            <Pressable onPress={() => router.push(`/(tabs)/arenas/${arenaId}/leaderboard`)}>
              <Ionicons name="trophy-outline" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {arena?.membership && (
        <View style={styles.pointsBar}>
          <Ionicons name="diamond" size={20} color="#6366f1" />
          <Text style={styles.pointsText}>{arena.membership.points} points</Text>
        </View>
      )}

      <FlatList
        data={markets}
        renderItem={renderMarket}
        keyExtractor={(item) => item.id}
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
              <Ionicons name="bar-chart-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No markets yet</Text>
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
  pointsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1e293b',
    gap: 8,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  marketCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  open: {
    backgroundColor: '#22c55e20',
  },
  resolved: {
    backgroundColor: '#6366f120',
  },
  expired: {
    backgroundColor: '#f59e0b20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
  },
  optionsPreview: {
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionText: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  probability: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  moreOptions: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  marketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
  },
  creatorText: {
    fontSize: 12,
    color: '#64748b',
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
