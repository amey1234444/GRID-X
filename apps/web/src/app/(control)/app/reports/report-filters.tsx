'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Option } from '@/lib/options';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReportFilterBar({ partners }: { partners: Option[] }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== 'ALL') next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="report-partner">Partner</Label>
        <Select
          defaultValue={params.get('partnerId') ?? 'ALL'}
          onValueChange={(value) => update('partnerId', value)}
        >
          <SelectTrigger id="report-partner">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All partners</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.value} value={partner.value}>
                {partner.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="report-from">From</Label>
        <Input
          id="report-from"
          type="date"
          defaultValue={params.get('from') ?? ''}
          onChange={(event) => update('from', event.currentTarget.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="report-to">To</Label>
        <Input
          id="report-to"
          type="date"
          defaultValue={params.get('to') ?? ''}
          onChange={(event) => update('to', event.currentTarget.value)}
        />
      </div>
    </div>
  );
}
