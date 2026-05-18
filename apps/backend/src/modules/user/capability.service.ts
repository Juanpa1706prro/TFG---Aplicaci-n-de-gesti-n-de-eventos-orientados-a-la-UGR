import { Injectable } from '@nestjs/common';
import { GlobalCapability, StaffFunction } from './user-enums';

@Injectable()
export class CapabilityService {
  /**
   * Capacidades globales según la función activa en sesión.
   * Si hay varias funciones y aún no hay `activeStaffFunction`, solo asistencia hasta elegir perfil.
   */
  resolveGlobalCapabilities(
    staffFunctions: StaffFunction[],
    activeStaffFunction: StaffFunction | null,
  ): GlobalCapability[] {
    const unique = [...new Set(staffFunctions)];
    if (unique.length === 0) {
      return [GlobalCapability.ATTEND_EVENTS];
    }

    let effective = activeStaffFunction;
    if (effective != null && !unique.includes(effective)) {
      effective = null;
    }
    if (unique.length > 1 && effective == null) {
      return [GlobalCapability.ATTEND_EVENTS];
    }
    if (effective == null) {
      effective = unique[0]!;
    }

    if (
      effective === StaffFunction.PROFESOR ||
      effective === StaffFunction.PDI_INVESTIGACION
    ) {
      return [
        GlobalCapability.ATTEND_EVENTS,
        GlobalCapability.CREATE_AND_MANAGE_OWN_EVENTS,
        GlobalCapability.INVITE_EVENT_MANAGERS,
      ];
    }

    return [GlobalCapability.ATTEND_EVENTS];
  }
}
