import { UserRole } from '@core/constants/user-enums';

export interface UserSession {
  id: number;
  email: string;
  userNumber: number;
  /** true si ya están los datos obligatorios según tipo de cuenta (@correo / @ugr). */
  profileComplete: boolean;
  role: UserRole;
}
