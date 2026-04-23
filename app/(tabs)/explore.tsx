import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { groupCourseTopics } from '@/lib/duocode-curriculum';
import type { DecoratedLesson } from '@/lib/duocode-curriculum';

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
  const { width: viewportWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const { dashboard, loading } = useLearnerDashboard();
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
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
  const isWideLayout = viewportWidth >= 1180;
  const pathOffsets = useMemo(() => {
    if (viewportWidth >= 1480) {
      return [0, 148, 236, 148, 0];
    }

    if (viewportWidth >= 1180) {
      return [0, 118, 188, 118, 0];
    }

    if (viewportWidth >= 860) {
      return [0, 78, 132, 78, 0];
    }

    return [0, 40, 72, 40, 0];
  }, [viewportWidth]);
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

  function renderSidebar() {
    if (!selectedLevel) {
      return null;
    }

    return (
      <View style={styles.sidebarPanel}>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarHeaderCopy}>
            <Text style={styles.sidebarLabel}>course.panel()</Text>
            <Text style={styles.sidebarTitle}>Niveles y unidades</Text>
          </View>

          <Pressable style={styles.sidebarToggleButton} onPress={() => setSidebarVisible(false)}>
            <Text style={styles.sidebarToggleButtonText}>OCULTAR</Text>
          </Pressable>
        </View>

        <View style={styles.sidebarSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>niveles</Text>
            <Text style={styles.panelMeta}>{`${courseLevels.length} niveles`}</Text>
          </View>

          <View style={styles.sidebarLevelList}>
            {courseLevels.map((level) => {
              const isSelected = level.id === selectedLevel?.id;

              return (
                <Pressable
                  key={level.id}
                  style={[
                    styles.levelChip,
                    styles.sidebarLevelChip,
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
          </View>
        </View>

        <View style={styles.sidebarSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>panel de unidades</Text>
            <Text style={styles.panelMeta}>ruta lateral</Text>
          </View>

          <Text style={styles.sidebarObjective}>{selectedLevel.objective}</Text>

          <View style={styles.unitList}>
            {queuedUnits.map((unit) => {
              const isSelected = unit.id === selectedUnit?.id;
              const isCurrent = unit.id === autoCurrentUnit?.id;

              return (
                <Pressable
                  key={unit.id}
                  style={[
                    styles.unitCard,
                    styles.sidebarUnitCard,
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
          </View>

          {completedUnits.length ? (
            <View style={styles.completedUnitsShell}>
              <Pressable
                style={styles.completedUnitsToggle}
                onPress={() => setCompletedUnitsExpanded((value) => !value)}>
                <View style={styles.completedUnitsCopy}>
                  <Text style={styles.completedUnitsTitle}>unidades terminadas</Text>
                  <Text style={styles.completedUnitsMeta}>{`${completedUnits.length} completadas`}</Text>
                </View>

                <Text style={styles.completedUnitsAction}>{completedUnitsExpanded ? 'OCULTAR' : 'VER'}</Text>
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
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={[styles.workspace, isWideLayout && sidebarVisible && styles.workspaceWide]}>
          {isWideLayout && sidebarVisible ? <View style={styles.sidebarDockInline}>{renderSidebar()}</View> : null}

          <View style={styles.mainColumn}>
            {selectedLevel ? (
              <View style={styles.pathHeroCard}>
                <View style={styles.pathHeroTopRow}>
                  <Pressable
                    style={[styles.pathHeroToggle, sidebarVisible && styles.pathHeroToggleActive]}
                    onPress={() => setSidebarVisible((value) => !value)}>
                    <Text style={styles.pathHeroToggleText}>
                      {sidebarVisible ? 'OCULTAR PANEL' : 'VER PANEL'}
                    </Text>
                  </Pressable>

                  <Text style={styles.pathHeroLabel}>{selectedLevel.name}</Text>
                </View>

                <Text style={styles.pathHeroTitle}>{selectedUnit?.title || autoCurrentUnit?.title || 'Sin unidad activa'}</Text>
                <Text style={styles.pathHeroText}>
                  {autoCurrentLesson
                    ? `Leccion actual: L${autoCurrentLesson.lessonNumber} · ${autoCurrentLesson.title}`
                    : 'Elige una leccion del camino para ver su detalle y empezar.'}
                </Text>

                <View style={styles.pathHeroStats}>
                  <View style={styles.pathHeroStatCard}>
                    <Text style={styles.pathHeroStatLabel}>unidad actual</Text>
                    <Text style={styles.pathHeroStatValue}>
                      {autoCurrentUnit ? `U${autoCurrentUnit.unitNumber}` : 'Pendiente'}
                    </Text>
                  </View>

                  <View style={styles.pathHeroStatCard}>
                    <Text style={styles.pathHeroStatLabel}>leccion actual</Text>
                    <Text style={styles.pathHeroStatValue}>
                      {autoCurrentLesson ? `L${autoCurrentLesson.lessonNumber}` : 'Pendiente'}
                    </Text>
                  </View>

                  <View style={styles.pathHeroStatCard}>
                    <Text style={styles.pathHeroStatLabel}>progreso</Text>
                    <Text style={styles.pathHeroStatValue}>{`${selectedLevel.progressPercent}%`}</Text>
                  </View>
                </View>

                {autoCurrentLesson && autoCurrentExercise ? (
                  <Pressable style={styles.focusStartButton} onPress={() => openLesson(autoCurrentLesson)}>
                    <Text style={styles.focusStartButtonText}>EMPEZAR CLASE</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {selectedUnit ? (
              <View style={styles.pathPanel}>
                <View style={styles.pathPanelHeader}>
                  <View style={styles.pathPanelCopy}>
                    <Text style={styles.panelTitle}>camino de la unidad</Text>
                    <Text style={styles.pathPanelMeta}>
                      {`Unidad ${selectedUnit.unitNumber} · ${selectedUnit.lessonCount} lecciones`}
                    </Text>
                  </View>
                </View>

                <View style={styles.pathShell}>
                  <View style={styles.pathRail} />

                  {selectedUnit.lessons.map((lesson, index) => {
                    const offset = pathOffsets[index % pathOffsets.length];

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
                  Toca una leccion del camino para ver su enfoque y abrirla sin salir de esta ruta.
                </Text>
              </View>
            ) : null}
          </View>

          {!isWideLayout && sidebarVisible ? (
            <View style={styles.sidebarDockOverlay}>
              <Pressable style={styles.sidebarBackdrop} onPress={() => setSidebarVisible(false)} />
              <View style={styles.sidebarOverlaySheet}>{renderSidebar()}</View>
            </View>
          ) : null}
        </View>
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
  },
  workspace: {
    position: 'relative',
    gap: 18,
  },
  workspaceWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    gap: 18,
    zIndex: 1,
    flex: 1,
  },
  pathHeroCard: {
    backgroundColor: '#0F1D32',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 20,
    gap: 16,
  },
  pathHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  pathHeroToggle: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pathHeroToggleActive: {
    backgroundColor: '#13304F',
  },
  pathHeroToggleText: {
    color: DuocodePalette.accent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathHeroLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathHeroTitle: {
    color: DuocodePalette.text,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathHeroText: {
    color: '#D2E1F7',
    fontSize: 14,
    lineHeight: 21,
  },
  pathHeroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pathHeroStatCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#132B45',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  pathHeroStatLabel: {
    color: '#A9C5E8',
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  pathHeroStatValue: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathPanel: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 20,
    gap: 18,
  },
  pathPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  pathPanelCopy: {
    flex: 1,
    gap: 4,
  },
  pathPanelMeta: {
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  sidebarDockInline: {
    width: 336,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  sidebarDockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent: 'flex-start',
  },
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.48)',
  },
  sidebarOverlaySheet: {
    width: '86%',
    maxWidth: 360,
    paddingTop: 4,
  },
  sidebarPanel: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 18,
    gap: 18,
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sidebarHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sidebarLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  sidebarTitle: {
    color: DuocodePalette.text,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  sidebarToggleButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidebarToggleButtonText: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  sidebarSection: {
    gap: 12,
  },
  sidebarLevelList: {
    gap: 10,
  },
  sidebarLevelChip: {
    minWidth: 0,
    width: '100%',
  },
  sidebarObjective: {
    color: '#C8D8EE',
    fontSize: 13,
    lineHeight: 19,
  },
  sidebarUnitCard: {
    borderRadius: 20,
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
