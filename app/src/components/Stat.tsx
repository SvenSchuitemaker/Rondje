import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

type Props = { label: string; value: string; unit?: string; large?: boolean };

export function Stat({ label, value, unit, large }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, large && styles.valueLarge]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontFamily: fonts.tekstMedium,
    fontSize: 13,
    color: colors.nachtblauw,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: {
    fontFamily: fonts.kop,
    fontSize: 40,
    color: colors.nachtblauw,
    fontVariant: ['tabular-nums'],
  },
  valueLarge: { fontSize: 96, lineHeight: 104 },
  unit: { fontFamily: fonts.tekstMedium, fontSize: 16, color: colors.nachtblauw, opacity: 0.6 },
});
