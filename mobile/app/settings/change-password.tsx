import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiChangePassword } from '../../services/userService';
import { validatePassword } from '../../utils/validation';
import { PasswordInput } from '../../components/PasswordInput';
import { Colors } from '../../constants/colors';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!current) { Alert.alert('提示', '请输入当前密码'); return; }
    const pwdError = validatePassword(next);
    if (pwdError) { Alert.alert('提示', pwdError); return; }
    if (next !== confirm) { Alert.alert('提示', '两次输入的新密码不一致'); return; }

    setLoading(true);
    try {
      await apiChangePassword(current, next);
      Alert.alert('成功', '密码已修改', [{ text: '好的', onPress: () => router.back() }]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message ?? '修改失败，请重试';
      Alert.alert('失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>当前密码</Text>
        <PasswordInput
          style={styles.pwWrap}
          value={current}
          onChangeText={setCurrent}
          placeholder="请输入当前密码"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="next"
          onSubmitEditing={() => nextRef.current?.focus()}
        />

        <Text style={styles.label}>新密码</Text>
        <PasswordInput
          ref={nextRef}
          style={styles.pwWrap}
          value={next}
          onChangeText={setNext}
          placeholder="至少 8 位，含字母和数字"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />

        <Text style={styles.label}>确认新密码</Text>
        <PasswordInput
          ref={confirmRef}
          style={styles.pwWrap}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="再次输入新密码"
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={handleSave}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>确认修改</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, paddingTop: 16 },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, marginTop: 20 },
  pwWrap: {},
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
