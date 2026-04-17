import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('student@duocode.dev');
  const [password, setPassword] = useState('demo12345');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo continuar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <BrandMark size={84} />
          <Text style={styles.title}>duocode auth</Text>
          <Text style={styles.subtitle}>
            Login por usuario y acceso admin. El alumno resuelve codigo escribiendo y el admin solo ve metricas y avance.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
              onPress={() => setMode('login')}>
              <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Login</Text>
            </Pressable>

            <Pressable
              style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
              onPress={() => setMode('register')}>
              <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Registro</Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={DuocodePalette.muted}
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholder="Email"
            placeholderTextColor={DuocodePalette.muted}
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={DuocodePalette.muted}
            style={styles.input}
          />

          <Pressable style={styles.submitButton} disabled={submitting} onPress={handleSubmit}>
            <Text style={styles.submitText}>{submitting ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Credenciales demo</Text>
            <Text style={styles.demoLine}>Alumno: `student@duocode.dev` / `demo12345`</Text>
            <Text style={styles.demoLine}>Admin: `admin@duocode.dev` / `admin12345`</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DuocodePalette.background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: DuocodePalette.text,
    fontSize: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: DuocodePalette.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 20,
    gap: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: DuocodePalette.surfaceAlt,
  },
  modeButtonActive: {
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  modeText: {
    color: DuocodePalette.muted,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  modeTextActive: {
    color: DuocodePalette.accent,
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
  submitButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: DuocodePalette.accent,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  demoBox: {
    marginTop: 6,
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
