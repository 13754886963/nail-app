import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGetNotifications, apiMarkAllRead, AppNotification } from '../services/notificationService';
import { useBadgeStore } from '../stores/badgeStore';
import { Colors } from '../constants/colors';
import { BouncingDots } from './BouncingDots';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  new_booking:       { icon: 'calendar',               color: Colors.primary,  bg: '#FFF0F5' },
  booking_confirmed: { icon: 'checkmark-circle',        color: '#10B981',       bg: '#F0FDF4' },
  booking_rejected:  { icon: 'close-circle',            color: '#EF4444',       bg: '#FFF5F5' },
  booking_cancelled: { icon: 'remove-circle',           color: '#F59E0B',       bg: '#FFFBEB' },
  booking_completed: { icon: 'ribbon',                  color: '#6366F1',       bg: '#F5F3FF' },
};

const DEFAULT_CONFIG = { icon: 'notifications', color: Colors.textSecondary, bg: '#F2F2F7' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG;
  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        {item.body && <Text style={styles.body} numberOfLines={2}>{item.body}</Text>}
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setMessageUnread = useBadgeStore((s) => s.setMessageUnread);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data] = await Promise.all([
        apiGetNotifications(),
        isRefresh ? new Promise<void>((r) => setTimeout(r, 1000)) : Promise.resolve(),
      ]);
      setItems(data);
      apiMarkAllRead().catch(() => {});
      setMessageUnread(0);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [setMessageUnread]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !refreshing) {
      fetchData(true);
    }
  }, [fetchData, refreshing]);

  const handlePress = (item: AppNotification) => {
    if (item.appointment_id) {
      router.push(`/appointment/${item.appointment_id}`);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>消息</Text>
          <View style={styles.titleAccent} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={onScrollEndDrag}
          ListHeaderComponent={refreshing ? <BouncingDots /> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>暂无消息</Text>
              <Text style={styles.emptySubtitle}>预约相关的通知会在这里显示</Text>
            </View>
          }
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  titleAccent: { height: 3, width: 18, backgroundColor: Colors.primary, borderRadius: 2, marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.border },

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 72 },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.background,
  },
  itemUnread: { backgroundColor: '#FAFAFA' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  textWrap: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginLeft: 8,
  },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 12, color: Colors.border, marginTop: 2 },
});
