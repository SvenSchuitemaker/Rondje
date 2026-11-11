import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export function Brand({ subtitle = 'Elk rondje telt.' }: { subtitle?: string }) {
  return (
    <View>
      <Text style={styles.name}>rondje</Text>
      <Text style={styles.slogan}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.kop, fontSize: 32, color: colors.nachtblauw, letterSpacing: -0.5 },
  slogan: { fontFamily: fonts.tekst, fontSize: 15, color: colors.nachtblauw, opacity: 0.6, marginTop: 2 },
});
