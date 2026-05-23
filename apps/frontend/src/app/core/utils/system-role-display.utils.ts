import { SystemRole } from '@core/constants/user-enums';

const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.USER]: 'Usuario',
  [SystemRole.MODERATOR]: 'Moderador',
  [SystemRole.MANAGER]: 'Manager',
  [SystemRole.ADMIN]: 'Admin',
};

export function systemRoleLabel(role: SystemRole | null | undefined): string {
  if (role == null) {
    return SYSTEM_ROLE_LABELS[SystemRole.USER];
  }
  return SYSTEM_ROLE_LABELS[role] ?? role;
}

export function isElevatedSystemRole(role: SystemRole | null | undefined): boolean {
  return role != null && role !== SystemRole.USER;
}

export function canOpenAdminSidebar(role: SystemRole | null | undefined): boolean {
  return role === SystemRole.ADMIN;
}
