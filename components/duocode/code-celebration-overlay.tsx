import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';

type CodeCelebrationOverlayProps = {
  visible: boolean;
  title: string;
  score: number;
  xpReward: number;
  onDismiss: () => void;
};

const LINES = [
  'const result = await runAllTests();',
  "if (result.status === 'PASS') unlockNextNode();",
  "console.log('good job, developer');",
];

export function CodeCelebrationOverlay({
  visible,
  title,
  score,
  xpReward,
  onDismiss,
}: CodeCelebrationOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0.35)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.34,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 92,
          useNativeDriver: true,
        }),
      ]).start();

      glowLoop.start();
      scanLoop.start();

      hideTimer = setTimeout(() => {
        onDismiss();
      }, 2400);
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
      scan.setValue(0);
    }

    return () => {
      glowLoop.stop();
      scanLoop.stop();
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [glow, onDismiss, opacity, scale, scan, visible]);

  if (!visible) {
    return null;
  }

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <Animated.View style={[styles.panelWrap, { opacity, transform: [{ scale }] }]}>
        <Animated.View style={[styles.halo, { opacity: haloOpacity }]} />
        <View style={styles.panel}>
          <View style={styles.windowBar}>
            <View style={[styles.dot, { backgroundColor: DuocodePalette.red }]} />
            <View style={[styles.dot, { backgroundColor: DuocodePalette.amber }]} />
            <View style={[styles.dot, { backgroundColor: DuocodePalette.green }]} />
          </View>

          <View style={styles.titleRow}>
            <View>
              <Text style={styles.kicker}>build.success()</Text>
              <Text style={styles.title}>GOOD JOB</Text>
              <Text style={styles.subtitle}>{title}</Text>
            </View>

            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>{`${score}% PASS`}</Text>
            </View>
          </View>

          <View style={styles.terminalBox}>
            <Animated.View
              style={[
                styles.terminalScan,
                {
                  transform: [{ translateY: scanTranslateY }],
                },
              ]}
            />

            {LINES.map((line) => (
              <Text key={line} style={styles.terminalLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>xp_unlocked</Text>
              <Text style={styles.metricValue}>{`+${xpReward}`}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>next_state</Text>
              <Text style={styles.metricValue}>node.glow = true</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(1, 7, 16, 0.82)',
  },
  panelWrap: {
    width: '100%',
    maxWidth: 540,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: '92%',
    height: '86%',
    borderRadius: 36,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
  },
  panel: {
    width: '100%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    backgroundColor: DuocodePalette.surfacePanel,
    padding: 22,
    gap: 18,
    overflow: 'hidden',
  },
  windowBar: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  kicker: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  title: {
    color: DuocodePalette.surface,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    marginTop: 4,
  },
  subtitle: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontFamily: Fonts.mono,
  },
  scorePill: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.terminalGreen,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scorePillText: {
    color: DuocodePalette.terminalGreen,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  terminalBox: {
    position: 'relative',
    backgroundColor: DuocodePalette.navy,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  terminalScan: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
  },
  terminalLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  metricValue: {
    color: DuocodePalette.surface,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
