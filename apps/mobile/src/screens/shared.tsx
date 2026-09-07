import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Today", "Yesterday", "3 days ago" — how a shop floor talks about dates. */
export function relativeDay(value: string | null | undefined): string {
  if (!value) return '—';
  const then = new Date(value);
  const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === -1) return 'Tomorrow';
  if (days > 1) return `${days} days ago`;
  return `in ${Math.abs(days)} days`;
}

export function formatMoney(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('en-IN')} kg`;
}

export function isSameDay(value: string | null | undefined, reference = new Date()): boolean {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

/**
 * The screen's identity block, matching the web's PageHeader: a typed glyph in
 * a bordered tile, the screen name, and any actions that belong to it, closed
 * by a hairline. The subtitle is deliberately quiet — the title and the data
 * below it carry the screen.
 */
export function ScreenHeader({
  title,
  subtitle,
  icon,
  meta,
  right,
}: {
  title: string;
  subtitle?: string;
  /** Ionicons name, matching the tab this screen belongs to. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Inline status or count pills that sit beside the title. */
  meta?: React.ReactNode;
  right?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <View style={styles.headerTitleRow}>
          {icon ? (
            <View style={styles.headerIcon}>
              <Ionicons name={icon} size={17} color={colors.brand} />
            </View>
          ) : null}
          <Text style={[typography.title, styles.headerTitle]} numberOfLines={1}>
            {title}
          </Text>
          {meta}
        </View>
        {subtitle ? <Text style={[typography.caption, styles.headerSubtitle]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Page frame: dark background, safe top inset, consistent gutters. */
export function Screen({
  children,
  edges = ['top'],
}: {
  children?: React.ReactNode;
  edges?: ('top' | 'bottom')[];
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

export function Refresher({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}): React.JSX.Element {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
    />
  );
}

export const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  gap: { gap: spacing.md },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  section: { marginTop: spacing.xl },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerText: { flex: 1, gap: 6 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flexShrink: 1 },
  /* Aligned under the title, clear of the glyph tile — as on the web. */
  headerSubtitle: { paddingLeft: 42 },
});
