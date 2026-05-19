import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';

const APP_VERSION = '0.1.0';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Logo 区域 */}
      <View style={styles.logoSection}>
        <Text style={styles.logoEmoji}>💅</Text>
        <Text style={styles.appName}>NailApp</Text>
        <Text style={styles.version}>版本 {APP_VERSION}</Text>
      </View>

      {/* 简介 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>关于我们</Text>
        <Text style={styles.cardText}>
          NailApp 是一款专注于美甲预约与款式发现的应用。我们致力于连接每一位热爱美甲的顾客与优秀的美甲师，让美甲变得更简单、更美好。
        </Text>
      </View>

      {/* 功能介绍 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>主要功能</Text>
        {[
          { icon: '🔍', text: '浏览海量美甲款式，找到专属风格' },
          { icon: '💆', text: '发现附近优质美甲师，一键预约' },
          { icon: '❤️', text: '收藏喜欢的款式，随时查看' },
          { icon: '📅', text: '管理预约记录，轻松安排时间' },
        ].map((item) => (
          <View key={item.text} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{item.icon}</Text>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.copyright}>© 2026 NailApp. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20, paddingBottom: 48 },

  logoSection: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logoEmoji: { fontSize: 56 },
  appName: { fontSize: 24, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  version: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  featureIcon: { fontSize: 16 },
  featureText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, flex: 1 },

  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.border,
    marginTop: 8,
  },
});
