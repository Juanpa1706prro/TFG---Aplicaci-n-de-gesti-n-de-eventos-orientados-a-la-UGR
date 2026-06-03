import {
  NotificationActorDto,
  NotificationItemDto,
  NotificationType,
} from '@core/interfaces/notification-interface';

export function notificationActorLabel(actor: NotificationActorDto): string {
  const parts = [actor.firstName, actor.lastName].filter(
    (part): part is string => !!part?.trim(),
  );
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return `Usuario ${actor.userNumber}`;
}

export function notificationMessage(item: NotificationItemDto): string {
  const name = notificationActorLabel(item.actor);
  const eventTitle = item.event?.title?.trim() || 'Evento';

  switch (item.type) {
    case NotificationType.MEETING_INVITATION:
      return `${name} te ha invitado a la reunión «${eventTitle}»`;
    case NotificationType.EVENT_INVITATION:
      return `${name} te recomienda que vayas al evento «${eventTitle}»`;
    case NotificationType.FRIEND_REQUEST:
      return `${name} quiere ser tu amigo/a`;
    default:
      return 'Notificación';
  }
}

export function notificationRelativeTime(iso: string, nowMs = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return '';
  }
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) {
    return 'Ahora';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}
