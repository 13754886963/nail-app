import { useColorScheme } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { LightColors, DarkColors } from '../constants/colors';

export type AppColors = typeof LightColors;

export function useColors(): AppColors {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  if (mode === 'system') return system === 'dark' ? DarkColors : LightColors;
  return mode === 'dark' ? DarkColors : LightColors;
}

export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  if (mode === 'system') return system === 'dark';
  return mode === 'dark';
}
