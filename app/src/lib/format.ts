const pad = (n: number) => n.toString().padStart(2, '0');

/** 754 s → "12:34", 3754 s → "1:02:34" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Meters → "5,23" (km, Nederlandse komma) */
export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(2).replace('.', ',');
}

/** Tempo in min/km → "5:12", of "–:––" als er nog te weinig afstand is. */
export function formatPace(meters: number, seconds: number): string {
  if (meters < 10 || seconds <= 0) return '–:––';
  const secPerKm = seconds / (meters / 1000);
  if (!Number.isFinite(secPerKm) || secPerKm > 99 * 60) return '–:––';
  const rounded = Math.round(secPerKm);
  return `${Math.floor(rounded / 60)}:${pad(rounded % 60)}`;
}

const DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** → "di 11 nov · 07:45" */
export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
