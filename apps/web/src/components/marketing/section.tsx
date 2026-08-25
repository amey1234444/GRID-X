import { Eyebrow, Statement } from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

/** Retained for the sub-pages (platform, pricing, security, partners). */
export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Eyebrow>{children}</Eyebrow>;
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
        align === 'center' ? 'mx-auto max-w-2xl items-center text-center' : 'max-w-2xl',
        className,
      )}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <Statement lead={title} />
      {description ? (
        <p className="text-pretty text-[1.0625rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
