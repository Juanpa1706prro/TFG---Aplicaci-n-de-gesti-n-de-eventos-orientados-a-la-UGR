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
 * Texto único de tiempo para marcadores y lista.
 * - Antes del inicio: cuándo comenzará (fecha/hora fija).
 * - Durante el evento: cuenta atrás hasta `endsAt`.
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
