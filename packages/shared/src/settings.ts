import { RoleCode } from './enums';

/**
 * Section 7 — the System settings screen.
 *
 * Settings used to be free-form JSON that the admin screen listed and edited and that no business
 * logic ever read. Changing one did nothing, which is worse than not offering it: it looks like
 * governance and is decoration.
 *
 * Every key a screen can edit is declared here with its type, its default and the rule it governs,
 * and the API reads settings only through this catalogue. A key that is not in the catalogue cannot
 * be written, so the screen cannot invent a setting nothing honours.
 */

export interface SettingDefinition<T> {
  key: string;
  label: string;
  /** What the setting actually changes. Shown on the settings screen. */
  description: string;
  group: 'security' | 'rateLimits' | 'governance' | 'drawings' | 'materials' | 'commercial';
  type: 'boolean' | 'number' | 'roleList';
  default: T;
  /** Rejects a value the rule cannot honour, so a bad setting fails at the edit, not in use. */
  validate?: (value: T) => string | null;
}

const positiveDays = (value: number): string | null =>
  Number.isFinite(value) && value > 0 && value <= 3650
    ? null
    : 'Enter a number of days between 1 and 3650';

const percent = (value: number): string | null =>
  Number.isFinite(value) && value >= 0 && value <= 100 ? null : 'Enter a percentage between 0 and 100';

/** A credential tier's allowance — deliberately small, so brute force stays expensive. */
const credentialAttempts = (value: number): string | null =>
  Number.isInteger(value) && value >= 1 && value <= 50
    ? null
    : 'Enter between 1 and 50 attempts — a credential endpoint should stay tight';

/** The general traffic allowance, which has to be roomy enough for real use. */
const normalRequests = (value: number): string | null =>
  Number.isInteger(value) && value >= 10 && value <= 100_000
    ? null
    : 'Enter between 10 and 100000 requests';

const windowMinutes = (value: number): string | null =>
  Number.isFinite(value) && value >= 1 && value <= 1440 ? null : 'Enter between 1 and 1440 minutes';

