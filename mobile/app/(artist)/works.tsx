import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGetMyStyles, apiDeleteStyle, NailStyle } from '../../services/nailStyleService';
import { Colors } from '../../constants/colors';
import { BouncingDots } from '../../components/BouncingDots';

const LIMIT = 12;
const COLS = 2;
const GAP = 10;
const PADDING = 16;
const ITEM_W = (Dimensions.get('window').width - PADDING * 2 - GAP) / COLS;

export default function WorksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [works, setWorks] = useState<NailStyle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    const offset = reset ? 0 : offsetRef.current;
    const data = await apiGetMyStyles(LIMIT, offset);
    if (reset) {
      setWorks(data);
      offsetRef.current = data.length;
    } else {
      // 重複排除してから追加
      setWorks((prev) => {
        const ids = new Set(prev.map((w) => w.id));
        const fresh = data.filter((w) => !ids.has(w.id));
        return [...prev, ...fresh];
      });
      offsetRef.current += data.length;
    }
    setHasMore(data.length === LIMIT);
  }, []);

  useEffect(() => {
    load(true).catch(() => {});
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(true), new Promise<void>((r) => setTimeout(r, 1000))]);
    } catch {}
    setRefreshing(false);
  }, [load]);

  const onScrollEndDrag = useCallback((e: any) => {
    if (e.nativeEvent.contentOffset.y < -60 && !refreshing) {
      handleRefresh();
    }
  }, [handleRefresh, refreshing]);

  const handleDelete = useCallback((item: NailStyle) => {
    Alert.alert('删除作品', `确认删除《${item.title}》？此操作不可撤销。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await apiDeleteStyle(item.id);
            setWorks((prev) => prev.filter((w) => w.id !== item.id));
          } catch {
            Alert.alert('失败', '删除失败，请重试');
          }
        },
      },
    ]);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try { await load(false); } catch {}
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [load, hasMore]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的作品</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/works/upload')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={works}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        contentContainerStyle={works.length === 0 ? styles.emptyContainer : styles.grid}
        columnWrapperStyle={works.length > 0 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={onScrollEndDrag}
        ListHeaderComponent={refreshing ? <BouncingDots /> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>还没有作品</Text>
              <Text style={styles.emptySubtitle}>上传你的第一个作品吧</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/works/upload')} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>立即上传</Text>
              </TouchableOpacity>
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
        renderItem={({ item }) => <WorkCard item={item} onDelete={() => handleDelete(item)} />}
      />
    </View>
  );
}

function WorkCard({ item, onDelete }: { item: NailStyle; onDelete: () => void }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/style/${item.id}`)}
      onLongPress={onDelete}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color={Colors.border} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeText}>{item.category_name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 120 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.border },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: 20,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  grid: { padding: PADDING, paddingTop: 8 },
  row: { gap: GAP, marginBottom: GAP },

  card: {
    width: ITEM_W, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardImage: { width: ITEM_W, height: ITEM_W * (4 / 3) },
  cardImagePlaceholder: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: 10, gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  catBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },

  footer: { paddingVertical: 20, alignItems: 'center' },
});
