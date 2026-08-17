'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterDefinition {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

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

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== 'ALL') next.set(key, value);
      else next.delete(key);
      next.delete('page');
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={params.get('search') ?? ''}
          placeholder={searchPlaceholder}
          className="pl-9"
          onKeyDown={(event) => {
            if (event.key === 'Enter') update('search', event.currentTarget.value.trim());
          }}
          onBlur={(event) => {
            const value = event.currentTarget.value.trim();
            if (value !== (params.get('search') ?? '')) update('search', value);
          }}
        />
      </div>
      {filters.map((filter) => (
        <Select
          key={filter.name}
          defaultValue={params.get(filter.name) ?? 'ALL'}
          onValueChange={(value) => update(filter.name, value)}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{filter.label}: all</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
