import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Dimensions, ActivityIndicator,
  TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetAllStyles, apiGetCategories, NailStyle, Category } from '../services/nailStyleService';
import { apiListArtists, apiToggleFollow, ArtistProfile } from '../services/artistService';
import { Avatar } from './Avatar';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { BouncingDots } from './BouncingDots';

const LIMIT = 12;
const COLS = 2;

const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;

type Mode = 'styles' | 'artists';

export function DiscoverFeed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('styles');

  // Styles tab state
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [items, setItems] = useState<NailStyle[]>([]);
  const [stylesRefreshing, setStylesRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const initialized = useRef(false);
  const loadingMoreRef = useRef(false);
  const loadedCatRef = useRef<string | null>(null);

  // Artists tab state
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsRefreshing, setArtistsRefreshing] = useState(false);
  const [artistQuery, setArtistQuery] = useState('');
  const artistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  const loadStyles = useCallback(async (reset: boolean, categoryId: string | null) => {
    const offset = reset ? 0 : offsetRef.current;
    const data = await apiGetAllStyles(LIMIT, offset, categoryId ?? undefined);
    if (reset) {
      setItems(data);
      offsetRef.current = data.length;
      loadedCatRef.current = categoryId;
    } else {
      setItems((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        return [...prev, ...data.filter((s) => !ids.has(s.id))];
      });
      offsetRef.current += data.length;
    }
    setHasMore(data.length === LIMIT);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialized.current) return;
      initialized.current = true;
      loadStyles(true, null).catch(() => {});
    }, [loadStyles])
  );

  const handleCatChange = useCallback((catId: string | null) => {
    setActiveCat(catId);
    setHasMore(true);
    loadStyles(true, catId).catch(() => {});
  }, [loadStyles]);

  const handleStylesRefresh = useCallback(async () => {
    setStylesRefreshing(true);
    try {
      const [data] = await Promise.all([
        apiGetAllStyles(LIMIT, 0, activeCat ?? undefined),
        new Promise<void>((r) => setTimeout(r, 1000)),
      ]);
      setItems([...data].sort(() => Math.random() - 0.5));
      offsetRef.current = data.length;
      loadedCatRef.current = activeCat;
      setHasMore(data.length === LIMIT);
    } catch {}
    setStylesRefreshing(false);
  }, [activeCat]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try { await loadStyles(false, activeCat); } catch {}
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [loadStyles, hasMore, activeCat]);

  const loadArtists = useCallback(async (q?: string) => {
    setArtistsLoading(true);
    try {
      const data = await apiListArtists(q);
      setArtists(data);
    } catch {}
    setArtistsLoading(false);
  }, []);

  const handleArtistsRefresh = useCallback(async () => {
    setArtistsRefreshing(true);
    try {
      const [data] = await Promise.all([
        apiListArtists(artistQuery || undefined),
        new Promise<void>((r) => setTimeout(r, 1000)),
      ]);
      setArtists([...data].sort(() => Math.random() - 0.5));
    } catch {}
    setArtistsRefreshing(false);
  }, [artistQuery]);

  const handleArtistQueryChange = useCallback((q: string) => {
    setArtistQuery(q);
    if (artistDebounceRef.current) clearTimeout(artistDebounceRef.current);
    artistDebounceRef.current = setTimeout(() => {
      loadArtists(q.trim() || undefined);
    }, 400);
  }, [loadArtists]);

  const onStylesScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !stylesRefreshing) {
      handleStylesRefresh();
    }
  }, [handleStylesRefresh, stylesRefreshing]);

  const onArtistsScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !artistsRefreshing) {
      handleArtistsRefresh();
    }
  }, [handleArtistsRefresh, artistsRefreshing]);

  const handleSwitchMode = useCallback((m: Mode) => {
    setMode(m);
    if (m === 'artists' && artists.length === 0) {
      loadArtists();
    }
  }, [artists.length, loadArtists]);

  const handleToggleFollow = useCallback(async (artist: ArtistProfile) => {
    try {
      const result = await apiToggleFollow(artist.id);
      setArtists((prev) =>
        prev.map((a) =>
          a.id === artist.id
            ? { ...a, is_followed: result.is_followed, follower_count: result.follower_count }
            : a
        )
      );
    } catch {}
  }, []);

  const chipsHeader = (
    <>
      {stylesRefreshing && <BouncingDots />}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip label="全部" active={activeCat === null} onPress={() => handleCatChange(null)} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={activeCat === c.id} onPress={() => handleCatChange(c.id)} />
        ))}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Fixed header — same position for both modes */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>发现</Text>
          <View style={styles.titleAccent} />
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push('/search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'styles' && styles.segBtnActive]}
          onPress={() => handleSwitchMode('styles')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, mode === 'styles' && styles.segTextActive]}>作品</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'artists' && styles.segBtnActive]}
          onPress={() => handleSwitchMode('artists')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, mode === 'artists' && styles.segTextActive]}>美甲师</Text>
        </TouchableOpacity>
      </View>

      {/* Both panes stay mounted — display:none keeps images in memory cache */}
      <View style={mode === 'styles' ? styles.fill : styles.gone}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={chipsHeader}
          onScrollEndDrag={onStylesScrollEndDrag}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !stylesRefreshing ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无内容</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => <StyleCard item={item} />}
        />
      </View>

      <View style={mode === 'artists' ? styles.fill : styles.gone}>
        <View style={styles.artistSearch}>
          <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.artistSearchInput}
            value={artistQuery}
            onChangeText={handleArtistQueryChange}
            placeholder="搜索美甲师姓名或地区..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {artistsLoading && artists.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <>
            {artistsRefreshing && <BouncingDots />}
            <FlatList
              data={artists}
              keyExtractor={(a) => a.id}
              contentContainerStyle={styles.artistList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollEndDrag={onArtistsScrollEndDrag}
              ListEmptyComponent={
                !artistsLoading ? (
                  <View style={styles.center}>
                    <Ionicons name="person-outline" size={52} color={Colors.border} />
                    <Text style={styles.emptyText}>
                      {artistQuery ? `未找到"${artistQuery}"` : '暂无美甲师'}
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <ArtistCard
                  artist={item}
                  onToggleFollow={handleToggleFollow}
                  currentUserId={currentUserId}
                />
              )}
            />
          </>
        )}
      </View>
    </View>
  );
}

