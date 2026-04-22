import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';

type NeonLessonNodeProps = {
  glyph: string;
  label: string;
  meta: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  showStartTag?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function NeonLessonNode({
  glyph,
  label,
  meta,
  isCurrent,
  isCompleted,
  isLocked,
  showStartTag = false,
  onPress,
  style,
}: NeonLessonNodeProps) {
  const pulse = useRef(new Animated.Value(isCurrent ? 0.75 : isCompleted ? 0.45 : 0.18)).current;
  const float = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: isCurrent ? 1 : isCompleted ? 0.6 : 0.22,
          duration: isCurrent ? 1100 : 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: isCurrent ? 0.72 : isCompleted ? 0.38 : 0.16,
          duration: isCurrent ? 1100 : 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -5,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 4,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    if (!isLocked) {
      pulseLoop.start();
      floatLoop.start();
      scanLoop.start();
    }

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      scanLoop.stop();
      pulse.stopAnimation();
      float.stopAnimation();
      scan.stopAnimation();
      scan.setValue(0);
    };
  }, [float, isCompleted, isCurrent, isLocked, pulse, scan]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.28],
  });

  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, isCurrent ? 0.5 : 0.28],
  });

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-34, 34],
  });

  return (
    <View style={[styles.wrap, style]}>
      <Pressable style={styles.button} onPress={onPress}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            isCurrent ? styles.haloCurrent : isCompleted ? styles.haloCompleted : styles.haloIdle,
            isLocked && styles.haloLocked,
            {
              opacity: isLocked ? 0.08 : haloOpacity,
              transform: [{ scale: isLocked ? 1 : haloScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.nodeBase,
            isCompleted && styles.nodeBaseCompleted,
            isCurrent && styles.nodeBaseCurrent,
            isLocked && styles.nodeBaseLocked,
            { transform: [{ translateY: isLocked ? 0 : float }] },
          ]}>
          <View
            style={[
              styles.nodeInner,
              isCompleted && styles.nodeInnerCompleted,
              isCurrent && styles.nodeInnerCurrent,
              isLocked && styles.nodeInnerLocked,
            ]}>
            {!isLocked ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.scanline,
                  {
                    transform: [{ translateY: scanTranslateY }],
                  },
                ]}
              />
            ) : null}

            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />

            <Text
              style={[
                styles.glyph,
                isCompleted && styles.glyphCompleted,
                isCurrent && styles.glyphCurrent,
                isLocked && styles.glyphLocked,
              ]}>
              {glyph}
            </Text>
          </View>

          {showStartTag ? (
            <View style={styles.startTag}>
              <Text style={styles.startTagText}>RUN</Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>

      <Text style={styles.label}>{label}</Text>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
    width: 208,
  },
  button: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  haloCurrent: {
    backgroundColor: DuocodePalette.accentGlow,
  },
  haloCompleted: {
    backgroundColor: 'rgba(52, 211, 153, 0.22)',
  },
  haloIdle: {
    backgroundColor: 'rgba(125, 211, 252, 0.14)',
  },
  haloLocked: {
    backgroundColor: 'rgba(143, 163, 199, 0.08)',
  },
  nodeBase: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#173150',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOpacity: 0.36,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  nodeBaseCompleted: {
    backgroundColor: '#12382A',
  },
  nodeBaseCurrent: {
    backgroundColor: '#13314D',
  },
  nodeBaseLocked: {
    backgroundColor: '#1F2D3B',
    shadowOpacity: 0.12,
  },
  nodeInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 2,
    borderColor: DuocodePalette.accent,
    overflow: 'hidden',
  },
  nodeInnerCompleted: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderColor: DuocodePalette.terminalGreen,
  },
  nodeInnerCurrent: {
    backgroundColor: DuocodePalette.terminalBlueSoft,
    borderColor: DuocodePalette.code,
  },
  nodeInnerLocked: {
    backgroundColor: '#2A3847',
    borderColor: '#43576E',
  },
  scanline: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(134, 239, 172, 0.12)',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: 'rgba(231, 240, 255, 0.34)',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: 'rgba(231, 240, 255, 0.34)',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 9,
    left: 9,
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(231, 240, 255, 0.34)',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(231, 240, 255, 0.34)',
  },
  glyph: {
    color: DuocodePalette.accent,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  glyphCompleted: {
    color: DuocodePalette.terminalGreen,
  },
  glyphCurrent: {
    color: DuocodePalette.code,
  },
  glyphLocked: {
    color: '#7A8EA5',
  },
  startTag: {
    position: 'absolute',
    top: -10,
    backgroundColor: DuocodePalette.navy,
    borderWidth: 1,
    borderColor: DuocodePalette.code,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  startTagText: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  label: {
    color: DuocodePalette.surface,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Fonts.mono,
  },
  meta: {
    color: DuocodePalette.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: Fonts.mono,
  },
});
