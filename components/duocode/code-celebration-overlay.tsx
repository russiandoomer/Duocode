import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';

type CodeCelebrationOverlayProps = {
  visible: boolean;
  title: string;
  headline?: string;
  score: number;
  xpReward: number;
  onDismiss: () => void;
  variant?: 'pass' | 'fail';
  answerLabel?: string;
  answerValue?: string | null;
  explanation?: string | null;
  actionLabel?: string | null;
  onAction?: (() => void) | null;
  disableBackdropDismiss?: boolean;
};

const CONFETTI_PIECES = [
  { left: '8%', size: 9, rotate: '-22deg', delay: 0, color: '#34D399' },
  { left: '18%', size: 7, rotate: '18deg', delay: 40, color: '#38BDF8' },
  { left: '28%', size: 10, rotate: '-14deg', delay: 80, color: '#FACC15' },
  { left: '38%', size: 8, rotate: '26deg', delay: 120, color: '#FB7185' },
  { left: '48%', size: 9, rotate: '-20deg', delay: 160, color: '#A78BFA' },
  { left: '58%', size: 7, rotate: '14deg', delay: 200, color: '#22C55E' },
  { left: '68%', size: 10, rotate: '-28deg', delay: 240, color: '#F97316' },
  { left: '78%', size: 8, rotate: '24deg', delay: 280, color: '#2DD4BF' },
  { left: '88%', size: 9, rotate: '-16deg', delay: 320, color: '#60A5FA' },
] as const;

const CODE_BACKDROP_LINES = ['82%', '64%', '74%', '58%', '88%', '68%', '77%', '61%'] as const;

const VARIANT_COPY = {
  pass: {
    headline: 'GOOD JOB',
    haloColor: 'rgba(52, 211, 153, 0.16)',
    scanColor: 'rgba(52, 211, 153, 0.12)',
    panelBackground: 'rgba(5, 22, 16, 0.96)',
    patternColor: 'rgba(74, 222, 128, 0.16)',
    pillBackground: DuocodePalette.terminalGreenSoft,
    pillBorder: DuocodePalette.terminalGreen,
    pillText: DuocodePalette.terminalGreen,
    scoreSuffix: 'PASS',
    autoHideMs: 2400,
  },
  fail: {
    headline: 'TRY AGAIN',
    haloColor: 'rgba(244, 63, 94, 0.16)',
    scanColor: 'rgba(244, 63, 94, 0.12)',
    panelBackground: 'rgba(33, 10, 18, 0.96)',
    patternColor: 'rgba(251, 113, 133, 0.16)',
    pillBackground: DuocodePalette.redSoft,
    pillBorder: DuocodePalette.red,
    pillText: DuocodePalette.red,
    scoreSuffix: 'BAD',
    autoHideMs: 2200,
  },
} as const;

