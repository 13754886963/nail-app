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
import { apiGetMyStyles, NailStyle } from '../../services/nailStyleService';
import { apiGetMyArtistProfile, apiGetMyReceivedComments, ReceivedComment, ArtistProfile } from '../../services/artistService';
import { Colors } from '../../constants/colors';

const HEADER_H = 210;
const FALLBACK_BG = 'https://picsum.photos/seed/nailapp/800/400';
const AVATAR_SIZE = 88;
const COLS = 2;
const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;

type Tab = 'works' | 'received-comments';

export default function ArtistProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('works');
  const [works, setWorks] = useState<NailStyle[]>([]);
  const [receivedComments, setReceivedComments] = useState<ReceivedComment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(() => {
    apiGetMyArtistProfile().then(setArtistProfile).catch(() => {});
    apiGetMyStyles(50, 0).then(setWorks).catch(() => {});
    apiGetMyReceivedComments().then(setReceivedComments).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      apiGetMyArtistProfile().then(setArtistProfile),
      apiGetMyStyles(50, 0).then(setWorks),
      apiGetMyReceivedComments().then(setReceivedComments),
    ]);
    setRefreshing(false);
  }, []);

  if (!user) return null;

  const workRows = works.reduce<NailStyle[][]>((acc, item, i) => {
    if (i % 2 === 0) acc.push([item]);
    else acc[acc.length - 1]!.push(item);
    return acc;
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >

        <ImageBackground
          source={{ uri: user.background_url || works[0]?.image_url || FALLBACK_BG }}
          style={[styles.headerBg, { height: HEADER_H + insets.top }]}
          resizeMode="cover"
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

        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <Avatar name={user.name} uri={user.avatar_url} size={AVATAR_SIZE} />
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            <View style={styles.artistBadge}>
              <Text style={styles.artistBadgeText}>美甲师</Text>
            </View>
          </View>
          {user.location ? (
            <View style={styles.ipBadge}>
              <Ionicons name="location-outline" size={11} color={Colors.textSecondary} />
              <Text style={styles.ipText}>{user.location}</Text>
            </View>
          ) : null}
          {artistProfile?.bio ? (
            <Text style={styles.bio} numberOfLines={2}>{artistProfile.bio}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatItem label="粉丝" value={artistProfile?.follower_count ?? 0} />
          <View style={styles.statSep} />
          <StatItem label="作品" value={artistProfile?.works_count ?? 0} />
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(artistProfile?.avg_rating ?? 0) > 0
                ? `★ ${artistProfile!.avg_rating.toFixed(1)}`
                : '--'}
            </Text>
            <Text style={styles.statLabel}>评分</Text>
          </View>
          <View style={styles.statSep} />
          <StatItem label="服务" value={artistProfile?.served_count ?? 0} />
        </View>

        <View style={styles.tabBar}>
          <TabBtn label="作品集" active={activeTab === 'works'} onPress={() => setActiveTab('works')} />
          <TabBtn label="收到的评论" active={activeTab === 'received-comments'} onPress={() => setActiveTab('received-comments')} />
        </View>

        {activeTab === 'works' && (
          workRows.length === 0 ? (
            <View style={styles.emptyContent}>
              <Ionicons name="images-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyText}>还没有作品</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/works/upload')}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>立即上传</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {workRows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/style/${item.id}`)}
                    >
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                        : <View style={[styles.cardImage, styles.cardPlaceholder]} />}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.category_name}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {row.length < 2 && <View style={{ width: ITEM_W }} />}
                </View>
              ))}
            </View>
          )
        )}

        {activeTab === 'received-comments' && (
          receivedComments.length === 0 ? (
            <View style={styles.emptyContent}>
              <Ionicons name="chatbubbles-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyText}>还没有收到评论</Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {receivedComments.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={rcCard.item}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/style/${c.style_id}`)}
                >
                  <Avatar name={c.user_name} uri={c.user_avatar_url} size={40} />
                  <View style={rcCard.body}>
                    <View style={rcCard.header}>
                      <Text style={rcCard.userName}>{c.user_name}</Text>
                      <Text style={rcCard.styleName} numberOfLines={1}>· {c.style_title}</Text>
                    </View>
                    <Text style={rcCard.content} numberOfLines={3}>{c.content}</Text>
                  </View>
                  {c.style_image_url
                    ? <Image source={{ uri: c.style_image_url }} style={rcCard.thumb} resizeMode="cover" />
                    : null}
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
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  headerBg: { position: 'relative' },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  artistBadge: { backgroundColor: '#FFF0F5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  artistBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  ipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6,
    backgroundColor: '#EBEBEB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  ipText: { fontSize: 11, color: Colors.textSecondary },
  bio: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, paddingHorizontal: 32, textAlign: 'center' },
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
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2.5, backgroundColor: Colors.primary, borderRadius: 2,
  },
  emptyContent: {
    alignItems: 'center', paddingVertical: 60,
    marginHorizontal: 16, marginTop: 1, backgroundColor: '#fff',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingHorizontal: 20, paddingVertical: 9,
    backgroundColor: Colors.primary, borderRadius: 20,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  grid: {
    marginHorizontal: PADDING, marginTop: 1, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    paddingHorizontal: 12,
  },
  gridRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  card: { width: ITEM_W, borderRadius: 12, backgroundColor: '#F8F8F8', overflow: 'hidden' },
  cardImage: { width: ITEM_W, height: ITEM_W * (4 / 3) },
  cardPlaceholder: { backgroundColor: '#E8E8E8' },
  cardInfo: { padding: 8, gap: 4 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.text },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  catBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '500' },
  listWrap: {
    marginHorizontal: 16, marginTop: 1, backgroundColor: '#fff',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
});

const rcCard = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  userName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  styleName: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  content: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  thumb: { width: 52, height: 52, borderRadius: 8 },
});
