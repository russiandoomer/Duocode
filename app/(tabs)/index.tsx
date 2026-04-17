import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>syncing student workspace...</Text>
        <Text style={styles.loadingText}>Estamos cargando tu progreso, ejercicios y metricas.</Text>
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { dashboard, loading } = useLearnerDashboard();

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  const { user, settings, topics, stats } = dashboard;
  const totalExercises = topics.reduce((total, topic) => total + topic.exerciseCount, 0);
  const completedExercises = topics.reduce((total, topic) => total + topic.completedExercises, 0);
  const completionPercent =
    totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);
  const nextTopic = topics.find((topic) => topic.exercises.some((exercise) => !exercise.completed)) || topics[0];
  const nextExercise =
    nextTopic?.exercises.find((exercise) => !exercise.completed) || nextTopic?.exercises[0] || null;
  const codeLines = String(nextExercise?.lastSubmittedCode || nextExercise?.starterCode || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{'// student_session'}</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.track}>{user.track}</Text>
        </View>

        <View style={styles.headerActions}>
          <BrandMark label={settings.branding.logoLabel} size={58} />
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.windowBar}>
          <View style={[styles.windowDot, styles.windowDotRed]} />
          <View style={[styles.windowDot, styles.windowDotAmber]} />
          <View style={[styles.windowDot, styles.windowDotGreen]} />
        </View>

        <Text style={styles.heroTitle}>{settings.branding.appName}</Text>
        <Text style={styles.heroSubtitle}>{user.focus}</Text>

        <View style={styles.heroCodeWrap}>
          {codeLines.map((line) => (
            <Text key={line} style={styles.heroCode}>
              {line}
            </Text>
          ))}
          {codeLines.length === 0 ? (
            <Text style={styles.heroCode}>{'function nextChallenge() {}'}</Text>
          ) : null}
        </View>

        <Text style={styles.heroHint}>
          {nextExercise
            ? `Siguiente reto: ${nextExercise.title}`
            : 'Todavia no tienes ejercicios cargados.'}
        </Text>

        <Pressable style={styles.heroButton} onPress={() => router.push('/(tabs)/game')}>
          <Text style={styles.heroButtonText}>IR A PRACTICA</Text>
        </Pressable>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>xp_total</Text>
          <Text style={styles.metricValue}>{stats.totalXp}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>precision</Text>
          <Text style={styles.metricValue}>{`${stats.precision}%`}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>racha</Text>
          <Text style={styles.metricValue}>{`${stats.streak} dias`}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>avance</Text>
          <Text style={styles.metricValue}>{`${completionPercent}%`}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>meta_diaria</Text>
          <Text style={styles.infoValue}>{`${user.dailyGoalMinutes} min`}</Text>
          <Text style={styles.infoMeta}>Objetivo minimo para mantener ritmo de estudio.</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>tema_actual</Text>
          <Text style={styles.infoValue}>{nextTopic?.title || 'Sin temas'}</Text>
          <Text style={styles.infoMeta}>
            {nextExercise ? `${nextExercise.title} · ${nextExercise.xpReward} XP` : 'Esperando ejercicios'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>temas_en_avance</Text>

      {topics.map((topic) => {
        const pendingExercise =
          topic.exercises.find((exercise) => !exercise.completed) || topic.exercises[0] || null;

        return (
          <Pressable key={topic.id} style={styles.topicCard} onPress={() => router.push('/(tabs)/game')}>
            <View style={styles.topicHeader}>
              <View style={styles.topicTitleWrap}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>
              </View>
              <Text style={styles.topicProgress}>{`${topic.progressPercent}%`}</Text>
            </View>

            <View style={styles.topicMetaRow}>
              <Text style={styles.topicMeta}>{`${topic.completedExercises}/${topic.exerciseCount} ejercicios`}</Text>
              <Text style={styles.topicMeta}>{`${topic.estimatedMinutes} min`}</Text>
              <Text style={styles.topicMeta}>{topic.status}</Text>
            </View>

            <Text style={styles.topicNext}>
              {pendingExercise ? `next => ${pendingExercise.title}` : 'next => Tema completado'}
            </Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${topic.progressPercent}%` }]} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DuocodePalette.background,
  },
  container: {
    padding: 24,
    paddingBottom: 96,
    gap: 18,
  },
  loadingCard: {
    marginTop: 32,
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 24,
    gap: 10,
  },
  loadingTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  loadingText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  headerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: DuocodePalette.muted,
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  name: {
    color: DuocodePalette.text,
    fontSize: 28,
    fontWeight: '900',
  },
  track: {
    color: DuocodePalette.code,
    fontSize: 14,
    fontFamily: Fonts.mono,
  },
  headerActions: {
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  heroCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    shadowColor: DuocodePalette.accent,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    gap: 12,
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
  windowDotRed: {
    backgroundColor: DuocodePalette.red,
  },
  windowDotAmber: {
    backgroundColor: DuocodePalette.amber,
  },
  windowDotGreen: {
    backgroundColor: DuocodePalette.green,
  },
  heroTitle: {
    color: DuocodePalette.text,
    fontSize: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroSubtitle: {
    color: DuocodePalette.accent,
    fontSize: 15,
    lineHeight: 21,
  },
  heroCodeWrap: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
  },
  heroCode: {
    color: DuocodePalette.code,
    fontSize: 14,
    fontFamily: Fonts.mono,
  },
  heroHint: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  heroButtonText: {
    color: DuocodePalette.accent,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    width: '47%',
    backgroundColor: DuocodePalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 8,
  },
  metricLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  metricValue: {
    color: DuocodePalette.text,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 14,
  },
  infoCard: {
    flex: 1,
    backgroundColor: DuocodePalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 8,
  },
  infoLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  infoValue: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  infoMeta: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 14,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicTitleWrap: {
    flex: 1,
    gap: 4,
  },
  topicTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicDescription: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  topicProgress: {
    color: DuocodePalette.accent,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  topicNext: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: DuocodePalette.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DuocodePalette.accent,
  },
});
