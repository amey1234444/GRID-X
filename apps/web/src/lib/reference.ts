import { apiGet } from './session';
import type { Option } from './options';
import {
  emptyPage,
  type ComponentRow,
  type CompanyRow,
  type ItemRow,
  type JobRow,
  type Paginated,
  type PartnerRow,
  type ProcessRow,
  type UserRow,
  type VehicleRow,
} from './types';

export async function partnerOptions(): Promise<Option[]> {
  const page = await apiGet<Paginated<PartnerRow>>('/partners?pageSize=200', emptyPage<PartnerRow>());
  return page.data.map((partner) => ({
    value: partner.id,
    label: `${partner.businessName} (${partner.partnerCode})`,
  }));
}

export async function componentOptions(): Promise<Option[]> {
  const page = await apiGet<Paginated<ComponentRow>>(
    '/components?pageSize=200',
    emptyPage<ComponentRow>(),
  );
  return page.data.map((component) => ({
    value: component.id,
    label: `${component.componentCode} — ${component.name}`,
  }));
}

export async function companyOptions(): Promise<Option[]> {
  const companies = await apiGet<CompanyRow[]>('/companies', []);
  return companies.map((company) => ({ value: company.id, label: company.name }));
}

export async function itemOptions(): Promise<Option[]> {
  const page = await apiGet<Paginated<ItemRow>>('/items?pageSize=200', emptyPage<ItemRow>());
  return page.data.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }));
}

export async function jobOptions(status?: string): Promise<Option[]> {
  const query = status ? `&status=${status}` : '';
  const page = await apiGet<Paginated<JobRow>>(`/jobs?pageSize=200${query}`, emptyPage<JobRow>());
  return page.data.map((job) => ({
    value: job.id,
    label: `${job.jobNumber} — ${job.componentName}`,
  }));
}

export async function vehicleOptions(): Promise<Option[]> {
  const vehicles = await apiGet<VehicleRow[]>('/logistics/vehicles', []);
  return vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.registrationNo} (${vehicle.vehicleType})`,
  }));
}

export async function processOptions(): Promise<Option[]> {
  const processes = await apiGet<ProcessRow[]>('/processes', []);
  return processes.map((process) => ({ value: process.code, label: process.name }));
}

export async function inspectorOptions(): Promise<Option[]> {
  const page = await apiGet<Paginated<UserRow>>(
    '/users?pageSize=200&roleCode=QUALITY_INSPECTOR',
    emptyPage<UserRow>(),
  );
  return page.data.map((user) => ({ value: user.id, label: user.name }));
}

/** Internal users, used to pick owners for corrective actions and similar. */
export async function userOptions(): Promise<Option[]> {
  const page = await apiGet<Paginated<UserRow>>('/users?pageSize=200', emptyPage<UserRow>());
  return page.data.map((user) => ({
    value: user.id,
    label: `${user.name} (${user.role.code.replace(/_/g, ' ')})`,
  }));
}

/** The default company, used to prefill company-scoped create forms. */
export async function defaultCompanyId(): Promise<string | undefined> {
  const companies = await apiGet<CompanyRow[]>('/companies', []);
  return companies[0]?.id;
}
