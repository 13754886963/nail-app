import { View, Text, Image, StyleSheet } from 'react-native';

// 10 组好看的色对，根据名字首字哈希选取
const PALETTES = [
  { bg: '#FFE4ED', text: '#D6336C' },
  { bg: '#E8F4FD', text: '#1971C2' },
  { bg: '#EBFBEE', text: '#2F9E44' },
  { bg: '#FFF3BF', text: '#E67700' },
  { bg: '#F3F0FF', text: '#7048E8' },
  { bg: '#E3FAFC', text: '#0C8599' },
  { bg: '#FFF0F6', text: '#C2255C' },
  { bg: '#F8F9FA', text: '#495057' },
  { bg: '#FFF9DB', text: '#F08C00' },
  { bg: '#E6FCF5', text: '#087F5B' },
];

function palette(name: string) {
  const code = name.trim().charCodeAt(0) || 0;
  return PALETTES[code % PALETTES.length]!;
}

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

export function Avatar({ name, uri, size = 72 }: AvatarProps) {
  const initials = name.trim().slice(0, 2);
  const { bg, text } = palette(name);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize: size * 0.38, color: text }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
