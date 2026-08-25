import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, statusTone, toneColor, typography, humanise } from '@/theme';

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  const animate = (to: number): void => {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={() => animate(0.98)} onPressOut={() => animate(1)}>
      <Animated.View style={[styles.card, style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function StatusPill({ status }: { status: string }): React.JSX.Element {
  const tone = toneColor(statusTone(status));
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}22` }]}>
      <View style={[styles.pillDot, { backgroundColor: tone }]} />
      <Text style={[styles.pillText, { color: tone }]}>{humanise(status)}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
}): React.JSX.Element {
  const valueColor =
    tone === 'warning'
      ? colors.warning
      : tone === 'destructive'
        ? colors.destructive
        : tone === 'success'
          ? colors.success
          : colors.foreground;
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number): void => {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'destructive' ? colors.destructive : 'transparent';
  const textColor = variant === 'outline' ? colors.foreground : colors.primaryForeground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: colors.border,
            opacity: disabled || loading ? 0.6 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.buttonText, { color: variant === 'destructive' ? '#fff' : textColor }]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Input(props: TextInputProps): React.JSX.Element {
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={styles.input}
      autoCapitalize="none"
      {...props}
    />
  );
}

export function EmptyState({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={typography.heading}>{title}</Text>
      <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.sm }]}>{description}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={[typography.heading, { color: colors.destructive }]}>Could not load</Text>
      <Text style={[typography.caption, { textAlign: 'center', marginVertical: spacing.md }]}>{message}</Text>
      <Button title="Try again" variant="outline" onPress={onRetry} />
    </View>
  );
}

export function LoadingState(): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '600' },
  statTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  statValue: { fontSize: 24, fontWeight: '600' },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
});
