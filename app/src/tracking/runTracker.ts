import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { haversine, type Point } from '../lib/geo';
import { saveRun, type Run } from '../lib/storage';

export const LOCATION_TASK = 'rondje-location-task';
const ACTIVE_KEY = 'rondje:active-run';

/** Punten met een onnauwkeurigheid boven deze waarde (meters) negeren we. */
export const MAX_ACCURACY_M = 30;

/**
 * In Expo Go werkt achtergrondlocatie niet op iOS. Daar meten we alleen
 * zolang de app open is (watchPositionAsync) en houden we het scherm aan.
 */
export const FOREGROUND_ONLY = isRunningInExpoGo();
let foregroundWatch: Location.LocationSubscription | null = null;

const TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
} as const;

export type ActiveRun = {
  startedAt: number;
  distanceM: number;
  points: Point[];
};

// ---------------------------------------------------------------------------
// Staat: in het geheugen gespiegeld en in AsyncStorage bewaard, zodat een run
// overleeft als iOS de app op de achtergrond opnieuw start.
// ---------------------------------------------------------------------------

let active: ActiveRun | null = null;
let loaded = false;
const listeners = new Set<(run: ActiveRun | null) => void>();

// Schrijfacties achter elkaar uitvoeren, zodat batches elkaar niet overschrijven.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);
  active = raw ? (JSON.parse(raw) as ActiveRun) : null;
  loaded = true;
}

async function persist(): Promise<void> {
  if (active) await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  else await AsyncStorage.removeItem(ACTIVE_KEY);
  listeners.forEach((l) => l(active));
}

export function subscribe(listener: (run: ActiveRun | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveRun(): Promise<ActiveRun | null> {
  return serial(async () => {
    await ensureLoaded();
    return active;
  });
}

// ---------------------------------------------------------------------------
// Achtergrondtaak. Moet op topniveau gedefinieerd worden (zie index.ts).
// ---------------------------------------------------------------------------

type LocationTaskData = { locations: Location.LocationObject[] };

// In Expo Go is er geen achtergrondtaak; daar gebruiken we watchPositionAsync.
if (!FOREGROUND_ONLY) {
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[rondje] locatietaak:', error.message);
      return;
    }
    if (data?.locations?.length) await addLocations(data.locations);
  });
}

export function addLocations(locations: Location.LocationObject[]): Promise<void> {
  return serial(async () => {
    await ensureLoaded();
    if (!active) return;

    let changed = false;
    for (const loc of locations) {
      const { latitude, longitude, accuracy, altitude } = loc.coords;
      if (accuracy == null || accuracy > MAX_ACCURACY_M) continue;
      if (loc.timestamp < active.startedAt) continue;

      const last = active.points[active.points.length - 1];
      if (last && loc.timestamp <= last.timestamp) continue;

      const point: Point = { latitude, longitude, accuracy, altitude, timestamp: loc.timestamp };
      if (last) active.distanceM += haversine(last, point);
      active.points.push(point);
      changed = true;
    }
    if (changed) await persist();
  });
}

/** Herstart de voorgrondmeting als de app opnieuw opent tijdens een run (Expo Go). */
export async function resumeTrackingIfNeeded(): Promise<void> {
  if (!FOREGROUND_ONLY || foregroundWatch) return;
  if (!(await getActiveRun())) return;
  foregroundWatch = await Location.watchPositionAsync(TRACKING_OPTIONS, (loc) => {
    addLocations([loc]);
  });
}

async function stopTracking(): Promise<void> {
  foregroundWatch?.remove();
  foregroundWatch = null;
  if (FOREGROUND_ONLY) return;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

// ---------------------------------------------------------------------------
// Start / stop
// ---------------------------------------------------------------------------

export type StartResult = { ok: true } | { ok: false; reason: string };

export async function startRun(): Promise<StartResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { ok: false, reason: 'Zonder locatie kunnen we je rondje niet meten. Zet het aan in Instellingen.' };
  }
  if (!FOREGROUND_ONLY) {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      return {
        ok: false,
        reason: 'Kies "Altijd" bij locatietoegang, dan loopt de meting door als je scherm uit staat.',
      };
    }
  }

  await serial(async () => {
    await ensureLoaded();
    active = { startedAt: Date.now(), distanceM: 0, points: [] };
    await persist();
  });

  await stopTracking();
  if (FOREGROUND_ONLY) {
    foregroundWatch = await Location.watchPositionAsync(TRACKING_OPTIONS, (loc) => {
      addLocations([loc]);
    });
    return { ok: true };
  }
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    ...TRACKING_OPTIONS,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return { ok: true };
}

/** Stopt de meting en slaat de run op. Geeft de opgeslagen run terug (of null). */
export async function stopRun(): Promise<Run | null> {
  await stopTracking();

  return serial(async () => {
    await ensureLoaded();
    if (!active) return null;
    const endedAt = Date.now();
    const run: Run = {
      id: `${active.startedAt}`,
      startedAt: active.startedAt,
      endedAt,
      durationSec: Math.round((endedAt - active.startedAt) / 1000),
      distanceM: active.distanceM,
      points: active.points,
      source: 'own_gps',
    };
    active = null;
    await persist();
    // Een run zonder beweging bewaren we niet.
    if (run.distanceM < 10) return null;
    await saveRun(run);
    return run;
  });
}
