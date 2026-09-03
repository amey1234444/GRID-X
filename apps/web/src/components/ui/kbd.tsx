import { cn } from '@/lib/utils';

/**
 * Keyboard hint chip. Used in the sidebar search row, command palette
 * footer and tooltips so shortcuts are discoverable rather than folklore.
 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center gap-0.5 rounded-[5px] border border-border-subtle bg-surface-elevated px-1.5',
        'font-sans text-[10px] font-medium leading-none text-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
