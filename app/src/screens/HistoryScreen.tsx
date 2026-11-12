import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '../components/Brand';
import { formatDate, formatDuration, formatKm, formatPace } from '../lib/format';
import { deleteRun, loadRuns, type Run } from '../lib/storage';
import { RunDetailScreen } from './RunDetailScreen';
import { colors, fonts } from '../theme';

type Props = {
  visible: boolean;
  refreshKey: number;
  openRunId: string | null;
  onOpenRun: (id: string | null) => void;
};

export function HistoryScreen({ visible, refreshKey, openRunId, onOpenRun }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRuns(await loadRuns());
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, refreshKey, reload]);

  const totalM = runs.reduce((sum, r) => sum + r.distanceM, 0);
  const openRun = openRunId ? runs.find((r) => r.id === openRunId) : undefined;

  function confirmDelete(run: Run) {
    Alert.alert('Run verwijderen?', formatDate(run.startedAt), [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(run.id);
          reload();
        },
      },
    ]);
  }

  if (openRun) {
    return (
      <RunDetailScreen
        run={openRun}
        onBack={() => onOpenRun(null)}
        onDeleted={() => {
          onOpenRun(null);
          reload();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={runs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await reload();
          setRefreshing(false);
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Brand subtitle="Geschiedenis" />
            {runs.length > 0 ? (
              <View style={styles.total}>
                <Text style={styles.totalValue}>{formatKm(totalM)} km</Text>
                <Text style={styles.totalLabel}>
                  in {runs.length} {runs.length === 1 ? 'rondje' : 'rondjes'}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nog geen rondjes.</Text>
            <Text style={styles.emptyText}>Je eerste telt ook. Druk op Start bij Run.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenRun(item.id)}
            onLongPress={() => confirmDelete(item)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
            <View style={styles.cardRow}>
              <Cell value={formatKm(item.distanceM)} unit="km" />
              <Cell value={formatDuration(item.durationSec)} unit="tijd" />
              <Cell value={formatPace(item.distanceM, item.durationSec)} unit="/km" />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function Cell({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  header: { marginBottom: 20 },
  total: {
    marginTop: 20,
    backgroundColor: colors.nachtblauw,
    borderRadius: 16,
    padding: 18,
  },
  totalValue: { fontFamily: fonts.kop, fontSize: 32, color: colors.limoen },
  totalLabel: { fontFamily: fonts.tekst, fontSize: 14, color: colors.ochtendmist, marginTop: 2 },
  empty: { paddingTop: 48, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.kop, fontSize: 22, color: colors.nachtblauw },
  emptyText: {
    fontFamily: fonts.tekst,
    fontSize: 15,
    color: colors.nachtblauw,
    opacity: 0.6,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.ochtendmist,
  },
  cardPressed: { backgroundColor: colors.ochtendmist },
  date: { fontFamily: fonts.tekstMedium, fontSize: 13, color: colors.nachtblauw, opacity: 0.6 },
  cardRow: { flexDirection: 'row', marginTop: 8 },
  cell: { flex: 1 },
  cellValue: {
    fontFamily: fonts.kop,
    fontSize: 22,
    color: colors.nachtblauw,
    fontVariant: ['tabular-nums'],
  },
  cellUnit: { fontFamily: fonts.tekst, fontSize: 12, color: colors.nachtblauw, opacity: 0.6 },
});
