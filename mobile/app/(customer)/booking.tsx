import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  apiGetMyAppointments, apiUpdateAppointmentStatus,
  Appointment, STATUS_LABEL, STATUS_COLOR,
} from '../../services/appointmentService';
import { useBadgeStore } from '../../stores/badgeStore';
import { Colors } from '../../constants/colors';
import { BouncingDots } from '../../components/BouncingDots';

type Filter = 'all' | 'pending' | 'confirmed' | 'completed' | 'closed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: '全部'   },
  { key: 'pending',   label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'closed',    label: '已结束' },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all:       '还没有预约记录',
  pending:   '没有待确认的预约',
  confirmed: '没有已确认的预约',
  completed: '没有已完成的预约',
  closed:    '没有已取消或拒绝的预约',
};

function matchesFilter(appt: Appointment, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'closed') return appt.status === 'cancelled' || appt.status === 'rejected';
  return appt.status === filter;
}

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const setCustomerPending = useBadgeStore((s) => s.setCustomerPending);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data] = await Promise.all([
        apiGetMyAppointments(),
        isRefresh ? new Promise<void>((r) => setTimeout(r, 1000)) : Promise.resolve(),
      ]);
      setItems(data);
      setCustomerPending(data.filter((a) => a.status === 'pending').length);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [setCustomerPending]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !refreshing) {
      fetchData(true);
    }
  }, [fetchData, refreshing]);

  const handleCancel = (item: Appointment) => {
    Alert.alert('取消预约', '确认取消这次预约吗？', [
      { text: '返回', style: 'cancel' },
      {
        text: '确认取消', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await apiUpdateAppointmentStatus(item.id, 'cancel');
            setItems((prev) => {
              const next = prev.map((a) => a.id === item.id ? updated : a);
              setCustomerPending(next.filter((a) => a.status === 'pending').length);
              return next;
            });
          } catch {
            Alert.alert('失败', '操作失败，请重试');
          }
        },
      },
    ]);
  };

  const filtered = useMemo(
    () => items.filter((a) => matchesFilter(a, activeFilter)),
    [items, activeFilter]
  );

  const countFor = (f: Filter) => items.filter((a) => matchesFilter(a, f)).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>我的预约</Text>
          <View style={styles.titleAccent} />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {FILTERS.map(({ key, label }) => {
          const count = key !== 'all' ? countFor(key) : null;
          const active = activeFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tab}
              onPress={() => setActiveFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}{count !== null && count > 0 ? ` ${count}` : ''}
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={onScrollEndDrag}
          ListHeaderComponent={refreshing ? <BouncingDots /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>{EMPTY_TEXT[activeFilter]}</Text>
              {activeFilter === 'all' && (
                <Text style={styles.emptySubtitle}>在发现页浏览款式并发起预约</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              onCancel={() => handleCancel(item)}
              onPress={() => router.push(`/appointment/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function AppointmentCard({
  item, onCancel, onPress,
}: {
  item: Appointment;
  onCancel: () => void;
  onPress: () => void;
}) {
  const canCancel = item.status === 'pending' || item.status === 'confirmed';
  const dt = new Date(item.scheduled_at);
  const dateStr = dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const initial = item.artist_name.charAt(0).toUpperCase();
  const avatarColors = ['#FF6B9D', '#A78BFA', '#34D399', '#60A5FA', '#F59E0B', '#F87171'];
  const avatarBg = avatarColors[item.artist_name.charCodeAt(0) % avatarColors.length];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {item.style_image_url ? (
        <Image source={{ uri: item.style_image_url }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: avatarBg + '22' }]}>
          <View style={[styles.initialCircle, { backgroundColor: avatarBg }]}>
            <Text style={styles.initialText}>{initial}</Text>
          </View>
          <Text style={[styles.noStyleText, { color: avatarBg }]}>自选时间</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.styleName} numberOfLines={1}>
            {item.style_title ?? '未指定款式'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <Text style={styles.artistName}>{item.artist_name}</Text>

        <View style={styles.timeRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.timeText}>{dateStr} {timeStr}</Text>
        </View>

        {item.note ? (
          <Text style={styles.note} numberOfLines={1}>备注：{item.note}</Text>
        ) : null}

        {item.reject_reason ? (
          <Text style={styles.rejectReason} numberOfLines={2}>拒绝原因：{item.reject_reason}</Text>
        ) : null}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={(e) => { e.stopPropagation(); onCancel(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>取消预约</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  titleAccent: { height: 3, width: 18, backgroundColor: Colors.primary, borderRadius: 2, marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 11,
  },
  tabText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 6, right: 6,
    height: 2, backgroundColor: Colors.primary, borderRadius: 1,
  },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.border },

  list: { padding: 16, gap: 12 },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 16,
    overflow: 'hidden', minHeight: 110,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  thumb: { width: 90, alignSelf: 'stretch' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  initialCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  noStyleText: { fontSize: 11, fontWeight: '600' },
  info: { flex: 1, paddingVertical: 12, paddingRight: 12, gap: 5 },
  infoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  styleName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  artistName: { fontSize: 13, color: Colors.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: Colors.textSecondary },
  note: { fontSize: 12, color: Colors.textSecondary },
  rejectReason: { fontSize: 12, color: '#EF4444' },
  cancelBtn: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#EF4444',
  },
  cancelBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
});
