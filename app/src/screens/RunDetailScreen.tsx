import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { RouteMap } from '../components/RouteMap';
import { SplitList } from '../components/SplitList';
import { formatDate, formatDuration, formatKm, formatPace } from '../lib/format';
import { computeSplits } from '../lib/run';
import { deleteRun, type Run } from '../lib/storage';
import { colors, fonts } from '../theme';

type Props = { run: Run; onBack: () => void; onDeleted: () => void };

export function RunDetailScreen({ run, onBack, onDeleted }: Props) {
  const splits = computeSplits(run.points, run.startedAt, run.pauses, run.durationSec);

  function confirmDelete() {
    Alert.alert('Run verwijderen?', 'Dit kun je niet ongedaan maken.', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(run.id);
          onDeleted();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backText}>‹ Geschiedenis</Text>
      </Pressable>

      <Text style={styles.date}>{formatDate(run.startedAt)}</Text>
      <Text style={styles.title}>{formatKm(run.distanceM)} km</Text>

      <View style={styles.facts}>
        <Fact label="Tijd" value={formatDuration(run.durationSec)} />
        <Fact label="Tempo" value={`${formatPace(run.distanceM, run.durationSec)} /km`} />
      </View>

      <RouteMap points={run.points} />

      {splits.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Per km</Text>
          <SplitList splits={splits} />
        </View>
      ) : null}

      <Button label="Run verwijderen" variant="light" onPress={confirmDelete} small style={styles.delete} />
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontFamily: fonts.tekstVet, fontSize: 16, color: colors.nachtblauw },
  date: { fontFamily: fonts.tekstMedium, fontSize: 14, color: colors.nachtblauw, opacity: 0.6, marginTop: 8 },
  title: { fontFamily: fonts.kop, fontSize: 48, color: colors.nachtblauw },
  facts: { flexDirection: 'row', marginTop: 8, marginBottom: 20 },
  fact: { flex: 1 },
  factLabel: {
    fontFamily: fonts.tekstMedium,
    fontSize: 12,
    color: colors.nachtblauw,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  factValue: {
    fontFamily: fonts.kop,
    fontSize: 24,
    color: colors.nachtblauw,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  section: { marginTop: 28 },
  sectionTitle: { fontFamily: fonts.kop, fontSize: 18, color: colors.nachtblauw, marginBottom: 12 },
  delete: { marginTop: 36 },
});
