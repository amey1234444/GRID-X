'use client';

export function ScrollableNav({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <nav className="h-full overflow-y-auto pr-1">{children}</nav>;
}
