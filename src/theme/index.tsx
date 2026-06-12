import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeScheme = 'dark' | 'light';

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  /** Cor de destaque para ícones e links sobre o fundo. */
  primaryLight: string;
  info: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
}

export const palettes: Record<ThemeScheme, Palette> = {
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#27364D',
    primary: '#D85A30',
    primaryLight: '#F0997B',
    info: '#38BDF8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#A78BFA',
    text: '#F8FAFC',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    border: '#2A3950',
  },
  light: {
    background: '#FDF9F3',
    surface: '#FFFFFF',
    surfaceElevated: '#F4EBDD',
    primary: '#D85A30',
    primaryLight: '#C2410C',
    info: '#0369A1',
    success: '#0E9F6E',
    warning: '#B45309',
    danger: '#DC2626',
    accent: '#7C3AED',
    text: '#2C2C2A',
    textMuted: '#8A877E',
    textSubtle: '#5F5E5A',
    border: '#EDE5D8',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

const THEME_KEY = '@petcare:theme';

interface ThemeContextValue {
  scheme: ThemeScheme;
  colors: Palette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'dark',
  colors: palettes.dark,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ThemeScheme>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark') setScheme(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: palettes[scheme],
      toggleTheme: () =>
        setScheme(prev => {
          const next: ThemeScheme = prev === 'dark' ? 'light' : 'dark';
          AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
          return next;
        }),
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Memoiza um StyleSheet construído a partir da paleta atual. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
