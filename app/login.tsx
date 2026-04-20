import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

type AuthMode = 'login' | 'register';

const ACCESS_LINES = [
  '$ auth.bootstrap()',
  '> secure token handshake ready',
  '> account isolation enabled',
  '> role guard: admin | student',
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateRegistration(name: string, email: string, password: string, confirmPassword: string) {
  if (name.trim().length < 3) {
    return 'El nombre debe tener al menos 3 caracteres.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return 'Ingresa un email valido.';
  }

  if (password.length < 8) {
    return 'El password debe tener al menos 8 caracteres.';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'El password debe incluir letras y numeros.';
  }

  if (password !== confirmPassword) {
    return 'La confirmacion del password no coincide.';
  }

  return null;
}

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [modeWidth, setModeWidth] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('student@duocode.dev');
  const [password, setPassword] = useState('demo12345');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const glow = useRef(new Animated.Value(0.3)).current;
  const float = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const modeLine = useRef(new Animated.Value(mode === 'login' ? 0 : 1)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.28,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -7,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 6,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    glowLoop.start();
    floatLoop.start();
    scanLoop.start();

    return () => {
      glowLoop.stop();
      floatLoop.stop();
      scanLoop.stop();
    };
  }, [float, glow, scan]);

  useEffect(() => {
    Animated.spring(modeLine, {
      toValue: mode === 'login' ? 0 : 1,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [mode, modeLine]);

  async function handleSubmit() {
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(normalizeEmail(email), password);
      } else {
        const validationError = validateRegistration(name, email, password, confirmPassword);

        if (validationError) {
          throw new Error(validationError);
        }

        await register(name.trim(), normalizeEmail(email), password, confirmPassword);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo continuar');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(nextMode: 'student' | 'admin') {
    setMode('login');
    setName('');
    setConfirmPassword('');

    if (nextMode === 'admin') {
      setEmail('admin@duocode.dev');
      setPassword('admin12345');
      return;
    }

    setEmail('student@duocode.dev');
    setPassword('demo12345');
  }

  const modeSegmentWidth = Math.max(0, modeWidth / 2 - 8);
  const modeTranslate = modeLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, modeWidth / 2)],
  });

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.4],
  });

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 360],
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.heroShell}>
          <Animated.View style={[styles.heroGlow, { opacity: haloOpacity, transform: [{ scale: glow }] }]} />

          <Animated.View style={[styles.heroCard, { transform: [{ translateY: float }] }]}>
            <Animated.View style={[styles.heroScanline, { transform: [{ translateY: scanTranslateY }] }]} />

            <View style={styles.windowBar}>
              <View style={[styles.windowDot, { backgroundColor: DuocodePalette.red }]} />
              <View style={[styles.windowDot, { backgroundColor: DuocodePalette.amber }]} />
              <View style={[styles.windowDot, { backgroundColor: DuocodePalette.green }]} />
            </View>

            <View style={styles.heroTop}>
              <BrandMark size={84} />

              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>duocode.secure_access()</Text>
                <Text style={styles.heroTitle}>AUTH CONSOLE</Text>
                <Text style={styles.heroSubtitle}>
                  Registro y login con token seguro, aislamiento de roles, proteccion ante intentos repetidos y experiencia visual estilo IDE.
                </Text>
              </View>
            </View>

            <View style={styles.terminalBox}>
              {ACCESS_LINES.map((line) => (
                <Text key={line} style={styles.terminalLine}>
                  {line}
                </Text>
              ))}
            </View>
          </Animated.View>
        </View>

        <View style={styles.card}>
          <View style={styles.modeShell} onLayout={(event) => setModeWidth(event.nativeEvent.layout.width)}>
            <Animated.View
              style={[
                styles.modeHighlight,
                {
                  width: modeSegmentWidth,
                  transform: [{ translateX: modeTranslate }],
                },
              ]}
            />

            <Pressable style={styles.modeButton} onPress={() => setMode('login')}>
              <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>LOGIN</Text>
            </Pressable>

            <Pressable style={styles.modeButton} onPress={() => setMode('register')}>
              <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>REGISTER</Text>
            </Pressable>
          </View>

          <View style={styles.demoRow}>
            <Pressable style={styles.demoChip} onPress={() => fillDemoAccount('student')}>
              <Text style={styles.demoChipText}>student.demo</Text>
            </Pressable>

            <Pressable style={styles.demoChip} onPress={() => fillDemoAccount('admin')}>
              <Text style={styles.demoChipText}>admin.demo</Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>user.name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={DuocodePalette.muted}
                style={styles.input}
              />
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>auth.email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholder="Email"
              placeholderTextColor={DuocodePalette.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>auth.password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor={DuocodePalette.muted}
                style={[styles.input, styles.passwordInput]}
              />

              <Pressable style={styles.visibilityButton} onPress={() => setShowPassword((current) => !current)}>
                <Text style={styles.visibilityText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            </View>
          </View>

          {mode === 'register' ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>confirm.password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Repite tu password"
                  placeholderTextColor={DuocodePalette.muted}
                  style={[styles.input, styles.passwordInput]}
                />

                <Pressable
                  style={styles.visibilityButton}
                  onPress={() => setShowConfirmPassword((current) => !current)}>
                  <Text style={styles.visibilityText}>{showConfirmPassword ? 'HIDE' : 'SHOW'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>{mode === 'login' ? 'session.rules' : 'register.rules'}</Text>
            <Text style={styles.rulesLine}>
              {mode === 'login'
                ? '> Usa tu email y password. El sistema bloquea temporalmente intentos repetidos.'
                : '> Nombre minimo 3 caracteres, email valido y password con letras + numeros.'}
            </Text>
          </View>

          <Pressable style={styles.submitButton} disabled={submitting} onPress={handleSubmit}>
            <Text style={styles.submitText}>
              {submitting
                ? 'PROCESSING...'
                : mode === 'login'
                  ? 'ACCESS SYSTEM'
                  : 'CREATE ACCOUNT'}
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Credenciales demo</Text>
            <Text style={styles.demoLine}>Alumno: `student@duocode.dev` / `demo12345`</Text>
            <Text style={styles.demoLine}>Admin: `admin@duocode.dev` / `admin12345`</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DuocodePalette.navy,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 22,
  },
  heroShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: '84%',
    height: '84%',
    borderRadius: 30,
    backgroundColor: DuocodePalette.accentGlow,
  },
  heroCard: {
    width: '100%',
    backgroundColor: DuocodePalette.surfacePanel,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 22,
    gap: 18,
    overflow: 'hidden',
  },
  heroScanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
  },
  windowBar: {
    flexDirection: 'row',
    gap: 8,
  },
  windowDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    gap: 5,
  },
  heroLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroTitle: {
    color: DuocodePalette.surface,
    fontSize: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroSubtitle: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  terminalBox: {
    backgroundColor: DuocodePalette.navy,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 8,
  },
  terminalLine: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  card: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 20,
    gap: 14,
  },
  modeShell: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    overflow: 'hidden',
  },
  modeHighlight: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 14,
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 1,
  },
  modeText: {
    color: DuocodePalette.muted,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 13,
  },
  modeTextActive: {
    color: DuocodePalette.accent,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoChip: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoChipText: {
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  input: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    color: DuocodePalette.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.mono,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  visibilityButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minWidth: 76,
    alignItems: 'center',
  },
  visibilityText: {
    color: DuocodePalette.muted,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 12,
  },
  rulesBox: {
    backgroundColor: DuocodePalette.navySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  rulesTitle: {
    color: DuocodePalette.surface,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 12,
  },
  rulesLine: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.mono,
  },
  submitButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: DuocodePalette.accent,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 14,
  },
  demoBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: DuocodePalette.border,
    paddingTop: 14,
    gap: 6,
  },
  demoTitle: {
    color: DuocodePalette.text,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  demoLine: {
    color: DuocodePalette.code,
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
