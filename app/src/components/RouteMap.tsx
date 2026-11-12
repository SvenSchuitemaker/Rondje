import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { Point } from '../lib/geo';
import { colors, fonts } from '../theme';

/** Route op de kaart; na een pauze begint een nieuw stuk lijn. */
export function RouteMap({ points }: { points: Point[] }) {
  const segments = useMemo(() => {
    const out: { latitude: number; longitude: number }[][] = [];
    let current: { latitude: number; longitude: number }[] = [];
    let seg: number | undefined;
    for (const p of points) {
      if (seg !== undefined && (p.segment ?? 0) !== seg) {
        if (current.length > 1) out.push(current);
        current = [];
      }
      seg = p.segment ?? 0;
      current.push({ latitude: p.latitude, longitude: p.longitude });
    }
    if (current.length > 1) out.push(current);
    return out;
  }, [points]);

  const region = useMemo(() => {
    if (points.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const p of points) {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLon = Math.min(minLon, p.longitude);
      maxLon = Math.max(maxLon, p.longitude);
    }
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.004),
      longitudeDelta: Math.max((maxLon - minLon) * 1.4, 0.004),
    };
  }, [points]);

  if (!region || segments.length === 0) {
    return (
      <View style={[styles.map, styles.empty]}>
        <Text style={styles.emptyText}>Geen route opgeslagen.</Text>
      </View>
    );
  }

  const start = points[0];
  const end = points[points.length - 1];

  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      showsPointsOfInterests={false}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
    >
      {segments.map((coords, i) => (
        <Polyline
          key={i}
          coordinates={coords}
          strokeColor={colors.sprintoranje}
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }} title="Start">
        <View style={[styles.dot, styles.dotStart]} />
      </Marker>
      <Marker coordinate={end} anchor={{ x: 0.5, y: 0.5 }} title="Finish">
        <View style={[styles.dot, styles.dotEnd]} />
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 16, overflow: 'hidden' },
  empty: { backgroundColor: colors.ochtendmist, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.tekst, fontSize: 15, color: colors.nachtblauw, opacity: 0.6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF' },
  dotStart: { backgroundColor: colors.limoen },
  dotEnd: { backgroundColor: colors.nachtblauw },
});
