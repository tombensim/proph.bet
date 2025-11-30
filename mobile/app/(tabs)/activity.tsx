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

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
  arena?: { id: string; name: string };
  metadata?: Record<string, unknown>;
}

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  MARKET_RESOLVED: 'checkmark-circle-outline',
  BET_RESOLVED: 'trophy-outline',
  WIN_PAYOUT: 'diamond-outline',
  MARKET_CREATED: 'add-circle-outline',
  MONTHLY_WINNER: 'medal-outline',
  POINTS_RESET: 'refresh-outline',
  MARKET_DISPUTED: 'warning-outline',
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
    const icon = NOTIFICATION_ICONS[item.type] || 'notifications-outline';
    
    return (
      <View style={[styles.notificationCard, !item.read && styles.unread]}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={item.read ? '#64748b' : '#6366f1'} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.text, !item.read && styles.unreadText]}>
            {item.content}
          </Text>
          <View style={styles.meta}>
            {item.arena && (
              <Text style={styles.arenaName}>{item.arena.name}</Text>
            )}
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <Pressable style={styles.markReadButton} onPress={handleMarkAllRead}>
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
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color="#64748b" />
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
    backgroundColor: '#0f172a',
  },
  markReadButton: {
    padding: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  markReadText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  unread: {
    backgroundColor: '#1e293b',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 4,
  },
  unreadText: {
    color: '#fff',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arenaName: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 8,
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
