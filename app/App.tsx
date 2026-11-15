import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TabBar, type TabKey } from './src/components/TabBar';
import { useSession } from './src/lib/auth';
import { syncNow } from './src/lib/sync';
import { AccountScreen, type SyncStatus } from './src/screens/AccountScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RunScreen } from './src/screens/RunScreen';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [tab, setTab] = useState<TabKey>('run');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ state: 'idle' });
  const session = useSession();
  const userId = session?.user.id;

  const runSync = useCallback(async () => {
    if (!userId) return;
    setSync({ state: 'busy' });
    try {
      const result = await syncNow();
      if (result.downloaded || result.deleted) setHistoryVersion((v) => v + 1);
      setSync({ state: 'idle', at: Date.now() });
    } catch (e) {
      const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      setSync({ state: 'error', message });
    }
  }, [userId]);

  // Synchroniseren na inloggen en telkens als de app weer op de voorgrond komt.
  useEffect(() => {
    if (!userId) return;
    runSync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runSync();
    });
    return () => sub.remove();
  }, [userId, runSync]);

  if (!fontsLoaded) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <SafeAreaView style={styles.content} edges={['top']}>
          {/* Alle schermen blijven gemount, zodat een lopende run niet herstart. */}
          <View style={[styles.content, tab !== 'run' && styles.hidden]}>
            <RunScreen
              onSaved={() => {
                setHistoryVersion((v) => v + 1);
                runSync();
              }}
              onOpenRun={(id) => {
                setOpenRunId(id);
                setTab('geschiedenis');
              }}
            />
          </View>
          <View style={[styles.content, tab !== 'geschiedenis' && styles.hidden]}>
            <HistoryScreen
              visible={tab === 'geschiedenis'}
              refreshKey={historyVersion}
              openRunId={openRunId}
              onOpenRun={setOpenRunId}
              onChanged={runSync}
            />
          </View>
          <View style={[styles.content, tab !== 'account' && styles.hidden]}>
            <AccountScreen session={session} sync={sync} onSync={runSync} />
          </View>
        </SafeAreaView>
        <TabBar
          active={tab}
          onChange={(key) => {
            // Nogmaals op Geschiedenis tikken brengt je terug naar de lijst.
            if (key === 'geschiedenis' && tab === 'geschiedenis') setOpenRunId(null);
            setTab(key);
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.papier },
  content: { flex: 1 },
  hidden: { display: 'none' },
});
