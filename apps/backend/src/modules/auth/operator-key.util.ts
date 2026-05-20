import { SystemRole } from '../user/user-enums';

/** Demo: claves provisionales en el registro para asignar SystemRole. */
const OPERATOR_KEY_TO_ROLE: Record<string, SystemRole> = {
  ADMIN: SystemRole.ADMIN,
  MANAGER: SystemRole.MANAGER,
  MODERATOR: SystemRole.MODERATOR,
};

/**
 * Si la clave coincide exactamente con ADMIN, MANAGER o MODERATOR, devuelve ese rol.
 * Cualquier otro valor (vacío, incorrecto) deja al usuario como USER.
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
