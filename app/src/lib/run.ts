import { haversine, type Point } from './geo';

export type Pause = { start: number; end: number };

export type Split = {
  /** Volgnummer, 1-based. */
  km: number;
  /** Afstand van dit stuk in meters (1000, behalve het laatste stuk). */
  distanceM: number;
  /** Tijd in seconden, zonder pauzes. */
  durationSec: number;
};

/** Gelopen tijd in seconden tussen startedAt en t, zonder pauzes. */
export function activeSeconds(
  startedAt: number,
  t: number,
  pauses: Pause[] = [],
  pausedAt: number | null = null,
): number {
  let pausedMs = 0;
  for (const p of pauses) {
    const s = Math.max(p.start, startedAt);
    const e = Math.min(p.end, t);
    if (e > s) pausedMs += e - s;
  }
  if (pausedAt != null && t > pausedAt) pausedMs += t - pausedAt;
  return Math.max(0, (t - startedAt - pausedMs) / 1000);
}

/**
 * Tijd per kilometer. Het moment waarop een kilometergrens gepasseerd wordt,
 * schatten we door lineair te interpoleren tussen de twee punten eromheen.
 * Het laatste, onvolledige stuk komt mee als totalSec is opgegeven.
 */
export function computeSplits(
  points: Point[],
  startedAt: number,
  pauses: Pause[] = [],
  totalSec?: number,
): Split[] {
  const splits: Split[] = [];
  let distance = 0;
  let nextBoundary = 1000;
  let lastBoundarySec = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((a.segment ?? 0) !== (b.segment ?? 0)) continue;
    const d = haversine(a, b);
    if (d <= 0) continue;

    while (distance + d >= nextBoundary) {
      const fraction = (nextBoundary - distance) / d;
      const t = a.timestamp + fraction * (b.timestamp - a.timestamp);
      const sec = activeSeconds(startedAt, t, pauses);
      splits.push({ km: splits.length + 1, distanceM: 1000, durationSec: sec - lastBoundarySec });
      lastBoundarySec = sec;
      nextBoundary += 1000;
    }
    distance += d;
  }

  const rest = distance - (nextBoundary - 1000);
  if (totalSec != null && rest >= 50) {
    splits.push({
      km: splits.length + 1,
      distanceM: rest,
      durationSec: Math.max(0, totalSec - lastBoundarySec),
    });
  }
  return splits;
}

/** Korte, aanmoedigende zin na een run. */
export function cheer(distanceM: number): string {
  if (distanceM >= 21000) return 'Halve marathon of meer. Petje af.';
  if (distanceM >= 10000) return 'Dubbele cijfers. Sterk gelopen.';
  if (distanceM >= 5000) return 'Lekker gelopen.';
  if (distanceM >= 1000) return 'Mooi rondje. Goed bezig.';
  return 'Elk rondje telt. Goed begin.';
}
