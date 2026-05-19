import { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBadgeStore } from '../../stores/badgeStore';
import { apiGetIncomingAppointments } from '../../services/appointmentService';
import { apiGetUnreadCount } from '../../services/notificationService';
import { Colors } from '../../constants/colors';

function PublishButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.publishBtn, { marginBottom: insets.bottom > 0 ? insets.bottom - 4 : 8 }]}
      onPress={() => router.push('/works/upload')}
      activeOpacity={0.85}
    >
      <View style={styles.publishCircle}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function ArtistTabsLayout() {
  const artistPending = useBadgeStore((s) => s.artistPending);
  const setArtistPending = useBadgeStore((s) => s.setArtistPending);
  const messageUnread = useBadgeStore((s) => s.messageUnread);
  const setMessageUnread = useBadgeStore((s) => s.setMessageUnread);

  useEffect(() => {
    apiGetIncomingAppointments()
      .then((data) => setArtistPending(data.filter((a) => a.status === 'pending').length))
      .catch(() => {});
    apiGetUnreadCount().then(setMessageUnread).catch(() => {});
  }, []);

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#E75480', headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '发现',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: '预约管理',
          tabBarBadge: artistPending > 0 ? artistPending : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: '',
          tabBarButton: () => <PublishButton />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '消息',
          tabBarBadge: messageUnread > 0 ? messageUnread : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 隐藏 works，仍可通过链接访问 */}
      <Tabs.Screen name="works" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  publishBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
});
