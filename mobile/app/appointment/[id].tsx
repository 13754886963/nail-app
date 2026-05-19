import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, FlatList, Dimensions,
  StatusBar, KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

const REJECT_PRESETS = ['当天时间已约满', '不在服务范围内', '款式超出能力范围', '地理位置不便'];
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  apiGetAppointmentById,
  apiUpdateAppointmentStatus,
  Appointment,
  STATUS_LABEL,
  STATUS_COLOR,
} from '../../services/appointmentService';
import { apiGetAppointmentReview, apiSubmitReview, apiReplyToReview, Review } from '../../services/reviewService';
import { useAuthStore } from '../../stores/authStore';
import { useBadgeStore } from '../../stores/badgeStore';
import { Avatar } from '../../components/Avatar';
import { Colors } from '../../constants/colors';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setCustomerPending = useBadgeStore((s) => s.setCustomerPending);

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Review state
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Artist reply state
  const [replyModal, setReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Image viewer
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
  };

  useEffect(() => {
    apiGetAppointmentById(id)
      .then((a) => {
        setAppt(a);
        if (a.status === 'completed') {
          apiGetAppointmentReview(a.id)
            .then((r) => setReview(r))
            .catch(() => setReview(null));
        } else {
          setReview(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const doAction = async (
    action: 'confirm' | 'reject' | 'cancel' | 'complete',
    reason?: string
  ) => {
    if (!appt) return;
    setActionLoading(true);
    try {
      const updated = await apiUpdateAppointmentStatus(appt.id, action, reason);
      if (action === 'cancel' && appt.status === 'pending') {
        const cur = useBadgeStore.getState().customerPending;
        setCustomerPending(Math.max(0, cur - 1));
      }
      setAppt(updated);
      // Fetch review when transitioning to completed
      if (action === 'complete') {
        apiGetAppointmentReview(appt.id).then((r) => setReview(r)).catch(() => setReview(null));
      }
    } catch {
      Alert.alert('失败', '操作失败，请重试');
    }
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!appt) return;
    setSubmitting(true);
    try {
      const submitted = await apiSubmitReview(appt.id, rating, comment.trim() || undefined);
      setReview(submitted);
      setReviewModal(false);
    } catch {
      Alert.alert('失败', '提交失败，请重试');
    }
    setSubmitting(false);
  };

  const handleSubmitReply = async () => {
    if (!appt || !replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const updated = await apiReplyToReview(appt.id, replyText.trim());
      setReview(updated);
      setReplyModal(false);
    } catch {
      Alert.alert('失败', '回复失败，请重试');
    }
    setReplySubmitting(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!appt) {
    return <View style={styles.center}><Text style={styles.errorText}>预约不存在</Text></View>;
  }

  const isArtist = user?.role === 'artist';
  const dt = new Date(appt.scheduled_at);
  const dateStr = dt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const canCancel = !isArtist && (appt.status === 'pending' || appt.status === 'confirmed');
  const canConfirm = isArtist && appt.status === 'pending';
  const canReject = isArtist && appt.status === 'pending';
  const canComplete = isArtist && appt.status === 'confirmed';
  const canReview = !isArtist && appt.status === 'completed' && review === null;
  const hasActions = canCancel || canConfirm || canReject || canComplete;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: hasActions ? insets.bottom + 100 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Style image — only shown when a style was selected */}
        {appt.style_image_url && (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => appt.style_id && router.push(`/style/${appt.style_id}`)}
          >
            <Image source={{ uri: appt.style_image_url }} style={styles.styleImage} contentFit="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageTip}>查看款式详情</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Status + title */}
        <View style={styles.section}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[appt.status] + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[appt.status] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[appt.status] }]}>
              {STATUS_LABEL[appt.status]}
            </Text>
          </View>
          {appt.style_title && <Text style={styles.styleTitle}>{appt.style_title}</Text>}
        </View>

        {/* Time */}
        <View style={styles.card}>
          <InfoRow icon="calendar-outline" label="预约日期" value={dateStr} />
          <Divider />
          <InfoRow icon="time-outline" label="时间" value={timeStr} />
        </View>

        {/* People */}
        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label={isArtist ? '顾客' : '美甲师'}
            value={isArtist ? appt.customer_name : appt.artist_name}
          />
        </View>

        {/* Reference images */}
        {appt.reference_images.length > 0 && (
          <View style={styles.refSection}>
            <View style={styles.refHeader}>
              <Ionicons name="images-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.refTitle}>参考图</Text>
              <Text style={styles.refCount}>{appt.reference_images.length} 张</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.refScroll}>
              {appt.reference_images.map((uri, i) => (
                <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => openViewer(appt.reference_images, i)}>
                  <Image source={{ uri }} style={styles.refImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Note / reject reason */}
        {(appt.note || appt.reject_reason) && (
          <View style={styles.card}>
            {appt.note && <InfoRow icon="chatbubble-outline" label="备注" value={appt.note} />}
            {appt.note && appt.reject_reason && <Divider />}
            {appt.reject_reason && (
              <InfoRow icon="close-circle-outline" label="拒绝原因" value={appt.reject_reason} danger />
            )}
          </View>
        )}

        {/* Review section */}
        {appt.status === 'completed' && review !== undefined && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>服务评价</Text>
            {review ? (
              <View style={{ gap: 8 }}>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Avatar name={review.customer_name} uri={review.customer_avatar_url} size={36} />
                    <View style={styles.reviewCardMeta}>
                      <Text style={styles.reviewerName}>{review.customer_name}</Text>
                      <StarDisplay rating={review.rating} />
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </Text>
                  </View>
                  {review.comment ? (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  ) : null}

                  {/* Artist reply */}
                  {review.artist_reply ? (
                    <View style={styles.replyBlock}>
                      <View style={styles.replyLabelRow}>
                        <Ionicons name="return-down-forward-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.replyLabel}>美甲师回复</Text>
                        {review.artist_replied_at && (
                          <Text style={styles.replyDate}>
                            {new Date(review.artist_replied_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.replyText}>{review.artist_reply}</Text>
                      {isArtist && (
                        <TouchableOpacity
                          onPress={() => { setReplyText(review.artist_reply ?? ''); setReplyModal(true); }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.editReplyHint}>修改回复</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : isArtist ? (
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => { setReplyText(''); setReplyModal(true); }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                      <Text style={styles.replyBtnText}>回复评价</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {!isArtist && (
                  <Text style={styles.reviewSubmittedHint}>评价已提交，不支持修改</Text>
                )}
              </View>
            ) : canReview ? (
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => { setRating(5); setComment(''); setReviewModal(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="star-outline" size={18} color={Colors.primary} />
                <Text style={styles.writeReviewBtnText}>写评价</Text>
              </TouchableOpacity>
            ) : isArtist ? (
              <Text style={styles.noReviewText}>顾客暂未评价</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      {hasActions && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
          {canCancel && (
            <ActionBtn label="取消预约" onPress={() => Alert.alert('取消预约', '确认取消这次预约吗？', [
              { text: '返回', style: 'cancel' },
              { text: '确认取消', style: 'destructive', onPress: () => doAction('cancel') },
            ])} variant="danger" loading={actionLoading} />
          )}
          {canReject && (
            <ActionBtn
              label="拒绝"
              onPress={() => { setRejectReason(''); setRejectModal(true); }}
              variant="outline"
              loading={actionLoading}
            />
          )}
          {canConfirm && (
            <ActionBtn label="确认预约" onPress={() => Alert.alert('确认预约', `确认 ${appt.customer_name} 的预约？`, [
              { text: '取消', style: 'cancel' },
              { text: '确认', onPress: () => doAction('confirm') },
            ])} variant="primary" loading={actionLoading} />
          )}
          {canComplete && (
            <ActionBtn label="标记完成" onPress={() => Alert.alert('完成服务', '确认标记此预约为已完成？', [
              { text: '取消', style: 'cancel' },
              { text: '确认完成', onPress: () => doAction('complete') },
            ])} variant="primary" loading={actionLoading} />
          )}
        </View>
      )}

      {/* Reject modal */}
      <Modal visible={rejectModal} animationType="slide" transparent onRequestClose={() => setRejectModal(false)}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modal.kav}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={modal.sheet}>
                <View style={modal.handle} />
                <Text style={modal.title}>拒绝原因（必填）</Text>

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
                  <TouchableOpacity style={modal.cancelBtn} onPress={() => { Keyboard.dismiss(); setRejectModal(false); }}>
                    <Text style={modal.cancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.submitBtn, { backgroundColor: '#EF4444' }, (!rejectReason.trim() || actionLoading) && { opacity: 0.4 }]}
                    disabled={!rejectReason.trim() || actionLoading}
                    onPress={async () => {
                      Keyboard.dismiss();
                      await doAction('reject', rejectReason.trim());
                      setRejectModal(false);
                    }}
                  >
                    {actionLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={modal.submitText}>确认拒绝</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Artist reply modal */}
      <Modal visible={replyModal} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>回复评价</Text>
            <TextInput
              style={modal.input}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="感谢顾客的评价，写下你的回复..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={500}
              autoFocus
            />
            <View style={modal.btnRow}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setReplyModal(false)}>
                <Text style={modal.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modal.submitBtn, (!replyText.trim() || replySubmitting) && { opacity: 0.5 }]}
                disabled={!replyText.trim() || replySubmitting}
                onPress={handleSubmitReply}
              >
                {replySubmitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={modal.submitText}>提交回复</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>评价服务</Text>
            <Text style={modal.label}>服务评分</Text>
            <StarSelector value={rating} onChange={setRating} />
            <Text style={modal.label}>评价内容（选填）</Text>
            <TextInput
              style={modal.input}
              value={comment}
              onChangeText={setComment}
              placeholder="分享一下你的服务体验..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={500}
            />
            <View style={modal.btnRow}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setReviewModal(false)}>
                <Text style={modal.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modal.submitBtn, submitting && { opacity: 0.6 }]}
                disabled={submitting}
                onPress={handleSubmitReview}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={modal.submitText}>提交评价</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen image viewer */}
      <Modal
        visible={viewerImages.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImages([])}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={viewer.root}>
          <FlatList
            data={viewerImages}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
            onMomentumScrollEnd={(e) => {
              setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_W, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: item }} style={viewer.img} contentFit="contain" />
              </View>
            )}
          />
          <TouchableOpacity style={[viewer.closeBtn, { top: insets.top + 12 }]} onPress={() => setViewerImages([])}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {viewerImages.length > 1 && (
            <View style={viewer.counter}>
              <Text style={viewer.counterText}>{viewerIndex + 1} / {viewerImages.length}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={starS.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={40} color="#F59E0B" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={starS.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

const starS = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});

function InfoRow({ icon, label, value, danger }: {
  icon: string; label: string; value: string; danger?: boolean;
}) {
  return (
    <View style={infoRow.container}>
      <View style={infoRow.left}>
        <Ionicons name={icon as any} size={16} color={danger ? Colors.error : Colors.textSecondary} />
        <Text style={[infoRow.label, danger && { color: Colors.error }]}>{label}</Text>
      </View>
      <Text style={[infoRow.value, danger && { color: Colors.error }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F2F2F7', marginLeft: 44 }} />;
}

function ActionBtn({ label, onPress, variant, loading }: {
  label: string; onPress: () => void;
  variant: 'primary' | 'outline' | 'danger'; loading?: boolean;
}) {
  const bg = variant === 'primary' ? Colors.primary : variant === 'danger' ? '#FFF0F0' : '#fff';
  const textColor = variant === 'primary' ? '#fff' : variant === 'danger' ? Colors.error : Colors.textSecondary;
  const borderColor = variant === 'outline' ? Colors.border : variant === 'danger' ? '#FFCDD2' : undefined;
  return (
    <TouchableOpacity
      style={[btn.base, { flex: 1, backgroundColor: bg }, borderColor && { borderWidth: 1, borderColor }]}
      onPress={onPress} disabled={loading} activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[btn.label, { color: textColor }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: Colors.textSecondary },
  content: { gap: 12 },

  styleImage: { width: '100%', height: 260 },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  imageTip: { fontSize: 13, color: '#fff' },

  section: { paddingHorizontal: 16, paddingTop: 4, gap: 6 },
  statusBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' },
  styleTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },

  card: {
    backgroundColor: Colors.background, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  refSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.background, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    paddingVertical: 14, gap: 10,
  },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  refTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  refCount: { fontSize: 12, color: Colors.border, marginLeft: 2 },
  refScroll: { paddingHorizontal: 16, gap: 10 },
  refImage: { width: 110, height: 110, borderRadius: 10 },

  reviewSection: { marginHorizontal: 16, gap: 10 },
  reviewSectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewCardMeta: { flex: 1, gap: 3 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewDate: { fontSize: 12, color: Colors.textSecondary },
  reviewComment: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  replyBlock: {
    backgroundColor: '#F8F8F8', borderRadius: 10, padding: 12, gap: 6, marginTop: 4,
  },
  replyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  replyDate: { fontSize: 11, color: Colors.border },
  replyText: { fontSize: 13, color: Colors.text, lineHeight: 19 },
  editReplyHint: { fontSize: 12, color: Colors.primary, marginTop: 4 },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF0F5', borderRadius: 20,
  },
  replyBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  writeReviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFF0F5', paddingVertical: 15, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  writeReviewBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  noReviewText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
  reviewSubmittedHint: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },

  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
});

const infoRow = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
});

const btn = StyleSheet.create({
  base: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
});

const viewer = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  img: { width: SCREEN_W, height: '100%' },
  closeBtn: {
    position: 'absolute', right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  counter: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },
  label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, marginTop: 14 },
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
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
