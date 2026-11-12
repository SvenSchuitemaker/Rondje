import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts } from '../theme';

type Variant = 'primary' | 'dark' | 'light';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  busy?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

const BG: Record<Variant, string> = {
  primary: colors.sprintoranje,
  dark: colors.nachtblauw,
  light: colors.ochtendmist,
};
const FG: Record<Variant, string> = {
  primary: colors.nachtblauw,
  dark: colors.papier,
  light: colors.nachtblauw,
};

export function Button({ label, onPress, variant = 'primary', busy, style, small }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: BG[variant] },
        (pressed || busy) && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={[styles.text, small && styles.textSmall, { color: FG[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  small: { height: 52, borderRadius: 26, paddingHorizontal: 20 },
  pressed: { opacity: 0.8 },
  text: { fontFamily: fonts.kop, fontSize: 24, letterSpacing: 0.5 },
  textSmall: { fontSize: 17 },
});
