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
  background: '#090909',
  surface: '#0f0f0f',
  surfaceElevated: '#161616',
  surfaceHover: '#1c1c1c',
  surfaceActive: '#242424',
  popover: '#141414',

  border: '#262626',
  borderSubtle: '#1b1b1b',
  borderStrong: '#3d3d3d',

  foreground: '#f7f7f7',
  mutedForeground: '#9e9e9e',
  /** Third text tier — captions, metadata, disabled labels. */
  subtleForeground: '#737373',

  /* Monochrome brand: white is the action colour on a black canvas. */
  primary: '#f7f7f7',
  primaryHover: '#ffffff',
  primaryForeground: '#0d0d0d',

  /* Hue is reserved for operational state, never for chrome. */
  success: '#479e76',
  warning: '#dfa239',
  destructive: '#d34b41',
  info: '#77a1c5',
} as const;

/** Machine / site operating states — a different axis to workflow status. */
export const stateColors = {
  OPERATIONAL: '#479e76',
  WARNING: '#dfa239',
  CRITICAL: '#d34b41',
  OFFLINE: '#757575',
  MAINTENANCE: '#77a1c5',
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
  // Inspections
  REQUESTED: 'warning',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  ACCEPTED: 'success',
  ACCEPTED_WITH_DEVIATION: 'warning',
  REWORK_REQUIRED: 'warning',
  REJECTED: 'destructive',
  HOLD_FOR_ENGINEERING_REVIEW: 'warning',
  // Jobs
  CREATED: 'muted',
  ALLOCATED: 'info',
  PARTNER_ACCEPTED: 'info',
  PARTNER_DECLINED: 'destructive',
  MATERIAL_ISSUED: 'info',
  IN_PRODUCTION: 'info',
  READY_FOR_INSPECTION: 'warning',
  DISPATCHED: 'info',
  RECEIVED: 'success',
  CANCELLED: 'muted',
  // Rework / non-conformance
  ISSUED: 'info',
  READY_FOR_REINSPECTION: 'warning',
  SCRAPPED: 'destructive',
  // Material
  ACKNOWLEDGED: 'success',
  PARTIALLY_ACKNOWLEDGED: 'warning',
  RECONCILED: 'success',
  SHORTAGE: 'destructive',
  // Drawings
  SUBMITTED: 'info',
  RELEASED: 'success',
  OBSOLETE: 'muted',
  // Commercials
  VERIFIED: 'info',
  SCHEDULED: 'info',
  HELD: 'destructive',
  PAID: 'success',
  APPROVED: 'success',
  // Generic
  ON_HOLD: 'warning',
  OPEN: 'warning',
  ANSWERED: 'success',
  CLOSED: 'muted',
  PENDING: 'warning',
  OVERDUE: 'destructive',
  DELAYED: 'destructive',
  NEW: 'info',
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
