import { StyleSheet, Text, View } from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';

type BrandMarkProps = {
  label?: string;
  size?: number;
};

export function BrandMark({ label = '</>', size = 64 }: BrandMarkProps) {
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
      ]}>
      <View style={styles.glow} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    backgroundColor: DuocodePalette.accentSoft,
    transform: [{ rotate: '18deg' }],
  },
  label: {
    color: DuocodePalette.code,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
