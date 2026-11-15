import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Point } from './geo';
import type { Pause } from './run';

export type ActivitySource = 'own_gps' | 'apple_health' | 'garmin' | 'fit_import';

export type Run = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  distanceM: number;
  points: Point[];
  pauses?: Pause[];
  source: ActivitySource;
  /** Id in het bronsysteem; voor eigen GPS-runs gelijk aan id. */
  externalId?: string;
  /** Gebruiker naar wie deze run voor het laatst is gesynchroniseerd. */
  syncedUserId?: string;
};

/** Een verwijderde run die nog uit Supabase gehaald moet worden. */
export type PendingDelete = { userId: string; source: ActivitySource; externalId: string };

const RUNS_KEY = 'rondje:runs';
const DELETES_KEY = 'rondje:pending-deletes';

export const externalIdOf = (run: Run) => run.externalId ?? run.id;

// Alle schrijfacties achter elkaar, zodat sync en opslaan elkaar niet overschrijven.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function readRuns(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) return [];
  try {
    const runs = JSON.parse(raw) as Run[];
    return runs.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

async function writeRuns(runs: Run[]): Promise<void> {
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

export function loadRuns(): Promise<Run[]> {
  return serial(readRuns);
}

export async function getRun(id: string): Promise<Run | null> {
  const runs = await loadRuns();
  return runs.find((r) => r.id === id) ?? null;
}

export function saveRun(run: Run): Promise<void> {
  return serial(async () => {
    const runs = await readRuns();
    await writeRuns([run, ...runs.filter((r) => r.id !== run.id)]);
  });
}

/** Voegt runs toe die er lokaal nog niet zijn (op id). Geeft het aantal nieuwe terug. */
export function addRuns(newRuns: Run[]): Promise<number> {
  return serial(async () => {
    const runs = await readRuns();
    const known = new Set(runs.map((r) => r.id));
    const fresh = newRuns.filter((r) => !known.has(r.id));
    if (fresh.length) await writeRuns([...fresh, ...runs]);
    return fresh.length;
  });
}

export function markSynced(id: string, userId: string): Promise<void> {
  return serial(async () => {
    const runs = await readRuns();
    await writeRuns(runs.map((r) => (r.id === id ? { ...r, syncedUserId: userId } : r)));
  });
}

export function deleteRun(id: string): Promise<void> {
  return serial(async () => {
    const runs = await readRuns();
    const run = runs.find((r) => r.id === id);
    await writeRuns(runs.filter((r) => r.id !== id));
    // Stond hij al in Supabase, dan onthouden we dat hij daar ook weg moet.
    if (run?.syncedUserId) {
      const pending = await readDeletes();
      pending.push({ userId: run.syncedUserId, source: run.source, externalId: externalIdOf(run) });
      await AsyncStorage.setItem(DELETES_KEY, JSON.stringify(pending));
    }
  });
}

async function readDeletes(): Promise<PendingDelete[]> {
  const raw = await AsyncStorage.getItem(DELETES_KEY);
  try {
    return raw ? (JSON.parse(raw) as PendingDelete[]) : [];
  } catch {
    return [];
  }
}

export function loadPendingDeletes(): Promise<PendingDelete[]> {
  return serial(readDeletes);
}

export function clearPendingDelete(done: PendingDelete): Promise<void> {
  return serial(async () => {
    const pending = await readDeletes();
    const rest = pending.filter(
      (p) => !(p.userId === done.userId && p.source === done.source && p.externalId === done.externalId),
    );
    await AsyncStorage.setItem(DELETES_KEY, JSON.stringify(rest));
  });
}