export const SETTING_DEFINITIONS = {
  /** Section 18 — "two-factor authentication for admins". */
  'security.twoFactorRequiredRoles': {
    key: 'security.twoFactorRequiredRoles',
    label: 'Roles that must use two-factor authentication',
    description:
      'Users holding these roles must enrol an authenticator before they can use GRID-X. Until they ' +
      'do, their session can only reach the enrolment screen.',
    group: 'security',
    type: 'roleList',
    default: ['GROUP_ADMIN', 'GRIDX_HEAD', 'FINANCE_USER'] as RoleCode[],
  } satisfies SettingDefinition<RoleCode[]>,

  'security.passwordResetTokenTtlMinutes': {
    key: 'security.passwordResetTokenTtlMinutes',
    label: 'Password reset link validity (minutes)',
    description: 'How long a password reset link works before it has to be requested again.',
    group: 'security',
    type: 'number',
    default: 60,
    validate: (value) =>
      Number.isFinite(value) && value >= 5 && value <= 1440
        ? null
        : 'Enter between 5 and 1440 minutes',
  } satisfies SettingDefinition<number>,

  /**
   * Section 18 — request throttling, in three tiers.
   *
   * A route declares which tier it belongs to rather than carrying its own numbers, so the
   * allowance for every sign-in endpoint can be tightened in one place instead of hunting through
   * controllers. Sign-in and sign-up stay deliberately low because those are the endpoints an
   * attacker iterates; ordinary authenticated traffic is far more generous because throttling it
   * only punishes real users.
   */
  'rateLimits.loginAttempts': {
    key: 'rateLimits.loginAttempts',
    label: 'Sign-in attempts allowed per window',
    description:
      'Applies to every endpoint that checks a credential — sign-in, OTP verification, password ' +
      'change and reset, and two-factor confirmation. Counted per caller, so one attacker cannot ' +
      'lock out everyone else.',
    group: 'rateLimits',
    type: 'number',
    default: 5,
    validate: credentialAttempts,
  } satisfies SettingDefinition<number>,

  'rateLimits.loginWindowMinutes': {
    key: 'rateLimits.loginWindowMinutes',
    label: 'Sign-in window (minutes)',
    description: 'The period over which sign-in attempts are counted before the allowance resets.',
    group: 'rateLimits',
    type: 'number',
    default: 15,
    validate: windowMinutes,
  } satisfies SettingDefinition<number>,

  'rateLimits.signupAttempts': {
    key: 'rateLimits.signupAttempts',
    label: 'Sign-up attempts allowed per window',
    description:
      'Applies to endpoints that create an account or send something outward on request — OTP ' +
      'requests, forgotten-password mails, two-factor enrolment and user invitations. Kept low ' +
      'because each one costs a message.',
    group: 'rateLimits',
    type: 'number',
    default: 3,
    validate: credentialAttempts,
  } satisfies SettingDefinition<number>,

  'rateLimits.signupWindowMinutes': {
    key: 'rateLimits.signupWindowMinutes',
    label: 'Sign-up window (minutes)',
    description: 'The period over which sign-up attempts are counted before the allowance resets.',
    group: 'rateLimits',
    type: 'number',
    default: 60,
    validate: windowMinutes,
  } satisfies SettingDefinition<number>,

  'rateLimits.normalRequests': {
    key: 'rateLimits.normalRequests',
    label: 'Ordinary requests allowed per window',
    description:
      'The ceiling for everyday authenticated traffic. Set high enough that no real shift hits ' +
      'it — it exists to stop a runaway client, not to pace normal work.',
    group: 'rateLimits',
    type: 'number',
    default: 600,
    validate: normalRequests,
  } satisfies SettingDefinition<number>,

  'rateLimits.normalWindowMinutes': {
    key: 'rateLimits.normalWindowMinutes',
    label: 'Ordinary request window (minutes)',
    description: 'The period over which ordinary requests are counted before the allowance resets.',
    group: 'rateLimits',
    type: 'number',
    default: 5,
    validate: windowMinutes,
  } satisfies SettingDefinition<number>,

  /** Module 2 — Class A components may only go out on senior authorisation. */
  'governance.classAOutsourcingRequiresApproval': {
    key: 'governance.classAOutsourcingRequiresApproval',
    label: 'Class A outsourcing needs senior authorisation',
    description:
      'When on, a Class A component cannot be put on a job or allocated without a documented ' +
      'authorisation from someone holding the Class A override permission.',
    group: 'governance',
    type: 'boolean',
    default: true,
  } satisfies SettingDefinition<boolean>,

  'governance.minOutsourcingEligibilityScore': {
    key: 'governance.minOutsourcingEligibilityScore',
    label: 'Minimum outsourcing eligibility score',
    description:
      'A component scoring below this is treated as a poor candidate for the network, and ' +
      'outsourcing it anyway needs the same senior authorisation as a Class A part.',
    group: 'governance',
    type: 'number',
    default: 40,
    validate: percent,
  } satisfies SettingDefinition<number>,

  /** Module 12 — what the system does with a critical-violation verdict. */
  'governance.autoSuspendOnCriticalViolation': {
    key: 'governance.autoSuspendOnCriticalViolation',
    label: 'Suspend a partner automatically on a critical violation',
    description:
      'When on, a scorecard that lands in the Suspended category also suspends the partner, so no ' +
      'further jobs can be allocated. When off, the verdict is raised to management as an ' +
      'escalation and a person decides.',
    group: 'governance',
    type: 'boolean',
    default: true,
  } satisfies SettingDefinition<boolean>,

  /** Module 3 — controlled drawings. */
  'drawings.accessExpiryDays': {
    key: 'drawings.accessExpiryDays',
    label: 'Default drawing access expiry (days)',
    description:
      'A drawing shared with a partner expires this many days after it is granted unless an ' +
      'explicit date is given. 0 means grants do not expire on their own.',
    group: 'drawings',
    type: 'number',
    default: 30,
    validate: (value) =>
      Number.isFinite(value) && value >= 0 && value <= 3650 ? null : 'Enter between 0 and 3650 days',
  } satisfies SettingDefinition<number>,

  'drawings.requireAcknowledgementBeforeProduction': {
    key: 'drawings.requireAcknowledgementBeforeProduction',
    label: 'Partner must acknowledge the drawing before production',
    description:
      'When on, a partner cannot report production started or offer work for inspection until they ' +
      'have acknowledged the revision their job is built to.',
    group: 'drawings',
    type: 'boolean',
    default: true,
  } satisfies SettingDefinition<boolean>,

  /** Module 6 — material control. */
  'materials.enforceScrapAllowance': {
    key: 'materials.enforceScrapAllowance',
    label: 'Flag scrap above the component allowance',
    description:
      'When on, scrap beyond the component scrap allowance is reported as a variance on ' +
      'reconciliation and raises an alert instead of passing silently.',
    group: 'materials',
    type: 'boolean',
    default: true,
  } satisfies SettingDefinition<boolean>,

  'materials.reconciliationToleranceKg': {
    key: 'materials.reconciliationToleranceKg',
    label: 'Reconciliation tolerance (kg)',
    description:
      'A difference smaller than this counts as balanced, so weighbridge rounding does not raise a ' +
      'shortage deduction.',
    group: 'materials',
    type: 'number',
    default: 0.5,
    validate: (value) =>
      Number.isFinite(value) && value >= 0 && value <= 100 ? null : 'Enter between 0 and 100 kg',
  } satisfies SettingDefinition<number>,

  /** Module 11 — commercial defaults. */
  'commercial.defaultPaymentTermsDays': {
    key: 'commercial.defaultPaymentTermsDays',
    label: 'Default payment terms (days)',
    description: 'Applied to a new partner when no terms are given.',
    group: 'commercial',
    type: 'number',
    default: 30,
    validate: positiveDays,
  } satisfies SettingDefinition<number>,
} as const;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

