import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiSearchStyles, NailStyle } from '../services/nailStyleService';
import { apiListArtists, apiToggleFollow, ArtistProfile } from '../services/artistService';
import { Avatar } from '../components/Avatar';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../stores/authStore';

const COLS = 2;
const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;

type Mode = 'styles' | 'artists';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('styles');

  const [styleResults, setStyleResults] = useState<NailStyle[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const runSearch = useCallback((q: string, m: Mode) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed) {
      setStyleResults([]);
      setArtistResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (m === 'styles') {
          const data = await apiSearchStyles(trimmed);
          setStyleResults(data);
        } else {
          const data = await apiListArtists(trimmed);
          setArtistResults(data);
        }
      } catch {
        if (m === 'styles') setStyleResults([]);
        else setArtistResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 400);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    runSearch(q, mode);
  };

  const handleSwitchMode = (m: Mode) => {
    setMode(m);
    if (query.trim()) runSearch(query, m);
  };

  const handleToggleFollow = async (artist: ArtistProfile) => {
    try {
      const result = await apiToggleFollow(artist.id);
      setArtistResults((prev) =>
        prev.map((a) =>
          a.id === artist.id
            ? { ...a, is_followed: result.is_followed, follower_count: result.follower_count }
            : a
        )
      );
    } catch {}
  };

  const trimmed = query.trim();
  const currentResults = mode === 'styles' ? styleResults : artistResults;
  const showEmpty = searched && !searching && currentResults.length === 0;
  const showHint = !trimmed;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.bar}>
        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="搜索作品或美甲师..."
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </View>

      {/* Segment control */}
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

      {/* Body */}
      {searching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : showHint ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={56} color={Colors.border} />
          <Text style={styles.hintText}>
            {mode === 'styles' ? '输入关键词搜索作品' : '输入姓名或地区搜索美甲师'}
          </Text>
        </View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Ionicons name="sad-outline" size={56} color={Colors.border} />
          <Text style={styles.hintText}>未找到「{trimmed}」的相关{mode === 'styles' ? '作品' : '美甲师'}</Text>
        </View>
      ) : mode === 'styles' ? (
        <FlatList
          data={styleResults}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.resultCount}>共 {styleResults.length} 个作品</Text>
          }
          renderItem={({ item }) => <StyleCard item={item} />}
        />
      ) : (
        <FlatList
          data={artistResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.artistList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.resultCount}>共 {artistResults.length} 位美甲师</Text>
          }
          renderItem={({ item }) => (
            <ArtistCard artist={item} onToggleFollow={handleToggleFollow} currentUserId={currentUserId} />
          )}
        />
      )}
    </View>
  );
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
          {artist.avg_rating > 0 && <Text style={ac.stat}>★ {artist.avg_rating.toFixed(1)}</Text>}
          <Text style={ac.stat}>{artist.works_count} 作品</Text>
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
        <TouchableOpacity onPress={() => router.push(`/artist/${item.artist_id}`)} activeOpacity={0.7}>
          <Text style={card.artist} numberOfLines={1}>{item.artist_name}</Text>
        </TouchableOpacity>
        <View style={card.badge}>
          <Text style={card.badgeText}>{item.category_name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  bar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    backgroundColor: '#F2F2F7',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon: { marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  segment: {
    flexDirection: 'row', marginHorizontal: PADDING, marginBottom: 8,
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hintText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },

  resultCount: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12 },
  grid: { padding: PADDING, paddingTop: 4 },
  row: { gap: GAP, marginBottom: GAP },

  artistList: { padding: PADDING, paddingTop: 4, gap: 10 },
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
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 1 },
  stat: { fontSize: 12, color: Colors.textSecondary },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followBtnActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.primary },
  followText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  followTextActive: { color: Colors.primary },
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
  artist: { fontSize: 11, color: Colors.primary },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2,
  },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
});
