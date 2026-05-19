import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/colors';

interface NotifPrefs {
  appointment: boolean;
  message: boolean;
  system: boolean;
}

const KEY = 'notif_prefs';
const DEFAULTS: NotifPrefs = { appointment: true, message: true, system: true };

const ITEMS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: 'appointment', label: '预约通知', desc: '预约确认、拒绝、完成时提醒您' },
  { key: 'message',     label: '消息通知', desc: '收到新消息时提醒您' },
  { key: 'system',      label: '系统公告', desc: '重要系统更新和公告' },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((raw) => {
      if (raw) {
        try { setPrefs(JSON.parse(raw)); return; } catch {}
      }
      setPrefs(DEFAULTS);
    });
  }, []);

  const toggle = async (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...(prefs ?? DEFAULTS), [key]: value };
    setPrefs(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  };

  if (!prefs) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>推送通知</Text>
      <View style={styles.card}>
        {ITEMS.map((item, i) => (
          <View key={item.key}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => toggle(item.key, v)}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={prefs[item.key] ? Colors.primary : '#fff'}
              />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>关闭后仍可在应用内查看相关消息</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7', padding: 16, paddingTop: 20 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 13, fontWeight: '500', color: Colors.textSecondary,
    marginBottom: 8, marginLeft: 4,
  },
  card: { backgroundColor: Colors.background, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowText: { flex: 1, marginRight: 12 },
  label: { fontSize: 15, fontWeight: '500', color: Colors.text, marginBottom: 2 },
  desc: { fontSize: 13, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 16 },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, marginLeft: 4 },
});
