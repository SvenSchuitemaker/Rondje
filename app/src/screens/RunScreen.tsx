import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { RunSummary } from '../components/RunSummary';
import { Stat } from '../components/Stat';
import { formatDuration, formatKm, formatPace } from '../lib/format';
import { computeSplits } from '../lib/run';
import type { Run } from '../lib/storage';
import { colors, fonts } from '../theme';
import {
  elapsedSeconds,
  getActiveRun,
  isForegroundTracking,
  pauseRun,
  resumeRun,
  resumeTrackingIfNeeded,
  startRun,
  stopRun,
  subscribe,
  type ActiveRun,
} from '../tracking/runTracker';

type Props = { onSaved: () => void; onOpenRun: (id: string) => void };

export function RunScreen({ onSaved, onOpenRun }: Props) {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [foreground, setForeground] = useState(false);
  const [summary, setSummary] = useState<Run | null>(null);

  // Lopende run ophalen (ook na herstart van de app) en live bijwerken.
  useEffect(() => {
    getActiveRun().then((r) => setRun(r ? { ...r } : null));
    resumeTrackingIfNeeded()
      .then(() => setForeground(isForegroundTracking()))
      .catch(console.warn);
    return subscribe((r) => setRun(r ? { ...r } : null));
  }, []);

  const paused = run?.pausedAt != null;

  // Klok laten tikken zolang er een run loopt (niet tijdens pauze).
  useEffect(() => {
    if (!run || paused) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [run?.startedAt, paused]);

  // In Expo Go meten we alleen met de app open: scherm aan houden.
  useEffect(() => {
    if (!run || !foreground) return;
    activateKeepAwakeAsync('rondje-run');
    return () => {
      deactivateKeepAwake('rondje-run');
    };
  }, [run?.startedAt, foreground]);

  const pointCount = run?.points.length ?? 0;
  const splits = useMemo(
    () => (run ? computeSplits(run.points, run.startedAt, run.pauses) : []),
    // Alleen opnieuw rekenen als er punten bijkomen of de pauzes veranderen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pointCount, run?.startedAt, run?.pauses.length],
  );

  if (summary) {
    return (
      <RunSummary
        run={summary}
        onClose={() => setSummary(null)}
        onOpen={() => {
          setSummary(null);
          onOpenRun(summary.id);
        }}
      />
    );
  }

  const running = run !== null;
  const elapsedSec = run ? elapsedSeconds(run, paused ? run.pausedAt! : now) : 0;
  const distanceM = run?.distanceM ?? 0;
  const hasFix = pointCount > 0;
  const recentSplits = splits.slice(-3);

  let subtitle = 'Elk rondje telt.';
  if (running) subtitle = paused ? 'Gepauzeerd. Adem even uit.' : hasFix ? 'Je bent onderweg.' : 'GPS zoeken…';

  async function handleStart() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await startRun();
      if (!result.ok) setMessage(result.reason);
      else setForeground(result.foreground);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setMessage(`Starten lukte niet. Probeer het nog eens.\n(${detail})`);
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const saved = await stopRun();
      if (saved) {
        setMessage(null);
        setSummary(saved);
        onSaved();
      } else {
        setMessage('Te kort om op te slaan. Volgende keer verder.');
      }
    } finally {
      setBusy(false);
    }
  }

  function handleStop() {
    Alert.alert('Rondje stoppen?', 'Je run wordt opgeslagen.', [
      { text: 'Doorlopen', style: 'cancel' },
      { text: 'Stoppen', style: 'destructive', onPress: finish },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Brand subtitle={subtitle} />

      <View style={styles.stats}>
        <Stat label="Afstand" value={formatKm(distanceM)} unit="km" large />
        <View style={styles.row}>
          <View style={styles.cell}>
            <Stat label="Tijd" value={formatDuration(elapsedSec)} />
          </View>
          <View style={styles.cell}>
            <Stat label="Tempo" value={formatPace(distanceM, elapsedSec)} unit="/km" />
          </View>
        </View>

        {recentSplits.length > 0 ? (
          <View style={styles.splits}>
            {recentSplits.map((s) => (
              <View key={s.km} style={styles.chip}>
                <Text style={styles.chipKm}>km {s.km}</Text>
                <Text style={styles.chipPace}>{formatPace(s.distanceM, s.durationSec)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {foreground && running ? (
        <Text style={styles.hint}>Testmodus: houd de app open tijdens je run.</Text>
      ) : null}

      {!running ? (
        <Button label="Start" onPress={handleStart} busy={busy} />
      ) : (
        <View style={styles.buttons}>
          <Button
            label={paused ? 'Hervat' : 'Pauze'}
            variant={paused ? 'primary' : 'light'}
            onPress={() => (paused ? resumeRun() : pauseRun())}
            style={styles.flex}
          />
          <Button label="Stop" variant="dark" onPress={handleStop} busy={busy} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  stats: { flex: 1, justifyContent: 'center', gap: 32 },
  row: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
  flex: { flex: 1 },
  splits: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: colors.ochtendmist,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipKm: { fontFamily: fonts.tekstMedium, fontSize: 12, color: colors.nachtblauw, opacity: 0.6 },
  chipPace: {
    fontFamily: fonts.kop,
    fontSize: 18,
    color: colors.nachtblauw,
    fontVariant: ['tabular-nums'],
  },
  buttons: { flexDirection: 'row', gap: 12 },
  message: {
    fontFamily: fonts.tekst,
    fontSize: 15,
    color: colors.nachtblauw,
    backgroundColor: colors.ochtendmist,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  hint: {
    fontFamily: fonts.tekst,
    fontSize: 13,
    color: colors.nachtblauw,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
});
