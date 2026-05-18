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

/**
 * Texto de cuenta atrás según instante actual.
 * - Antes del inicio: tiempo hasta `startsAt`.
 * - Durante el evento: tiempo hasta fin (= startsAt + durationMinutes).
 */
export function eventCountdownText(
  startsAtIso: string,
  durationMinutes: number,
  nowMs: number,
): string {
  const startMs = Date.parse(startsAtIso);
  if (!Number.isFinite(startMs)) {
    return '—';
  }
  const endMs = startMs + durationMinutes * 60_000;
  if (nowMs < startMs) {
    return `Empieza en ${formatRemain(startMs - nowMs)}`;
  }
  if (nowMs < endMs) {
    return `Quedan ${formatRemain(endMs - nowMs)}`;
  }
  return 'Finalizado';
}