export function CodeCelebrationOverlay({
  visible,
  title,
  headline,
  score,
  xpReward,
  onDismiss,
  variant = 'pass',
  answerLabel = 'respuesta correcta',
  answerValue = null,
  explanation = null,
  actionLabel = null,
  onAction = null,
  disableBackdropDismiss = false,
}: CodeCelebrationOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0.35)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const confettiDrop = useRef(new Animated.Value(0)).current;
  const variantCopy = VARIANT_COPY[variant];

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
      confettiDrop.setValue(0);
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

      if (variant === 'pass') {
        Animated.timing(confettiDrop, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }

      if (!actionLabel) {
        hideTimer = setTimeout(() => {
          onDismiss();
        }, variantCopy.autoHideMs);
      }
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
      scan.setValue(0);
      confettiDrop.setValue(0);
    }

    return () => {
      glowLoop.stop();
      scanLoop.stop();
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [actionLabel, confettiDrop, glow, onDismiss, opacity, scale, scan, variant, variantCopy.autoHideMs, visible]);

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (!disableBackdropDismiss && !actionLabel) {
          onDismiss();
        }
      }}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!disableBackdropDismiss && !actionLabel) {
              onDismiss();
            }
          }}
        />

        <Animated.View style={[styles.panelWrap, { opacity, transform: [{ scale }] }]}>
          {variant === 'pass' ? (
            <View pointerEvents="none" style={styles.confettiLayer}>
              {CONFETTI_PIECES.map((piece, index) => {
                const translateY = confettiDrop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-44 - piece.delay * 0.08, 150 + piece.delay * 0.08],
                });

                const opacityValue = confettiDrop.interpolate({
                  inputRange: [0, 0.12, 0.85, 1],
                  outputRange: [0, 1, 1, 0],
                });

                return (
                  <Animated.View
                    key={`${piece.left}-${index}`}
                    style={[
                      styles.confettiPiece,
                      {
                        left: piece.left,
                        width: piece.size,
                        height: piece.size * 1.6,
                        backgroundColor: piece.color,
                        opacity: opacityValue,
                        transform: [{ translateY }, { rotate: piece.rotate }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          ) : null}
          <Animated.View style={[styles.halo, { opacity: haloOpacity, backgroundColor: variantCopy.haloColor }]} />
          <View
            style={[
              styles.panel,
              {
                borderColor: variantCopy.pillBorder,
                backgroundColor: variantCopy.panelBackground,
              },
            ]}>
            <View pointerEvents="none" style={styles.codeBackdrop}>
              <Animated.View
                style={[
                  styles.codeBackdropScan,
                  {
                    backgroundColor: variantCopy.scanColor,
                    transform: [{ translateY: scanTranslateY }],
                  },
                ]}
              />
              {CODE_BACKDROP_LINES.map((width, index) => (
                <View
                  key={`${width}-${index}`}
                  style={[
                    styles.codeBackdropLine,
                    {
                      top: 26 + index * 28,
                      width,
                      backgroundColor: variantCopy.patternColor,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.windowBar}>
              <View style={[styles.dot, { backgroundColor: DuocodePalette.red }]} />
              <View style={[styles.dot, { backgroundColor: DuocodePalette.amber }]} />
              <View style={[styles.dot, { backgroundColor: DuocodePalette.green }]} />
            </View>

            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>{headline || variantCopy.headline}</Text>
                <Text style={styles.subtitle}>{title}</Text>
              </View>

              <View
                style={[
                  styles.scorePill,
                  {
                    backgroundColor: variantCopy.pillBackground,
                    borderColor: variantCopy.pillBorder,
                  },
                ]}>
                <Text style={[styles.scorePillText, { color: variantCopy.pillText }]}>{`${score}% ${variantCopy.scoreSuffix}`}</Text>
              </View>
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollInner}
              showsVerticalScrollIndicator={false}>
              <View style={styles.metricsRow}>
                <View
                  style={[
                    styles.metricCard,
                    {
                      borderColor: variantCopy.pillBorder,
                      backgroundColor: variantCopy.pillBackground,
                    },
                  ]}>
                  <Text style={[styles.metricLabel, { color: variantCopy.pillText }]}>experiencia</Text>
                  <Text style={[styles.metricValue, { color: variantCopy.pillText }]}>{`+${xpReward} XP`}</Text>
                </View>
              </View>

              {variant === 'pass' && answerValue ? (
                <View style={styles.responseCard}>
                  <Text style={[styles.responseLabel, { color: variantCopy.pillText }]}>{answerLabel}</Text>
                  <Text style={styles.responseValue}>{answerValue}</Text>
                </View>
              ) : null}

              {explanation ? (
                <View style={styles.responseCard}>
                  <Text style={styles.responseLabel}>explicacion actual</Text>
                  <Text style={styles.responseText}>{explanation}</Text>
                </View>
              ) : null}
            </ScrollView>

            {actionLabel ? (
              <Pressable
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: variantCopy.pillBackground,
                    borderColor: variantCopy.pillBorder,
                  },
                ]}
                onPress={onAction || onDismiss}>
                <Text style={[styles.actionButtonText, { color: variantCopy.pillText }]}>{actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    overflow: 'visible',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  confettiPiece: {
    position: 'absolute',
    top: 6,
    borderRadius: 999,
  },
  halo: {
    position: 'absolute',
    width: '92%',
    height: '86%',
    borderRadius: 36,
  },
  panel: {
    position: 'relative',
    width: '100%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    backgroundColor: DuocodePalette.surfacePanel,
    padding: 22,
    gap: 18,
    overflow: 'hidden',
  },
  contentScroll: {
    maxHeight: 360,
  },
  contentScrollInner: {
    gap: 14,
  },
  codeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  codeBackdropScan: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 78,
  },
  codeBackdropLine: {
    position: 'absolute',
    left: 22,
    height: 8,
    borderRadius: 999,
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
  title: {
    color: DuocodePalette.text,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Fonts.mono,
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
  metricsRow: {
    gap: 12,
  },
  metricCard: {
    alignSelf: 'flex-start',
    minWidth: 156,
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.terminalGreen,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  metricValue: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  responseCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 8,
  },
  responseLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
    textTransform: 'uppercase',
  },
  responseValue: {
    color: DuocodePalette.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  responseText: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 21,
  },
  actionButton: {
    marginTop: 2,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
