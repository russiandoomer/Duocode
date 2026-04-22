import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { groupCourseTopics } from '@/lib/duocode-curriculum';
import type { DecoratedLesson } from '@/lib/duocode-curriculum';

const PATH_OFFSETS = [0, 90, 148, 90, 0];

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
    return `${lesson.exerciseCount} ejercicios · bloqueado`;
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
  const [unitsExpanded, setUnitsExpanded] = useState(true);
  const [modalLessonId, setModalLessonId] = useState<string | null>(null);

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
  const lessonForModal =
    selectedUnit?.lessons.find((lesson) => lesson.id === modalLessonId) ||
    allLessons.find((lesson) => lesson.id === modalLessonId) ||
    null;
  const selectedExercise = getFirstPendingExercise(lessonForModal || selectedLesson);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function openLesson(lesson: DecoratedLesson | null) {
    const lessonExercise = getFirstPendingExercise(lesson);

    if (!lesson || lesson.isLocked || !lessonExercise) {
      return;
    }

    setModalLessonId(null);
    router.push({
      pathname: '/(tabs)/game',
      params: {
        topicId: lesson.id,
        exerciseId: lessonExercise.id,
        sessionMode: 'lesson',
      },
    });
  }

  function openLessonDetail(lesson: DecoratedLesson) {
    if (lesson.isLocked) {
      return;
    }

    setSelectedLessonId(lesson.id);
    setModalLessonId(lesson.id);
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>course.navigator()</Text>
          <Text style={styles.heroTitle}>Aprender por unidad</Text>
          <Text style={styles.heroText}>
            Siempre ves en que unidad y en que leccion vas. El detalle completo aparece solo cuando
            abres una leccion del camino.
          </Text>
        </View>

        {selectedLevel ? (
          <View style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <View style={styles.focusCopy}>
                <Text style={styles.focusEyebrow}>{selectedLevel.name}</Text>
                <Text style={styles.focusTitle}>{selectedUnit?.title || 'Sin unidad'}</Text>
                <Text style={styles.focusMeta}>
                  {selectedLesson
                    ? `Leccion ${selectedLesson.lessonNumber}: ${selectedLesson.title}`
                    : 'Selecciona una leccion para empezar.'}
                </Text>
              </View>

              <Pressable style={styles.focusButton} onPress={() => setUnitsExpanded((value) => !value)}>
                <Text style={styles.focusButtonText}>{unitsExpanded ? 'OCULTAR UNIDADES' : 'VER UNIDADES'}</Text>
              </Pressable>
            </View>

            <View style={styles.focusInfoRow}>
              <View style={styles.focusInfoCard}>
                <Text style={styles.focusInfoLabel}>unidad actual</Text>
                <Text style={styles.focusInfoValue}>
                  {selectedUnit ? `U${selectedUnit.unitNumber}` : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.focusInfoCard}>
                <Text style={styles.focusInfoLabel}>leccion actual</Text>
                <Text style={styles.focusInfoValue}>
                  {selectedLesson ? `L${selectedLesson.lessonNumber}` : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.focusInfoCard}>
                <Text style={styles.focusInfoLabel}>progreso</Text>
                <Text style={styles.focusInfoValue}>{`${selectedLevel.progressPercent}%`}</Text>
              </View>
            </View>
          </View>
        ) : null}

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
                  style={[
                    styles.levelChip,
                    isSelected && styles.levelChipSelected,
                    level.isLocked && styles.levelChipLocked,
                  ]}
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
              <Text style={styles.panelTitle}>panel de unidades</Text>
              <Text style={styles.panelMeta}>{selectedLevel.objective}</Text>
            </View>

            {unitsExpanded ? (
              <View style={styles.unitList}>
                {selectedLevel.units.map((unit) => {
                  const isSelected = unit.id === selectedUnit?.id;

                  return (
                    <Pressable
                      key={unit.id}
                      style={[
                        styles.unitCard,
                        isSelected && styles.unitCardSelected,
                        unit.isLocked && styles.unitCardLocked,
                      ]}
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
            ) : (
              <View style={styles.collapsedHint}>
                <Text style={styles.collapsedHintText}>
                  El panel esta contraido. Aun asi sigues viendo arriba tu unidad y leccion activa.
                </Text>
              </View>
            )}
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
                      onPress={() => openLessonDetail(lesson)}
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
              <Text style={styles.panelTitle}>leccion seleccionada</Text>
              <Text style={styles.panelMeta}>{`Leccion ${selectedLesson.lessonNumber}`}</Text>
            </View>

            <Text style={styles.lessonHeadline}>{selectedLesson.title}</Text>
            <Text style={styles.panelText}>{selectedLesson.lessonGoal}</Text>

            <View style={styles.summaryBadges}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeValue}>
                  {selectedLesson.exercises.filter((exercise) => exercise.mode === 'choice').length}
                </Text>
                <Text style={styles.summaryBadgeLabel}>seleccion</Text>
              </View>

              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeValue}>
                  {selectedLesson.exercises.filter((exercise) => exercise.mode === 'text').length}
                </Text>
                <Text style={styles.summaryBadgeLabel}>texto</Text>
              </View>

              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeValue}>
                  {selectedLesson.exercises.filter((exercise) => exercise.mode === 'code').length}
                </Text>
                <Text style={styles.summaryBadgeLabel}>codigo</Text>
              </View>
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setModalLessonId(selectedLesson.id)}>
              <Text style={styles.primaryButtonText}>VER DETALLE DE LA LECCION</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(lessonForModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setModalLessonId(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalLessonId(null)} />

          <View style={styles.modalCard}>
            {lessonForModal ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalEyebrow}>{`UNIDAD ${lessonForModal.unitNumber} · LECCION ${lessonForModal.lessonNumber}`}</Text>
                    <Text style={styles.modalTitle}>{lessonForModal.title}</Text>
                    <Text style={styles.modalText}>{lessonForModal.lessonGoal}</Text>
                  </View>

                  <Pressable style={styles.modalCloseButton} onPress={() => setModalLessonId(null)}>
                    <Text style={styles.modalCloseButtonText}>CERRAR</Text>
                  </Pressable>
                </View>

                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>{`${lessonForModal.exerciseCount}`}</Text>
                    <Text style={styles.modalBadgeLabel}>retos</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>
                      {`${lessonForModal.exercises.reduce((total, exercise) => total + exercise.xpReward, 0)} XP`}
                    </Text>
                    <Text style={styles.modalBadgeLabel}>aprendizaje</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>
                      {`${lessonForModal.exercises.reduce((total, exercise) => total + exercise.practiceXpReward, 0)} XP`}
                    </Text>
                    <Text style={styles.modalBadgeLabel}>practica</Text>
                  </View>
                </View>

                {lessonForModal.exampleCode ? (
                  <View style={styles.codePreview}>
                    {lessonForModal.exampleCode.split('\n').map((line, index) => (
                      <Text key={`${lessonForModal.id}-modal-${index + 1}`} style={styles.codeLine}>
                        {line || ' '}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Pressable style={styles.primaryButton} onPress={() => openLesson(lessonForModal)}>
                  <Text style={styles.primaryButtonText}>
                    {selectedExercise ? `EMPEZAR ${selectedExercise.lessonTypeLabel.toUpperCase()}` : 'EMPEZAR LECCION'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
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
  focusCard: {
    backgroundColor: '#10243A',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 18,
    gap: 16,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  focusCopy: {
    flex: 1,
    gap: 6,
  },
  focusEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  focusTitle: {
    color: DuocodePalette.surface,
    fontSize: 21,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  focusMeta: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  focusButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  focusButtonText: {
    color: DuocodePalette.accent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  focusInfoRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  focusInfoCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#132B45',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  focusInfoLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  focusInfoValue: {
    color: DuocodePalette.surface,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
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
    flex: 1,
    textAlign: 'right',
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
  collapsedHint: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
  },
  collapsedHintText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  pathShell: {
    position: 'relative',
    paddingVertical: 18,
    paddingHorizontal: 14,
    paddingBottom: 26,
  },
  pathRail: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: '50%',
    width: 4,
    marginLeft: -2,
    borderRadius: 999,
    backgroundColor: '#132844',
  },
  lessonRow: {
    minHeight: 178,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonHeadline: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  summaryBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryBadge: {
    flex: 1,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  summaryBadgeValue: {
    color: DuocodePalette.accent,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  summaryBadgeLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.78)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  modalTitle: {
    color: DuocodePalette.text,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  modalText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalCloseButtonText: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalBadge: {
    flex: 1,
    minWidth: 120,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  modalBadgeValue: {
    color: DuocodePalette.surface,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    textAlign: 'center',
  },
  modalBadgeLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
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
});
