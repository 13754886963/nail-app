import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ImageBackground, Dimensions, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/Avatar';
import {
  apiGetStats,
  apiGetMyFavorites, FavoriteStyle,
  apiGetMyComments, MyComment,
  apiGetMyFollowing, FollowingArtist,
} from '../../services/userService';
import { apiGetMyAppointments, Appointment, STATUS_LABEL, STATUS_COLOR } from '../../services/appointmentService';
import { Colors } from '../../constants/colors';

const COLS = 2;
const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;
const HEADER_H = 210;
const AVATAR_SIZE = 88;

type Tab = 'favorites' | 'appointments' | 'following' | 'comments';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<Tab>('favorites');
  const [favorites, setFavorites] = useState<FavoriteStyle[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [following, setFollowing] = useState<FollowingArtist[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(() => {
    apiGetStats().then(setStats).catch(() => {});
    apiGetMyFavorites().then(setFavorites).catch(() => {});
    apiGetMyAppointments().then(setAppointments).catch(() => {});
    apiGetMyFollowing().then(setFollowing).catch(() => {});
    apiGetMyComments().then(setComments).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      apiGetStats().then(setStats),
      apiGetMyFavorites().then(setFavorites),
      apiGetMyAppointments().then(setAppointments),
      apiGetMyFollowing().then(setFollowing),
      apiGetMyComments().then(setComments),
    ]);
    setRefreshing(false);
  }, []);

  if (!user) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >

        {user.background_url ? (
          <ImageBackground
            source={{ uri: user.background_url }}
            style={[styles.headerBg, { height: HEADER_H + insets.top }]}
            contentFit="cover"
          >
            <View style={styles.overlayWrap}><View style={styles.overlay} /></View>
            <TouchableOpacity
              style={[styles.gearBtn, { top: insets.top + 12 }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </ImageBackground>
        ) : (
          <View style={[styles.headerBg, styles.headerBgDefault, { height: HEADER_H + insets.top }]}>
            <TouchableOpacity
              style={[styles.gearBtn, { top: insets.top + 12 }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <Avatar name={user.name} uri={user.avatar_url} size={AVATAR_SIZE} />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>{user.name}</Text>
          {user.location ? (
            <View style={styles.ipBadge}>
              <Ionicons name="location-outline" size={11} color={Colors.textSecondary} />
              <Text style={styles.ipText}>{user.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatItem label="预约" value={stats.appointments ?? 0} />
          <View style={styles.statSep} />
          <StatItem label="关注" value={stats.following ?? 0} />
        </View>

        <View style={styles.tabBar}>
          <TabBtn label="收藏款式" active={activeTab === 'favorites'} onPress={() => setActiveTab('favorites')} />
          <TabBtn label="预约记录" active={activeTab === 'appointments'} onPress={() => setActiveTab('appointments')} />
          <TabBtn label="我关注的" active={activeTab === 'following'} onPress={() => setActiveTab('following')} />
          <TabBtn label="我的评论" active={activeTab === 'comments'} onPress={() => setActiveTab('comments')} />
        </View>

        {activeTab === 'favorites' && (
          favorites.length === 0 ? (
            <Empty icon="bookmark-outline" text="还没有收藏的款式" actionLabel="去发现作品" onAction={() => router.push('/(customer)/')} />
          ) : (
            <GridContent>
              {chunk(favorites, 2).map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/style/${item.id}`)}
                    >
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
                        : <View style={[styles.cardImage, styles.cardPlaceholder]} />}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>{item.artist_name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {row.length < 2 && <View style={{ width: ITEM_W }} />}
                </View>
              ))}
            </GridContent>
          )
        )}

        {activeTab === 'appointments' && (() => {
          const active = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
          const hasHistory = appointments.some((a) => a.status !== 'pending' && a.status !== 'confirmed');
          if (appointments.length === 0) {
            return <Empty icon="calendar-outline" text="暂无预约记录" actionLabel="去浏览美甲师" onAction={() => router.push('/(customer)/')} />;
          }
          return (
            <View style={styles.listWrap}>
              {active.length === 0 ? (
                <View style={styles.listEmpty}>
                  <Text style={styles.listEmptyText}>暂无进行中的预约</Text>
                </View>
              ) : (
                active.map((appt) => {
                  const dt = new Date(appt.scheduled_at);
                  const dateStr = dt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
                  const timeStr = dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <TouchableOpacity
                      key={appt.id}
                      style={apptCard.item}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/appointment/${appt.id}`)}
                    >
                      <View style={apptCard.left}>
                        <Text style={apptCard.dateText}>{dateStr}</Text>
                        <Text style={apptCard.timeText}>{timeStr}</Text>
                      </View>
                      <View style={apptCard.center}>
                        <Text style={apptCard.artistName} numberOfLines={1}>{appt.artist_name}</Text>
                        {appt.style_title && (
                          <Text style={apptCard.styleName} numberOfLines={1}>{appt.style_title}</Text>
                        )}
                      </View>
                      <View style={[apptCard.badge, { backgroundColor: STATUS_COLOR[appt.status] + '20' }]}>
                        <Text style={[apptCard.badgeText, { color: STATUS_COLOR[appt.status] }]}>
                          {STATUS_LABEL[appt.status]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              {hasHistory && (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => router.push('/(customer)/booking')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>查看全部预约记录</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {activeTab === 'following' && (
          following.length === 0 ? (
            <Empty icon="people-outline" text="还没有关注的美甲师" actionLabel="去发现美甲师" onAction={() => router.push('/(customer)/')} />
          ) : (
            <View style={styles.listWrap}>
              {following.map((artist) => (
                <TouchableOpacity
                  key={artist.artist_id}
                  style={followCard.item}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/artist/${artist.artist_id}`)}
                >
                  <Avatar name={artist.name} uri={artist.avatar_url} size={44} />
                  <View style={followCard.info}>
                    <Text style={followCard.name}>{artist.name}</Text>
                    <Text style={followCard.sub}>{artist.works_count} 作品 · {artist.follower_count} 粉丝</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {activeTab === 'comments' && (
          comments.length === 0 ? (
            <Empty icon="chatbubble-outline" text="还没有发表过评论" />
          ) : (
            <View style={styles.listWrap}>
              {comments.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={commentCard.item}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/style/${c.style_id}`)}
                >
                  {c.style_image_url
                    ? <Image source={{ uri: c.style_image_url }} style={commentCard.thumb} contentFit="cover" />
                    : <View style={[commentCard.thumb, commentCard.thumbPlaceholder]} />}
                  <View style={commentCard.body}>
                    <Text style={commentCard.styleTitle} numberOfLines={1}>{c.style_title}</Text>
                    <Text style={commentCard.artistName} numberOfLines={1}>{c.artist_name}</Text>
                    <Text style={commentCard.content} numberOfLines={2}>{c.content}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  return arr.reduce<T[][]>((acc, item, i) => {
    if (i % size === 0) acc.push([item]);
    else acc[acc.length - 1]!.push(item);
    return acc;
  }, []);
}

function Empty({
  icon, text, actionLabel, onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContent}>
      <Ionicons name={icon} size={52} color={Colors.border} />
      <Text style={styles.emptyText}>{text}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function GridContent({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  headerBg: { position: 'relative' },
  headerBgDefault: { backgroundColor: Colors.primary },
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  gearBtn: {
    position: 'absolute', right: 16, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  avatarSection: { alignItems: 'center', marginTop: -(AVATAR_SIZE / 2 + 3), zIndex: 1 },
  avatarRing: {
    borderWidth: 3, borderColor: '#fff', borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  infoSection: { alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: '#F2F2F7' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  ipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6,
    backgroundColor: '#EBEBEB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  ipText: { fontSize: 11, color: Colors.textSecondary },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, paddingVertical: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  statSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '10%', right: '10%',
    height: 2.5, backgroundColor: Colors.primary, borderRadius: 2,
  },
  emptyContent: {
    alignItems: 'center', paddingVertical: 60,
    marginHorizontal: 16, marginTop: 1, backgroundColor: '#fff',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  emptyAction: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: 20,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  grid: {
    marginHorizontal: PADDING, marginTop: 1, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    paddingHorizontal: 12,
  },
  gridRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  card: { width: ITEM_W, borderRadius: 12, backgroundColor: '#F8F8F8', overflow: 'hidden' },
  cardImage: { width: ITEM_W, height: ITEM_W * (4 / 3) },
  cardPlaceholder: { backgroundColor: '#E8E8E8' },
  cardInfo: { padding: 8, gap: 2 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 11, color: Colors.textSecondary },
  listWrap: {
    marginHorizontal: 16, marginTop: 1, backgroundColor: '#fff',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  listEmpty: { paddingVertical: 24, alignItems: 'center' },
  listEmptyText: { fontSize: 13, color: Colors.textSecondary },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

const apptCard = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  left: { width: 44, alignItems: 'center' },
  dateText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  timeText: { fontSize: 11, color: Colors.textSecondary },
  center: { flex: 1 },
  artistName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  styleName: { fontSize: 12, color: Colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});

const followCard = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});

const commentCard = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: '#E8E8E8' },
  body: { flex: 1 },
  styleTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  artistName: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  content: { fontSize: 13, color: Colors.text, lineHeight: 18 },
});
