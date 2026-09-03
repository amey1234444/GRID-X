import { RATE_LIMIT_TIER_KEYS, type RateLimitTier } from '@gridx/shared';

import { updateRateLimitTierAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SettingRow } from '@/lib/types';

/**
 * Section 18 — request throttling, presented as the three tiers an operator actually thinks in
 * rather than as six loose numbers.
 *
 * Sign-in and sign-up are the endpoints an attacker iterates, so their allowances stay small; the
 * ordinary tier exists to stop a runaway client and is deliberately generous, because throttling
 * real work only costs the shift floor time. Each tier's allowance and window are edited together
 * because neither number means anything on its own.
 */

interface Tier {
  tier: RateLimitTier;
  title: string;
  description: string;
  /** What the number counts, in the operator's language. */
  unit: string;
  covers: string;
}

const TIERS: Tier[] = [
  {
    tier: 'login',
    title: 'Sign-in',
    description:
      'Every endpoint that checks a credential — sign-in, OTP verification, password change and ' +
      'reset, two-factor confirmation.',
    unit: 'attempts',
    covers: 'Keep this low. It is what makes password guessing expensive.',
  },
  {
    tier: 'signup',
    title: 'Sign-up',
    description:
      'Endpoints that create an account or send a message outward — OTP requests, forgotten- ' +
      'password mail, two-factor enrolment and user invitations.',
    unit: 'attempts',
    covers: 'Keep this low. Each attempt costs a real SMS or email.',
  },
  {
    tier: 'normal',
    title: 'Ordinary traffic',
    description:
      'The ceiling for everyday authenticated use across the rest of the API.',
    unit: 'requests',
    covers: 'Keep this high. It should never be reached by a real shift.',
  },
];

function valueOf(settings: SettingRow[], key: string): number | null {
  const row = settings.find((setting) => setting.key === key);
  if (!row) return null;
  return typeof row.value === 'number' ? row.value : Number(row.value);
}

export function RateLimitPanel({ settings }: { settings: SettingRow[] }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rate limits</CardTitle>
        <CardDescription>
          How many requests one caller may make before GRID-X starts refusing them. Counted per
          caller and per window, shared across every API instance, so scaling out does not widen the
          limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-px overflow-hidden rounded-card bg-border-subtle sm:grid-cols-3">
        {TIERS.map((tier) => {
          const keys = RATE_LIMIT_TIER_KEYS[tier.tier];
          const limit = valueOf(settings, keys.limit);
          const windowMinutes = valueOf(settings, keys.window);
          const isDefault =
            settings.find((setting) => setting.key === keys.limit)?.isDefault !== false &&
            settings.find((setting) => setting.key === keys.window)?.isDefault !== false;
          const unavailable = limit === null || windowMinutes === null;

          return (
            <div key={tier.tier} className="flex flex-col gap-3 bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="type-label">{tier.title}</span>
                <Badge variant={isDefault ? 'secondary' : 'outline'} className="font-normal">
                  {isDefault ? 'Default' : 'Changed'}
                </Badge>
              </div>

              {unavailable ? (
                <p className="type-small text-muted-foreground">
                  Not available — platform defaults are in force.
                </p>
              ) : (
                <p className="flex items-baseline gap-1.5">
                  <span className="type-metric" data-numeric>
                    {limit}
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {tier.unit} / {windowMinutes} min
                  </span>
                </p>
              )}

              <p className="type-small text-muted-foreground">{tier.description}</p>
              <p className="mt-auto pt-1 text-xs text-subtle">{tier.covers}</p>

              <ActionDialog
                title={`${tier.title} rate limit`}
                description={tier.description}
                triggerLabel="Edit"
                triggerVariant="outline"
                triggerSize="sm"
                submitLabel="Save limit"
                action={updateRateLimitTierAction}
                disabled={unavailable}
                hidden={{ tier: tier.tier }}
                fields={[
                  {
                    name: 'limit',
                    label: `Allowed ${tier.unit} per window`,
                    type: 'number',
                    required: true,
                    defaultValue: limit === null ? undefined : String(limit),
                    help:
                      tier.tier === 'normal'
                        ? 'Between 10 and 100000.'
                        : 'Between 1 and 50 — a credential endpoint should stay tight.',
                  },
                  {
                    name: 'windowMinutes',
                    label: 'Window (minutes)',
                    type: 'number',
                    required: true,
                    defaultValue: windowMinutes === null ? undefined : String(windowMinutes),
                    help: 'Between 1 and 1440. The allowance resets when the window rolls over.',
                  },
                ]}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
