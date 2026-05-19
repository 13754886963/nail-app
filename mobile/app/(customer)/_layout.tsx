import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBadgeStore } from '../../stores/badgeStore';
import { apiGetMyAppointments } from '../../services/appointmentService';
import { apiGetUnreadCount } from '../../services/notificationService';

export default function CustomerTabsLayout() {
  const customerPending = useBadgeStore((s) => s.customerPending);
  const setCustomerPending = useBadgeStore((s) => s.setCustomerPending);
  const messageUnread = useBadgeStore((s) => s.messageUnread);
  const setMessageUnread = useBadgeStore((s) => s.setMessageUnread);

  useEffect(() => {
    apiGetMyAppointments()
      .then((data) => setCustomerPending(data.filter((a) => a.status === 'pending').length))
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
        name="booking"
        options={{
          title: '预约',
          tabBarBadge: customerPending > 0 ? customerPending : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="favorites" options={{ href: null }} />
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
    </Tabs>
  );
}
