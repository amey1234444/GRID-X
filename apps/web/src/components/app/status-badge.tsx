import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { humanise } from '@/lib/format';
import { statusLabel, type Language } from '@/lib/i18n';

type Tone = NonNullable<BadgeProps['variant']>;

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

export function toneForStatus(status: string | null | undefined): Tone {
  if (!status) return 'muted';
  const value = status.toUpperCase();
  if (SUCCESS.includes(value)) return 'success';
  if (WARNING.includes(value)) return 'warning';
  if (DESTRUCTIVE.includes(value)) return 'destructive';
  return 'default';
}

export function StatusBadge({
  status,
  className,
  language = 'EN',
  dot = true,
}: {
  status: string | null | undefined;
  className?: string;
  /** Partner screens pass the signed-in user's language so statuses read in Hindi too. */
  language?: Language;
  /** The leading dot lets a column of statuses be scanned by colour alone. */
  dot?: boolean;
}): React.JSX.Element {
  const english = humanise(status);
  return (
    <Badge variant={toneForStatus(status)} className={className} dot={dot}>
      {status ? statusLabel(status, language, english) : english}
    </Badge>
  );
}

/** Machine / site operating states, which are a different axis to workflow status. */
export type MachineState = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' | 'MAINTENANCE';

const MACHINE_STATE: Record<MachineState, { label: string; dot: string; text: string }> = {
  OPERATIONAL: { label: 'Operational', dot: 'bg-state-operational', text: 'text-state-operational' },
  WARNING: { label: 'Warning', dot: 'bg-state-warning', text: 'text-state-warning' },
  CRITICAL: { label: 'Critical', dot: 'bg-state-critical', text: 'text-state-critical' },
  OFFLINE: { label: 'Offline', dot: 'bg-state-offline', text: 'text-state-offline' },
  MAINTENANCE: { label: 'Maintenance', dot: 'bg-state-maintenance', text: 'text-state-maintenance' },
};

/**
 * A live operating state. Only CRITICAL pulses — if everything animates,
 * nothing reads as urgent.
 */
export function StateIndicator({
  state,
  label,
  className,
}: {
  state: MachineState;
  /** Overrides the default state name, e.g. a machine's own status text. */
  label?: string;
  className?: string;
}): React.JSX.Element {
  const config = MACHINE_STATE[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.8125rem]', config.text, className)}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {state === 'CRITICAL' ? (
          <span className={cn('absolute inset-0 rounded-full animate-ping-ring', config.dot)} aria-hidden />
        ) : null}
        <span className={cn('relative h-1.5 w-1.5 rounded-full', config.dot)} />
      </span>
      {label ?? config.label}
    </span>
  );
}
