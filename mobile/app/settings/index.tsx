import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/Avatar';
import { apiDevSwitchUser } from '../../services/userService';
import { Colors } from '../../constants/colors';

// TODO: 测试账号，上线前删除
const DEV_ACCOUNTS = [
  { id: '5d79f493-fcc6-49b5-a616-411a4e9497f0', name: 'KUMAKO_nailz', roleLabel: '美甲师' },
  { id: '8d0e0576-92cd-430c-97dc-5cdc515e7133', name: 'User_Njh',     roleLabel: '顾客'   },
] as const;

const APP_VERSION = '0.1.0';

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function Row({ icon, iconBg, iconColor, label, value, onPress, danger }: RowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg ?? Colors.surface }]}>
          <Ionicons name={icon} size={16} color={danger ? Colors.error : (iconColor ?? Colors.textSecondary)} />
        </View>
        <Text style={[styles.rowLabel, { color: danger ? Colors.error : Colors.text }]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={15} color={Colors.border} />
      </View>
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);
  const handleClearCache = () => {
    Alert.alert('清除缓存', '确定要清除本地图片缓存吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        onPress: async () => {
          await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
          Alert.alert('完成', '缓存已清除');
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  // TODO: 测试用，上线前删除
  const handleDevSwitchUser = (targetId: string, targetName: string) => {
    Alert.alert('切换账号（测试用）', `切换到 ${targetName}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '切换',
        onPress: async () => {
          try {
            const { user: newUser, token } = await apiDevSwitchUser(targetId);
            await setAuth(newUser, token);
          } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
              ?? (e as { message?: string })?.message ?? '未知错误';
            Alert.alert('失败', `切换失败：${msg}`);
          }
        },
      },
    ]);
  };

  if (!user) return null;

  const roleLabel = user.role === 'artist' ? '美甲师' : '顾客';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户摘要卡 */}
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => router.push('/settings/edit-profile')}
        activeOpacity={0.8}
      >
        <Avatar name={user.name} uri={user.avatar_url} size={52} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userMeta}>{roleLabel} · {user.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.border} />
      </TouchableOpacity>

      <SectionTitle title="账号" />
      <View style={styles.card}>
        <Row
          icon="person-outline" iconBg="#FFF0F5" iconColor={Colors.primary}
          label="编辑资料" onPress={() => router.push('/settings/edit-profile')}
        />
        <Divider />
        <Row
          icon="lock-closed-outline" iconBg="#FFF0F5" iconColor={Colors.primary}
          label="修改密码" onPress={() => router.push('/settings/change-password')}
        />
      </View>

      <SectionTitle title="偏好" />
      <View style={styles.card}>
        <Row
          icon="notifications-outline" iconBg="#FFF3E0" iconColor="#F59E0B"
          label="通知设置"
          onPress={() => router.push('/settings/notifications')}
        />
      </View>

      <SectionTitle title="关于" />
      <View style={styles.card}>
        <Row
          icon="information-circle-outline" iconBg="#EEF6FF" iconColor="#3B82F6"
          label="关于 NailApp" value={`v${APP_VERSION}`}
          onPress={() => router.push('/settings/about')}
        />
        <Divider />
        <Row
          icon="help-circle-outline" iconBg="#F0FDF4" iconColor="#22C55E"
          label="帮助与反馈"
          onPress={() => router.push('/settings/help')}
        />
        <Divider />
        <Row
          icon="shield-checkmark-outline" iconBg="#F5F3FF" iconColor="#8B5CF6"
          label="隐私政策"
          onPress={() => router.push('/settings/privacy')}
        />
        <Divider />
        <Row
          icon="trash-outline" iconBg="#FFF3E0" iconColor="#F59E0B"
          label="清除缓存"
          onPress={handleClearCache}
        />
      </View>

      {/* TODO: 测试用，上线前删除整个 section */}
      <SectionTitle title="开发测试" />
      <View style={styles.card}>
        {DEV_ACCOUNTS.map((acct, i) => {
          const isCurrent = user.id === acct.id;
          return (
            <View key={acct.id}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                style={styles.row}
                onPress={isCurrent ? undefined : () => handleDevSwitchUser(acct.id, acct.name)}
                activeOpacity={isCurrent ? 1 : 0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: isCurrent ? '#F0FDF4' : '#FFF3E0' }]}>
                    <Ionicons
                      name={acct.roleLabel === '美甲师' ? 'brush-outline' : 'person-outline'}
                      size={16}
                      color={isCurrent ? '#22C55E' : '#F59E0B'}
                    />
                  </View>
                  <View>
                    <Text style={styles.rowLabel}>{acct.name}</Text>
                    <Text style={[styles.rowValue, { marginTop: 1 }]}>{acct.roleLabel}</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  {isCurrent
                    ? <View style={devStyles.badge}><Text style={devStyles.badgeText}>当前</Text></View>
                    : <Ionicons name="swap-horizontal-outline" size={18} color={Colors.textSecondary} />}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <SectionTitle title="" />
      <View style={styles.card}>
        <Row
          icon="log-out-outline" iconBg="#FFF0F0"
          label="退出登录" onPress={handleLogout} danger
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16, marginTop: 20,
    borderRadius: 16, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  userMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  sectionTitle: {
    fontSize: 13, fontWeight: '500', color: Colors.textSecondary,
    marginTop: 24, marginBottom: 8, marginHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.background,
    marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, color: Colors.text },
  rowValue: { fontSize: 14, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 60 },
  bottomPadding: { height: 40 },
});

const devStyles = StyleSheet.create({
  badge: {
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
});
