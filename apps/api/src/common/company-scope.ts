import { ForbiddenException } from '@nestjs/common';
import { RequestUser } from './request-user';

/**
 * Section 4 and Section 18 — group company isolation.
 *
 * Only the Group Admin has "full access across Oswal Engineers, Oswar Rotocorp and future group
 * companies". Every other internal user is confined to the companies they are linked to through
 * `UserCompany`. Partner users are not company-scoped at all: their boundary is `partnerId`,
 * which each service enforces separately, and they hold no company links.
 */
export function seesAllCompanies(actor: RequestUser): boolean {
  return actor.roleCode === 'GROUP_ADMIN';
}

/** True when this actor's queries must be narrowed to a set of companies. */
export function isCompanyScoped(actor: RequestUser): boolean {
  return actor.userType !== 'PARTNER' && !seesAllCompanies(actor);
}

/**
 * The company ids an actor may read, or `null` when no company filter applies.
 *
 * `requested` is the caller-supplied `companyId` filter: it narrows the scope, and is rejected
 * outright when it falls outside what the actor is allowed to see, so an explicit filter can
 * never be used to reach across the group.
 */
export function allowedCompanyIds(actor: RequestUser, requested?: string): string[] | null {
  if (!isCompanyScoped(actor)) {
    return requested ? [requested] : null;
  }
  if (actor.companyIds.length === 0) {
    throw new ForbiddenException(
      'Your account is not linked to a company. Ask an administrator to assign one.',
    );
  }
  if (requested) {
    if (!actor.companyIds.includes(requested)) {
      throw new ForbiddenException('You do not have access to that company');
    }
    return [requested];
  }
  return actor.companyIds;
}

/**
 * `where` fragment for any model that carries `companyId` directly — Partner, Product, Component,
 * Drawing, GridJob, MaterialIssue, InspectionPlan, Shipment, PartnerRate, PartnerInvoice and Tool.
 */
export function companyWhere(
  actor: RequestUser,
  requested?: string,
): { companyId?: { in: string[] } } {
  const ids = allowedCompanyIds(actor, requested);
  return ids ? { companyId: { in: ids } } : {};
}

/**
 * Same fragment, one relation deep — for records that inherit their company from a parent, such
 * as an inspection or a rework order hanging off a job.
 */
export function nestedCompanyWhere<K extends string>(
  actor: RequestUser,
  relation: K,
  requested?: string,
): Record<K, { companyId: { in: string[] } }> | Record<string, never> {
  const ids = allowedCompanyIds(actor, requested);
  return ids
    ? ({ [relation]: { companyId: { in: ids } } } as Record<K, { companyId: { in: string[] } }>)
    : {};
}

/**
 * Guards a record already loaded by id. Detail reads and writes bypass list filters, so every
 * lookup by primary key has to be checked separately.
 */
export function assertCompanyScope(
  actor: RequestUser,
  companyId: string | null | undefined,
  label = 'record',
): void {
  if (!isCompanyScoped(actor)) return;
  if (!companyId) return;
  if (!actor.companyIds.includes(companyId)) {
    throw new ForbiddenException(`This ${label} belongs to another company`);
  }
}

/**
 * Guards a company id supplied on a write. Unlike `assertCompanyScope` a missing value is an
 * error here: you cannot create a record without saying which company owns it.
 */
export function assertCanWriteToCompany(actor: RequestUser, companyId: string): void {
  if (!isCompanyScoped(actor)) return;
  if (!actor.companyIds.includes(companyId)) {
    throw new ForbiddenException('You cannot create records for another company');
  }
}
