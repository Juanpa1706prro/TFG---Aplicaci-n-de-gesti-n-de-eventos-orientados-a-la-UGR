import {
  SystemRole,
  StaffFunction,
  GlobalCapability,
} from '@core/constants/user-enums';

export interface UserSession {
  id: number;
  email: string;
  userNumber: number;
  /** true si ya están los datos obligatorios según tipo de cuenta (@correo / @ugr). */
  profileComplete: boolean;
  /** true si debe elegir función de sesión (varias funciones; tras cada login se pide de nuevo). */
  needsPersonaSelection: boolean;
  role: SystemRole;
  staffFunctions: StaffFunction[];
  activeStaffFunction: StaffFunction | null;
  globalCapabilities: GlobalCapability[];
}
