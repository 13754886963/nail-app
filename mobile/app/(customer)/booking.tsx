import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
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

type Section = { title: string; data: Appointment[] };

function groupAppointments(items: Appointment[]): Section[] {
  const pending   = items.filter((a) => a.status === 'pending');
  const confirmed = items.filter((a) => a.status === 'confirmed');
  const history   = items.filter((a) => ['completed', 'rejected', 'cancelled'].includes(a.status));
  const sections: Section[] = [];
  if (pending.length)   sections.push({ title: '待处理', data: pending });
  if (confirmed.length) sections.push({ title: '已确认', data: confirmed });
  if (history.length)   sections.push({ title: '历史记录', data: history });
  return sections;
}

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    if (e.nativeEvent.contentOffset.y < -60 && !refreshing) fetchData(true);
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

  const sections = groupAppointments(items);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>我的预约</Text>
          <View style={styles.titleAccent} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={onScrollEndDrag}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={refreshing ? <BouncingDots /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>还没有预约记录</Text>
              <Text style={styles.emptySubtitle}>在发现页浏览款式并发起预约</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
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

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.border },

  list: { padding: 16 },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: 8, marginTop: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
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
