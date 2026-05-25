import { Injectable } from '@nestjs/common';
import { GlobalCapability, StaffFunction } from './user-enums';

// -------------------------------------------------------------------
// Capability Service
// Resolves global platform capabilities from staff functions and session persona.
// -------------------------------------------------------------------
@Injectable()
export class CapabilityService {
  // ------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------

  /**
   * Global capabilities for the active session staff function.
   * If multiple functions exist and activeStaffFunction is unset, only ATTEND_EVENTS until persona is chosen.
   * @param {StaffFunction[]} staffFunctions - All functions linked to the user.
   * @param {StaffFunction | null} activeStaffFunction - Function selected for the current session.
   * @returns {GlobalCapability[]} Capabilities granted for this session.
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
