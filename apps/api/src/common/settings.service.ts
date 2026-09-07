import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  SettingKey,
  SettingValues,
  coerceSetting,
  isSettingKey,
  settingDefault,
  validateSetting,
} from '@gridx/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Section 7 — the System settings screen, made to mean something.
 *
 * Settings were stored, listed and edited, and read by nothing: `classAOutsourcingRequiresApproval`
 * sat next to a hardcoded Class A rule, and `drawingAccessExpiryDays` next to a grant that never
 * expired unless a date was typed. Every rule that claims to be configurable now reads its value
 * through here.
 *
 * Values are cached briefly because they are read on hot paths — every job creation, every drawing
 * open — and change perhaps monthly. The cache is dropped on write, so an edit takes effect at once
 * on the instance that made it and within the TTL everywhere else.
 */
const CACHE_TTL_MS = 30_000;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: Map<string, unknown> | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * A setting's current value, typed. Falls back to the declared default when the row is missing
   * or unusable — a corrupted setting must not take the rule it governs down with it.
   */
  async get<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
    const stored = await this.load();
    if (!stored.has(key)) return settingDefault(key);
    return coerceSetting(key, stored.get(key));
  }

  /** Several settings at once, so a service does not make one round trip per rule. */
  async getMany<K extends SettingKey>(keys: K[]): Promise<{ [P in K]: SettingValues[P] }> {
    const stored = await this.load();
    const result = {} as { [P in K]: SettingValues[P] };
    for (const key of keys) {
      result[key] = stored.has(key) ? coerceSetting(key, stored.get(key)) : settingDefault(key);
    }
    return result;
  }

  /**
   * The whole catalogue for the settings screen: definition, effective value and whether it is
   * still the default. Keys stored in the database that are no longer in the catalogue are left
   * out, so a setting nothing reads cannot be presented as if it were live.
   */
  async catalogue(): Promise<
    Array<{
      key: string;
      label: string;
      description: string;
      group: string;
      type: string;
      value: unknown;
      isDefault: boolean;
      default: unknown;
    }>
  > {
    const stored = await this.load();
    return SETTING_KEYS.map((key) => {
      const definition = SETTING_DEFINITIONS[key];
      const isDefault = !stored.has(key);
      return {
        key,
        label: definition.label,
        description: definition.description,
        group: definition.group,
        type: definition.type,
        value: isDefault ? definition.default : coerceSetting(key, stored.get(key)),
        isDefault,
        default: definition.default,
      };
    });
  }

  /** Writes a catalogued setting after checking the value against its declared rule. */
  async set(key: string, rawValue: unknown): Promise<{ key: string; value: unknown }> {
    if (!isSettingKey(key)) {
      throw new BadRequestException(
        `${key} is not a GRID-X setting. Only settings the platform actually reads can be changed.`,
      );
    }

    const value = this.normalise(key, rawValue);
    const invalid = validateSetting(key, value);
    if (invalid) throw new BadRequestException(invalid);

    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
    this.invalidate();
    return { key, value };
  }

  /**
   * Form posts arrive as strings; the catalogue knows what each key should be. Doing this here
   * rather than in the schema keeps the coercion next to the type declaration it belongs to.
   */
  private normalise(key: SettingKey, raw: unknown): unknown {
    const { type } = SETTING_DEFINITIONS[key];
    if (type === 'boolean') {
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'string') return ['true', '1', 'on', 'yes'].includes(raw.toLowerCase());
      return Boolean(raw);
    }
    if (type === 'number') {
      return typeof raw === 'number' ? raw : Number(raw);
    }
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return raw;
  }

  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }

  private async load(): Promise<Map<string, unknown>> {
    if (this.cache && Date.now() - this.cachedAt < CACHE_TTL_MS) return this.cache;
    try {
      const rows = await this.prisma.systemSetting.findMany();
      this.cache = new Map(rows.map((row) => [row.key, row.value]));
      this.cachedAt = Date.now();
    } catch (error) {
      // Defaults are safe values, so a settings read failing must not fail the request that
      // triggered it. It is worth a warning because the rules are silently at their defaults.
      this.logger.warn(`Could not read system settings, using defaults: ${String(error)}`);
      this.cache = new Map();
      this.cachedAt = Date.now();
    }
    return this.cache;
  }
}
