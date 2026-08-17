import { Request } from 'express';
import { PermissionCode } from '@gridx/shared';
import { RoleCode, UserType } from '@gridx/db';

export interface RequestUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  roleCode: RoleCode;
  permissions: PermissionCode[];
  partnerId: string | null;
  companyIds: string[];
  defaultCompanyId: string | null;
}

export interface AuthedRequest extends Request {
  user?: RequestUser;
}

export function isPartnerUser(user: RequestUser): boolean {
  return user.userType === 'PARTNER';
}
