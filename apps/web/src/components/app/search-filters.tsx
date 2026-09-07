'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ListFilter, Search, SlidersHorizontal, X } from 'lucide-react';

import { ToolbarChip, ToolbarDivider, ToolbarRail } from '@/components/app/toolbar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterDefinition {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * The filter rail.
 *
 * Search collapses into an icon until it holds a value, and each active
 * filter promotes itself into a labelled chip with its own clear affordance.
 * The result is that a filtered view *looks* filtered — the single most
 * common source of "why is this table empty?" confusion.
 */
export function SearchFilters({
  searchPlaceholder = 'Search…',
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSearch = params.get('search') ?? '';
  const [searchOpen, setSearchOpen] = useState(currentSearch.length > 0);
  const [draft, setDraft] = useState(currentSearch);

  // Back/forward navigation must not leave a stale term in the box.
  useEffect(() => {
    setDraft(currentSearch);
    if (currentSearch) setSearchOpen(true);
  }, [currentSearch]);

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== 'ALL') next.set(key, value);
      else next.delete(key);
      next.delete('page');
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [params, pathname, router],
  );

  const activeFilters = filters.filter((filter) => {
    const value = params.get(filter.name);
    return Boolean(value) && value !== 'ALL';
  });

  const activeCount = activeFilters.length + (currentSearch ? 1 : 0);

  const clearAll = (): void => {
    const next = new URLSearchParams(params.toString());
    next.delete('search');
    next.delete('page');
    for (const filter of filters) next.delete(filter.name);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <ToolbarRail>
      {/* Search — icon until it earns width. */}
      {searchOpen ? (
        <div className="relative flex h-8 min-w-[200px] flex-1 items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-subtle" />
          <input
            ref={inputRef}
            autoFocus={!currentSearch}
            value={draft}
            placeholder={searchPlaceholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') update('search', draft.trim());
              if (event.key === 'Escape') {
                setDraft('');
                if (currentSearch) update('search', '');
                else setSearchOpen(false);
              }
            }}
            onBlur={() => {
              const value = draft.trim();
              if (value !== currentSearch) update('search', value);
              else if (!value) setSearchOpen(false);
            }}
            className={cn(
              'h-8 w-full rounded-control bg-surface-elevated pl-8 pr-8 text-[0.8125rem] shadow-hairline',
              'placeholder:text-subtle',
              'focus:outline-none focus:shadow-[inset_0_0_0_1px_hsl(var(--primary)),0_0_0_3px_hsl(var(--primary)/0.15)]',
            )}
          />
          {draft ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setDraft('');
                update('search', '');
                inputRef.current?.focus();
              }}
              className="absolute right-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-subtle transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      ) : (
        <ToolbarChip icon={Search} onClick={() => setSearchOpen(true)} aria-label="Search">
          <span className="font-normal text-subtle">Search</span>
        </ToolbarChip>
      )}

      {filters.length ? <ToolbarDivider /> : null}

      {filters.map((filter) => {
        const value = params.get(filter.name);
        const active = Boolean(value) && value !== 'ALL';
        const selected = filter.options.find((option) => option.value === value);

        return (
          <Popover key={filter.name}>
            <PopoverTrigger asChild>
              <ToolbarChip
                icon={active ? undefined : ListFilter}
                label={active ? filter.label : undefined}
                active={active}
                caret
              >
                {active ? (selected?.label ?? value ?? '') : filter.label}
              </ToolbarChip>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <div className="max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => update(filter.name, 'ALL')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-input px-2 py-1.5 text-left text-[0.8125rem]',
                    'transition-colors duration-100 hover:bg-surface-hover',
                    !active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0', active && 'opacity-0')} />
                  <span className="flex-1 truncate">All</span>
                </button>
                {filter.options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => update(filter.name, option.value)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-input px-2 py-1.5 text-left text-[0.8125rem]',
                        'transition-colors duration-100 hover:bg-surface-hover',
                        isSelected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <Check className={cn('h-3.5 w-3.5 shrink-0', !isSelected && 'opacity-0')} />
                      <span className="flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {activeCount > 0 ? (
        <>
          <ToolbarDivider />
          <ToolbarChip icon={SlidersHorizontal} tone="ghost" onClick={clearAll}>
            <span className="font-normal">
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </span>
          </ToolbarChip>
        </>
      ) : null}
    </ToolbarRail>
  );
}
