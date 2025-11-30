import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/lib/theme';

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
  arena?: { id: string; name: string };
  metadata?: Record<string, unknown>;
}

const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  MARKET_RESOLVED: { name: 'checkmark-circle-outline', color: theme.colors.success },
  BET_RESOLVED: { name: 'trophy-outline', color: theme.colors.warning },
  WIN_PAYOUT: { name: 'diamond-outline', color: theme.colors.primary },
  MARKET_CREATED: { name: 'add-circle-outline', color: theme.colors.primary },
  MONTHLY_WINNER: { name: 'medal-outline', color: theme.colors.warning },
  POINTS_RESET: { name: 'refresh-outline', color: theme.colors.mutedForeground },
  MARKET_DISPUTED: { name: 'warning-outline', color: theme.colors.destructive },
};

export default function ActivityScreen() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markReadMutation = useMarkNotificationsRead();

  const unreadCount = notifications?.filter((n: Notification) => !n.read).length || 0;

  async function handleMarkAllRead() {
    try {
      await markReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  function renderNotification({ item }: { item: Notification }) {
    const iconConfig = NOTIFICATION_ICONS[item.type] || { 
      name: 'notifications-outline' as keyof typeof Ionicons.glyphMap, 
      color: theme.colors.mutedForeground 
    };
    
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.notificationCard, 
          !item.read && styles.unread,
          pressed && styles.notificationCardPressed
        ]}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: `${iconConfig.color}15` }
        ]}>
          <Ionicons 
            name={iconConfig.name} 
            size={22} 
            color={iconConfig.color} 
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.text, !item.read && styles.unreadText]}>
            {item.content}
          </Text>
          <View style={styles.meta}>
            {item.arena && (
              <View style={styles.arenaBadge}>
                <Text style={styles.arenaName}>{item.arena.name}</Text>
              </View>
            )}
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <Pressable 
          style={({ pressed }) => [
            styles.markReadButton,
            pressed && styles.markReadButtonPressed
          ]} 
          onPress={handleMarkAllRead}
        >
          <Ionicons name="checkmark-done" size={18} color={theme.colors.primary} />
          <Text style={styles.markReadText}>
            Mark all {unreadCount} as read
          </Text>
        </Pressable>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-outline" size={48} color={theme.colors.mutedForeground} />
              </View>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                You'll see updates about your bets and markets here
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
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  markReadButtonPressed: {
    backgroundColor: theme.colors.muted,
  },
  markReadText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  list: {
    padding: theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
    ...theme.shadows.sm,
  },
  notificationCardPressed: {
    backgroundColor: theme.colors.muted,
  },
  unread: {
    backgroundColor: theme.colors.indigoLight,
    borderColor: theme.colors.primary,
    borderLeftWidth: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    marginBottom: theme.spacing.sm,
  },
  unreadText: {
    color: theme.colors.foreground,
    fontWeight: theme.typography.fontWeight.medium,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  arenaBadge: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  arenaName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  time: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    marginTop: theme.spacing.xs,
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
