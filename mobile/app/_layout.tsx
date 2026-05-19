import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Toast } from '../components/Toast';
import { Colors } from '../constants/colors';

function AuthGuard() {
  const { user, token, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuth = segments[0] === '(auth)';
    const inCustomer = segments[0] === '(customer)';
    const inArtist = segments[0] === '(artist)';

    if (!token) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // 已登录时，只重定向从 auth 页来的，或在错误 role 组里的情况
    // settings / style / artist / appointment 等顶层路由不需要重定向
    const inProtectedNested = ['settings', 'style', 'artist', 'appointment', 'works', 'search'].includes(segments[0] as string);
    if (inProtectedNested) return;

    const role = user?.role ?? 'customer';

    if (role === 'artist' && !inArtist) {
      router.replace('/(artist)');
    } else if (role === 'customer' && !inCustomer) {
      router.replace('/(customer)');
    }
  }, [token, isInitialized, segments, user?.role]);

  return null;
}

export default function RootLayout() {
  const { initialize, isInitialized } = useAuthStore();
  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <AuthGuard />
      <Toast />
      <Stack screenOptions={{ headerShown: false, headerBackTitleVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(artist)" />
        <Stack.Screen name="style/[id]" options={{ headerShown: true, title: '款式详情', headerTintColor: Colors.primary, headerBackTitle: '' }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="appointment/[id]" options={{ headerShown: true, title: '预约详情', headerTintColor: Colors.primary, headerBackTitle: '' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="works/upload" options={{ headerShown: true, title: '上传作品', headerTintColor: Colors.primary, headerBackTitle: '' }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
