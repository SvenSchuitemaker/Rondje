import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../theme';

export type TabKey = 'run' | 'geschiedenis';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'run', label: 'Run' },
  { key: 'geschiedenis', label: 'Geschiedenis' },
];

type Props = { active: TabKey; onChange: (key: TabKey) => void };

export function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <View style={[styles.dot, selected && styles.dotActive]} />
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.nachtblauw,
    paddingTop: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.limoen },
  label: { fontFamily: fonts.tekstMedium, fontSize: 14, color: colors.ochtendmist, opacity: 0.6 },
  labelActive: { color: colors.papier, opacity: 1, fontFamily: fonts.tekstVet },
});
