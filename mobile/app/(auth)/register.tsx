import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRegister } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { PasswordInput } from '../../components/PasswordInput';
import { Colors } from '../../constants/colors';
import { isValidEmail, validatePassword } from '../../utils/validation';

type Role = 'customer' | 'artist';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [role, setRole] = useState<Role>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('提示', '请填写昵称'); return; }
    if (!email.trim() || !isValidEmail(email)) { Alert.alert('提示', '邮箱格式不正确'); return; }
    const pwdError = validatePassword(password);
    if (pwdError) { Alert.alert('提示', pwdError); return; }

    setLoading(true);
    try {
      const { user, token } = await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      await setAuth(user, token);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message ?? '注册失败，请重试';
      Alert.alert('注册失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>

        <Text style={styles.title}>创建账号</Text>
        <Text style={styles.subtitle}>加入我们，探索美甲世界</Text>

        {/* 身份选择 */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
            onPress={() => setRole('customer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
              💁 我是顾客
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'artist' && styles.roleButtonActive]}
            onPress={() => setRole('artist')}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleText, role === 'artist' && styles.roleTextActive]}>
              💅 我是美甲师
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="昵称"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextInput
          ref={emailRef}
          style={styles.input}
          placeholder="邮箱"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordInput
          ref={passwordRef}
          style={styles.passwordWrap}
          placeholder="密码（至少 8 位，含字母和数字）"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleRegister}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>注册</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
          <Text style={styles.link}>
            已有账号？<Text style={styles.linkBold}>立即登录</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  backButton: { marginBottom: 32 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 32 },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF0F5',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  roleTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  passwordWrap: { marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  link: { textAlign: 'center', color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primary, fontWeight: '600' },
});
