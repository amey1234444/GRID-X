/**
 * GRID-X mobile design tokens — mirrors the web app's dark-only palette
 * (apps/web/src/app/globals.css) so both surfaces feel like one product.
 */
export const colors = {
  background: '#0b0b0d',
  surface: '#111114',
  surfaceElevated: '#16161a',
  surfaceHover: '#1c1c21',
  surfaceActive: '#232329',
  border: '#26262c',
  borderSubtle: '#1a1a1f',
  foreground: '#f2f3f7',
  mutedForeground: '#9a9aa5',
  primary: '#7a6ff0',
  primaryForeground: '#0a0a14',
  success: '#3ec98a',
  warning: '#f5a83c',
  destructive: '#e5484d',
  info: '#4cb3f0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '600' as const, color: colors.foreground },
  heading: { fontSize: 17, fontWeight: '600' as const, color: colors.foreground },
  body: { fontSize: 15, color: colors.foreground },
  caption: { fontSize: 13, color: colors.mutedForeground },
  mono: { fontSize: 13, color: colors.mutedForeground, fontVariant: ['tabular-nums'] as const },
} as const;

export type StatusTone = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const STATUS_TONES: Record<string, StatusTone> = {
  REQUESTED: 'warning',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  ON_HOLD: 'warning',
  OPEN: 'warning',
  CLOSED: 'muted',
  PAID: 'success',
  APPROVED: 'success',
  PENDING: 'warning',
  OVERDUE: 'destructive',
  DELAYED: 'destructive',
  NEW: 'info',
  ISSUED: 'info',
  DRAFT: 'muted',
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? 'default';
}

export function toneColor(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'destructive':
      return colors.destructive;
    case 'info':
      return colors.info;
    case 'muted':
      return colors.mutedForeground;
    default:
      return colors.primary;
  }
}

export function humanise(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