function calcServiceScore(avgRating: number, reviewCount: number): number | null {
  if (reviewCount === 0) return null;
  return Math.round(Number(avgRating) * 20 * Math.min(reviewCount, 10) / 10);
}

function ArtistCard({
  artist,
  onToggleFollow,
  currentUserId,
}: {
  artist: ArtistProfile;
  onToggleFollow: (a: ArtistProfile) => void;
  currentUserId?: string;
}) {
  const router = useRouter();
  const isSelf = artist.user_id === currentUserId;
  const score = calcServiceScore(artist.avg_rating, artist.review_count);
  const scoreColor = score === null ? Colors.textSecondary
    : score >= 80 ? '#10B981'
    : score >= 50 ? '#F59E0B'
    : '#EF4444';

  return (
    <TouchableOpacity
      style={ac.wrap}
      activeOpacity={0.85}
      onPress={() => router.push(`/artist/${artist.id}`)}
    >
      <Avatar name={artist.name} uri={artist.avatar_url} size={52} />
      <View style={ac.info}>
        <View style={ac.nameRow}>
          <Text style={ac.name}>{artist.name}</Text>
          <View style={ac.badge}>
            <Text style={ac.badgeText}>{artist.is_part_time ? '兼职' : '全职'}</Text>
          </View>
        </View>
        {artist.location ? (
          <View style={ac.metaRow}>
            <Ionicons name="location-outline" size={11} color={Colors.textSecondary} />
            <Text style={ac.meta}>{artist.location}</Text>
          </View>
        ) : null}
        <View style={ac.statsRow}>
          <View style={[ac.scoreBadge, { backgroundColor: scoreColor + '18' }]}>
            <Text style={[ac.scoreText, { color: scoreColor }]}>
              服务分 {score !== null ? score : '--'}
            </Text>
          </View>
          <Text style={ac.stat}>{artist.served_count} 完成</Text>
          <Text style={ac.stat}>{artist.follower_count} 粉丝</Text>
        </View>
      </View>
      {!isSelf && (
        <TouchableOpacity
          style={[ac.followBtn, artist.is_followed && ac.followBtnActive]}
          onPress={(e) => { e.stopPropagation(); onToggleFollow(artist); }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[ac.followText, artist.is_followed && ac.followTextActive]}>
            {artist.is_followed ? '已关注' : '关注'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[chip.wrap, active && chip.wrapActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[chip.text, active && chip.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StyleCard({ item }: { item: NailStyle }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={card.wrap}
      activeOpacity={0.85}
      onPress={() => router.push(`/style/${item.id}`)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={card.image} contentFit="cover" />
      ) : (
        <View style={[card.image, card.placeholder]} />
      )}
      <View style={card.info}>
        <Text style={card.title} numberOfLines={1}>{item.title}</Text>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); router.push(`/artist/${item.artist_id}`); }}
          activeOpacity={0.7}
        >
          <Text style={[card.artist, card.artistLink]} numberOfLines={1}>{item.artist_name}</Text>
        </TouchableOpacity>
        <View style={card.badge}>
          <Text style={card.badgeText}>{item.category_name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING, paddingBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '600', color: Colors.text },
  titleAccent: { height: 3, width: 18, backgroundColor: Colors.primary, borderRadius: 2, marginTop: 3 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },

  segment: {
    flexDirection: 'row', marginHorizontal: PADDING, marginTop: 12,
    backgroundColor: '#E8E8EE', borderRadius: 12, padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10 },
  segBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  segText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  segTextActive: { color: Colors.text },

  artistSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: PADDING, marginTop: 12, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  artistSearchInput: { flex: 1, fontSize: 14, color: Colors.text },

  artistList: { padding: PADDING, paddingTop: 8, gap: 10 },

  chips: { paddingLeft: 8, paddingRight: PADDING, paddingVertical: 12, gap: 8 },

  fill: { flex: 1 },
  gone: { display: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  grid: { padding: PADDING, paddingTop: 4 },
  row: { gap: GAP, marginBottom: GAP },
  footer: { paddingVertical: 20, alignItems: 'center' },
});

const ac = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  badge: { backgroundColor: '#FFF0F5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 12, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  stat: { fontSize: 12, color: Colors.textSecondary },
  scoreBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  scoreText: { fontSize: 12, fontWeight: '700' },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followBtnActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.primary },
  followText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  followTextActive: { color: Colors.primary },
});

const chip = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.border,
  },
  wrapActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  text: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  textActive: { color: '#fff', fontWeight: '700' },
});

const card = StyleSheet.create({
  wrap: {
    width: ITEM_W, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  image: { width: ITEM_W, height: ITEM_W * (4 / 3) },
  placeholder: { backgroundColor: '#F0F0F0' },
  info: { padding: 10, gap: 4 },
  title: { fontSize: 13, fontWeight: '600', color: Colors.text },
  artist: { fontSize: 11, color: Colors.textSecondary },
  artistLink: { color: Colors.primary },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2,
  },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
});
