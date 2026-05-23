/** Formatea milisegundos restantes (solo aritmética, sin consultas). */
function formatRemain(ms: number): string {
  if (ms <= 0) {
    return '0s';
  }
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

const START_DATE_FMT: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
};

/**
 * Panel lateral / listas: fecha de inicio, cuenta atrás en curso o finalizado.
 */
export function eventTimeDisplayText(
  startsAtIso: string,
  endsAtIso: string,
  nowMs: number,
): string {
  const startMs = Date.parse(startsAtIso);
  const endMs = Date.parse(endsAtIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return '—';
  }
  if (nowMs < startMs) {
    const startFormatted = new Date(startMs).toLocaleString('es-ES', START_DATE_FMT);
    return `Comienza el ${startFormatted}`;
  }
  if (nowMs < endMs) {
    return `Quedan ${formatRemain(endMs - nowMs)}`;
  }
  return 'Finalizado';
}

const TIME_ONLY_FMT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

function isSameLocalDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Mismo día → solo hora; otro día → fecha y hora. */
function formatMarkerScheduleTime(targetMs: number, referenceMs: number): string {
  if (isSameLocalDay(targetMs, referenceMs)) {
    return new Date(targetMs).toLocaleTimeString('es-ES', TIME_ONLY_FMT);
  }
  return new Date(targetMs).toLocaleString('es-ES', START_DATE_FMT);
}

/**
 * Marcadores del mapa: Inicio (si no ha empezado) o Final (si ya empezó).
 */
export function eventMarkerTimeText(
  startsAtIso: string,
  endsAtIso: string,
  nowMs = Date.now(),
): string {
  const startMs = Date.parse(startsAtIso);
  const endMs = Date.parse(endsAtIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return '—';
  }

  if (nowMs < startMs) {
    return `Inicio: ${formatMarkerScheduleTime(startMs, nowMs)}`;
  }

  return `Final: ${formatMarkerScheduleTime(endMs, nowMs)}`;
}

const TIME_TICK_BUFFER_MS = 50;
const DETAIL_COUNTDOWN_TICK_MS = 1000;

/**
 * Cuándo actualizar marcadores que aún muestran «Inicio» (pasan a «Final» al empezar).
 * Sin ticks periódicos: un solo aviso en la hora de inicio.
 */
export function msUntilNextMarkerLabelRefresh(
  startsAtList: string[],
  nowMs = Date.now(),
): number | null {
  let nextMs = Number.POSITIVE_INFINITY;

  for (const startsAtIso of startsAtList) {
    const startMs = Date.parse(startsAtIso);
    if (!Number.isFinite(startMs) || nowMs >= startMs) {
      continue;
    }
    nextMs = Math.min(nextMs, startMs - nowMs);
  }

  if (!Number.isFinite(nextMs)) {
    return null;
  }

  return Math.max(nextMs + TIME_TICK_BUFFER_MS, TIME_TICK_BUFFER_MS);
}

/**
 * Cuándo actualizar la hora del panel lateral (cuenta atrás solo si el evento está en curso).
 */
export function msUntilNextDetailTimeRefresh(
  startsAtIso: string,
  endsAtIso: string,
  nowMs = Date.now(),
): number | null {
  const startMs = Date.parse(startsAtIso);
  const endMs = Date.parse(endsAtIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }

  if (nowMs < startMs) {
    return Math.max(startMs - nowMs + TIME_TICK_BUFFER_MS, TIME_TICK_BUFFER_MS);
  }

  if (nowMs < endMs) {
    return Math.min(
      DETAIL_COUNTDOWN_TICK_MS,
      Math.max(endMs - nowMs + TIME_TICK_BUFFER_MS, TIME_TICK_BUFFER_MS),
    );
  }

  return null;
}
