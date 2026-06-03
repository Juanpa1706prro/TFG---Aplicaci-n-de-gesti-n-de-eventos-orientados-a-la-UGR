import { StaffFunction } from '@core/constants/user-enums';

export function staffFunctionLabel(fn: StaffFunction | undefined | null): string {
  switch (fn) {
    case StaffFunction.ESTUDIANTE:
      return 'Estudiante';
    case StaffFunction.PROFESOR:
      return 'Profesor / Profesora';
    case StaffFunction.PDI_INVESTIGACION:
      return 'PDI / Investigación';
    case StaffFunction.SECRETARIA_ADMINISTRACION:
      return 'Secretaría / Administración';
    case StaffFunction.BIBLIOTECA:
      return 'Biblioteca';
    case StaffFunction.RECTORADO:
      return 'Rectorado / Dirección';
    case StaffFunction.SEGURIDAD:
      return 'Seguridad / Servicios';
    case StaffFunction.OTRO_PERSONAL:
      return 'Otro personal UGR';
    default:
      return '—';
  }
}
