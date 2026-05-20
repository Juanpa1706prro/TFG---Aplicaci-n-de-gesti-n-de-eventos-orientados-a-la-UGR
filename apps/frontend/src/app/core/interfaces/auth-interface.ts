import {
  UserCampus,
  UserDegree,
  UserFaculty,
  UserGender,
  StaffFunction,
} from '@core/constants/user-enums';

export interface SetSessionPersonaPayload {
  staffFunction: StaffFunction;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  /** Demo: ADMIN, MANAGER o MODERATOR; omitir o vacío = usuario normal. */
  operatorKey?: string;
}

export interface CompleteOnboardingPayload {
  firstName: string;
  lastName: string;
  staffFunctions?: StaffFunction[];
  faculty?: UserFaculty;
  campus?: UserCampus;
  degree?: UserDegree;
  department?: string;
  gender?: UserGender;
  birthDate?: string;
  phoneNumber?: string;
}
