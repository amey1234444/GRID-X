import { cn } from '@/lib/utils';

/**
 * Record attributes. Label above value, in a quiet uppercase micro-label,
 * with a hairline between rows so a long attribute list stays scannable
 * without turning into a table.
 */
export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}): React.JSX.Element {
  return (
    <dl
      className={cn(
        'grid gap-x-8',
        columns === 1 ? 'sm:grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 space-y-1 border-b border-border-subtle py-2.5 last:border-b-0"
        >
          <dt className="type-label">{item.label}</dt>
          <dd className="type-small break-words text-foreground">
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-subtle">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
