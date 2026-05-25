import { SystemRole } from '../user/user-enums';

// -------------------------------------------------------------------
// Operator key resolver (demo)
// Maps provisional registration keys to SystemRole values.
// -------------------------------------------------------------------

/**
 * Demo mapping from registration operator keys to system roles.
 */
const OPERATOR_KEY_TO_ROLE: Record<string, SystemRole> = {
  ADMIN: SystemRole.ADMIN,
  MANAGER: SystemRole.MANAGER,
  MODERATOR: SystemRole.MODERATOR,
};

/**
 * Resolves the system role from an optional operator key at registration.
 * Exact match on ADMIN, MANAGER or MODERATOR; otherwise USER.
 * @param {string | undefined | null} operatorKey - Key from RegisterDto.
 * @returns {SystemRole} Assigned role for the new user.
 */
export function resolveSystemRoleFromOperatorKey(
  operatorKey: string | undefined | null,
): SystemRole {
  const trimmed = operatorKey?.trim();
  if (!trimmed) {
    return SystemRole.USER;
  }
  return OPERATOR_KEY_TO_ROLE[trimmed] ?? SystemRole.USER;
}
