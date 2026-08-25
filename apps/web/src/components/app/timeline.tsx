import { cn } from '@/lib/utils';

export interface TimelineItem {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}

const TONE_DOT: Record<NonNullable<TimelineItem['tone']>, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

/**
 * Event history. The rail stops at the last node rather than running to the
 * bottom of the container, so the timeline reads as finite.
 */
export function Timeline({ items }: { items: TimelineItem[] }): React.JSX.Element {
  return (
    <ol className="relative space-y-5">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative pl-6">
            {last ? null : (
              <span
                className="absolute left-[3px] top-3 h-[calc(100%+1.25rem-0.5rem)] w-px bg-border-subtle"
                aria-hidden
              />
            )}
            <span
              className={cn(
                'absolute left-0 top-[5px] h-[7px] w-[7px] rounded-full ring-4 ring-background',
                TONE_DOT[item.tone ?? 'default'],
              )}
              aria-hidden
            />
            <p className="text-[0.8125rem] font-medium leading-snug text-foreground">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-subtle">{item.timestamp}</p>
            {item.description ? (
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
