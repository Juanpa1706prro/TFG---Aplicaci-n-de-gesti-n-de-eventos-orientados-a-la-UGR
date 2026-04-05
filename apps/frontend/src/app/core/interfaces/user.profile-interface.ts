import { UserSession } from './user-interface';

export interface UserProfile extends UserSession {
  email: string;
  userNumber: number;
}
