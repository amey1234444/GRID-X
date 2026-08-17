import { humanise } from './format';

export interface Option {
  value: string;
  label: string;
}

export function optionsFrom(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: humanise(value) }));
}

export function monthOptions(): Option[] {
  return Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Date(2024, index, 1).toLocaleString('en-IN', { month: 'long' }),
  }));
}

export function yearOptions(span = 3): Option[] {
  const current = new Date().getFullYear();
  return Array.from({ length: span }, (_, index) => {
    const year = current - index;
    return { value: String(year), label: String(year) };
  });
}
