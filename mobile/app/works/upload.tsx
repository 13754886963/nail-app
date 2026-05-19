import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGetCategories, apiCreateStyle, Category } from '../../services/nailStyleService';
import { Colors } from '../../constants/colors';

export default function UploadWorkScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<TextInput>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册访问权限才能上传作品');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!imageUri) { Alert.alert('提示', '请先选择作品图片'); return; }
    if (!title.trim()) { Alert.alert('提示', '请输入作品标题'); return; }
    if (!selectedCategoryId) { Alert.alert('提示', '请选择分类'); return; }

    setUploading(true);
    try {
      await apiCreateStyle({
        uri: imageUri,
        title: title.trim(),
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
        tags,
      });
      Alert.alert('成功', '作品已上传', [{ text: '好的', onPress: () => router.back() }]);
    } catch {
      Alert.alert('失败', '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Image picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="add-circle-outline" size={48} color={Colors.primaryLight} />
              <Text style={styles.imagePlaceholderText}>点击选择作品图片</Text>
              <Text style={styles.imagePlaceholderSub}>建议比例 3:4</Text>
            </View>
          )}
          {imageUri && (
            <View style={styles.imageEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={styles.imageEditText}>更换</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.label}>作品标题 *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="为你的作品起个名字"
          placeholderTextColor={Colors.textSecondary}
          maxLength={100}
        />

        {/* Category */}
        <Text style={styles.label}>分类 *</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategoryId === cat.id && styles.catChipActive]}
              onPress={() => setSelectedCategoryId(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, selectedCategoryId === cat.id && styles.catChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>描述（选填）</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="介绍一下这个作品的风格、用料等"
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Tags */}
        <Text style={styles.label}>标签（选填，最多 10 个）</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            ref={tagInputRef}
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="输入标签后按回车添加"
            placeholderTextColor={Colors.textSecondary}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              const t = tagInput.trim();
              if (t && !tags.includes(t) && tags.length < 10) {
                setTags((prev) => [...prev, t]);
              }
              setTagInput('');
            }}
          />
          <TouchableOpacity
            style={[styles.tagAddBtn, (tags.length >= 10 || !tagInput.trim()) && styles.tagAddBtnDisabled]}
            disabled={tags.length >= 10 || !tagInput.trim()}
            onPress={() => {
              const t = tagInput.trim();
              if (t && !tags.includes(t) && tags.length < 10) {
                setTags((prev) => [...prev, t]);
              }
              setTagInput('');
              tagInputRef.current?.focus();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagList}>
            {tags.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.tagChip}
                onPress={() => setTags((prev) => prev.filter((x) => x !== t))}
                activeOpacity={0.7}
              >
                <Text style={styles.tagChipText}># {t}</Text>
                <Ionicons name="close" size={12} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upload button */}
        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>发布作品</Text>
              </>
            )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20 },

  imagePicker: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF0F5',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
    position: 'relative',
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePlaceholderText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  imagePlaceholderSub: { fontSize: 12, color: Colors.textSecondary },
  previewImage: { width: '100%', height: '100%' },
  imageEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageEditText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 24,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textArea: { height: 100, paddingTop: 14 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catChipActive: { borderColor: Colors.primary, backgroundColor: '#FFF0F5' },
  catChipText: { fontSize: 14, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.primary, fontWeight: '600' },

  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagInput: {
    flex: 1,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: Colors.text, backgroundColor: Colors.surface,
  },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  tagAddBtnDisabled: { opacity: 0.4 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tagChipText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginTop: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