/** The value type each key carries, so a reader gets a typed value rather than `unknown`. */
export type SettingValues = {
  'security.twoFactorRequiredRoles': RoleCode[];
  'security.passwordResetTokenTtlMinutes': number;
  'rateLimits.loginAttempts': number;
  'rateLimits.loginWindowMinutes': number;
  'rateLimits.signupAttempts': number;
  'rateLimits.signupWindowMinutes': number;
  'rateLimits.normalRequests': number;
  'rateLimits.normalWindowMinutes': number;
  'governance.classAOutsourcingRequiresApproval': boolean;
  'governance.minOutsourcingEligibilityScore': number;
  'governance.autoSuspendOnCriticalViolation': boolean;
  'drawings.accessExpiryDays': number;
  'drawings.requireAcknowledgementBeforeProduction': boolean;
  'materials.enforceScrapAllowance': boolean;
  'materials.reconciliationToleranceKg': number;
  'commercial.defaultPaymentTermsDays': number;
};

export function isSettingKey(key: string): key is SettingKey {
  return SETTING_KEYS.includes(key as SettingKey);
}

export function settingDefault<K extends SettingKey>(key: K): SettingValues[K] {
  return SETTING_DEFINITIONS[key].default as SettingValues[K];
}

/**
 * Coerces a stored JSON value to the declared type, falling back to the default when the stored
 * value is unusable. A setting that has been corrupted must not take a rule down with it.
 */
export function coerceSetting<K extends SettingKey>(key: K, raw: unknown): SettingValues[K] {
  const definition = SETTING_DEFINITIONS[key];
  const fallback = definition.default as SettingValues[K];

  if (definition.type === 'boolean') {
    return (typeof raw === 'boolean' ? raw : fallback) as SettingValues[K];
  }
  if (definition.type === 'number') {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) return fallback;
    const invalid = definition.validate?.(value as never);
    return (invalid ? fallback : value) as SettingValues[K];
  }
  // roleList
  if (Array.isArray(raw) && raw.every((entry) => typeof entry === 'string')) {
    return raw as SettingValues[K];
  }
  return fallback;
}

/** Validation for a write from the settings screen. Returns null when the value is acceptable. */
export function validateSetting(key: SettingKey, raw: unknown): string | null {
  const definition = SETTING_DEFINITIONS[key];
  if (definition.type === 'boolean') {
    return typeof raw === 'boolean' ? null : 'Expected true or false';
  }
  if (definition.type === 'number') {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) return 'Expected a number';
    return definition.validate ? definition.validate(value as never) : null;
  }
  if (!Array.isArray(raw) || !raw.every((entry) => typeof entry === 'string')) {
    return 'Expected a list of role codes';
  }
  return null;
}


// ---------------------------------------------------------------------------
// Rate-limit tiers
// ---------------------------------------------------------------------------

/**
 * The three throttling tiers a route can declare.
 *
 * `login` guards anything that checks a credential, `signup` anything that creates an account or
 * sends a message outward, and `normal` is the ceiling for ordinary authenticated traffic.
 */
export const RATE_LIMIT_TIERS = ['login', 'signup', 'normal'] as const;

export type RateLimitTier = (typeof RATE_LIMIT_TIERS)[number];

/** The two settings keys each tier is assembled from. */
export const RATE_LIMIT_TIER_KEYS = {
  login: { limit: 'rateLimits.loginAttempts', window: 'rateLimits.loginWindowMinutes' },
  signup: { limit: 'rateLimits.signupAttempts', window: 'rateLimits.signupWindowMinutes' },
  normal: { limit: 'rateLimits.normalRequests', window: 'rateLimits.normalWindowMinutes' },
} as const satisfies Record<RateLimitTier, { limit: SettingKey; window: SettingKey }>;

export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

/** A tier's configured allowance, from values already read out of the catalogue. */
export function rateLimitFor(
  tier: RateLimitTier,
  values: Partial<Record<SettingKey, unknown>>,
): RateLimitWindow {
  const keys = RATE_LIMIT_TIER_KEYS[tier];
  const limit = coerceSetting(keys.limit as never, values[keys.limit]) as unknown as number;
  const minutes = coerceSetting(keys.window as never, values[keys.window]) as unknown as number;
  return { limit, windowMs: minutes * 60_000 };
}

/** A tier's shipped defaults, used when settings cannot be read at all. */
export function defaultRateLimitFor(tier: RateLimitTier): RateLimitWindow {
  const keys = RATE_LIMIT_TIER_KEYS[tier];
  return {
    limit: settingDefault(keys.limit) as unknown as number,
    windowMs: (settingDefault(keys.window) as unknown as number) * 60_000,
  };
}
