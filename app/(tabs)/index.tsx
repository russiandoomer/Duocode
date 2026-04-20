import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { groupCourseTopics } from '@/lib/duocode-curriculum';
import type { LearnerExercise, LearnerTopic } from '@/types/duocode';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>syncing.course()</Text>
        <Text style={styles.panelText}>Estamos cargando tu curso completo de JavaScript.</Text>
      </View>
    </ScrollView>
  );
}

function getNextExercise(topic: LearnerTopic | null) {
  if (!topic) {
    return null;
  }

  return topic.exercises.find((exercise) => !exercise.completed) || topic.exercises[0] || null;
}

function findNextLesson(topics: LearnerTopic[]) {
  return (
    topics.find((topic) => topic.progressPercent < 100) ||
    topics[0] ||
    null
  );
}

function countExercises(topic: LearnerTopic, mode: LearnerExercise['mode']) {
  return topic.exercises.filter((exercise) => exercise.mode === mode).length;
}

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { dashboard, loading } = useLearnerDashboard();

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  const { user, settings, topics, stats } = dashboard;
  const levels = groupCourseTopics(topics);
  const totalLessons = topics.length;
  const completedLessons = topics.filter((topic) => topic.progressPercent >= 100).length;
  const nextLesson = findNextLesson(topics);
  const nextExercise = getNextExercise(nextLesson);
  const currentLevel = levels.find((level) => level.id === nextLesson?.levelId) || levels[0] || null;
  const currentUnit =
    currentLevel?.units.find((unit) => unit.id === nextLesson?.unitId) ||
    currentLevel?.units[0] ||
    null;

  function handleContinue() {
    if (!nextLesson || !nextExercise) {
      return;
    }

    router.push({
      pathname: '/(tabs)/explore',
      params: {
        topicId: nextLesson.id,
        exerciseId: nextExercise.id,
      },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>{'// js_course_boot'}</Text>
          <Text style={styles.headerName}>{user.name}</Text>
          <Text style={styles.headerTrack}>{user.track}</Text>
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

        <Text style={styles.heroTitle}>duocode.js</Text>
        <Text style={styles.heroSubtitle}>
          Curso serio de JavaScript con 3 niveles, 15 unidades y 75 lecciones cortas tipo ruta.
        </Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLine}>{`const progress = ${completedLessons}/${totalLessons};`}</Text>
          <Text style={styles.codeLine}>
            {`const lesson = "${nextLesson?.title || 'Sin leccion'}";`}
          </Text>
          <Text style={styles.codeLine}>
            {`const exercise = "${nextExercise?.title || 'Sin ejercicio'}";`}
          </Text>
        </View>

        <Text style={styles.heroMeta}>
          {nextLesson
            ? `Siguiente foco: ${nextLesson.unitTitle} · Leccion ${nextLesson.lessonNumber}`
            : 'No hay lecciones pendientes.'}
        </Text>

        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>CONTINUAR CURSO</Text>
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
          <Text style={styles.metricLabel}>lecciones</Text>
          <Text style={styles.metricValue}>{`${completedLessons}/${totalLessons}`}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ruta_actual</Text>
        <Text style={styles.panelText}>
          {currentUnit
            ? `${currentLevel?.name} · Unidad ${currentUnit.unitNumber} · ${currentUnit.title}`
            : 'Todavia no hay una unidad seleccionada.'}
        </Text>
        <Text style={styles.panelHint}>
          {nextLesson
            ? `${nextLesson.title} · ${countExercises(nextLesson, 'choice')} seleccion · ${countExercises(nextLesson, 'text')} texto · ${countExercises(nextLesson, 'code')} codigo`
            : 'Esperando lecciones.'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>niveles_del_curso</Text>

      {levels.map((level) => {
        const firstLesson = level.units[0]?.lessons[0] || null;

        return (
          <Pressable
            key={level.id}
            style={[styles.levelCard, level.isLocked && styles.levelCardLocked]}
            onPress={() => {
              if (!firstLesson || level.isLocked) {
                return;
              }

              router.push({
                pathname: '/(tabs)/explore',
                params: {
                  topicId: firstLesson.id,
                },
              });
            }}>
            <View style={styles.levelHeader}>
              <View style={styles.levelCopy}>
                <Text style={styles.levelEyebrow}>{`Nivel ${level.levelNumber}`}</Text>
                <Text style={styles.levelTitle}>{level.name}</Text>
                <Text style={styles.levelObjective}>{level.objective}</Text>
              </View>

              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{`${level.progressPercent}%`}</Text>
              </View>
            </View>

            <View style={styles.levelMetaRow}>
              <Text style={styles.levelMeta}>{`${level.units.length} unidades`}</Text>
              <Text style={styles.levelMeta}>
                {`${level.units.reduce((total, unit) => total + unit.completedLessons, 0)} lecciones completas`}
              </Text>
              <Text style={styles.levelMeta}>{level.isLocked ? 'locked' : 'open'}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${level.progressPercent}%` }]} />
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
  headerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerEyebrow: {
    color: DuocodePalette.muted,
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  headerName: {
    color: DuocodePalette.text,
    fontSize: 28,
    fontWeight: '900',
  },
  headerTrack: {
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
  codeCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
  },
  codeLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  heroMeta: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
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
  panel: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 8,
  },
  panelTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  panelText: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  panelHint: {
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
  levelCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 14,
  },
  levelCardLocked: {
    opacity: 0.65,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  levelCopy: {
    flex: 1,
    gap: 4,
  },
  levelEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  levelTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  levelObjective: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  levelBadge: {
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  levelBadgeText: {
    color: DuocodePalette.accent,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  levelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
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
