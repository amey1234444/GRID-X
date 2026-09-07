'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CONTROL_NAVIGATION, type AuthUser, type NavSection } from '@gridx/shared';
import { ArrowRight, CornerDownLeft } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

interface PaletteEntry {
  group: string;
  label: string;
  href: string;
  icon?: string;
  /** Extra search terms so "PO" finds "Jobs", etc. */
  keywords: string;
}

/** Flattens the permission-filtered nav tree into a single searchable list. */
function buildEntries(sections: NavSection[]): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (const section of sections) {
    if (section.href) {
      entries.push({
        group: 'Navigation',
        label: section.label,
        href: section.href,
        icon: section.icon,
        keywords: section.label,
      });
    }
    for (const item of section.items ?? []) {
      entries.push({
        group: section.label,
        label: item.label,
        href: item.href,
        icon: item.icon ?? section.icon,
        keywords: `${section.label} ${item.label}`,
      });
    }
  }
  return entries;
}

export function CommandPalette({
  user,
  open,
  onOpenChange,
}: {
  user: AuthUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const router = useRouter();
  const permissions = React.useMemo(() => new Set<string>(user.permissions), [user.permissions]);

  const entries = React.useMemo(() => {
    const sections = CONTROL_NAVIGATION.filter(
      (section) => !section.permission || permissions.has(section.permission),
    ).map((section) => ({
      ...section,
      items: section.items?.filter((item) => !item.permission || permissions.has(item.permission)),
    }));
    return buildEntries(sections);
  }, [permissions]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    for (const entry of entries) {
      const bucket = map.get(entry.group);
      if (bucket) bucket.push(entry);
      else map.set(entry.group, [entry]);
    }
    return [...map.entries()];
  }, [entries]);

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a screen, or search the workspace…" />
      <CommandList>
        <CommandEmpty>No matching screen.</CommandEmpty>
        {grouped.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((entry) => (
              <CommandItem
                key={entry.href}
                value={entry.keywords}
                onSelect={() => go(entry.href)}
                className="group/item"
              >
                <NavIcon name={entry.icon} className="h-4 w-4 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{entry.label}</span>
                {group !== 'Navigation' ? (
                  <span className="hidden text-[11px] text-subtle sm:inline">{group}</span>
                ) : null}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-data-[selected=true]/item:opacity-50" />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft className="h-2.5 w-2.5" />
          </Kbd>
          to open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>esc</Kbd>
          to close
        </span>
      </div>
    </CommandDialog>
  );
}

/** Binds ⌘K / Ctrl+K once, for whichever shell mounts it. */
export function useCommandPalette(): {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
