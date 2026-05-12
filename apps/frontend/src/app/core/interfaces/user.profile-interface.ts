import { UserSession } from './user-interface';
import {
  UserGender,
  UserFaculty,
  UserCampus,
  UserDegree,
  StaffFunction,
} from '@core/constants/user-enums';

export interface UserProfileDetails {
  userName: string;
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: UserGender | null;
  phoneNumber: string | null;
  bio: string | null;
  profilePicture: string | null;
}

export interface StudentProfileDto {
  faculty: UserFaculty;
  campus: UserCampus;
  degree: UserDegree;
}

export interface FullUserPayload extends UserSession {
  profile: UserProfileDetails;
  staffFunctions: StaffFunction[];
  studentProfile: StudentProfileDto | null;
}

/** Respuesta de GET /user/public/:userNumber */
export interface PublicProfileView {
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  viewerIsOwner: boolean;
  staffFunctions: StaffFunction[];
  studentProfile: StudentProfileDto | null;
}
