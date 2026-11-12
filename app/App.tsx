import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TabBar, type TabKey } from './src/components/TabBar';
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

  if (!fontsLoaded) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <SafeAreaView style={styles.content} edges={['top']}>
          {/* Beide schermen blijven gemount, zodat een lopende run niet herstart. */}
          <View style={[styles.content, tab !== 'run' && styles.hidden]}>
            <RunScreen
              onSaved={() => setHistoryVersion((v) => v + 1)}
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
            />
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
