import { StyleSheet, Text, View } from 'react-native';

import { formatPace } from '../lib/format';
import type { Split } from '../lib/run';
import { colors, fonts } from '../theme';

/** Tijd per kilometer met een balk: hoe langer de balk, hoe sneller die km. */
export function SplitList({ splits }: { splits: Split[] }) {
  if (splits.length === 0) return null;

  const paces = splits.map((s) => s.durationSec / (s.distanceM / 1000));
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);

  return (
    <View style={styles.list}>
      {splits.map((split, i) => {
        const pace = paces[i];
        // Snelste km = volle balk, langzaamste = 40%.
        const ratio = slowest === fastest ? 1 : 0.4 + (0.6 * (slowest - pace)) / (slowest - fastest);
        const isFastest = splits.length > 1 && pace === fastest && split.distanceM >= 1000;
        const partial = split.distanceM < 1000;
        return (
          <View key={split.km} style={styles.row}>
            <Text style={styles.km}>
              {partial ? `${(split.distanceM / 1000).toFixed(2).replace('.', ',')}` : split.km}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.round(ratio * 100)}%` },
                  isFastest && styles.barFastest,
                ]}
              />
            </View>
            <Text style={styles.pace}>{formatPace(split.distanceM, split.durationSec)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  km: {
    width: 40,
    fontFamily: fonts.kop,
    fontSize: 15,
    color: colors.nachtblauw,
    fontVariant: ['tabular-nums'],
  },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.ochtendmist },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.nachtblauw },
  barFastest: { backgroundColor: colors.sprintoranje },
  pace: {
    width: 52,
    textAlign: 'right',
    fontFamily: fonts.kop,
    fontSize: 15,
    color: colors.nachtblauw,
    fontVariant: ['tabular-nums'],
  },
});
