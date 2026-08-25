/**
 * GRID-X mobile design tokens.
 *
 * These are the exact hex equivalents of the web app's HSL tokens in
 * apps/web/src/app/globals.css. When a token changes there, regenerate the
 * matching value here — the two surfaces must not drift, because a partner
 * moves between the PWA and this app without noticing they have.
 *
 * Surfaces are layered, never flat:
 *   background → surface → surfaceElevated → surfaceHover → surfaceActive
 */
export const colors = {
  background: '#09090b',
  surface: '#0f0f12',
  surfaceElevated: '#151519',
  surfaceHover: '#1c1c1f',
  surfaceActive: '#222226',
  popover: '#141417',

  border: '#242429',
  borderSubtle: '#19191c',
  borderStrong: '#35353b',

  foreground: '#f3f4f6',
  mutedForeground: '#9196a1',
  /** Third text tier — captions, metadata, disabled labels. */
  subtleForeground: '#686e78',

  primary: '#6d66f0',
  primaryHover: '#837df2',
  primaryForeground: '#0b0b14',

  success: '#37be7f',
  warning: '#f6a831',
  destructive: '#e14747',
  info: '#47adf5',
} as const;

/** Machine / site operating states — a different axis to workflow status. */
export const stateColors = {
  OPERATIONAL: '#37be7f',
  WARNING: '#f6a831',
  CRITICAL: '#e14747',
  OFFLINE: '#6c727f',
  MAINTENANCE: '#47adf5',
} as const;

export type MachineState = keyof typeof stateColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Mirrors the web radius hierarchy: control < input < card < modal. */
export const radius = {
  control: 6,
  input: 8,
  card: 12,
  modal: 16,
  full: 999,
} as const;

/** Motion, matched to the web's ease-out-expo feel. */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/**
 * Type scale. Hierarchy comes from weight, size and colour together — not
 * from making everything bold and white.
 */
export const typography = {
  display: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.foreground },
  title: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.4, color: colors.foreground },
  heading: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, color: colors.foreground },
  cardTitle: { fontSize: 15, fontWeight: '500' as const, color: colors.foreground },
  body: { fontSize: 15, color: colors.foreground },
  small: { fontSize: 13, color: colors.mutedForeground },
  caption: { fontSize: 12, color: colors.subtleForeground },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: colors.mutedForeground,
  },
  metric: {
    fontSize: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.8,
    color: colors.foreground,
    fontVariant: ['tabular-nums'] as const,
  },
  mono: { fontSize: 13, color: colors.mutedForeground, fontVariant: ['tabular-nums'] as const },
} as const;

/**
 * Elevation. React Native has no inset box-shadow, so the web's hairline
 * ring is expressed here as a 1px border in the same colour.
 */
export const elevation = {
  hairline: { borderWidth: 1, borderColor: colors.borderSubtle },
  raised: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
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

/**
 * Tinted wash for a status pill. Matches the web badge treatment: a low
 * alpha fill of the tone colour rather than a solid block.
 */
export function toneWash(tone: StatusTone): string {
  return `${toneColor(tone)}1a`;
}

export function toneBorder(tone: StatusTone): string {
  return `${toneColor(tone)}38`;
}

export function humanise(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
