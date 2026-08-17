import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  trend,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' };
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold tracking-tight',
            tone === 'success' && 'text-success',
            tone === 'warning' && 'text-warning',
            tone === 'destructive' && 'text-destructive',
          )}
        >
          {value}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.direction === 'up' ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trend.value}
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
