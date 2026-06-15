import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeScheme = 'dark' | 'light';

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  /** Superfície quente levemente elevada (cards secundários). */
  surface2: string;
  /** Superfície "afundada" (trilhas de progresso, thumbs). */
  surfaceSunken: string;
  primary: string;
  /** Laranja mais escuro para gradientes/realces de CTA. */
  primaryStrong: string;
  /** Fundo tonal suave do primário (botão secundário, chips). */
  primarySoft: string;
  /** Cor de destaque para ícones e links sobre o fundo. */
  primaryLight: string;
  /** Cor do texto/ícone sobre fundo `primary` (botões, badges sólidos). */
  onPrimary: string;
  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  /** Vidro fosco para elementos flutuantes (tab bar, overlays). */
  glass: string;
}

export const palettes: Record<ThemeScheme, Palette> = {
  // Paleta oficial PetCare (redesign): laranja #E66A3A · navy #1B2940 · creme #FBF5EF
  light: {
    background: '#FBF5EF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFF8F2',
    surface2: '#FFF8F2',
    surfaceSunken: '#F4EDE6',
    primary: '#E66A3A',
    primaryStrong: '#D2562A',
    primarySoft: '#FBE6DA',
    primaryLight: '#C2410C',
    onPrimary: '#FFFFFF',
    info: '#2C72B8',
    infoSoft: '#DEEAF6',
    success: '#0E9F6E',
    successSoft: '#DEF3EA',
    warning: '#C9760F',
    warningSoft: '#FBEBD3',
    danger: '#D6493B',
    dangerSoft: '#FBE3DF',
    accent: '#7C3AED',
    accentSoft: '#ECE3FB',
    text: '#1B2940',
    textMuted: '#6A788C',
    textSubtle: '#4A586E',
    border: '#EEE2D8',
    borderStrong: '#E3D4C7',
    glass: 'rgba(255,255,255,0.82)',
  },
  dark: {
    background: '#0A0F1C',
    surface: '#161F33',
    surfaceElevated: '#1C273F',
    surface2: '#1C273F',
    surfaceSunken: '#111A2C',
    primary: '#F4793F',
    primaryStrong: '#E2602A',
    primarySoft: '#3A2519',
    primaryLight: '#FFB27A',
    onPrimary: '#FFFFFF',
    info: '#54A8F0',
    infoSoft: '#122336',
    success: '#2DD49A',
    successSoft: '#122A24',
    warning: '#F5A623',
    warningSoft: '#2E2310',
    danger: '#F4685A',
    dangerSoft: '#2E1916',
    accent: '#A78BFA',
    accentSoft: '#221C3A',
    text: '#F4F7FB',
    textMuted: '#8C99AE',
    textSubtle: '#5E6B82',
    border: '#25324B',
    borderStrong: '#303E59',
    glass: 'rgba(22,31,51,0.78)',
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

/** Raios do redesign — cards mais arredondados (18-26) + pílulas (999). */
export const radius = {
  sm: 11,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 26,
  full: 9999,
} as const;

/** Famílias do redesign. Carregadas via useFonts no App.tsx. */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayExtra: 'BricolageGrotesque_800ExtraBold',
  text: 'PlusJakartaSans_400Regular',
  textMedium: 'PlusJakartaSans_500Medium',
  textSemibold: 'PlusJakartaSans_600SemiBold',
  textBold: 'PlusJakartaSans_700Bold',
} as const;

/**
 * Escala tipográfica. `display`/`h1-h3` usam Bricolage Grotesque (títulos,
 * nomes de pets, números); o resto usa Plus Jakarta Sans.
 */
export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, fontFamily: fonts.displayExtra, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '700' as const, fontFamily: fonts.display, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, fontFamily: fonts.display, letterSpacing: -0.4 },
  h3: { fontSize: 18, fontWeight: '700' as const, fontFamily: fonts.display, letterSpacing: -0.4 },
  h4: { fontSize: 16, fontWeight: '700' as const, fontFamily: fonts.textBold },
  body: { fontSize: 15, fontWeight: '400' as const, fontFamily: fonts.text },
  label: { fontSize: 13, fontWeight: '600' as const, fontFamily: fonts.textSemibold },
  caption: { fontSize: 12, fontWeight: '400' as const, fontFamily: fonts.text },
  tiny: { fontSize: 11, fontWeight: '400' as const, fontFamily: fonts.text },
} as const;

/** Sombras quentes em 3 níveis (iOS shadow* / Android elevation). */
export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#3A2A1E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#3A2A1E', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 18 },
    android: { elevation: 6 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#1B2940', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 34 },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

const THEME_KEY = '@petcare:theme';

interface ThemeContextValue {
  scheme: ThemeScheme;
  colors: Palette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: palettes.light,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ThemeScheme>('light');

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
