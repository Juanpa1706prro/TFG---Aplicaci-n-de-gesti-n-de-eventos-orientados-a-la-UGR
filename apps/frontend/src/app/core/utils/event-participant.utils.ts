import { EventParticipantDto } from '@core/interfaces/event-interface';

export function eventParticipantDisplayName(p: EventParticipantDto): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return name || `Usuario ${p.userNumber}`;
}

export function eventParticipantInitials(p: EventParticipantDto): string {
  const first = p.firstName?.trim().charAt(0) ?? '';
  const last = p.lastName?.trim().charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || String(p.userNumber).slice(-2);
}
