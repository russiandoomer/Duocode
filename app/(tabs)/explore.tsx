import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import type { LearnerExercise, LearnerTopic } from '@/types/duocode';

const PATH_OFFSETS = [0, 48, 82, 48, 0, -48, -82, -48];

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>loading.classes()</Text>
        <Text style={styles.loadingText}>Estamos organizando tus clases por stack y tecnologia.</Text>
      </View>
    </ScrollView>
  );
}

function getTopicStack(topic: LearnerTopic) {
  const title = topic.title.toLowerCase();

  if (title.includes('react')) {
    return { label: 'react', flavor: 'componentes + estado', glyph: '<>' };
  }

  if (title.includes('deploy')) {
    return { label: 'deploy', flavor: 'railway + vercel', glyph: 'git' };
  }

  if (title.includes('api')) {
    return { label: 'api', flavor: 'http + json', glyph: 'api' };
  }

  if (title.includes('javascript') || title.includes('js')) {
    return { label: 'javascript', flavor: 'fundamentos + funciones', glyph: 'js' };
  }

  return { label: 'code', flavor: 'logica + practica', glyph: '</>' };
}

function buildLessonMeta(exercise: LearnerExercise) {
  if (exercise.completed) {
    return `${exercise.xpReward} XP · clase completada`;
  }

  if (exercise.bestScore > 0) {
    return `${exercise.xpReward} XP · avance ${exercise.bestScore}%`;
  }

  return `${exercise.xpReward} XP · clase pendiente`;
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[]; exerciseId?: string | string[] }>();
  const { dashboard, loading } = useLearnerDashboard();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;

  useEffect(() => {
    if (!dashboard?.topics.length) {
      setSelectedTopicId(null);
      return;
    }

    setSelectedTopicId((current) => {
      if (
        requestedTopicId &&
        dashboard.topics.some((topic) => topic.id === requestedTopicId) &&
        current !== requestedTopicId
      ) {
        return requestedTopicId;
      }

      if (current && dashboard.topics.some((topic) => topic.id === current)) {
        return current;
      }

      return dashboard.topics[0].id;
    });
  }, [dashboard, requestedTopicId]);

  const selectedTopic =
    dashboard?.topics.find((topic) => topic.id === selectedTopicId) || dashboard?.topics[0] || null;

  useEffect(() => {
    if (!selectedTopic?.exercises.length) {
      setSelectedExerciseId(null);
      return;
    }

    const defaultExercise =
      selectedTopic.exercises.find((exercise) => exercise.id === requestedExerciseId) ||
      selectedTopic.exercises.find((exercise) => !exercise.completed) ||
      selectedTopic.exercises[0];

    setSelectedExerciseId((current) => {
      if (current && selectedTopic.exercises.some((exercise) => exercise.id === current)) {
        return current;
      }

      return defaultExercise.id;
    });
  }, [requestedExerciseId, selectedTopic]);

  const selectedExercise =
    selectedTopic?.exercises.find((exercise) => exercise.id === selectedExerciseId) ||
    selectedTopic?.exercises[0] ||
    null;

  const selectedStack = selectedTopic ? getTopicStack(selectedTopic) : null;
  const selectedObjectives = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    const objectives = new Set<string>();

    selectedTopic.exercises.forEach((exercise) => {
      exercise.instructions.forEach((instruction) => {
        if (objectives.size < 4) {
          objectives.add(instruction);
        }
      });
    });

    return Array.from(objectives);
  }, [selectedTopic]);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleOpenPractice() {
    if (!selectedTopic || !selectedExercise) {
      return;
    }

    router.push({
      pathname: '/(tabs)/game',
      params: {
        topicId: selectedTopic.id,
        exerciseId: selectedExercise.id,
      },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>classes.catalog()</Text>
        <Text style={styles.heroTitle}>Clases por tecnologia</Text>
        <Text style={styles.heroSubtitle}>
          Aqui eliges que tema estudiar. `Practica` queda aparte para repetir lo que ya aprendiste y volver a resolverlo cuando quieras.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>tracks</Text>
          <Text style={styles.sectionMeta}>{`${dashboard.topics.length} clases base`}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRow}>
          {dashboard.topics.map((topic) => {
            const isSelected = topic.id === selectedTopic?.id;
            const stack = getTopicStack(topic);

            return (
              <Pressable
                key={topic.id}
                style={[styles.trackCard, isSelected && styles.trackCardSelected]}
                onPress={() => setSelectedTopicId(topic.id)}>
                <Text style={[styles.trackBadge, isSelected && styles.trackBadgeSelected]}>{stack.label}</Text>
                <Text style={styles.trackTitle}>{topic.title}</Text>
                <Text style={styles.trackFlavor}>{stack.flavor}</Text>
                <Text style={styles.trackStats}>{`${topic.exerciseCount} lecciones · ${topic.estimatedMinutes} min`}</Text>
                <View style={styles.trackProgress}>
                  <View style={[styles.trackProgressFill, { width: `${topic.progressPercent}%` }]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {selectedTopic ? (
        <View style={styles.sectionCard}>
          <View style={styles.classHeaderRow}>
            <View style={styles.classHeaderText}>
              <Text style={styles.classLabel}>{selectedStack?.label || 'code'}</Text>
              <Text style={styles.classTitle}>{selectedTopic.title}</Text>
              <Text style={styles.classSubtitle}>{selectedTopic.description}</Text>
            </View>

            <View style={styles.classBadge}>
              <Text style={styles.classBadgeValue}>{`${selectedTopic.progressPercent}%`}</Text>
              <Text style={styles.classBadgeText}>avance</Text>
            </View>
          </View>

          <View style={styles.classInfoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>estado</Text>
              <Text style={styles.infoValue}>{selectedTopic.status}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>lecciones</Text>
              <Text style={styles.infoValue}>{`${selectedTopic.completedExercises}/${selectedTopic.exerciseCount}`}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>stack</Text>
              <Text style={styles.infoValue}>{selectedStack?.flavor || 'fundamentals'}</Text>
            </View>
          </View>

          <View style={styles.objectiveBox}>
            <Text style={styles.objectiveTitle}>objetivos_de_clase</Text>
            {selectedObjectives.map((objective) => (
              <Text key={objective} style={styles.objectiveLine}>
                {`> ${objective}`}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {selectedTopic ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ruta de clase</Text>
            <Text style={styles.sectionMeta}>{selectedTopic.title}</Text>
          </View>

          <View style={styles.pathShell}>
            <View style={styles.pathRail} />

            {selectedTopic.exercises.map((exercise, index) => {
              const offset = PATH_OFFSETS[index % PATH_OFFSETS.length];
              const isSelected = exercise.id === selectedExercise?.id;

              return (
                <View key={exercise.id} style={styles.lessonRow}>
                  {offset !== 0 ? (
                    <View
                      style={[
                        styles.traceLine,
                        offset > 0 ? styles.traceRight : styles.traceLeft,
                        { width: Math.abs(offset) },
                      ]}
                    />
                  ) : null}

                  <NeonLessonNode
                    glyph={selectedStack?.glyph || '</>'}
                    label={exercise.title}
                    meta={buildLessonMeta(exercise)}
                    isCurrent={isSelected}
                    isCompleted={exercise.completed}
                    isLocked={false}
                    showStartTag={isSelected}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    style={{ transform: [{ translateX: offset }] }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {selectedExercise ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>detalle de clase</Text>
            <Text style={styles.sectionMeta}>{selectedExercise.functionName}</Text>
          </View>

          <Text style={styles.exercisePrompt}>{selectedExercise.prompt}</Text>

          <View style={styles.objectiveBox}>
            <Text style={styles.objectiveTitle}>pasos_de_la_leccion</Text>
            {selectedExercise.instructions.map((instruction) => (
              <Text key={instruction} style={styles.objectiveLine}>
                {`> ${instruction}`}
              </Text>
            ))}
          </View>

          <View style={styles.previewCodeBox}>
            {selectedExercise.starterCode.split('\n').map((line, index) => (
              <Text key={`${selectedExercise.id}-starter-${index + 1}`} style={styles.previewCodeLine}>
                {line || ' '}
              </Text>
            ))}
          </View>

          <Pressable style={styles.practiceButton} onPress={handleOpenPractice}>
            <Text style={styles.practiceButtonText}>INICIAR LECCION EN LABORATORIO</Text>
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
  heroSubtitle: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  sectionMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  trackRow: {
    gap: 12,
  },
  trackCard: {
    width: 226,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
  },
  trackCardSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  trackBadge: {
    alignSelf: 'flex-start',
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    backgroundColor: '#10253F',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trackBadgeSelected: {
    color: DuocodePalette.accent,
  },
  trackTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  trackFlavor: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  trackStats: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  trackProgress: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#10253F',
    overflow: 'hidden',
  },
  trackProgressFill: {
    height: '100%',
    backgroundColor: DuocodePalette.accent,
  },
  classHeaderRow: {
    flexDirection: 'row',
    gap: 14,
  },
  classHeaderText: {
    flex: 1,
    gap: 4,
  },
  classLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  classTitle: {
    color: DuocodePalette.text,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  classSubtitle: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  classBadge: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  classBadgeValue: {
    color: DuocodePalette.accent,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  classBadgeText: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  classInfoRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  infoBox: {
    flex: 1,
    minWidth: 110,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  infoLabel: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  infoValue: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  objectiveBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  objectiveTitle: {
    color: DuocodePalette.surface,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  objectiveLine: {
    color: DuocodePalette.code,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.mono,
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
    position: 'relative',
  },
  traceLine: {
    position: 'absolute',
    top: 47,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#163252',
  },
  traceLeft: {
    right: '50%',
  },
  traceRight: {
    left: '50%',
  },
  exercisePrompt: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
  },
  previewCodeBox: {
    backgroundColor: DuocodePalette.navySoft,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  previewCodeLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  practiceButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  practiceButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
