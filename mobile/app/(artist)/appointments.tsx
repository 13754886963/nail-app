import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Platform,
  KeyboardAvoidingView, Keyboard,
} from 'react-native';

const REJECT_PRESETS = ['当天时间已约满', '不在服务范围内', '款式超出能力范围', '地理位置不便'];
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  apiGetIncomingAppointments, apiUpdateAppointmentStatus,
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

export default function ArtistAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setArtistPending = useBadgeStore((s) => s.setArtistPending);
  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data] = await Promise.all([
        apiGetIncomingAppointments(),
        isRefresh ? new Promise<void>((r) => setTimeout(r, 1000)) : Promise.resolve(),
      ]);
      setItems(data);
      setArtistPending(data.filter((a) => a.status === 'pending').length);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [setArtistPending]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !refreshing) {
      fetchData(true);
    }
  }, [fetchData, refreshing]);

  const doAction = async (
    item: Appointment,
    action: 'confirm' | 'reject' | 'cancel' | 'complete',
    reason?: string
  ) => {
    setActionLoading(true);
    try {
      const updated = await apiUpdateAppointmentStatus(item.id, action, reason);
      setItems((prev) => {
        const next = prev.map((a) => a.id === item.id ? updated : a);
        setArtistPending(next.filter((a) => a.status === 'pending').length);
        return next;
      });
    } catch {
      Alert.alert('失败', '操作失败，请重试');
    }
    setActionLoading(false);
  };

  const handleConfirm = (item: Appointment) => {
    Alert.alert('确认预约', `确认 ${item.customer_name} 的预约？`, [
      { text: '取消', style: 'cancel' },
      { text: '确认', onPress: () => doAction(item, 'confirm') },
    ]);
  };

  const handleReject = (item: Appointment) => {
    setRejectTarget(item);
    setRejectReason('');
  };

  const handleComplete = (item: Appointment) => {
    Alert.alert('完成服务', '确认标记此预约为已完成？', [
      { text: '取消', style: 'cancel' },
      { text: '确认完成', onPress: () => doAction(item, 'complete') },
    ]);
  };

  const sections = groupAppointments(items);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>预约管理</Text>
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
          ListHeaderComponent={refreshing ? <BouncingDots /> : null}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>暂无预约请求</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <ArtistApptCard
              item={item}
              onConfirm={() => handleConfirm(item)}
              onReject={() => handleReject(item)}
              onComplete={() => handleComplete(item)}
              onPress={() => router.push(`/appointment/${item.id}`)}
            />
          )}
        />
      )}

      {/* Reject reason modal */}
      <Modal visible={!!rejectTarget} animationType="slide" transparent onRequestClose={() => setRejectTarget(null)}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modal.kav}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={modal.sheet}>
                <View style={modal.handle} />
                <Text style={modal.title}>选择拒绝原因</Text>

                <View style={modal.presets}>
                  {REJECT_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[modal.preset, rejectReason === p && modal.presetActive]}
                      onPress={() => { Keyboard.dismiss(); setRejectReason(rejectReason === p ? '' : p); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[modal.presetText, rejectReason === p && modal.presetTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={modal.input}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="或自定义原因（选填）…"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  maxLength={200}
                  returnKeyType="done"
                  blurOnSubmit
                />

                <View style={modal.btnRow}>
                  <TouchableOpacity style={modal.cancelBtn} onPress={() => { Keyboard.dismiss(); setRejectTarget(null); }}>
                    <Text style={modal.cancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.rejectBtn, actionLoading && { opacity: 0.6 }]}
                    disabled={actionLoading}
                    onPress={async () => {
                      Keyboard.dismiss();
                      if (!rejectTarget) return;
                      await doAction(rejectTarget, 'reject', rejectReason.trim() || undefined);
                      setRejectTarget(null);
                    }}
                  >
                    {actionLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={modal.rejectText}>确认拒绝</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ArtistApptCard({
  item, onConfirm, onReject, onComplete, onPress,
}: {
  item: Appointment;
  onConfirm: () => void;
  onReject: () => void;
  onComplete: () => void;
  onPress: () => void;
}) {
  const dt = new Date(item.scheduled_at);
  const dateStr = dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const initial = item.customer_name.charAt(0).toUpperCase();
  const avatarColors = ['#FF6B9D','#A78BFA','#34D399','#60A5FA','#F59E0B','#F87171'];
  const avatarBg = avatarColors[item.customer_name.charCodeAt(0) % avatarColors.length];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
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
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        {item.style_title && (
          <Text style={styles.styleName} numberOfLines={1}>{item.style_title}</Text>
        )}

        <View style={styles.timeRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.timeText}>{dateStr} {timeStr}</Text>
        </View>

        {item.note ? (
          <Text style={styles.note} numberOfLines={2}>备注：{item.note}</Text>
        ) : null}

        {/* Action buttons */}
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={(e) => { e.stopPropagation(); onReject(); }}>
              <Text style={styles.rejectBtnText}>拒绝</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={(e) => { e.stopPropagation(); onConfirm(); }}>
              <Text style={styles.confirmBtnText}>确认</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'confirmed' && (
          <TouchableOpacity style={styles.completeBtn} onPress={(e) => { e.stopPropagation(); onComplete(); }}>
            <Text style={styles.completeBtnText}>标记完成</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
  customerName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  styleName: { fontSize: 13, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: Colors.textSecondary },
  note: { fontSize: 12, color: Colors.textSecondary },

  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rejectBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: '#EF4444', alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  confirmBtn: {
    flex: 2, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#10B981', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  completeBtn: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  completeBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});

const modal = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },

  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  preset: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E7EB',
  },
  presetActive: { backgroundColor: '#FFF0F5', borderColor: Colors.primary },
  presetText: { fontSize: 13, color: Colors.textSecondary },
  presetTextActive: { color: Colors.primary, fontWeight: '600' },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1C1C1E', minHeight: 64, textAlignVertical: 'top',
    marginBottom: 20,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  rejectBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#EF4444', alignItems: 'center',
  },
  rejectText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
