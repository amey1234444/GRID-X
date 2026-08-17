import { cn } from '@/lib/utils';

export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

export function SectionHeading({
  label,
  title,
  description,
  align = 'center',
  className,
}: {
  label?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'mx-auto max-w-2xl text-center items-center' : 'max-w-2xl',
        className,
      )}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description ? <p className="text-balance text-lg text-muted-foreground">{description}</p> : null}
    </div>
  );
}
