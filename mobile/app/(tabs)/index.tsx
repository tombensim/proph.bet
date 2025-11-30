import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useArenas } from '@/hooks/useArenas';
import { Ionicons } from '@expo/vector-icons';

interface Arena {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  membership?: {
    points: number;
    role: string;
  };
  _count?: {
    members: number;
    markets: number;
  };
}

export default function ArenasScreen() {
  const router = useRouter();
  const { data: arenas, isLoading, refetch, isRefetching } = useArenas();

  function renderArena({ item }: { item: Arena }) {
    return (
      <Pressable
        style={styles.arenaCard}
        onPress={() => router.push(`/(tabs)/arenas/${item.id}`)}
      >
        <View style={styles.arenaHeader}>
          <Text style={styles.arenaName}>{item.name}</Text>
          {item.membership?.role === 'ADMIN' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        
        {item.description && (
          <Text style={styles.arenaDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.arenaStats}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={16} color="#94a3b8" />
            <Text style={styles.statText}>{item._count?.members || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="bar-chart-outline" size={16} color="#94a3b8" />
            <Text style={styles.statText}>{item._count?.markets || 0}</Text>
          </View>
          {item.membership && (
            <View style={styles.stat}>
              <Ionicons name="diamond-outline" size={16} color="#6366f1" />
              <Text style={[styles.statText, styles.points]}>
                {item.membership.points}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={arenas}
        renderItem={renderArena}
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
              <Ionicons name="grid-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No arenas yet</Text>
              <Text style={styles.emptySubtext}>
                You'll see your arenas here once you join one
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
    backgroundColor: '#0f172a',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  arenaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  arenaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arenaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  adminBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  arenaDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 20,
  },
  arenaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  points: {
    color: '#6366f1',
    fontWeight: '600',
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
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
});
