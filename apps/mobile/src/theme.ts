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
  /** --background 0 0% 3.8% */
  background: '#0a0a0a',
  /** --surface 0 0% 6% */
  surface: '#0f0f0f',
  /** --surface-elevated 0 0% 8.5% */
  surfaceElevated: '#161616',
  /** --surface-hover 0 0% 11% */
  surfaceHover: '#1c1c1c',
  /** --surface-active 0 0% 14% */
  surfaceActive: '#242424',
  /** --card 0 0% 6.5% */
  card: '#111111',
  /** --popover 0 0% 8% */
  popover: '#141414',

  /** --border 0 0% 15% */
  border: '#262626',
  /** --border-subtle 0 0% 10.5% */
  borderSubtle: '#1b1b1b',
  /** --border-strong 0 0% 24% */
  borderStrong: '#3d3d3d',

  /** --foreground 0 0% 96% */
  foreground: '#f5f5f5',
  /** --muted-foreground 0 0% 63% */
  mutedForeground: '#a1a1a1',
  /** Third text tier — captions, metadata, disabled labels. --subtle-foreground 0 0% 45% */
  subtleForeground: '#737373',

  /* Monochrome brand: white is the action colour on a black canvas. */
  /** --primary 0 0% 97% */
  primary: '#f7f7f7',
  /** --primary-hover 0 0% 100% */
  primaryHover: '#ffffff',
  /** --primary-foreground 0 0% 5% */
  primaryForeground: '#0d0d0d',
  /** --brand 0 0% 92% */
  brand: '#ebebeb',

  /* Hue is reserved for operational state, never for chrome. `info` is a
   * neutral grey on purpose — on the web it is 0 0% 68%, not a blue, so an
   * informational badge cannot be mistaken for a healthy or a failing one. */
  /** --success 152 38% 45% */
  success: '#479e76',
  /** --warning 38 72% 55% */
  warning: '#dfa23a',
  /** --destructive 4 62% 54% */
  destructive: '#d24b41',
  /** --info 0 0% 68% */
  info: '#adadad',
} as const;

/** Machine / site operating states — a different axis to workflow status. */
export const stateColors = {
  OPERATIONAL: '#479e76',
  WARNING: '#dfa23a',
  CRITICAL: '#d24b41',
  /** --state-offline 0 0% 46% */
  OFFLINE: '#757575',
  /** --state-maintenance 0 0% 68% */
  MAINTENANCE: '#adadad',
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

/**
 * Mirrors the web radius hierarchy exactly: control < input < card < modal.
 * The web is deliberately restrained here — 8px cards, not 16 — and rounder
 * corners on mobile were the single loudest way the two surfaces diverged.
 */
export const radius = {
  /** --radius-control 0.25rem */
  control: 4,
  /** --radius-input 0.375rem */
  input: 6,
  /** --radius-card 0.5rem */
  card: 8,
  /** --radius-modal 1rem */
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

/**
 * Status tones, mirrored value-for-value from the web's
 * apps/web/src/components/app/status-badge.tsx.
 *
 * These are lists rather than one big map for the same reason the web keeps
 * them that way: statuses arrive from a dozen modules and most of them are
 * neutral. Only the ones that mean "good", "waiting" or "bad" get a colour,
 * and anything unlisted stays neutral instead of being guessed at.
 */
const SUCCESS = [
  'ACCEPTED',
  'ACTIVE',
  'APPROVED',
  'BALANCED',
  'CERTIFIED',
  'CLOSED',
  'COMPLETED',
  'DELIVERED',
  'FINANCE_APPROVED',
  'PAID',
  'PASSED',
  'RELEASED',
  'RESOLVED',
  'STRATEGIC',
  'VERIFIED',
];

const WARNING = [
  'AWAITING_PARTNER_ACCEPTANCE',
  'DELAYED',
  'HOLD',
  'IN_REVIEW',
  'IN_TRANSIT',
  'ON_HOLD',
  'OPEN',
  'PARTIALLY_PAID',
  'PENDING',
  'REWORK',
  'REWORK_REQUIRED',
  'SUBMITTED',
  'TRIAL_APPROVED',
  'UNDER_REVIEW',
  'VARIANCE',
];

const DESTRUCTIVE = [
  'BLACKLISTED',
  'CANCELLED',
  'DECLINED',
  'FAILED',
  'OVERDUE',
  'REJECTED',
  'SCRAPPED',
  'SUSPENDED',
  'TERMINATED',
];

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'muted';
  const value = status.toUpperCase();
  if (SUCCESS.includes(value)) return 'success';
  if (WARNING.includes(value)) return 'warning';
  if (DESTRUCTIVE.includes(value)) return 'destructive';
  return 'default';
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
