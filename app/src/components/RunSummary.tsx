import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatKm, formatPace } from '../lib/format';
import { cheer, computeSplits } from '../lib/run';
import type { Run } from '../lib/storage';
import { colors, fonts } from '../theme';
import { Button } from './Button';
import { SplitList } from './SplitList';

type Props = { run: Run; onClose: () => void; onOpen: () => void };

/** Samenvatting direct na het stoppen. */
export function RunSummary({ run, onClose, onOpen }: Props) {
  const splits = computeSplits(run.points, run.startedAt, run.pauses, run.durationSec);
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.cheer}>{cheer(run.distanceM)}</Text>
        <Text style={styles.headline}>
          {formatKm(run.distanceM)} km in {formatDuration(run.durationSec)}
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Fact label="Afstand" value={formatKm(run.distanceM)} unit="km" />
            <Fact label="Tijd" value={formatDuration(run.durationSec)} />
            <Fact label="Tempo" value={formatPace(run.distanceM, run.durationSec)} unit="/km" />
          </View>
        </View>

        {splits.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Per km</Text>
            <SplitList splits={splits} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Bekijk route" variant="primary" onPress={onOpen} style={styles.action} small />
        <Button label="Klaar" variant="dark" onPress={onClose} style={styles.action} small />
      </View>
    </View>
  );
}

function Fact({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>
        {value}
        {unit ? <Text style={styles.factUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  cheer: { fontFamily: fonts.tekstMedium, fontSize: 16, color: colors.nachtblauw, opacity: 0.7 },
  headline: { fontFamily: fonts.kop, fontSize: 34, color: colors.nachtblauw, marginTop: 4 },
  card: { marginTop: 24, backgroundColor: colors.nachtblauw, borderRadius: 16, padding: 18 },
  row: { flexDirection: 'row' },
  fact: { flex: 1 },
  factLabel: {
    fontFamily: fonts.tekstMedium,
    fontSize: 12,
    color: colors.ochtendmist,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  factValue: { fontFamily: fonts.kop, fontSize: 22, color: colors.limoen, marginTop: 4 },
  factUnit: { fontFamily: fonts.tekst, fontSize: 13, color: colors.ochtendmist },
  section: { marginTop: 28 },
  sectionTitle: { fontFamily: fonts.kop, fontSize: 18, color: colors.nachtblauw, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 24 },
  action: { flex: 1 },
});
