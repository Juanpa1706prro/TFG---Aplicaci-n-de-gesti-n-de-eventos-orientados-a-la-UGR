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
  hasProfilePicture: boolean;
  department?: string | null;
}

export interface StudentProfileDto {
  faculty: UserFaculty;
  campus: UserCampus;
  degree: UserDegree;
}

export interface FullUserPayload extends UserSession {
  profile: UserProfileDetails;
  studentProfile: StudentProfileDto | null;
}

/** Cuerpo de PATCH /user/profile */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  gender?: UserGender;
  birthDate?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface ProfileRoleFieldView {
  key: string;
  label: string;
  value: string;
}

export interface ProfileRoleSectionView {
  function: StaffFunction;
  title: string;
  fields: ProfileRoleFieldView[];
}

/** Respuesta de GET /user/public/:userNumber */
export interface PublicProfileView {
  userId: number;
  userNumber: number;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  hasProfilePicture: boolean;
  email?: string;
  viewerIsOwner: boolean;
  staffFunctions: StaffFunction[];
  studentProfile: StudentProfileDto | null;
  department?: string | null;
  roleSections: ProfileRoleSectionView[];
}
