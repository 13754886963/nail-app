import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/Avatar';
import {
  apiUpdateProfile,
  apiUploadAvatar,
  apiUploadBackground,
} from '../../services/userService';
import { apiUpdateArtistProfile, apiGetMyArtistProfile } from '../../services/artistService';
import { isValidEmail } from '../../utils/validation';
import { Colors } from '../../constants/colors';

const BG_H = 160;
const AVATAR_SIZE = 80;
const GENDERS = [
  { value: 'male',    label: '男' },
  { value: 'female',  label: '女' },
  { value: 'private', label: '保密' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isArtist = user?.role === 'artist';

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [gender, setGender] = useState<string>(user?.gender ?? '');
  const [birthday, setBirthday] = useState(
    user?.birthday ? (user.birthday as string).slice(0, 10) : ''
  );
  const [location, setLocation] = useState(user?.location ?? '');

  // Artist-only fields
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bio, setBio] = useState('');
  const [years, setYears] = useState('');
  const [isPartTime, setIsPartTime] = useState(false);

  useEffect(() => {
    if (!isArtist) return;
    apiGetMyArtistProfile().then((p) => {
      if (p.bio) setBio(p.bio);
      if (p.years_of_experience != null) setYears(String(p.years_of_experience));
      setIsPartTime(p.is_part_time);
    }).catch(() => {});
  }, [isArtist]);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  const pickImage = async (aspect: [number, number]) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限才能更换图片');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.85,
    });
    if (result.canceled) return null;
    return result.assets[0]!.uri;
  };

  const handlePickAvatar = async () => {
    const uri = await pickImage([1, 1]);
    if (!uri) return;
    setUploadingAvatar(true);
    try {
      const updated = await apiUploadAvatar(uri);
      updateUser(updated);
    } catch {
      Alert.alert('失败', '头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickBackground = async () => {
    const uri = await pickImage([16, 9]);
    if (!uri) return;
    setUploadingBg(true);
    try {
      const updated = await apiUploadBackground(uri);
      updateUser(updated);
    } catch {
      Alert.alert('失败', '背景图上传失败，请重试');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('提示', '昵称不能为空'); return; }
    if (email.trim() && !isValidEmail(email.trim())) { Alert.alert('提示', '邮箱格式不正确'); return; }
    setSaving(true);
    try {
      const updated = await apiUpdateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() !== user?.email ? email.trim() : undefined,
        gender: gender || null,
        birthday: birthday || null,
        location: location.trim() || null,
      });
      updateUser(updated);

      if (isArtist) {
        const yearsNum = years ? parseInt(years, 10) : undefined;
        await apiUpdateArtistProfile({
          bio: bio.trim() || null,
          years_of_experience: isNaN(yearsNum as number) ? null : yearsNum,
          is_part_time: isPartTime,
        });
      }

      Alert.alert('成功', '资料已更新', [{ text: '好的', onPress: () => router.back() }]);
    } catch {
      Alert.alert('失败', '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* 背景 + 头像 */}
        <View style={styles.headerSection}>
          <TouchableOpacity style={styles.bgTouchable} onPress={handlePickBackground} activeOpacity={0.85}>
            {user.background_url ? (
              <ImageBackground source={{ uri: user.background_url }} style={styles.bgImage} resizeMode="cover">
                <View style={styles.bgOverlay} />
                <BgHint loading={uploadingBg} label="更换背景" />
              </ImageBackground>
            ) : (
              <View style={[styles.bgImage, styles.bgPlaceholder]}>
                <BgHint loading={uploadingBg} label="点击设置背景图" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.avatarRow}>
            <TouchableOpacity style={styles.avatarTouchable} onPress={handlePickAvatar} activeOpacity={0.85}>
              <View style={styles.avatarRing}>
                <Avatar name={user.name} uri={user.avatar_url} size={AVATAR_SIZE} />
                {uploadingAvatar && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </View>
              <View style={styles.avatarCamIcon}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 基本信息 */}
        <SectionTitle title="基本信息" />

        <FieldLabel label="昵称" />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="请输入昵称"
          placeholderTextColor={Colors.textSecondary}
        />

        <FieldLabel label="邮箱" />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="请输入邮箱"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FieldLabel label="手机号" />
        <TextInput
          style={styles.input}
          value={phone ?? ''}
          onChangeText={setPhone}
          placeholder="请输入手机号（选填）"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="phone-pad"
        />

        <FieldLabel label="地区" />
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="城市 / 地区（选填）"
          placeholderTextColor={Colors.textSecondary}
        />

        <FieldLabel label="生日" />
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          <Text style={[styles.datePickerText, !birthday && styles.datePickerPlaceholder]}>
            {birthday || '选择生日（选填）'}
          </Text>
          {birthday ? (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => { e.stopPropagation(); setBirthday(''); }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {showDatePicker && (
          <View>
            <DateTimePicker
              value={birthday ? new Date(birthday) : new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (date) setBirthday(date.toISOString().slice(0, 10));
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.dateConfirmBtn}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateConfirmText}>完成</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FieldLabel label="性别" />
        <View style={styles.segmentRow}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.segBtn, gender === g.value && styles.segBtnActive]}
              onPress={() => setGender(gender === g.value ? '' : g.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segBtnText, gender === g.value && styles.segBtnTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 美甲师专属 */}
        {isArtist && (
          <>
            <SectionTitle title="美甲师信息" />

            <FieldLabel label="个人简介" />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="介绍一下自己（选填）"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <FieldLabel label="从业年限" />
            <TextInput
              style={styles.input}
              value={years}
              onChangeText={setYears}
              placeholder="如：3（选填）"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
            />

            <FieldLabel label="工作性质" />
            <View style={styles.segmentRow}>
              {([false, true] as boolean[]).map((val) => (
                <TouchableOpacity
                  key={String(val)}
                  style={[styles.segBtn, isPartTime === val && styles.segBtnActive]}
                  onPress={() => setIsPartTime(val)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segBtnText, isPartTime === val && styles.segBtnTextActive]}>
                    {val ? '兼职' : '全职'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>保存</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BgHint({ loading, label }: { loading: boolean; label: string }) {
  return (
    <View style={styles.bgHint}>
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={styles.bgHintText}>{label}</Text></>}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: 40 },
  headerSection: { marginBottom: 8 },

  bgTouchable: {},
  bgImage: { height: BG_H },
  bgPlaceholder: { backgroundColor: Colors.primaryLight },
  bgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  bgHint: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20,
  },
  bgHintText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  avatarRow: { alignItems: 'flex-start', paddingHorizontal: 20, marginTop: -(AVATAR_SIZE / 2) },
  avatarTouchable: { position: 'relative' },
  avatarRing: {
    borderWidth: 3, borderColor: '#fff', borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  avatarLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: AVATAR_SIZE / 2, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCamIcon: {
    position: 'absolute', right: 0, bottom: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  sectionTitle: {
    fontSize: 13, color: Colors.textSecondary, fontWeight: '600',
    marginTop: 28, marginBottom: 4, marginHorizontal: 20,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  label: {
    fontSize: 13, color: Colors.textSecondary,
    marginBottom: 8, marginTop: 18, marginHorizontal: 20, fontWeight: '500',
  },
  input: {
    height: 52, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 16, color: Colors.text, backgroundColor: Colors.surface, marginHorizontal: 20,
  },
  textarea: { height: 100, paddingTop: 12 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 52, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: Colors.surface, marginHorizontal: 20,
  },
  datePickerText: { flex: 1, fontSize: 16, color: Colors.text },
  datePickerPlaceholder: { color: Colors.textSecondary },
  dateConfirmBtn: {
    marginHorizontal: 20, marginTop: 4, paddingVertical: 12,
    backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center',
  },
  dateConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  segmentRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10 },
  segBtn: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  segBtnActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F5' },
  segBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  segBtnTextActive: { color: Colors.primary, fontWeight: '700' },

  button: {
    height: 52, backgroundColor: Colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 36, marginHorizontal: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
