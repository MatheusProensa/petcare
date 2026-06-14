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
  /** Cor do texto/ícone sobre fundo `primary` (botões, badges sólidos). */
  onPrimary: string;
}

export const palettes: Record<ThemeScheme, Palette> = {
  // Paleta oficial da marca PetCare:
  // laranja #E66A3A / #F59E0B / #FFB27A · navy #1B2940 / #0B1120 · off-white #F8FAFC
  dark: {
    background: '#0B1120',
    surface: '#1B2940',
    surfaceElevated: '#26364E',
    primary: '#E66A3A',
    primaryLight: '#FFB27A',
    info: '#38BDF8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#A78BFA',
    text: '#F8FAFC',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    border: '#2A3B55',
    onPrimary: '#FFFFFF',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#EEF2F7',
    primary: '#E66A3A',
    primaryLight: '#C2410C',
    info: '#0369A1',
    success: '#0E9F6E',
    warning: '#B45309',
    danger: '#DC2626',
    accent: '#7C3AED',
    text: '#1B2940',
    textMuted: '#64748B',
    textSubtle: '#475569',
    border: '#E2E8F0',
    onPrimary: '#FFFFFF',
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

/** Escala tipográfica única — tamanhos e pesos padrão para títulos e textos. */
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '400' as const },
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
