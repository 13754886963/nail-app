import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ImageBackground,
  TouchableOpacity, Dimensions, ActivityIndicator,
  Alert, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiGetArtistProfile, apiGetArtistStyles, apiToggleFollow, ArtistProfile, ArtistStyle } from '../../services/artistService';
import { apiBookAppointment } from '../../services/appointmentService';
import { apiGetArtistReviews, Review } from '../../services/reviewService';
import { apiGetArtistAvailability, DayAvailability } from '../../services/artistAvailabilityService';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/Avatar';
import { StarDisplay } from '../appointment/[id]';
import { Colors } from '../../constants/colors';

const HEADER_H = 200;
const FALLBACK_BG = 'https://picsum.photos/seed/nailapp/800/400';
const AVATAR_SIZE = 84;
const COLS = 2;
const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;

export default function ArtistPublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const userRole = currentUser?.role;

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [styles, setStyles] = useState<ArtistStyle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'works' | 'reviews'>('works');
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  // Booking modal
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
  const [bookingImages, setBookingImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGetArtistProfile(id).then(setProfile),
      apiGetArtistStyles(id).then(setStyles),
      apiGetArtistReviews(id).then(setReviews),
      apiGetArtistAvailability(id).then(setAvailability).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const result = await apiToggleFollow(profile.id);
      setProfile((p) => p ? { ...p, is_followed: result.is_followed, follower_count: result.follower_count } : p);
    } catch {
      Alert.alert('失败', '操作失败，请重试');
    }
    setFollowLoading(false);
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请在设置中允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - bookingImages.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setBookingImages((prev) => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const handleBook = async () => {
    if (!profile) return;
    if (bookingDate <= new Date()) {
      Alert.alert('提示', '请选择未来的时间');
      return;
    }
    if (bookingImages.length < 2) {
      Alert.alert('提示', '请至少上传 2 张参考图片');
      return;
    }
    if (availability.length > 0) {
      const dayOfWeek = bookingDate.getDay();
      const daySchedule = availability.find((a) => a.day_of_week === dayOfWeek);
      if (daySchedule && !daySchedule.is_available) {
        const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        Alert.alert('提示', `美甲师 ${DAY_NAMES[dayOfWeek]} 不接受预约`);
        return;
      }
      if (daySchedule?.is_available) {
        const hhmm = `${String(bookingDate.getHours()).padStart(2, '0')}:${String(bookingDate.getMinutes()).padStart(2, '0')}`;
        if (hhmm < daySchedule.start_time || hhmm >= daySchedule.end_time) {
          Alert.alert('提示', `美甲师当天可预约时间为 ${daySchedule.start_time} - ${daySchedule.end_time}`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      await apiBookAppointment({
        artistId: profile.id,
        scheduledAt: bookingDate.toISOString(),
        styleId: null,
        note: bookingNote.trim() || null,
        images: bookingImages.map((img) => ({
          uri: img.uri,
          type: img.mimeType ?? 'image/jpeg',
          fileName: img.fileName ?? `ref_${Date.now()}.jpg`,
        })),
      });
      setBookingVisible(false);
      setBookingNote('');
      setBookingImages([]);
      Alert.alert('预约成功', '已发送预约请求，等待美甲师确认');
    } catch {
      Alert.alert('失败', '预约发送失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>美甲师不存在</Text>
      </View>
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  // Build rows for 2-col grid
  const rows: ArtistStyle[][] = styles.reduce<ArtistStyle[][]>((acc, item, i) => {
    if (i % 2 === 0) acc.push([item]);
    else acc[acc.length - 1]!.push(item);
    return acc;
  }, []);

  return (
    <>
      <View style={s.root}>
        {/* Back button (floating) */}
        <TouchableOpacity
          style={[s.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} bounces>
          {/* Header background: background_url → first work image → placeholder */}
          <ImageBackground
            source={{ uri: profile.background_url || styles[0]?.image_url || FALLBACK_BG }}
            style={[s.headerBg, { height: HEADER_H + insets.top }]}
            contentFit="cover"
          >
            <View style={s.overlayWrap}>
              <View style={s.overlay} />
            </View>
          </ImageBackground>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatarRing}>
              <Avatar name={profile.name} uri={profile.avatar_url} size={AVATAR_SIZE} />
            </View>
          </View>

          {/* Name + badge + location */}
          <View style={s.infoSection}>
            <View style={s.nameRow}>
              <Text style={s.name}>{profile.name}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{profile.is_part_time ? '兼职美甲师' : '美甲师'}</Text>
              </View>
            </View>
            {profile.location ? (
              <View style={s.metaRow}>
                <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                <Text style={s.metaText}>{profile.location}</Text>
                {profile.years_of_experience != null && (
                  <Text style={s.metaText}>· 从业 {profile.years_of_experience} 年</Text>
                )}
              </View>
            ) : profile.years_of_experience != null ? (
              <Text style={s.metaText}>从业 {profile.years_of_experience} 年</Text>
            ) : null}
            {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatItem label="粉丝" value={profile.follower_count} />
            <View style={s.sep} />
            <StatItem label="作品" value={profile.works_count} />
            <View style={s.sep} />
            <View style={s.statItem}>
              <Text style={s.statValue}>
                {Number(profile.avg_rating) > 0 ? `★ ${Number(profile.avg_rating).toFixed(1)}` : '--'}
              </Text>
              <Text style={s.statLabel}>评分</Text>
            </View>
            <View style={s.sep} />
            <StatItem label="服务" value={profile.served_count} />
          </View>

          {/* Follow + Book buttons */}
          {currentUser?.id !== profile.user_id && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.followBtn, profile.is_followed && s.followBtnActive]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.8}
              >
                {followLoading
                  ? <ActivityIndicator size="small" color={profile.is_followed ? Colors.primary : '#fff'} />
                  : <>
                      <Ionicons
                        name={profile.is_followed ? 'heart' : 'heart-outline'}
                        size={16}
                        color={profile.is_followed ? Colors.primary : '#fff'}
                      />
                      <Text style={[s.followBtnText, profile.is_followed && s.followBtnTextActive]}>
                        {profile.is_followed ? '已关注' : '关注'}
                      </Text>
                    </>}
              </TouchableOpacity>
              {userRole === 'customer' && (
                <TouchableOpacity style={s.bookBtn} activeOpacity={0.85} onPress={() => setBookingVisible(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={s.bookBtnText}>预约</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tabs */}
          <View style={s.tabBar}>
            <TouchableOpacity
              style={[s.tabBtn, activeTab === 'works' && s.tabBtnActive]}
              onPress={() => setActiveTab('works')}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, activeTab === 'works' && s.tabBtnTextActive]}>
                作品集 ({profile.works_count})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, activeTab === 'reviews' && s.tabBtnActive]}
              onPress={() => setActiveTab('reviews')}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnText, activeTab === 'reviews' && s.tabBtnTextActive]}>
                评价 ({profile.review_count})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Works grid */}
          {activeTab === 'works' && (
            <View style={s.section}>
              {styles.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="images-outline" size={52} color={Colors.border} />
                  <Text style={s.emptyText}>暂无作品</Text>
                </View>
              ) : (
                <View style={s.grid}>
                  {rows.map((row, ri) => (
                    <View key={ri} style={s.gridRow}>
                      {row.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={s.card}
                          activeOpacity={0.85}
                          onPress={() => router.push(`/style/${item.id}`)}
                        >
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={s.cardImage} contentFit="cover" />
                          ) : (
                            <View style={[s.cardImage, s.cardPlaceholder]} />
                          )}
                          <View style={s.cardInfo}>
                            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={s.catBadge}>
                              <Text style={s.catBadgeText}>{item.category_name}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {row.length < 2 && <View style={{ width: ITEM_W }} />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Reviews list */}
          {activeTab === 'reviews' && (
            <View style={s.section}>
              {reviews.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="star-outline" size={52} color={Colors.border} />
                  <Text style={s.emptyText}>暂无评价</Text>
                </View>
              ) : (
                <View style={s.reviewList}>
                  {reviews.map((r) => (
                    <View key={r.id} style={s.reviewCard}>
                      <View style={s.reviewHeader}>
                        <Avatar name={r.customer_name} uri={r.customer_avatar_url} size={36} />
                        <View style={s.reviewMeta}>
                          <Text style={s.reviewName}>{r.customer_name}</Text>
                          <StarDisplay rating={r.rating} size={13} />
                        </View>
                        <Text style={s.reviewDate}>
                          {new Date(r.created_at).toLocaleDateString('zh-CN')}
                        </Text>
                      </View>
                      {r.comment ? (
                        <Text style={s.reviewComment}>{r.comment}</Text>
                      ) : null}
                      {r.artist_reply ? (
                        <View style={s.replyBlock}>
                          <View style={s.replyLabelRow}>
                            <Ionicons name="return-down-forward-outline" size={12} color={Colors.textSecondary} />
                            <Text style={s.replyLabel}>美甲师回复</Text>
                          </View>
                          <Text style={s.replyText}>{r.artist_reply}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Booking modal */}
      <Modal visible={bookingVisible} animationType="slide" transparent>
        <View style={modal.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={modal.sheet}>
              <View style={modal.handle} />
              <Text style={modal.title}>预约 · {profile.name}</Text>

              <Text style={modal.label}>预约日期</Text>
              {Platform.OS === 'ios' ? (
                <View style={modal.picker}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <DateTimePicker
                    value={bookingDate}
                    mode="date"
                    display="compact"
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                      if (date) setBookingDate((prev) => {
                        const next = new Date(date);
                        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                        return next;
                      });
                    }}
                  />
                </View>
              ) : (
                <>
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
                </>
              )}

              <Text style={modal.label}>预约时间</Text>
              {Platform.OS === 'ios' ? (
                <View style={modal.picker}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <DateTimePicker
                    value={bookingDate}
                    mode="time"
                    display="compact"
                    onChange={(_, date) => {
                      if (date) setBookingDate((prev) => {
                        const next = new Date(prev);
                        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                        return next;
                      });
                    }}
                  />
                </View>
              ) : (
                <>
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
                </>
              )}

              {availability.length > 0 && (() => {
                const dow = bookingDate.getDay();
                const av = availability.find((a) => a.day_of_week === dow);
                const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                if (!av || !av.is_available) {
                  return (
                    <View style={modal.availHint}>
                      <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                      <Text style={modal.availHintText}>{DAY_NAMES[dow]} 美甲师不接受预约</Text>
                    </View>
                  );
                }
                return (
                  <View style={modal.availHint}>
                    <Ionicons name="time-outline" size={13} color="#10B981" />
                    <Text style={[modal.availHintText, { color: '#10B981' }]}>
                      {DAY_NAMES[dow]} 可预约：{av.start_time} - {av.end_time}
                    </Text>
                  </View>
                );
              })()}

              <View style={modal.labelRow}>
                <Text style={modal.label}>参考图片</Text>
                <Text style={modal.labelHint}>{bookingImages.length}/5（至少 2 张）</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.imageScroll}>
                {bookingImages.map((img, i) => (
                  <View key={img.uri} style={modal.imgWrap}>
                    <Image source={{ uri: img.uri }} style={modal.imgThumb} contentFit="cover" />
                    <TouchableOpacity
                      style={modal.imgRemove}
                      onPress={() => setBookingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {bookingImages.length < 5 && (
                  <TouchableOpacity style={modal.imgAdd} onPress={handlePickImages}>
                    <Ionicons name="add" size={28} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </ScrollView>

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

              <View style={modal.btnRow}>
                <TouchableOpacity style={modal.cancelBtn} onPress={() => { setBookingVisible(false); setBookingImages([]); }}>
                  <Text style={modal.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modal.confirmBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleBook}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={modal.confirmText}>确认预约</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: Colors.textSecondary },

  backBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  headerBg: { position: 'relative' },
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },

  avatarSection: { alignItems: 'center', marginTop: -(AVATAR_SIZE / 2 + 3), zIndex: 1 },
  avatarRing: {
    borderWidth: 3, borderColor: '#fff',
    borderRadius: (AVATAR_SIZE + 6) / 2, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },

  infoSection: { alignItems: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 20, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  badge: { backgroundColor: '#FFF0F5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  bio: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 },
  followBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  followBtnActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.primary, shadowOpacity: 0 },
  followBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  followBtnTextActive: { color: Colors.primary },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 14, borderRadius: 16, paddingVertical: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  sep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary, paddingVertical: 13, borderRadius: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#F2F2F7', borderRadius: 12, padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.text },

  section: { marginTop: 16, paddingHorizontal: PADDING },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },

  reviewList: { gap: 10 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, gap: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewMeta: { flex: 1, gap: 2 },
  reviewName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  reviewDate: { fontSize: 11, color: Colors.textSecondary },
  reviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  replyBlock: {
    backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, gap: 4, marginTop: 6,
  },
  replyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  replyText: { fontSize: 12, color: Colors.text, lineHeight: 18 },

  grid: { gap: 0 },
  gridRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  card: {
    width: ITEM_W, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardImage: { width: ITEM_W, height: ITEM_W * (4 / 3) },
  cardPlaceholder: { backgroundColor: '#F0F0F0' },
  cardInfo: { padding: 10, gap: 4 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  catBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
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
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  labelHint: { fontSize: 12, color: Colors.textSecondary },
  imageScroll: { flexDirection: 'row' },
  imgWrap: { position: 'relative', marginRight: 8 },
  imgThumb: { width: 80, height: 80, borderRadius: 10 },
  imgRemove: { position: 'absolute', top: -6, right: -6 },
  imgAdd: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerText: { fontSize: 15, color: Colors.text },
  availHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, paddingHorizontal: 2,
  },
  availHintText: { fontSize: 12, color: '#F59E0B' },
  noteInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.text, minHeight: 80, textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
