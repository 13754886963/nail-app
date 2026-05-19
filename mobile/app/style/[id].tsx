import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Dimensions, Modal, ActionSheetIOS, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  apiGetStyleDetail, apiGetComments, apiPostComment,
  apiToggleLike, apiToggleFavorite, apiDeleteStyle, apiUpdateStyle,
  StyleDetail, Comment,
} from '../../services/nailStyleService';
import { apiBookAppointment } from '../../services/appointmentService';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/Avatar';
import { Colors } from '../../constants/colors';

const IMG_H = Dimensions.get('window').width * (4 / 3);

export default function StyleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const userRole = currentUser?.role;
  const userId = currentUser?.id;

  const [detail, setDetail] = useState<StyleDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<{ id: string; userName: string } | null>(null);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Permissions modal state
  const [permVisible, setPermVisible] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  // Booking modal state
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bookingNote, setBookingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGetStyleDetail(id).then(setDetail),
      apiGetComments(id).then(setComments),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [id]);


  const handleLike = async () => {
    if (!detail) return;
    const liked = await apiToggleLike(detail.id).catch(() => detail.is_liked);
    setDetail((d) => d ? {
      ...d, is_liked: liked,
      like_count: d.like_count + (liked ? 1 : -1),
    } : d);
  };

  const handleFavorite = async () => {
    if (!detail) return;
    const favorited = await apiToggleFavorite(detail.id).catch(() => detail.is_favorited);
    setDetail((d) => d ? {
      ...d, is_favorited: favorited,
      favorite_count: d.favorite_count + (favorited ? 1 : -1),
    } : d);
  };

  const handlePostComment = async () => {
    if (!input.trim() || !detail) return;
    setPosting(true);
    try {
      const comment = await apiPostComment(
        detail.id,
        input.trim(),
        replyTarget?.id,
        replyTarget?.userName,
      );
      setComments((prev) => [...prev, comment]);
      setInput('');
      setReplyTarget(null);
      setDetail((d) => d ? { ...d, comment_count: d.comment_count + 1 } : d);
    } catch {
      Alert.alert('失败', '评论发送失败，请重试');
    } finally {
      setPosting(false);
    }
  };

  const isOwner = userRole === 'artist' && detail?.artist_user_id === userId;

  const handleDelete = () => {
    if (!detail) return;
    Alert.alert('删除作品', `确认删除《${detail.title}》？此操作不可撤销。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try { await apiDeleteStyle(detail.id); router.back(); }
          catch { Alert.alert('失败', '删除失败，请重试'); }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !detail) return;
    setEditSaving(true);
    try {
      const newTags = editTags.split(/[，,]+/).map((t) => t.trim()).filter(Boolean);
      await apiUpdateStyle(detail.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        tags: newTags,
      });
      setDetail((d) => d ? { ...d, title: editTitle.trim(), description: editDesc.trim() || null, tags: newTags } : d);
      setEditVisible(false);
    } catch {
      Alert.alert('失败', '保存失败，请重试');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSetPublic = async (isPublic: boolean) => {
    if (!detail || detail.is_public === isPublic || permSaving) return;
    setPermSaving(true);
    try {
      await apiUpdateStyle(detail.id, { is_public: isPublic });
      setDetail((d) => d ? { ...d, is_public: isPublic } : d);
    } catch {
      Alert.alert('失败', '设置失败，请重试');
    } finally {
      setPermSaving(false);
    }
  };

  const handleOwnerMenu = () => {
    if (!detail) return;
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['取消', '编辑', '权限设置', '删除'], destructiveButtonIndex: 3, cancelButtonIndex: 0 },
      (idx) => {
        if (idx === 1) {
          setEditTitle(detail.title);
          setEditDesc(detail.description ?? '');
          setEditTags(detail.tags.join('，'));
          setEditVisible(true);
        }
        if (idx === 2) setPermVisible(true);
        if (idx === 3) handleDelete();
      },
    );
  };


  const handleBook = async () => {
    if (!detail) return;
    if (bookingDate <= new Date()) {
      Alert.alert('提示', '请选择未来的时间');
      return;
    }
    setSubmitting(true);
    try {
      await apiBookAppointment({
        artistId: detail.artist_id,
        scheduledAt: bookingDate.toISOString(),
        styleId: detail.id,
        note: bookingNote.trim() || null,
      });
      setBookingVisible(false);
      setBookingNote('');
      Alert.alert('预约成功', '已发送预约请求，等待美甲师确认');
    } catch {
      Alert.alert('失败', '预约发送失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>作品不存在</Text>
      </View>
    );
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Stack.Screen options={{
        title: detail?.title ?? '款式详情',
        headerRight: isOwner ? () => (
          <TouchableOpacity
            onPress={handleOwnerMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            style={{ width: 34, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : undefined,
      }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>

          {/* Image */}
          {detail.image_url ? (
            <Image source={{ uri: detail.image_url }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>{detail.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{detail.category_name}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push(`/artist/${detail.artist_id}`)}>
                <Text style={[styles.artistName, styles.artistNameLink]}>{detail.artist_name}</Text>
              </TouchableOpacity>
            </View>
            {detail.description ? (
              <Text style={styles.description}>{detail.description}</Text>
            ) : null}
            {detail.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {detail.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}># {tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action bar — like & favorite pills */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={handleLike}
              activeOpacity={0.75}
            >
              <Ionicons
                name={detail.is_liked ? 'heart' : 'heart-outline'}
                size={18}
                color={detail.is_liked ? '#F43F5E' : Colors.textSecondary}
              />
              <Text style={[styles.actionPillText, detail.is_liked && { color: '#F43F5E' }]}>
                {detail.like_count}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={handleFavorite}
              activeOpacity={0.75}
            >
              <Ionicons
                name={detail.is_favorited ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={detail.is_favorited ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.actionPillText, detail.is_favorited && { color: Colors.primary }]}>
                {detail.favorite_count}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Book button — only for customers */}
          {userRole === 'customer' && (
            <View style={styles.bookSection}>
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.85}
                onPress={() => setBookingVisible(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.bookBtnText}>预约此款式</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>评论 ({detail.comment_count})</Text>
            {comments.length === 0 ? (
              <Text style={styles.noComments}>还没有评论，来抢沙发吧</Text>
            ) : (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onReply={() => setReplyTarget({ id: c.id, userName: c.user_name })}
                />
              ))
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Comment input */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom || 8 }]}>
          {replyTarget && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>回复 @{replyTarget.userName}</Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={replyTarget ? `回复 @${replyTarget.userName}...` : '写下你的评论...'}
              placeholderTextColor={Colors.textSecondary}
              multiline={false}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || posting) && styles.sendBtnDisabled]}
              onPress={handlePostComment}
              disabled={!input.trim() || posting}
              activeOpacity={0.8}
            >
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Booking modal */}
      <Modal visible={bookingVisible} animationType="slide" transparent>
        <View style={modal.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={modal.sheet}>
              <View style={modal.handle} />
              <Text style={modal.title}>预约 · {detail.artist_name}</Text>

              {/* Date */}
              <Text style={modal.label}>预约日期</Text>
              <TouchableOpacity style={modal.picker} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={modal.pickerText}>{formatDate(bookingDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={bookingDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setBookingDate((prev) => {
                      const next = new Date(date);
                      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                      return next;
                    });
                  }}
                />
              )}

              {/* Time */}
              <Text style={modal.label}>预约时间</Text>
              <TouchableOpacity style={modal.picker} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <Text style={modal.pickerText}>{formatTime(bookingDate)}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={bookingDate}
                  mode="time"
                  is24Hour
                  onChange={(_, date) => {
                    setShowTimePicker(false);
                    if (date) setBookingDate((prev) => {
                      const next = new Date(prev);
                      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      return next;
                    });
                  }}
                />
              )}

              {/* Note */}
              <Text style={modal.label}>备注（选填）</Text>
              <TextInput
                style={modal.noteInput}
                value={bookingNote}
                onChangeText={setBookingNote}
                placeholder="例：想做渐变色，偏粉色系"
                placeholderTextColor={Colors.textSecondary}
                multiline
                maxLength={200}
              />

              {/* Buttons */}
              <View style={modal.btnRow}>
                <TouchableOpacity
                  style={modal.cancelBtn}
                  onPress={() => setBookingVisible(false)}
                >
                  <Text style={modal.cancelBtnText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modal.confirmBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleBook}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={modal.confirmBtnText}>确认预约</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={modal.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={modal.sheet}>
              <View style={modal.handle} />
              <Text style={modal.title}>编辑作品</Text>

              <Text style={modal.label}>标题</Text>
              <TextInput
                style={modal.picker}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="作品标题"
                placeholderTextColor={Colors.textSecondary}
                maxLength={100}
              />

              <Text style={modal.label}>简介（选填）</Text>
              <TextInput
                style={modal.noteInput}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="描述一下这个作品..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                maxLength={500}
              />

              <Text style={modal.label}>标签（逗号分隔）</Text>
              <TextInput
                style={modal.picker}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="例：渐变，法式，粉色"
                placeholderTextColor={Colors.textSecondary}
                maxLength={200}
              />

              <View style={modal.btnRow}>
                <TouchableOpacity style={modal.cancelBtn} onPress={() => setEditVisible(false)}>
                  <Text style={modal.cancelBtnText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modal.confirmBtn, (!editTitle.trim() || editSaving) && { opacity: 0.5 }]}
                  onPress={handleSaveEdit}
                  disabled={!editTitle.trim() || editSaving}
                >
                  {editSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={modal.confirmBtnText}>保存</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Permissions modal */}
      <Modal visible={permVisible} animationType="slide" transparent>
        <Pressable style={modal.overlay} onPress={() => setPermVisible(false)}>
          <Pressable style={[modal.sheet, { paddingBottom: 28 }]}>
            <View style={modal.handle} />
            <Text style={modal.title}>权限设置</Text>

            <TouchableOpacity
              style={[perm.option, detail?.is_public && perm.optionActive]}
              onPress={() => handleSetPublic(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="earth-outline" size={22} color={detail?.is_public ? Colors.primary : Colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[perm.label, detail?.is_public && { color: Colors.primary }]}>公开</Text>
                <Text style={perm.desc}>所有人可以查看此作品</Text>
              </View>
              {detail?.is_public && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[perm.option, !detail?.is_public && perm.optionActive]}
              onPress={() => handleSetPublic(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed-outline" size={22} color={!detail?.is_public ? Colors.primary : Colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[perm.label, !detail?.is_public && { color: Colors.primary }]}>私密</Text>
                <Text style={perm.desc}>仅自己可见，不出现在发现页</Text>
              </View>
              {!detail?.is_public && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}


function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  const date = new Date(comment.created_at).toLocaleDateString('zh-CN', {
    month: 'numeric', day: 'numeric',
  });
  return (
    <View style={styles.commentItem}>
      <Avatar name={comment.user_name} size={36} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{comment.user_name}</Text>
          <Text style={styles.commentDate}>{date}</Text>
        </View>
        <Text style={styles.commentContent}>
          {comment.reply_to_user_name && (
            <Text style={styles.replyPrefix}>回复 @{comment.reply_to_user_name} </Text>
          )}
          {comment.content}
        </Text>
        <TouchableOpacity onPress={onReply} activeOpacity={0.7} style={styles.replyBtn}>
          <Text style={styles.replyBtnText}>回复</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, fontSize: 15 },

  image: { width: '100%', height: IMG_H },
  imagePlaceholder: { backgroundColor: '#F0F0F0' },

  infoSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catBadge: { backgroundColor: '#FFF0F5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  catBadgeText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  artistName: { fontSize: 13, color: Colors.textSecondary },
  artistNameLink: { color: Colors.primary, textDecorationLine: 'underline' },
  description: { fontSize: 14, color: Colors.text, lineHeight: 22, marginTop: 4 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: {
    backgroundColor: '#F0F0F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  tagText: { fontSize: 12, color: Colors.textSecondary },

  actionRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F2F2F7',
  },
  actionPillText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  bookSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    paddingVertical: 13, borderRadius: 14,
  },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  commentsSection: { padding: 16 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  noComments: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  commentUser: { fontSize: 13, fontWeight: '600', color: Colors.text },
  commentDate: { fontSize: 11, color: Colors.textSecondary },
  commentContent: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  replyPrefix: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  replyBtn: { marginTop: 4, alignSelf: 'flex-start' },
  replyBtnText: { fontSize: 12, color: Colors.textSecondary },

  inputArea: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  replyBannerText: { fontSize: 12, color: Colors.primary },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  textInput: {
    flex: 1, height: 40, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 14,
    fontSize: 14, color: Colors.text, backgroundColor: Colors.surface,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 14 },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerText: { fontSize: 15, color: Colors.text },
  noteInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.text, minHeight: 80,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const perm = StyleSheet.create({
  option: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F5' },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
