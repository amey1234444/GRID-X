import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  type StatusTone,
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
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const base = [styles.card, padded && styles.cardPadded, style];

  if (!onPress) return <View style={base}>{children}</View>;

  const animate = (to: number): void => {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={() => animate(0.985)} onPressOut={() => animate(1)}>
      <Animated.View style={[...base, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function StatusPill({
  status,
  label,
  tone,
}: {
  status: string;
  label?: string;
  tone?: StatusTone;
}): React.JSX.Element {
  const resolved = tone ?? statusTone(status);
  const color = toneColor(resolved);
  return (
    <View style={[styles.pill, { backgroundColor: toneWash(resolved), borderColor: toneBorder(resolved) }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label ?? humanise(status)}</Text>
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
  onPress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'destructive' | 'success' | 'info';
  onPress?: () => void;
}): React.JSX.Element {
  const accent =
    tone === 'warning'
      ? colors.warning
      : tone === 'destructive'
        ? colors.destructive
        : tone === 'success'
          ? colors.success
          : tone === 'info'
            ? colors.info
            : colors.primary;

  const valueColor = tone === 'default' ? colors.foreground : accent;
  const content = (
    <>
      {/* Accent rail carries the tone so the number itself stays legible. */}
      <View style={[styles.statRail, { backgroundColor: accent }]} />
      <Text style={typography.label}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </>
  );

  if (!onPress) return <View style={styles.statTile}>{content}</View>;
  return (
    <Pressable style={styles.statTile} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'default' | 'small';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
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
        : variant === 'success'
          ? colors.success
          : variant === 'outline'
            ? colors.surfaceElevated
            : 'transparent';

  const textColor =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'destructive' || variant === 'success'
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
      style={style}
    >
      <Animated.View
        style={[
          styles.button,
          size === 'small' && styles.buttonSmall,
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
          <View style={styles.buttonInner}>
            {icon ? <Ionicons name={icon} size={size === 'small' ? 15 : 17} color={textColor} /> : null}
            <Text style={[styles.buttonText, size === 'small' && styles.buttonTextSmall, { color: textColor }]}>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={typography.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={typography.caption}>{hint}</Text> : null}
    </View>
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

export function Textarea({ style, ...props }: TextInputProps): React.JSX.Element {
  return (
    <TextInput
      placeholderTextColor={colors.subtleForeground}
      multiline
      textAlignVertical="top"
      style={[styles.input, styles.textarea, style]}
      {...props}
    />
  );
}

/** Horizontal segmented control — the mobile equivalent of the web's animated tabs. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segmentedItem, active && styles.segmentedItemActive]}
          >
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Scrolling filter chips for lists with many statuses. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={styles.chipScroll}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
              {option.count !== undefined ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Label/value list used on every detail screen. */
export function FactList({
  facts,
}: {
  facts: { label: string; value: string; tone?: StatusTone }[];
}): React.JSX.Element {
  return (
    <View>
      {facts.map((fact, index) => (
        <View key={fact.label} style={[styles.factRow, index > 0 && styles.factRowBorder]}>
          <Text style={[typography.caption, styles.factLabel]}>{fact.label}</Text>
          <Text
            style={[typography.body, styles.factValue, fact.tone ? { color: toneColor(fact.tone) } : null]}
            numberOfLines={3}
          >
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Thin quantity/progress bar. Animates to its value so a refresh reads as movement. */
export function ProgressBar({
  value,
  total,
  tone = 'default',
}: {
  value: number;
  total: number;
  tone?: StatusTone;
}): React.JSX.Element {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: ratio,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, width]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: toneColor(tone),
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

export function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

/** Circular initials mark, used in the profile header and job cards. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }): React.JSX.Element {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials || 'GX'}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
}: {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={22} color={colors.mutedForeground} />
      </View>
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
      <View style={[styles.emptyIcon, { borderColor: toneBorder('destructive') }]}>
        <Ionicons name="alert-circle-outline" size={22} color={colors.destructive} />
      </View>
      <Text style={[typography.heading, { color: colors.destructive }]}>Could not load</Text>
      <Text style={[typography.small, styles.centered, { marginBottom: spacing.md }]}>{message}</Text>
      <Button title="Try again" variant="outline" icon="refresh" onPress={onRetry} />
    </View>
  );
}

export function LoadingState(): React.JSX.Element {
  return (
    <View style={styles.loading}>
      <SkeletonRow lines={2} />
      <SkeletonRow lines={3} />
      <SkeletonRow lines={2} />
    </View>
  );
}

/** Skeleton block for list loading, with a slow opacity pulse. */
export function SkeletonRow({ lines = 2 }: { lines?: number }): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, styles.cardPadded, { opacity: pulse }]}>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonBar,
            { width: index === 0 ? '55%' : index === 1 ? '85%' : '70%', marginTop: index === 0 ? 0 : spacing.sm },
          ]}
        />
      ))}
    </Animated.View>
  );
}

/** Quiet group label above a card or field list. */
export function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={typography.label}>{children}</Text>
      {action}
    </View>
  );
}

/** Tappable row with a chevron — the standard navigation affordance. */
export function NavRow({
  title,
  subtitle,
  icon,
  badge,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.navRow}>
      <View style={styles.navIcon}>
        <Ionicons name={icon} size={18} color={colors.mutedForeground} />
      </View>
      <View style={styles.navText}>
        <Text style={typography.cardTitle}>{title}</Text>
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
      </View>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.subtleForeground} />
    </Pressable>
  );
}

/** Inline banner for a warning or error inside a form. */
export function Banner({
  tone,
  message,
}: {
  tone: 'warning' | 'destructive' | 'info' | 'success';
  message: string;
}): React.JSX.Element {
  const color = toneColor(tone);
  const icon: keyof typeof Ionicons.glyphMap =
    tone === 'destructive'
      ? 'alert-circle'
      : tone === 'warning'
        ? 'warning-outline'
        : tone === 'success'
          ? 'checkmark-circle'
          : 'information-circle-outline';

  return (
    <View style={[styles.banner, { backgroundColor: toneWash(tone), borderColor: toneBorder(tone) }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[typography.small, { color, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    ...elevation.hairline,
  },
  cardPadded: { padding: spacing.lg },
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
  buttonSmall: { height: 38, paddingHorizontal: spacing.lg },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextSmall: { fontSize: 13 },
  field: { gap: spacing.sm },
  fieldError: { color: colors.destructive, fontSize: 12 },
  input: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  textarea: { minHeight: 96, paddingTop: spacing.md },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 4,
  },
  segmentedItem: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.control, alignItems: 'center' },
  segmentedItemActive: { backgroundColor: colors.surfaceActive },
  segmentedText: { color: colors.mutedForeground, fontSize: 14, fontWeight: '500' },
  segmentedTextActive: { color: colors.foreground },
  chipScroll: { marginHorizontal: -spacing.lg },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.surfaceActive, borderColor: colors.borderStrong },
  chipText: { fontSize: 13, color: colors.mutedForeground },
  chipTextActive: { color: colors.foreground, fontWeight: '500' },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.md },
  factRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  factLabel: { flexShrink: 0 },
  factValue: { flexShrink: 1, textAlign: 'right' },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
  },
  progressFill: { height: 5, borderRadius: 3 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.lg },
  avatar: {
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.foreground, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  loading: { padding: spacing.lg, gap: spacing.md },
  centered: { textAlign: 'center' },
  skeletonBar: { height: 12, borderRadius: radius.control, backgroundColor: colors.surfaceHover },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { flex: 1, gap: 2 },
  navBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    padding: spacing.md,
  },
});
