import {
  UserCampus,
  UserDegree,
  UserFaculty,
  UserGender,
  StaffFunction,
} from '@core/constants/user-enums';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface CompleteOnboardingPayload {
  firstName: string;
  lastName: string;
  staffFunctions?: StaffFunction[];
  faculty?: UserFaculty;
  campus?: UserCampus;
  degree?: UserDegree;
  gender?: UserGender;
  birthDate?: string;
  phoneNumber?: string;
}
