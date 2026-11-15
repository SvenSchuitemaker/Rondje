import type { Point } from './geo';
import type { Pause } from './run';
import {
  addRuns,
  clearPendingDelete,
  externalIdOf,
  loadPendingDeletes,
  loadRuns,
  markSynced,
  type ActivitySource,
  type Run,
} from './storage';
import { supabase } from './supabase';

export type SyncResult = { uploaded: number; downloaded: number; deleted: number };

const POINT_CHUNK = 500;
const PAGE = 1000;

type ActivityRow = {
  id: string;
  source: ActivitySource;
  external_id: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  distance_m: number;
  pauses: Pause[] | null;
};

type PointRow = {
  seq: number;
  recorded_at: string;
  latitude: number;
  longitude: number;
  altitude_m: number | null;
  accuracy_m: number | null;
  segment: number;
};

/** Lokaal id van een run uit Supabase. Eigen GPS-runs houden hun eigen id. */
const localIdFor = (source: ActivitySource, externalId: string) =>
  source === 'own_gps' ? externalId : `${source}:${externalId}`;

let running: Promise<SyncResult> | null = null;

/** Synchroniseert lokaal ↔ Supabase. Gelijktijdige aanroepen delen dezelfde run. */
export function syncNow(): Promise<SyncResult> {
  if (!running) {
    running = doSync().finally(() => {
      running = null;
    });
  }
  return running;
}

async function doSync(): Promise<SyncResult> {
  const result: SyncResult = { uploaded: 0, downloaded: 0, deleted: 0 };
  if (!supabase) return result;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return result;

  // 1. Verwijderingen doorvoeren.
  for (const del of await loadPendingDeletes()) {
    if (del.userId !== userId) continue;
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('source', del.source)
      .eq('external_id', del.externalId);
    if (error) throw error;
    await clearPendingDelete(del);
    result.deleted++;
  }

  // 2. Nieuwe lokale runs uploaden.
  const local = await loadRuns();
  for (const run of local) {
    if (run.syncedUserId === userId) continue;
    await uploadRun(run, userId);
    await markSynced(run.id, userId);
    result.uploaded++;
  }

  // 3. Runs die alleen in Supabase staan ophalen (bijv. na herinstallatie).
  const knownIds = new Set(local.map((r) => r.id));
  const pendingDeletes = new Set(
    (await loadPendingDeletes()).map((d) => localIdFor(d.source, d.externalId)),
  );
  const remote = await fetchAll<ActivityRow>((from, to) =>
    supabase!
      .from('activities')
      .select('id, source, external_id, started_at, ended_at, duration_sec, distance_m, pauses')
      .order('started_at', { ascending: false })
      .range(from, to),
  );
  const missing = remote.filter((a) => {
    const id = localIdFor(a.source, a.external_id);
    return !knownIds.has(id) && !pendingDeletes.has(id);
  });
  const downloaded: Run[] = [];
  for (const activity of missing) downloaded.push(await downloadRun(activity, userId));
  result.downloaded = await addRuns(downloaded);

  return result;
}

async function uploadRun(run: Run, userId: string): Promise<void> {
  const db = supabase!;
  const { data, error } = await db
    .from('activities')
    .upsert(
      {
        user_id: userId,
        source: run.source,
        external_id: externalIdOf(run),
        started_at: new Date(run.startedAt).toISOString(),
        ended_at: new Date(run.endedAt).toISOString(),
        duration_sec: Math.round(run.durationSec),
        distance_m: run.distanceM,
        pauses: run.pauses ?? [],
      },
      { onConflict: 'user_id,source,external_id' },
    )
    .select('id')
    .single();
  if (error) throw error;
  const activityId = (data as { id: string }).id;

  // Punten vervangen, zodat een herhaalde upload geen dubbele punten geeft.
  const del = await db.from('activity_points').delete().eq('activity_id', activityId);
  if (del.error) throw del.error;

  for (let i = 0; i < run.points.length; i += POINT_CHUNK) {
    const rows = run.points.slice(i, i + POINT_CHUNK).map((p, j) => ({
      activity_id: activityId,
      seq: i + j,
      recorded_at: new Date(p.timestamp).toISOString(),
      latitude: p.latitude,
      longitude: p.longitude,
      altitude_m: p.altitude,
      accuracy_m: p.accuracy,
      segment: p.segment ?? 0,
    }));
    const ins = await db.from('activity_points').insert(rows);
    if (ins.error) throw ins.error;
  }
}

async function downloadRun(a: ActivityRow, userId: string): Promise<Run> {
  const rows = await fetchAll<PointRow>((from, to) =>
    supabase!
      .from('activity_points')
      .select('seq, recorded_at, latitude, longitude, altitude_m, accuracy_m, segment')
      .eq('activity_id', a.id)
      .order('seq')
      .range(from, to),
  );
  const points: Point[] = rows.map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    altitude: r.altitude_m,
    accuracy: r.accuracy_m,
    timestamp: Date.parse(r.recorded_at),
    segment: r.segment,
  }));
  return {
    id: localIdFor(a.source, a.external_id),
    externalId: a.external_id,
    source: a.source,
    startedAt: Date.parse(a.started_at),
    endedAt: Date.parse(a.ended_at),
    durationSec: a.duration_sec,
    distanceM: a.distance_m,
    pauses: a.pauses ?? [],
    points,
    syncedUserId: userId,
  };
}

/** Supabase geeft standaard maximaal 1000 rijen per verzoek; haal alles op in pagina's. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}
