import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { groupCourseTopics } from '@/lib/duocode-curriculum';
import type { DecoratedLesson } from '@/lib/duocode-curriculum';

const PATH_OFFSETS = [0, 54, 86, 54, 0];

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>loading.course.map()</Text>
        <Text style={styles.panelText}>Estamos preparando niveles, unidades y lecciones.</Text>
      </View>
    </ScrollView>
  );
}

function getFirstPendingExercise(lesson: DecoratedLesson | null) {
  if (!lesson) {
    return null;
  }

  return lesson.exercises.find((exercise) => !exercise.completed) || lesson.exercises[0] || null;
}

function buildLessonMeta(lesson: DecoratedLesson) {
  if (lesson.progressPercent >= 100) {
    return `${lesson.exerciseCount} ejercicios · completo`;
  }

  if (lesson.isLocked) {
    return `${lesson.exerciseCount} ejercicios · locked`;
  }

  return `${lesson.completedExercises}/${lesson.exerciseCount} ejercicios`;
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const { dashboard, loading } = useLearnerDashboard();
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const courseLevels = useMemo(() => (dashboard ? groupCourseTopics(dashboard.topics) : []), [dashboard]);
  const allLessons = useMemo(
    () => courseLevels.flatMap((level) => level.units.flatMap((unit) => unit.lessons)),
    [courseLevels]
  );

  useEffect(() => {
    if (!courseLevels.length) {
      setSelectedLevelId(null);
      return;
    }

    const requestedLesson = allLessons.find((lesson) => lesson.id === requestedTopicId);

    setSelectedLevelId((current) => {
      if (requestedLesson) {
        return requestedLesson.levelId;
      }

      if (current && courseLevels.some((level) => level.id === current)) {
        return current;
      }

      return courseLevels.find((level) => !level.isLocked)?.id || courseLevels[0].id;
    });
  }, [allLessons, courseLevels, requestedTopicId]);

  const selectedLevel =
    courseLevels.find((level) => level.id === selectedLevelId) ||
    courseLevels.find((level) => !level.isLocked) ||
    courseLevels[0] ||
    null;

  useEffect(() => {
    if (!selectedLevel?.units.length) {
      setSelectedUnitId(null);
      return;
    }

    const requestedLesson = allLessons.find((lesson) => lesson.id === requestedTopicId);
    const requestedUnit = selectedLevel.units.find((unit) => unit.id === requestedLesson?.unitId);

    setSelectedUnitId((current) => {
      if (requestedUnit && !requestedUnit.isLocked) {
        return requestedUnit.id;
      }

      if (current && selectedLevel.units.some((unit) => unit.id === current && !unit.isLocked)) {
        return current;
      }

      return selectedLevel.units.find((unit) => !unit.isLocked)?.id || selectedLevel.units[0].id;
    });
  }, [allLessons, requestedTopicId, selectedLevel]);

  const selectedUnit =
    selectedLevel?.units.find((unit) => unit.id === selectedUnitId) ||
    selectedLevel?.units.find((unit) => !unit.isLocked) ||
    selectedLevel?.units[0] ||
    null;

  useEffect(() => {
    if (!selectedUnit?.lessons.length) {
      setSelectedLessonId(null);
      return;
    }

    const requestedLesson = selectedUnit.lessons.find((lesson) => lesson.id === requestedTopicId);

    setSelectedLessonId((current) => {
      if (requestedLesson && !requestedLesson.isLocked) {
        return requestedLesson.id;
      }

      if (current && selectedUnit.lessons.some((lesson) => lesson.id === current && !lesson.isLocked)) {
        return current;
      }

      return selectedUnit.lessons.find((lesson) => !lesson.isLocked)?.id || selectedUnit.lessons[0].id;
    });
  }, [requestedTopicId, selectedUnit]);

  const selectedLesson =
    selectedUnit?.lessons.find((lesson) => lesson.id === selectedLessonId) ||
    selectedUnit?.lessons.find((lesson) => !lesson.isLocked) ||
    selectedUnit?.lessons[0] ||
    null;
  const selectedExercise = getFirstPendingExercise(selectedLesson);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function openLesson(lesson: DecoratedLesson | null) {
    const lessonExercise = getFirstPendingExercise(lesson);

    if (!lesson || lesson.isLocked || !lessonExercise) {
      return;
    }

    router.push({
      pathname: '/(tabs)/game',
      params: {
        topicId: lesson.id,
        exerciseId: lessonExercise.id,
      },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>course.map()</Text>
        <Text style={styles.heroTitle}>Ruta completa de JavaScript</Text>
        <Text style={styles.heroText}>
          Cada nodo representa una leccion. Dentro de cada leccion tienes seleccion, respuesta corta,
          prediccion, debugging y retos de codigo en cierres de unidad.
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.panelTitle}>niveles</Text>
          <Text style={styles.panelMeta}>{`${courseLevels.length} niveles`}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelRow}>
          {courseLevels.map((level) => {
            const isSelected = level.id === selectedLevel?.id;

            return (
              <Pressable
                key={level.id}
                style={[styles.levelChip, isSelected && styles.levelChipSelected, level.isLocked && styles.levelChipLocked]}
                onPress={() => {
                  if (!level.isLocked) {
                    setSelectedLevelId(level.id);
                  }
                }}>
                <Text style={[styles.levelChipTitle, isSelected && styles.levelChipTitleSelected]}>
                  {level.name}
                </Text>
                <Text style={styles.levelChipMeta}>{`${level.units.length} unidades · ${level.progressPercent}%`}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {selectedLevel ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>unidades del nivel</Text>
            <Text style={styles.panelMeta}>{selectedLevel.objective}</Text>
          </View>

          <View style={styles.unitList}>
            {selectedLevel.units.map((unit) => {
              const isSelected = unit.id === selectedUnit?.id;

              return (
                <Pressable
                  key={unit.id}
                  style={[styles.unitCard, isSelected && styles.unitCardSelected, unit.isLocked && styles.unitCardLocked]}
                  onPress={() => {
                    if (!unit.isLocked) {
                      setSelectedUnitId(unit.id);
                    }
                  }}>
                  <View style={styles.unitHeader}>
                    <View style={styles.unitCopy}>
                      <Text style={styles.unitEyebrow}>{`UNIDAD ${unit.unitNumber}`}</Text>
                      <Text style={styles.unitTitle}>{unit.title}</Text>
                      <Text style={styles.unitMeta}>{`${unit.completedLessons}/${unit.lessonCount} lecciones`}</Text>
                    </View>
                    <Text style={styles.unitProgress}>{`${unit.progressPercent}%`}</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${unit.progressPercent}%` }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {selectedUnit ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>camino de la unidad</Text>
            <Text style={styles.panelMeta}>{`${selectedUnit.lessonCount} lecciones`}</Text>
          </View>

          <View style={styles.pathShell}>
            <View style={styles.pathRail} />

            {selectedUnit.lessons.map((lesson, index) => {
              const offset = PATH_OFFSETS[index % PATH_OFFSETS.length];

              return (
                <View key={lesson.id} style={styles.lessonRow}>
                  <NeonLessonNode
                    glyph={lesson.progressPercent >= 100 ? 'OK' : lesson.lessonNumber.toString()}
                    label={lesson.title}
                    meta={buildLessonMeta(lesson)}
                    isCurrent={lesson.id === selectedLesson?.id && !lesson.isLocked}
                    isCompleted={lesson.progressPercent >= 100}
                    isLocked={lesson.isLocked}
                    showStartTag={lesson.id === selectedLesson?.id && !lesson.isLocked}
                    onPress={() => {
                      if (!lesson.isLocked) {
                        setSelectedLessonId(lesson.id);
                      }
                    }}
                    style={{ transform: [{ translateX: offset }] }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {selectedLesson ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>detalle de la leccion</Text>
            <Text style={styles.panelMeta}>{`Leccion ${selectedLesson.lessonNumber}`}</Text>
          </View>

          <Text style={styles.lessonDescription}>{selectedLesson.lessonGoal}</Text>

          <View style={styles.codePreview}>
            {(selectedLesson.exampleCode || '').split('\n').map((line, index) => (
              <Text key={`${selectedLesson.id}-${index + 1}`} style={styles.codeLine}>
                {line || ' '}
              </Text>
            ))}
          </View>

          <View style={styles.exerciseSummaryRow}>
            <View style={styles.exerciseBadge}>
              <Text style={styles.exerciseBadgeValue}>
                {selectedLesson.exercises.filter((exercise) => exercise.mode === 'choice').length}
              </Text>
              <Text style={styles.exerciseBadgeLabel}>seleccion</Text>
            </View>
            <View style={styles.exerciseBadge}>
              <Text style={styles.exerciseBadgeValue}>
                {selectedLesson.exercises.filter((exercise) => exercise.mode === 'text').length}
              </Text>
              <Text style={styles.exerciseBadgeLabel}>texto</Text>
            </View>
            <View style={styles.exerciseBadge}>
              <Text style={styles.exerciseBadgeValue}>
                {selectedLesson.exercises.filter((exercise) => exercise.mode === 'code').length}
              </Text>
              <Text style={styles.exerciseBadgeLabel}>codigo</Text>
            </View>
          </View>

          <View style={styles.exerciseList}>
            {selectedLesson.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <Text style={styles.exerciseItemTitle}>{exercise.title}</Text>
                <Text style={styles.exerciseItemMeta}>{`${exercise.lessonTypeLabel} · ${exercise.xpReward} XP`}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={() => openLesson(selectedLesson)}>
            <Text style={styles.primaryButtonText}>
              {selectedExercise ? `ABRIR ${selectedExercise.lessonTypeLabel.toUpperCase()}` : 'ABRIR LECCION'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DuocodePalette.navy,
  },
  container: {
    padding: 18,
    paddingTop: 24,
    paddingBottom: 110,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#0F1D32',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 20,
    gap: 8,
  },
  heroLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroTitle: {
    color: DuocodePalette.surface,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 16,
  },
  panelTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  panelText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panelMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  levelRow: {
    gap: 12,
  },
  levelChip: {
    minWidth: 180,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  levelChipSelected: {
    backgroundColor: DuocodePalette.accentSoft,
    borderColor: DuocodePalette.accent,
  },
  levelChipLocked: {
    opacity: 0.55,
  },
  levelChipTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  levelChipTitleSelected: {
    color: DuocodePalette.accent,
  },
  levelChipMeta: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  unitList: {
    gap: 12,
  },
  unitCard: {
    backgroundColor: '#132335',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 12,
  },
  unitCardSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: '#152A42',
  },
  unitCardLocked: {
    opacity: 0.6,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  unitCopy: {
    flex: 1,
    gap: 4,
  },
  unitEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  unitTitle: {
    color: DuocodePalette.surface,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  unitMeta: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  unitProgress: {
    color: DuocodePalette.accent,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#0B1625',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DuocodePalette.accent,
  },
  pathShell: {
    position: 'relative',
    paddingVertical: 8,
    paddingBottom: 16,
  },
  pathRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 4,
    marginLeft: -2,
    borderRadius: 999,
    backgroundColor: '#132844',
  },
  lessonRow: {
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonDescription: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
  },
  codePreview: {
    backgroundColor: DuocodePalette.navySoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 6,
  },
  codeLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  exerciseSummaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseBadge: {
    flex: 1,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  exerciseBadgeValue: {
    color: DuocodePalette.accent,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  exerciseBadgeLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  exerciseList: {
    gap: 10,
  },
  exerciseItem: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  exerciseItemTitle: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  exerciseItemMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  primaryButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
