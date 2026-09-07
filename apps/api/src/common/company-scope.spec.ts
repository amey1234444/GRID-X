import { ForbiddenException } from '@nestjs/common';
import { PERMISSIONS } from '@gridx/shared';
import {
  allowedCompanyIds,
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
  isCompanyScoped,
  nestedCompanyWhere,
  seesAllCompanies,
} from './company-scope';
import { RequestUser } from './request-user';

const OSWAR = 'company-oswar';
const OSWAL = 'company-oswal';

function user(overrides: Partial<RequestUser> = {}): RequestUser {
  return {
    id: 'user-1',
    name: 'Test user',
    email: 'test@oswar.example',
    phone: null,
    userType: 'INTERNAL',
    roleCode: 'OPERATIONS_HEAD',
    permissions: [PERMISSIONS.JOB_READ],
    partnerId: null,
    companyIds: [OSWAR],
    defaultCompanyId: OSWAR,
    ...overrides,
  };
}

const groupAdmin = user({ roleCode: 'GROUP_ADMIN', companyIds: [OSWAR, OSWAL] });
const partnerUser = user({
  userType: 'PARTNER',
  roleCode: 'PARTNER_OWNER',
  partnerId: 'partner-1',
  companyIds: [],
  defaultCompanyId: null,
});

describe('company scope', () => {
  describe('who is scoped', () => {
    it('exempts the Group Admin, who has full access across group companies', () => {
      expect(seesAllCompanies(groupAdmin)).toBe(true);
      expect(isCompanyScoped(groupAdmin)).toBe(false);
      expect(allowedCompanyIds(groupAdmin)).toBeNull();
    });

    it('exempts partner users, whose boundary is partnerId rather than company', () => {
      expect(isCompanyScoped(partnerUser)).toBe(false);
      expect(allowedCompanyIds(partnerUser)).toBeNull();
    });

    it('scopes every other internal role to its linked companies', () => {
      expect(isCompanyScoped(user())).toBe(true);
      expect(allowedCompanyIds(user())).toEqual([OSWAR]);
    });
  });

  describe('the requested companyId filter', () => {
    it('narrows the scope when the actor holds that company', () => {
      const actor = user({ companyIds: [OSWAR, OSWAL] });
      expect(allowedCompanyIds(actor, OSWAL)).toEqual([OSWAL]);
    });

    it('cannot be used to reach a company the actor does not hold', () => {
      expect(() => allowedCompanyIds(user(), OSWAL)).toThrow(ForbiddenException);
    });

    it('is honoured for a Group Admin without widening anything', () => {
      expect(allowedCompanyIds(groupAdmin, OSWAL)).toEqual([OSWAL]);
    });
  });

  describe('fail-closed behaviour', () => {
    it('refuses an internal account with no company links, rather than showing everything', () => {
      expect(() => allowedCompanyIds(user({ companyIds: [] }))).toThrow(ForbiddenException);
    });
  });

  describe('where fragments', () => {
    it('narrows a model that carries companyId', () => {
      expect(companyWhere(user())).toEqual({ companyId: { in: [OSWAR] } });
    });

    it('adds no clause for an unscoped actor', () => {
      expect(companyWhere(groupAdmin)).toEqual({});
      expect(companyWhere(partnerUser)).toEqual({});
    });

    it('narrows through a named relation', () => {
      expect(nestedCompanyWhere(user(), 'job')).toEqual({ job: { companyId: { in: [OSWAR] } } });
      expect(nestedCompanyWhere(groupAdmin, 'job')).toEqual({});
    });
  });

  describe('guarding a record loaded by id', () => {
    it('rejects a record belonging to another company', () => {
      expect(() => assertCompanyScope(user(), OSWAL, 'job')).toThrow(ForbiddenException);
      expect(() => assertCompanyScope(user(), OSWAL, 'job')).toThrow(/another company/);
    });

    it('accepts a record in one of the actor s companies', () => {
      expect(() => assertCompanyScope(user(), OSWAR)).not.toThrow();
    });

    it('lets the Group Admin and partner users through', () => {
      expect(() => assertCompanyScope(groupAdmin, OSWAL)).not.toThrow();
      expect(() => assertCompanyScope(partnerUser, OSWAL)).not.toThrow();
    });
  });

  describe('guarding a write', () => {
    it('refuses to create records for another company', () => {
      expect(() => assertCanWriteToCompany(user(), OSWAL)).toThrow(ForbiddenException);
    });

    it('permits a company the actor holds', () => {
      expect(() => assertCanWriteToCompany(user(), OSWAR)).not.toThrow();
    });
  });
});
