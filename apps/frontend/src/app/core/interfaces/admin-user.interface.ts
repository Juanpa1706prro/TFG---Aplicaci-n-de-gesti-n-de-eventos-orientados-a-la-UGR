import { SystemRole } from '@core/constants/user-enums';

export type AdminUserListItem = {
  userId: number;
  userNumber: number;
  email: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  role: SystemRole;
  createdAt: string;
  hasProfilePicture: boolean;
};

export type AdminUserDetail = AdminUserListItem & {
  bio: string | null;
  gender: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  profileComplete: boolean;
};

export type AdminUsersListResponse = {
  items: AdminUserListItem[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type AdminUsersSortField = 'createdAt' | 'name';
export type AdminUsersSortOrder = 'asc' | 'desc';

export type AdminUsersListParams = {
  page: number;
  limit: number;
  sort: AdminUsersSortField;
  order: AdminUsersSortOrder;
  q?: string;
};

export type AdminUpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  gender?: string | null;
  birthDate?: string;
  phoneNumber?: string;
  bio?: string;
  role?: SystemRole;
};
