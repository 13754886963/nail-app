import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const SECTIONS = [
  {
    title: '1. 我们收集的信息',
    body: '我们收集您在注册和使用过程中主动提供的信息，包括：姓名、邮箱地址、头像、联系电话（可选）、生日（可选）。对于美甲师用户，还包括从业经历、作品图片等专业信息。\n\n我们不会收集您的精确地理位置，仅收集您自愿填写的地区信息。',
  },
  {
    title: '2. 信息的使用方式',
    body: '您的信息用于：\n• 提供预约、消息、作品展示等核心服务\n• 向您发送预约状态更新等通知\n• 改进产品体验和解决技术问题\n\n我们不会将您的个人信息出售给第三方。',
  },
  {
    title: '3. 信息存储与安全',
    body: '您的账号密码经过加密存储。应用登录凭证保存于设备的安全存储区域，不会明文存储。\n\n我们采取合理的技术和管理措施保护您的信息，但无法保证绝对安全，请妥善保管您的账号信息。',
  },
  {
    title: '4. 信息的共享',
    body: '以下情况我们可能共享您的信息：\n• 预约流程中，顾客信息将展示给被预约的美甲师\n• 法律法规要求的情形\n\n除上述情形外，我们不会与任何第三方共享您的个人信息。',
  },
  {
    title: '5. 您的权利',
    body: '您有权：\n• 访问、更正或删除您的个人信息\n• 注销账号（账号注销后相关数据将在 30 天内删除）\n• 撤回对通知推送的授权\n\n如需行使上述权利，请通过"帮助与反馈"联系我们。',
  },
  {
    title: '6. 未成年人',
    body: '本应用面向 18 周岁及以上用户。如我们发现未成年人在未经监护人同意的情况下注册账号，将及时删除相关信息。',
  },
  {
    title: '7. 政策更新',
    body: '我们可能不定期更新本政策。重大变更时将通过应用内通知告知您。继续使用即视为同意更新后的政策。\n\n本政策最后更新日期：2026 年 5 月 18 日',
  },
];

export default function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        本隐私政策说明 NailApp 如何收集、使用和保护您的个人信息。请在使用本应用前仔细阅读。
      </Text>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingTop: 20 },
  intro: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, marginBottom: 16, marginHorizontal: 4 },
  section: { backgroundColor: Colors.background, borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary },
});
