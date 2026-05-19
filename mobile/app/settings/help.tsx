import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const FAQ: { q: string; a: string }[] = [
  {
    q: '如何预约美甲师？',
    a: '在"发现"页面浏览美甲师或作品，点击进入详情后选择"立即预约"，填写时间和备注后提交。美甲师确认后会收到通知。',
  },
  {
    q: '如何取消预约？',
    a: '在"我的预约"中找到目标预约，点击"取消预约"按钮即可。已确认的预约取消前请提前与美甲师沟通。',
  },
  {
    q: '预约后多久会有回复？',
    a: '美甲师通常在 24 小时内确认或拒绝预约。如超时未响应，可通过消息功能直接联系。',
  },
  {
    q: '如何修改个人资料？',
    a: '进入"设置 → 编辑资料"，修改昵称、头像、联系方式等信息后点击"保存"。',
  },
  {
    q: '忘记密码怎么办？',
    a: '目前请联系客服重置密码，后续版本将支持邮箱找回功能。',
  },
  {
    q: '如何成为美甲师？',
    a: '注册时选择"我是美甲师"身份即可。已注册为顾客的用户暂不支持切换角色，请联系客服处理。',
  },
];

function FAQItem({ item }: { item: (typeof FAQ)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={styles.faqRow}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </View>
  );
}

export default function HelpScreen() {
  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>常见问题</Text>
      <View style={styles.card}>
        {FAQ.map((item, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.divider} />}
            <FAQItem item={item} />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>联系我们</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => Linking.openURL('mailto:support@nailapp.example.com')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FFF0F5' }]}>
            <Ionicons name="mail-outline" size={16} color={Colors.primary} />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>邮件反馈</Text>
            <Text style={styles.contactDesc}>support@nailapp.example.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={Colors.border} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.contactRow}>
          <View style={[styles.iconWrap, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="time-outline" size={16} color="#22C55E" />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>客服时间</Text>
            <Text style={styles.contactDesc}>工作日 10:00 – 18:00</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  sectionTitle: {
    fontSize: 13, fontWeight: '500', color: Colors.textSecondary,
    marginTop: 24, marginBottom: 8, marginHorizontal: 20,
  },
  card: { backgroundColor: Colors.background, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 16 },
  faqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  faqQ: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text, marginRight: 8 },
  faqA: {
    fontSize: 14, lineHeight: 22, color: Colors.textSecondary,
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1 },
  contactLabel: { fontSize: 15, fontWeight: '500', color: Colors.text, marginBottom: 2 },
  contactDesc: { fontSize: 13, color: Colors.textSecondary },
});
