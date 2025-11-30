import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useArena, useArenaMarkets } from '@/hooks/useArenas';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import { generateGradientColors } from '@proph-bet/shared/utils';
import { theme } from '@/lib/theme';
import { InlineBetOptions } from '@/components/InlineBetOptions';
import { CompactBetForm } from '@/components/CompactBetForm';

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
  assets?: { type: string; url: string }[];
}

export default function ArenaScreen() {
  const { arenaId } = useLocalSearchParams<{ arenaId: string }>();
  const router = useRouter();
  const { data: arena } = useArena(arenaId);
  const { data: markets, isLoading, refetch, isRefetching } = useArenaMarkets(arenaId);
  
  // Inline betting state - tracks which market/option is currently being bet on
  const [bettingState, setBettingState] = useState<{
    marketId: string;
    optionId: string;
    side: 'yes' | 'no';
  } | null>(null);

  const handleSelectBet = useCallback((marketId: string, optionId: string, side: 'yes' | 'no') => {
    setBettingState({ marketId, optionId, side });
  }, []);

  const handleCloseBet = useCallback(() => {
    setBettingState(null);
  }, []);
  
  // Get user points from arena membership
  const userPoints = arena?.membership?.points ?? 0;
  const feePercent = 0; // TODO: Get from arena settings

  function calculateProbability(option: { liquidity: number }, allOptions: { liquidity: number }[]) {
    const inverseSum = allOptions.reduce((sum, o) => sum + 1 / o.liquidity, 0);
    return ((1 / option.liquidity) / inverseSum) * 100;
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'BINARY':
        return 'Yes/No';
      case 'MULTIPLE_CHOICE':
        return 'Multi';
      case 'NUMERIC':
        return 'Range';
      default:
        return type;
    }
  }

  function renderMarket({ item }: { item: Market }) {
    const isResolved = item.status === 'RESOLVED';
    const resolutionDate = new Date(item.resolutionDate);
    const isExpired = resolutionDate < new Date() && !isResolved;
    const coverImage = item.assets?.find(a => a.type === 'IMAGE')?.url;
    const gradient = generateGradientColors(item.id);
    const canBet = !isResolved && !isExpired;
    
    // Check if this market is currently in betting mode
    const isBettingThisMarket = bettingState?.marketId === item.id;
    const selectedOption = isBettingThisMarket 
      ? item.options.find(o => o.id === bettingState.optionId)
      : null;

    return (
      <View style={styles.marketCard}>
        <Pressable
          style={({ pressed }) => [
            pressed && styles.marketCardPressed,
          ]}
          onPress={() => router.push(`/(tabs)/arenas/${arenaId}/markets/${item.id}`)}
        >
          {/* Cover Image or Gradient */}
          {coverImage ? (
            <Image 
              source={{ uri: coverImage }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={gradient.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverGradient}
            />
          )}

          {/* Status Badge */}
          {(isResolved || isExpired) && (
            <View style={[
              styles.statusBadge,
              isResolved ? styles.resolvedBadge : styles.expiredBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {isResolved ? 'Resolved' : 'Expired'}
              </Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.marketContent}>
            {/* Header with title and type badge */}
            <View style={styles.marketHeader}>
              <Text style={styles.marketTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{getTypeBadge(item.type)}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.marketDescription} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Creator */}
            <Text style={styles.creatorText}>
              Created by {item.creator.name}
            </Text>
          </View>
        </Pressable>

        {/* Inline Betting Section */}
        {canBet && !isBettingThisMarket && (
          <View style={styles.inlineBetSection}>
            <InlineBetOptions
              options={item.options}
              marketType={item.type as 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC_RANGE'}
              onSelectBet={(optionId, side) => handleSelectBet(item.id, optionId, side)}
              coverImage={coverImage}
            />
          </View>
        )}

        {/* Compact Bet Form (when option selected) */}
        {canBet && isBettingThisMarket && selectedOption && (
          <View style={styles.inlineBetSection}>
            <CompactBetForm
              marketId={item.id}
              option={selectedOption}
              side={bettingState.side}
              allOptions={item.options}
              userPoints={userPoints}
              feePercent={feePercent}
              coverImage={coverImage}
              onClose={handleCloseBet}
              onSuccess={() => refetch()}
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.marketFooter}>
          <View style={styles.footerStats}>
            <Text style={styles.footerText}>{item._count.bets} bets</Text>
            <Text style={styles.footerDot}>•</Text>
            <Text style={styles.footerText}>
              {formatDistanceToNow(resolutionDate, { addSuffix: true })}
            </Text>
          </View>
          
          <View style={styles.footerActions}>
            <Pressable style={styles.iconButton}>
              <Ionicons name="share-outline" size={18} color={theme.colors.mutedForeground} />
            </Pressable>
            <Ionicons name="gift-outline" size={18} color={theme.colors.mutedForeground} />
            <Ionicons name="bookmark-outline" size={18} color={theme.colors.mutedForeground} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: arena?.name || 'Arena',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.foreground,
          headerRight: () => (
            <Pressable 
              onPress={() => router.push(`/(tabs)/arenas/${arenaId}/leaderboard`)}
              style={styles.headerButton}
            >
              <Ionicons name="trophy-outline" size={24} color={theme.colors.foreground} />
            </Pressable>
          ),
        }}
      />

      {/* Points Bar */}
      {arena?.membership && (
        <View style={styles.pointsBar}>
          <Ionicons name="diamond" size={20} color={theme.colors.primary} />
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
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="bar-chart-outline" size={48} color={theme.colors.mutedForeground} />
              </View>
              <Text style={styles.emptyText}>No markets yet</Text>
              <Text style={styles.emptySubtext}>
                Markets will appear here once they're created
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
  headerButton: {
    padding: theme.spacing.sm,
  },
  pointsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.muted,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pointsText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  list: {
    padding: theme.spacing.lg,
  },
  marketCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  marketCardPressed: {
    opacity: 0.95,
  },
  coverImage: {
    width: '100%',
    height: theme.components.marketCardCover.height,
  },
  coverGradient: {
    width: '100%',
    height: theme.components.marketCardCover.height,
  },
  statusBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  resolvedBadge: {
    backgroundColor: theme.colors.indigoLight,
  },
  expiredBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  statusBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
  },
  marketContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  inlineBetSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  marketTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    flex: 1,
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.tight,
  },
  typeBadge: {
    backgroundColor: theme.colors.foreground,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.background,
  },
  marketDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  creatorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  marketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  footerDot: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    opacity: 0.5,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconButton: {
    padding: theme.spacing.sm,
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
