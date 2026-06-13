import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface Props {
  size?: number;
}

export function ThemeToggle({ size = 22 }: Props) {
  const { colors, scheme, toggleTheme } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={scheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      <Ionicons
        name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
        size={size}
        color={colors.textSubtle}
      />
    </TouchableOpacity>
  );
}
