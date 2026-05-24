import { API_BASE_URL } from '@core/config/api.config';

export function userProfilePhotoUrl(userNumber: number): string {
  return `${API_BASE_URL}/user/public/${userNumber}/photo`;
}

export function sessionProfilePhotoUrl(): string {
  return `${API_BASE_URL}/user/profile/photo`;
}

export function eventPhotoUrl(eventId: number): string {
  return `${API_BASE_URL}/events/${eventId}/photo`;
}

export function adminUserPhotoUrl(userNumber: number): string {
  return `${API_BASE_URL}/admin/users/${userNumber}/photo`;
}

export function adminEventPhotoUrl(eventId: number): string {
  return `${API_BASE_URL}/admin/events/${eventId}/photo`;
}
