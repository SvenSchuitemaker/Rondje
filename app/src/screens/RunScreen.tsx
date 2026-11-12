import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '../components/Brand';
import { Stat } from '../components/Stat';
import { formatDuration, formatKm, formatPace } from '../lib/format';
import { colors, fonts } from '../theme';
import { getActiveRun, startRun, stopRun, subscribe, type ActiveRun } from '../tracking/runTracker';

type Props = { onSaved: () => void };

export function RunScreen({ onSaved }: Props) {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Lopende run ophalen (ook na herstart van de app) en live bijwerken.
  useEffect(() => {
    getActiveRun().then((r) => setRun(r ? { ...r } : null));
    return subscribe((r) => setRun(r ? { ...r } : null));
  }, []);

  // Klok laten tikken zolang er een run loopt.
  useEffect(() => {
    if (!run) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [run?.startedAt]);

  const running = run !== null;
  const elapsedSec = run ? (now - run.startedAt) / 1000 : 0;
  const distanceM = run?.distanceM ?? 0;
  const hasFix = (run?.points.length ?? 0) > 0;

  async function handleStart() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await startRun();
      if (!result.ok) setMessage(result.reason);
    } catch (e) {
      setMessage('Starten lukte niet. Probeer het nog eens.');
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
        setMessage(`Lekker gelopen. ${formatKm(saved.distanceM)} km staat erin.`);
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
      <Brand subtitle={running ? (hasFix ? 'Je bent onderweg.' : 'GPS zoeken…') : 'Elk rondje telt.'} />

      <View style={styles.stats}>
        <Stat label="Afstand" value={formatKm(distanceM)} unit="km" large />
        <View style={styles.row}>
          <Stat label="Tijd" value={formatDuration(elapsedSec)} />
          <Stat label="Tempo" value={formatPace(distanceM, elapsedSec)} unit="/km" />
        </View>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        onPress={running ? handleStop : handleStart}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          running && styles.buttonStop,
          (pressed || busy) && styles.buttonPressed,
        ]}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={running ? colors.papier : colors.nachtblauw} />
        ) : (
          <Text style={[styles.buttonText, running && styles.buttonTextStop]}>
            {running ? 'Stop' : 'Start'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  stats: { flex: 1, justifyContent: 'center', gap: 32 },
  row: { flexDirection: 'row', gap: 16 },
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
  button: {
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sprintoranje,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStop: { backgroundColor: colors.nachtblauw },
  buttonPressed: { opacity: 0.8 },
  buttonText: { fontFamily: fonts.kop, fontSize: 24, color: colors.nachtblauw, letterSpacing: 0.5 },
  buttonTextStop: { color: colors.papier },
});
