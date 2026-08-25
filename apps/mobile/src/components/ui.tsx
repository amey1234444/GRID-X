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

import {
  colors,
  elevation,
  radius,
  spacing,
  stateColors,
  statusTone,
  toneBorder,
  toneColor,
  toneWash,
  typography,
  humanise,
  type MachineState,
} from '@/theme';

/**
 * GRID-X mobile primitives.
 *
 * Same language as the web components, expressed in React Native: layered
 * surfaces, hairline borders in place of inset rings, a restrained press
 * scale, and colour reserved for status.
 */

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
    <Pressable onPress={onPress} onPressIn={() => animate(0.985)} onPressOut={() => animate(1)}>
      <Animated.View style={[styles.card, style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function StatusPill({ status }: { status: string }): React.JSX.Element {
  const tone = statusTone(status);
  const color = toneColor(tone);
  return (
    <View style={[styles.pill, { backgroundColor: toneWash(tone), borderColor: toneBorder(tone) }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{humanise(status)}</Text>
    </View>
  );
}

/** Live operating state for a machine or site — distinct from workflow status. */
export function StateDot({ state, label }: { state: MachineState; label?: string }): React.JSX.Element {
  const color = stateColors[state];
  return (
    <View style={styles.stateRow}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[typography.small, { color }]}>{label ?? humanise(state)}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
}): React.JSX.Element {
  const accent =
    tone === 'warning'
      ? colors.warning
      : tone === 'destructive'
        ? colors.destructive
        : tone === 'success'
          ? colors.success
          : colors.primary;

  const valueColor = tone === 'default' ? colors.foreground : accent;

  return (
    <View style={styles.statTile}>
      {/* Accent rail carries the tone so the number itself stays legible. */}
      <View style={[styles.statRail, { backgroundColor: accent }]} />
      <Text style={typography.label}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
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
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number): void => {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'destructive'
        ? colors.destructive
        : variant === 'outline'
          ? colors.surfaceElevated
          : 'transparent';

  const textColor =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'destructive'
        ? '#ffffff'
        : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: colors.borderSubtle,
            opacity: disabled || loading ? 0.55 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Input({ style, ...props }: TextInputProps): React.JSX.Element {
  return (
    <TextInput
      placeholderTextColor={colors.subtleForeground}
      style={[styles.input, style]}
      autoCapitalize="none"
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={typography.heading}>{title}</Text>
      <Text style={[typography.small, styles.centered]}>{description}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={[typography.heading, { color: colors.destructive }]}>Could not load</Text>
      <Text style={[typography.small, styles.centered, { marginBottom: spacing.md }]}>{message}</Text>
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

/**
 * Skeleton block for list loading. A static muted surface rather than an
 * animated shimmer — on the low-end devices this app targets, the animation
 * costs more than it communicates.
 */
export function SkeletonRow({ lines = 2 }: { lines?: number }): React.JSX.Element {
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonBar,
            { width: index === 0 ? '60%' : '85%', marginTop: index === 0 ? 0 : spacing.sm },
          ]}
        />
      ))}
    </View>
  );
}

/** Quiet group label for a long field list. */
export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={[typography.label, { marginBottom: spacing.sm }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    ...elevation.hairline,
    padding: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '500' },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTile: {
    flex: 1,
    minWidth: '45%',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    ...elevation.hairline,
    padding: spacing.lg,
  },
  statRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, opacity: 0.7 },
  statValue: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  statHint: { fontSize: 12, color: colors.subtleForeground, marginTop: 4 },
  button: {
    height: 48,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  input: {
    height: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  centered: { textAlign: 'center', marginTop: spacing.sm },
  skeletonBar: {
    height: 12,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceHover,
  },
});
