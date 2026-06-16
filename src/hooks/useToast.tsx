import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, useTheme, Palette } from '../theme';

export type ToastVariant = 'success' | 'error';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => setToast(null),
    );
  }, [opacity]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success', action?: ToastAction) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, variant, action });
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      const duration = action ? 5000 : 2400;
      hideTimer.current = setTimeout(hide, duration);
    },
    [opacity, translateY, hide],
  );

  const styles = createStyles(colors);
  const isSuccess = toast?.variant !== 'error';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            { opacity, transform: [{ translateY }] },
            { borderColor: isSuccess ? colors.success : colors.danger },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={isSuccess ? colors.success : colors.danger}
          />
          <Text style={styles.text}>{toast.message}</Text>
          {toast.action ? (
            <TouchableOpacity
              onPress={() => {
                toast.action!.onPress();
                hide();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionLabel}>{toast.action.label}</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: Platform.OS === 'ios' ? spacing.xxl + spacing.md : spacing.xxl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
    text: {
      flex: 1,
      fontSize: typography.body.fontSize,
      color: colors.text,
    },
    actionLabel: {
      fontSize: typography.body.fontSize,
      fontWeight: '700',
      color: colors.primary,
    },
  });
