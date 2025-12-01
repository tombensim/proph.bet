import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useArenas } from '@/hooks/useArenas';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

interface Arena {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  logo?: string | null;
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
        style={({ pressed }) => [
          styles.arenaCard,
          pressed && styles.arenaCardPressed,
        ]}
        onPress={() => router.push(`/(tabs)/arenas/${item.id}`)}
      >
        <View style={styles.arenaContent}>
          {item.logo && (
            <Image 
              source={{ uri: item.logo }} 
              style={styles.arenaLogo}
              resizeMode="cover"
            />
          )}
          <View style={styles.arenaInfo}>
            <Text style={styles.arenaName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.arenaDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.arenaFooter}>
          {item.membership && (
            <Text style={styles.pointsText}>{item.membership.points} pts</Text>
          )}
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={theme.colors.mutedForeground} 
          />
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
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="grid-outline" size={48} color={theme.colors.mutedForeground} />
              </View>
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
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  arenaCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  arenaCardPressed: {
    backgroundColor: theme.colors.muted,
  },
  arenaContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  arenaLogo: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.muted,
  },
  arenaInfo: {
    flex: 1,
  },
  arenaName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  arenaDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  arenaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pointsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    fontWeight: theme.typography.fontWeight.medium,
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
    maxWidth: 280,
  },
});
