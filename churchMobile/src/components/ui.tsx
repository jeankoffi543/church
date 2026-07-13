import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radius } from '../theme';

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const isDisabled = disabled || loading;
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={secondary ? colors.indigo : colors.ink} />
      ) : (
        <Text style={[styles.buttonLabel, secondary && styles.buttonLabelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        style={styles.input}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

export function Banner({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return (
    <View style={[styles.banner, tone === 'success' ? styles.bannerSuccess : styles.bannerError]}>
      <Text style={[styles.bannerText, tone === 'success' ? styles.bannerTextSuccess : styles.bannerTextError]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  buttonLabelSecondary: { color: colors.indigo },
  field: { marginBottom: 14 },
  fieldLabel: { color: colors.indigo, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.indigo,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  banner: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  bannerError: { backgroundColor: 'rgba(201,83,107,0.12)' },
  bannerSuccess: { backgroundColor: 'rgba(31,138,91,0.12)' },
  bannerText: { fontSize: 14, fontWeight: '600' },
  bannerTextError: { color: colors.live },
  bannerTextSuccess: { color: colors.online },
});
