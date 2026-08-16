import { Badge, type BadgeProps } from '@/components/ui/badge';
import { humanise } from '@/lib/format';

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
}: {
  status: string | null | undefined;
  className?: string;
}): React.JSX.Element {
  return (
    <Badge variant={toneForStatus(status)} className={className}>
      {humanise(status)}
    </Badge>
  );
}
