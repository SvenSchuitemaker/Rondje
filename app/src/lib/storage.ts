import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Point } from './geo';
import type { Pause } from './run';

export type Run = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  distanceM: number;
  points: Point[];
  pauses?: Pause[];
  source: 'own_gps';
};

const RUNS_KEY = 'rondje:runs';

export async function loadRuns(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) return [];
  try {
    const runs = JSON.parse(raw) as Run[];
    return runs.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function saveRun(run: Run): Promise<void> {
  const runs = await loadRuns();
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify([run, ...runs]));
}

export async function deleteRun(id: string): Promise<void> {
  const runs = await loadRuns();
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(runs.filter((r) => r.id !== id)));
}

export async function getRun(id: string): Promise<Run | null> {
  const runs = await loadRuns();
  return runs.find((r) => r.id === id) ?? null;
}
