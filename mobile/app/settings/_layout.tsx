import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="index"           options={{ title: '设置' }} />
      <Stack.Screen name="edit-profile"    options={{ title: '编辑资料' }} />
      <Stack.Screen name="change-password" options={{ title: '修改密码' }} />
      <Stack.Screen name="notifications"   options={{ title: '通知设置' }} />
      <Stack.Screen name="help"            options={{ title: '帮助与反馈' }} />
      <Stack.Screen name="privacy"         options={{ title: '隐私政策' }} />
      <Stack.Screen name="about"           options={{ title: '关于 NailApp' }} />
    </Stack>
  );
}
