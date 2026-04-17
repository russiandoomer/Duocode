import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NeonLessonNode } from '@/components/duocode/neon-lesson-node';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import type { LearnerExercise, LearnerTopic } from '@/types/duocode';

const PATH_OFFSETS = [0, 54, 92, 54, 0, -54, -92, -54];
const CODE_GLYPHS = ['</>', 'fn', '{}', '[]', 'map', 'api', 'git', 'db'];

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>loading roadmap...</Text>
        <Text style={styles.loadingText}>Estamos armando tu ruta visual de lecciones.</Text>
      </View>
    </ScrollView>
  );
}

function normalizeGlyph(exercise: LearnerExercise, index: number) {
  const functionName = exercise.functionName.toLowerCase();

  if (functionName.includes('array')) {
    return '[]';
  }

  if (functionName.includes('label')) {
    return 'txt';
  }

  if (functionName.includes('task')) {
    return 'map';
  }

  if (functionName.includes('deploy')) {
    return 'git';
  }

  if (functionName.includes('env')) {
    return 'env';
  }

  return CODE_GLYPHS[index % CODE_GLYPHS.length];
}

export default function ExploreScreen() {
  const router = useRouter();
  const { dashboard, loading } = useLearnerDashboard();

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  const { topics, user } = dashboard;
  const allLessons = topics.flatMap((topic) => topic.exercises.map((exercise) => ({ topic, exercise })));
  const firstPendingIndex = allLessons.findIndex((entry) => !entry.exercise.completed);
  const activeTopic =
    topics.find((topic) => topic.exercises.some((exercise) => !exercise.completed)) || topics[0] || null;

  const timelineItems: (
    | { type: 'section'; topic: LearnerTopic; topicIndex: number }
    | {
        type: 'lesson';
        topic: LearnerTopic;
        exercise: LearnerExercise;
        topicIndex: number;
        globalIndex: number;
      }
    | { type: 'checkpoint'; topic: LearnerTopic; topicIndex: number }
  )[] = [];

  let globalIndex = 0;

  topics.forEach((topic, topicIndex) => {
    timelineItems.push({ type: 'section', topic, topicIndex });

    topic.exercises.forEach((exercise) => {
      timelineItems.push({
        type: 'lesson',
        topic,
        exercise,
        topicIndex,
        globalIndex,
      });
      globalIndex += 1;
    });

    if (topicIndex < topics.length - 1) {
      timelineItems.push({
        type: 'checkpoint',
        topic,
        topicIndex,
      });
    }
  });

  function handleLessonPress(topic: LearnerTopic, exercise: LearnerExercise, isLocked: boolean) {
    if (isLocked) {
      Alert.alert('duocode', 'Completa la leccion actual para desbloquear la siguiente.');
      return;
    }

    router.push({
      pathname: '/(tabs)/game',
      params: {
        topicId: topic.id,
        exerciseId: exercise.id,
      },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.gridBackdrop} />

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerLabel}>
            {activeTopic ? `TRACK ACTIVO · ${activeTopic.status.toUpperCase()}` : 'TRACK ACTIVO'}
          </Text>
          <Text style={styles.headerTitle}>{activeTopic?.title || user.track}</Text>
          <Text style={styles.headerSubtitle}>
            {activeTopic
              ? `${activeTopic.completedExercises}/${activeTopic.exerciseCount} lecciones · ${activeTopic.estimatedMinutes} min`
              : user.focus}
          </Text>
        </View>

        <Pressable
          style={styles.guideButton}
          onPress={() => Alert.alert('duocode', activeTopic?.description || user.focus)}>
          <Text style={styles.guideButtonText}>GUIA</Text>
        </Pressable>
      </View>

      <View style={styles.pathShell}>
        <View style={styles.pathRail} />

        {timelineItems.map((item) => {
          if (item.type === 'section') {
            return (
              <View key={`section-${item.topic.id}`} style={styles.sectionDivider}>
                <View style={styles.sectionDividerLine} />
                <Text style={styles.sectionDividerText}>{item.topic.title}</Text>
                <View style={styles.sectionDividerLine} />
              </View>
            );
          }

          if (item.type === 'checkpoint') {
            const checkpointOffset = item.topicIndex % 2 === 0 ? -76 : 76;

            return (
              <View key={`checkpoint-${item.topic.id}`} style={styles.lessonRow}>
                <View
                  style={[
                    styles.traceLine,
                    checkpointOffset >= 0 ? styles.traceRight : styles.traceLeft,
                    { width: Math.abs(checkpointOffset) },
                  ]}
                />

                <View style={[styles.checkpointWrap, { transform: [{ translateX: checkpointOffset }] }]}>
                  <View style={styles.checkpointNode}>
                    <Text style={styles.checkpointNodeText}>XP</Text>
                  </View>
                  <Text style={styles.lessonLabel}>checkpoint</Text>
                </View>
              </View>
            );
          }

          const offset = PATH_OFFSETS[item.globalIndex % PATH_OFFSETS.length];
          const isCurrent = firstPendingIndex === -1 ? false : item.globalIndex === firstPendingIndex;
          const isLocked = firstPendingIndex === -1 ? false : item.globalIndex > firstPendingIndex;
          const glyph = isLocked ? '--' : normalizeGlyph(item.exercise, item.globalIndex);

          return (
            <View key={item.exercise.id} style={styles.lessonRow}>
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
                glyph={glyph}
                label={item.exercise.title}
                meta={
                  isLocked
                    ? 'bloqueado'
                    : item.exercise.completed
                      ? `${item.exercise.xpReward} XP · completado`
                      : `${item.exercise.xpReward} XP · en curso`
                }
                isCurrent={isCurrent}
                isCompleted={item.exercise.completed}
                isLocked={isLocked}
                showStartTag={isCurrent}
                onPress={() => handleLessonPress(item.topic, item.exercise, isLocked)}
                style={{ transform: [{ translateX: offset }] }}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.toolboxCard}>
        <Text style={styles.toolboxTitle}>dev_toolbox</Text>
        <Text style={styles.toolboxText}>
          Ruta inspirada en Duolingo, pero convertida en roadmap de codigo con nodos neon, pulsos de compilacion, checkpoints XP y progreso real por leccion.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
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
  headerCard: {
    backgroundColor: '#0F1D32',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  gridBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'transparent',
    borderRadius: 24,
    opacity: 0.6,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
    zIndex: 1,
  },
  headerLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  headerTitle: {
    color: DuocodePalette.surface,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  headerSubtitle: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.mono,
  },
  guideButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 1,
  },
  guideButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  pathShell: {
    position: 'relative',
    paddingVertical: 10,
    paddingBottom: 20,
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
    shadowColor: DuocodePalette.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DuocodePalette.border,
  },
  sectionDividerText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  lessonRow: {
    height: 132,
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
  lessonLabel: {
    color: DuocodePalette.surface,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: Fonts.mono,
  },
  lessonMeta: {
    color: DuocodePalette.muted,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Fonts.mono,
  },
  checkpointWrap: {
    alignItems: 'center',
    gap: 6,
    width: 132,
  },
  checkpointNode: {
    width: 74,
    height: 74,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C2942',
    borderWidth: 1,
    borderColor: '#4D6382',
  },
  checkpointNodeText: {
    color: DuocodePalette.amber,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  toolboxCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 8,
  },
  toolboxTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  toolboxText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
