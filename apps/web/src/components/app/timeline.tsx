export interface TimelineItem {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }): React.JSX.Element {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.timestamp}</p>
          {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}
