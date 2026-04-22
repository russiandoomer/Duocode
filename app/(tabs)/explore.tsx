import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { groupCourseTopics } from '@/lib/duocode-curriculum';
import type { DecoratedLesson } from '@/lib/duocode-curriculum';

const PATH_OFFSETS = [0, 116, 188, 116, 0];

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

function buildLessonModeMix(lesson: DecoratedLesson) {
  const choiceCount = lesson.exercises.filter((exercise) => exercise.mode === 'choice').length;
  const textCount = lesson.exercises.filter((exercise) => exercise.mode === 'text').length;
  const codeCount = lesson.exercises.filter((exercise) => exercise.mode === 'code').length;
  const parts = [];

  if (choiceCount) {
    parts.push(`${choiceCount} chequeo${choiceCount > 1 ? 's' : ''}`);
  }

  if (textCount) {
    parts.push(`${textCount} completar`);
  }

  if (codeCount) {
    parts.push(`${codeCount} codigo`);
  }

  return parts.join(' · ') || 'reto guiado';
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const { dashboard, loading } = useLearnerDashboard();
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [unitsExpanded, setUnitsExpanded] = useState(true);
  const [completedUnitsExpanded, setCompletedUnitsExpanded] = useState(false);
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

  const autoCurrentLesson = useMemo(() => {
    if (!selectedLevel) {
      return null;
    }

    const lessons = selectedLevel.units.flatMap((unit) => unit.lessons);

    return (
      lessons.find((lesson) => !lesson.isLocked && lesson.progressPercent < 100) ||
      lessons.find((lesson) => !lesson.isLocked) ||
      lessons[lessons.length - 1] ||
      null
    );
  }, [selectedLevel]);

  const autoCurrentUnit = useMemo(() => {
    if (!selectedLevel) {
      return null;
    }

    return (
      selectedLevel.units.find((unit) => unit.id === autoCurrentLesson?.unitId) ||
      selectedLevel.units.find((unit) => unit.progressPercent < 100) ||
      selectedLevel.units[selectedLevel.units.length - 1] ||
      null
    );
  }, [autoCurrentLesson?.unitId, selectedLevel]);

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

      if (autoCurrentUnit && !autoCurrentUnit.isLocked) {
        return autoCurrentUnit.id;
      }

      if (current && selectedLevel.units.some((unit) => unit.id === current && !unit.isLocked)) {
        return current;
      }

      return selectedLevel.units.find((unit) => !unit.isLocked)?.id || selectedLevel.units[0].id;
    });
  }, [allLessons, autoCurrentUnit, requestedTopicId, selectedLevel]);

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

      if (selectedUnit.id === autoCurrentUnit?.id && autoCurrentLesson && !autoCurrentLesson.isLocked) {
        return autoCurrentLesson.id;
      }

      if (current && selectedUnit.lessons.some((lesson) => lesson.id === current && !lesson.isLocked)) {
        return current;
      }

      return selectedUnit.lessons.find((lesson) => !lesson.isLocked)?.id || selectedUnit.lessons[0].id;
    });
  }, [autoCurrentLesson, autoCurrentUnit?.id, requestedTopicId, selectedUnit]);

  const selectedLesson =
    selectedUnit?.lessons.find((lesson) => lesson.id === selectedLessonId) ||
    selectedUnit?.lessons.find((lesson) => !lesson.isLocked) ||
    selectedUnit?.lessons[0] ||
    null;
  const lessonForModal =
    selectedUnit?.lessons.find((lesson) => lesson.id === modalLessonId) ||
    allLessons.find((lesson) => lesson.id === modalLessonId) ||
    null;
  const modalExercise = getFirstPendingExercise(lessonForModal);
  const autoCurrentExercise = getFirstPendingExercise(autoCurrentLesson);
  const queuedUnits = useMemo(() => {
    if (!selectedLevel) {
      return [];
    }

    return selectedLevel.units
      .filter((unit) => unit.progressPercent < 100)
      .slice()
      .sort((left, right) => {
        if (left.id === autoCurrentUnit?.id) {
          return -1;
        }

        if (right.id === autoCurrentUnit?.id) {
          return 1;
        }

        return left.unitNumber - right.unitNumber;
      });
  }, [autoCurrentUnit?.id, selectedLevel]);
  const completedUnits = useMemo(
    () =>
      selectedLevel?.units
        .filter((unit) => unit.progressPercent >= 100)
        .slice()
        .sort((left, right) => left.unitNumber - right.unitNumber) || [],
    [selectedLevel]
  );

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
      pathname: '/lesson',
      params: {
        topicId: lesson.id,
        exerciseId: lessonExercise.id,
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
                <Text style={styles.focusTitle}>{autoCurrentUnit?.title || 'Sin unidad'}</Text>
                <Text style={styles.focusMeta}>
                  {autoCurrentLesson
                    ? `Clase sugerida: Leccion ${autoCurrentLesson.lessonNumber} · ${autoCurrentLesson.title}`
                    : 'Selecciona una leccion para empezar.'}
                </Text>
              </View>

              <View style={styles.focusActions}>
                <Pressable style={styles.focusButton} onPress={() => setUnitsExpanded((value) => !value)}>
                  <Text style={styles.focusButtonText}>{unitsExpanded ? 'OCULTAR UNIDADES' : 'VER UNIDADES'}</Text>
                </Pressable>

                {autoCurrentLesson && autoCurrentExercise ? (
                  <Pressable style={styles.focusStartButton} onPress={() => openLesson(autoCurrentLesson)}>
                    <Text style={styles.focusStartButtonText}>EMPEZAR CLASE</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.focusInfoRow}>
              <View style={styles.focusInfoCard}>
                <Text style={styles.focusInfoLabel}>unidad actual</Text>
                <Text style={styles.focusInfoValue}>
                  {autoCurrentUnit ? `U${autoCurrentUnit.unitNumber}` : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.focusInfoCard}>
                <Text style={styles.focusInfoLabel}>leccion actual</Text>
                <Text style={styles.focusInfoValue}>
                  {autoCurrentLesson ? `L${autoCurrentLesson.lessonNumber}` : 'Pendiente'}
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
                {queuedUnits.map((unit) => {
                  const isSelected = unit.id === selectedUnit?.id;
                  const isCurrent = unit.id === autoCurrentUnit?.id;

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
                          <Text style={styles.unitEyebrow}>
                            {isCurrent ? `UNIDAD ${unit.unitNumber} · AHORA` : `UNIDAD ${unit.unitNumber}`}
                          </Text>
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

                {completedUnits.length ? (
                  <View style={styles.completedUnitsShell}>
                    <Pressable
                      style={styles.completedUnitsToggle}
                      onPress={() => setCompletedUnitsExpanded((value) => !value)}>
                      <View style={styles.completedUnitsCopy}>
                        <Text style={styles.completedUnitsTitle}>unidades terminadas</Text>
                        <Text style={styles.completedUnitsMeta}>{`${completedUnits.length} completadas`}</Text>
                      </View>

                      <Text style={styles.completedUnitsAction}>
                        {completedUnitsExpanded ? 'OCULTAR' : 'VER'}
                      </Text>
                    </Pressable>

                    {completedUnitsExpanded ? (
                      <View style={styles.completedUnitsList}>
                        {completedUnits.map((unit) => {
                          const isSelected = unit.id === selectedUnit?.id;

                          return (
                            <Pressable
                              key={unit.id}
                              style={[styles.completedUnitCard, isSelected && styles.completedUnitCardSelected]}
                              onPress={() => setSelectedUnitId(unit.id)}>
                              <Text style={styles.completedUnitEyebrow}>{`UNIDAD ${unit.unitNumber}`}</Text>
                              <Text style={styles.completedUnitTitle}>{unit.title}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : null}
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
            <Text style={styles.pathHint}>
              Toca una leccion del camino para ver su enfoque y abrir una vista dedicada solo para esa clase.
            </Text>
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

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>de que trata</Text>
                  <Text style={styles.modalSectionText}>{lessonForModal.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>vas a practicar</Text>
                  <Text style={styles.modalSectionText}>{buildLessonModeMix(lessonForModal)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>resultado esperado</Text>
                  <Text style={styles.modalSectionText}>{lessonForModal.stageGoal}</Text>
                </View>

                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>{`${lessonForModal.exerciseCount}`}</Text>
                    <Text style={styles.modalBadgeLabel}>retos</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>{`${lessonForModal.estimatedMinutes} min`}</Text>
                    <Text style={styles.modalBadgeLabel}>duracion</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>
                      {`${lessonForModal.exercises.reduce((total, exercise) => total + exercise.xpReward, 0)} XP`}
                    </Text>
                    <Text style={styles.modalBadgeLabel}>recompensa</Text>
                  </View>
                </View>

                {lessonForModal.exampleCode ? (
                  <View style={styles.codePreview}>
                    <Text style={styles.modalSectionLabel}>ejemplo rapido</Text>
                    {lessonForModal.exampleCode.split('\n').map((line, index) => (
                      <Text key={`${lessonForModal.id}-modal-${index + 1}`} style={styles.codeLine}>
                        {line || ' '}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Pressable style={styles.primaryButton} onPress={() => openLesson(lessonForModal)}>
                  <Text style={styles.primaryButtonText}>ABRIR LECCION</Text>
                </Pressable>

                {modalExercise ? (
                  <Text style={styles.modalStartHint}>
                    {`Primer reto: ${modalExercise.lessonTypeLabel.toLowerCase()} · ${modalExercise.title}`}
                  </Text>
                ) : null}
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
    color: DuocodePalette.text,
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
  focusActions: {
    gap: 10,
    alignItems: 'flex-end',
  },
  focusCopy: {
    flex: 1,
    gap: 6,
  },
  focusEyebrow: {
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  focusTitle: {
    color: DuocodePalette.text,
    fontSize: 21,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  focusMeta: {
    color: '#C9D8F0',
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
  focusStartButton: {
    backgroundColor: '#163325',
    borderWidth: 1,
    borderColor: DuocodePalette.green,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  focusStartButtonText: {
    color: DuocodePalette.code,
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
    color: '#A9C5E8',
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  focusInfoValue: {
    color: DuocodePalette.text,
    fontSize: 17,
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
    color: DuocodePalette.terminalBlue,
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
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  unitTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  unitMeta: {
    color: '#B6C7E3',
    fontSize: 12,
    lineHeight: 18,
  },
  unitProgress: {
    color: DuocodePalette.code,
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
    color: '#B6C7E3',
    fontSize: 13,
    lineHeight: 19,
  },
  completedUnitsShell: {
    gap: 10,
    marginTop: 4,
  },
  completedUnitsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
  },
  completedUnitsCopy: {
    gap: 4,
  },
  completedUnitsTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  completedUnitsMeta: {
    color: '#B6C7E3',
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  completedUnitsAction: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  completedUnitsList: {
    gap: 10,
  },
  completedUnitCard: {
    backgroundColor: '#101C2F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  completedUnitCardSelected: {
    borderColor: DuocodePalette.accent,
  },
  completedUnitEyebrow: {
    color: '#9DB8DA',
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  completedUnitTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathShell: {
    position: 'relative',
    paddingVertical: 22,
    paddingHorizontal: 26,
    paddingBottom: 34,
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
    minHeight: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathHint: {
    color: '#BFD1EB',
    fontSize: 13,
    lineHeight: 19,
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
  modalSection: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  modalSectionLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  modalSectionText: {
    color: DuocodePalette.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    fontFamily: Fonts.mono,
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
    color: DuocodePalette.text,
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
  modalStartHint: {
    color: '#A8BFE2',
    fontSize: 12,
    fontFamily: Fonts.mono,
    textAlign: 'center',
  },
});
