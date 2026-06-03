/**
 * Rutas de perfil bajo el shell del usuario de sesión:
 * - propio: /u/:me/profile
 * - ajeno: /u/:me/profile/:viewUserNumber
 */
export function profileRoute(
  sessionUserNumber: number,
  viewUserNumber?: number | null,
): (string | number)[] {
  if (
    viewUserNumber == null ||
    viewUserNumber === sessionUserNumber
  ) {
    return ['/u', sessionUserNumber, 'profile'];
  }
  return ['/u', sessionUserNumber, 'profile', viewUserNumber];
}

export function sessionUserNumberOrNull(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value;
}
