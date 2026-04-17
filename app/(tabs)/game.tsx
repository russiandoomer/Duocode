import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { BrandMark } from '@/components/brand/brand-mark';
import { CodeCelebrationOverlay } from '@/components/duocode/code-celebration-overlay';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import type { ExerciseEvaluationResponse } from '@/types/duocode';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>loading.practice()</Text>
        <Text style={styles.panelBodyText}>
          Estamos preparando tus temas, ejercicios y tests del reto.
        </Text>
      </View>
    </ScrollView>
  );
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ topicId?: string | string[]; exerciseId?: string | string[] }>();
  const { dashboard, loading, evaluateExercise } = useLearnerDashboard();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [hydratedExerciseId, setHydratedExerciseId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ExerciseEvaluationResponse | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId)
    ? params.exerciseId[0]
    : params.exerciseId;

  useEffect(() => {
    if (!dashboard?.topics.length) {
      setSelectedTopicId(null);
      return;
    }

    const preferredTopic =
      dashboard.topics.find((topic) => topic.exercises.some((exercise) => !exercise.completed)) ||
      dashboard.topics[0];

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

      return preferredTopic.id;
    });
  }, [dashboard, requestedTopicId]);

  const selectedTopic =
    dashboard?.topics.find((topic) => topic.id === selectedTopicId) || dashboard?.topics[0] || null;

  useEffect(() => {
    if (!selectedTopic?.exercises.length) {
      setSelectedExerciseId(null);
      return;
    }

    const preferredExercise =
      selectedTopic.exercises.find((exercise) => !exercise.completed) || selectedTopic.exercises[0];

    setSelectedExerciseId((current) => {
      if (
        requestedExerciseId &&
        selectedTopic.exercises.some((exercise) => exercise.id === requestedExerciseId) &&
        current !== requestedExerciseId
      ) {
        return requestedExerciseId;
      }

      if (current && selectedTopic.exercises.some((exercise) => exercise.id === current)) {
        return current;
      }

      return preferredExercise.id;
    });
  }, [requestedExerciseId, selectedTopic]);

  const selectedExercise =
    selectedTopic?.exercises.find((exercise) => exercise.id === selectedExerciseId) ||
    selectedTopic?.exercises[0] ||
    null;

  useEffect(() => {
    if (!selectedExercise) {
      setEditorCode('');
      setEvaluation(null);
      setHydratedExerciseId(null);
      return;
    }

    if (hydratedExerciseId !== selectedExercise.id) {
      setEditorCode(selectedExercise.lastSubmittedCode || selectedExercise.starterCode);
      setEvaluation(null);
      setHydratedExerciseId(selectedExercise.id);
    }
  }, [hydratedExerciseId, selectedExercise]);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  async function handleRunTests() {
    if (!selectedExercise) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await evaluateExercise(selectedExercise.id, editorCode);
      setEvaluation(response);
      if (response.passed) {
        setCelebrationVisible(true);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo evaluar el reto');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (!selectedExercise) {
      return;
    }

    setEditorCode(selectedExercise.starterCode);
    setEvaluation(null);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.heroRow}>
          <BrandMark label={dashboard.settings.branding.logoLabel} size={72} />

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>practice-lab.ts</Text>
            <Text style={styles.heroSubtitle}>
              {selectedTopic ? `${selectedTopic.title} · ${selectedTopic.progressPercent}%` : 'Sin tema'}
            </Text>
            <Text style={styles.heroMeta}>
              {selectedExercise
                ? `target=${selectedExercise.functionName} · reward=${selectedExercise.xpReward}xp`
                : 'target=none'}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelChrome}>
            <Text style={styles.panelChromeText}>topics.index()</Text>
          </View>

          <Text style={styles.panelTitle}>topics</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
            {dashboard.topics.map((topic) => {
              const isSelected = topic.id === selectedTopic?.id;

              return (
                <Pressable
                  key={topic.id}
                  style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                  onPress={() => setSelectedTopicId(topic.id)}>
                  <Text style={[styles.topicChipText, isSelected && styles.topicChipTextSelected]}>
                    {topic.title}
                  </Text>
                  <Text style={[styles.topicChipMeta, isSelected && styles.topicChipMetaSelected]}>
                    {`${topic.completedExercises}/${topic.exerciseCount}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {selectedTopic ? (
          <View style={styles.panel}>
            <View style={styles.panelChrome}>
              <Text style={styles.panelChromeText}>lessons.route()</Text>
            </View>

            <Text style={styles.panelTitle}>challenge_list</Text>

            {selectedTopic.exercises.map((exercise) => {
              const isSelected = exercise.id === selectedExercise?.id;

              return (
                <Pressable
                  key={exercise.id}
                  style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                  onPress={() => setSelectedExerciseId(exercise.id)}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseTitleWrap}>
                      <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                      <Text style={styles.exerciseMeta}>{`${exercise.xpReward} XP · score ${exercise.bestScore}%`}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        exercise.completed ? styles.statusBadgeSuccess : styles.statusBadgePending,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          exercise.completed ? styles.statusTextSuccess : styles.statusTextPending,
                        ]}>
                        {exercise.completed ? 'OK' : 'TODO'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {selectedExercise ? (
          <>
            <View style={styles.panel}>
              <View style={styles.panelChrome}>
                <Text style={styles.panelChromeText}>briefing.packet()</Text>
              </View>

              <Text style={styles.panelTitle}>challenge_brief</Text>
              <Text style={styles.promptText}>{selectedExercise.prompt}</Text>

              <View style={styles.instructionsBox}>
                {selectedExercise.instructions.map((instruction) => (
                  <Text key={instruction} style={styles.instructionText}>
                    {`> ${instruction}`}
                  </Text>
                ))}
              </View>

              <View style={styles.exerciseInfoRow}>
                <View style={styles.exerciseInfoCard}>
                  <Text style={styles.exerciseInfoLabel}>funcion</Text>
                  <Text style={styles.exerciseInfoValue}>{selectedExercise.functionName}</Text>
                </View>

                <View style={styles.exerciseInfoCard}>
                  <Text style={styles.exerciseInfoLabel}>estado</Text>
                  <Text style={styles.exerciseInfoValue}>
                    {selectedExercise.completed ? 'Completado' : 'En practica'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelChrome}>
                <Text style={styles.panelChromeText}>editor.runtime()</Text>
              </View>

              <View style={styles.editorHeader}>
                <Text style={styles.panelTitle}>write_code</Text>

                <View style={styles.editorActions}>
                  <Pressable style={styles.secondaryButton} onPress={handleReset}>
                    <Text style={styles.secondaryButtonText}>RESET</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                    onPress={handleRunTests}
                    disabled={submitting}>
                    <Text style={styles.primaryButtonText}>
                      {submitting ? 'RUNNING...' : 'RUN TESTS'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.editorShell}>
                <View style={styles.editorGutter}>
                  {editorCode.split('\n').map((_, index) => (
                    <Text key={`${selectedExercise.id}-line-${index + 1}`} style={styles.gutterLine}>
                      {index + 1}
                    </Text>
                  ))}
                </View>

                <TextInput
                  value={editorCode}
                  onChangeText={setEditorCode}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textAlignVertical="top"
                  style={styles.editorInput}
                />
              </View>
            </View>

            {evaluation ? (
              <View style={styles.panel}>
                <View style={styles.panelChrome}>
                  <Text style={styles.panelChromeText}>
                    {evaluation.passed ? 'compiler.pass()' : 'compiler.fail()'}
                  </Text>
                </View>

                <View style={styles.resultHeader}>
                  <View>
                    <Text style={styles.panelTitle}>feedback</Text>
                    <Text style={styles.panelBodyText}>
                      {evaluation.passed
                        ? 'Tu solucion paso todos los tests.'
                        : 'Tu solucion todavia falla en algunos tests.'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.resultBadge,
                      evaluation.passed ? styles.resultBadgeSuccess : styles.resultBadgeError,
                    ]}>
                    <Text style={styles.resultBadgeText}>{`${evaluation.score}%`}</Text>
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>resultado_recibido</Text>
                  <Text style={styles.previewValue}>{evaluation.previewResult || 'Sin salida visible'}</Text>
                </View>

                {evaluation.tests.map((test) => (
                  <View key={test.label} style={styles.testCard}>
                    <View style={styles.testHeader}>
                      <Text style={styles.testTitle}>{test.label}</Text>
                      <Text style={[styles.testStatus, test.pass ? styles.testStatusPass : styles.testStatusFail]}>
                        {test.pass ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>

                    <Text style={styles.testLine}>{`args: ${test.argsPreview}`}</Text>
                    <Text style={styles.testLine}>{`esperado: ${test.expectedPreview}`}</Text>
                    <Text style={styles.testLine}>{`recibido: ${test.receivedPreview}`}</Text>

                    {test.consoleOutput.length ? (
                      <View style={styles.consoleBox}>
                        {test.consoleOutput.map((line) => (
                          <Text key={`${test.label}-${line}`} style={styles.consoleLine}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}

                <View style={styles.solutionCard}>
                  <Text style={styles.solutionLabel}>solucion_correcta</Text>
                  <Text style={styles.solutionCode}>{evaluation.correctSolution}</Text>
                </View>

                <View style={styles.explanationCard}>
                  <Text style={styles.solutionLabel}>explicacion</Text>
                  <Text style={styles.explanationText}>{evaluation.explanation}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>challenge_brief</Text>
            <Text style={styles.panelBodyText}>No hay ejercicios disponibles para este usuario.</Text>
          </View>
        )}
      </ScrollView>

      <CodeCelebrationOverlay
        visible={celebrationVisible && Boolean(evaluation?.passed && selectedExercise)}
        title={selectedExercise?.title || 'Lesson complete'}
        score={evaluation?.score || 0}
        xpReward={selectedExercise?.xpReward || 0}
        onDismiss={() => setCelebrationVisible(false)}
      />
    </View>
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: DuocodePalette.surface,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroSubtitle: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontFamily: Fonts.mono,
    marginTop: 4,
  },
  heroMeta: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
    marginTop: 6,
  },
  panel: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    overflow: 'hidden',
  },
  panelChrome: {
    alignSelf: 'flex-start',
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  panelChromeText: {
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  panelTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  panelBodyText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  topicRow: {
    gap: 12,
  },
  topicChip: {
    minWidth: 170,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  topicChipSelected: {
    backgroundColor: DuocodePalette.accentSoft,
    borderColor: DuocodePalette.accent,
  },
  topicChipText: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  topicChipTextSelected: {
    color: DuocodePalette.accent,
  },
  topicChipMeta: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  topicChipMetaSelected: {
    color: DuocodePalette.code,
  },
  exerciseCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
  },
  exerciseCardSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  exerciseTitleWrap: {
    flex: 1,
    gap: 4,
  },
  exerciseTitle: {
    color: DuocodePalette.text,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  exerciseMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeSuccess: {
    backgroundColor: '#0D2B1A',
  },
  statusBadgePending: {
    backgroundColor: '#35260B',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  statusTextSuccess: {
    color: DuocodePalette.green,
  },
  statusTextPending: {
    color: DuocodePalette.amber,
  },
  promptText: {
    color: DuocodePalette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  instructionsBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
  },
  instructionText: {
    color: DuocodePalette.code,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.mono,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseInfoCard: {
    flex: 1,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  exerciseInfoLabel: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  exerciseInfoValue: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  primaryButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  editorInput: {
    minHeight: 280,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.mono,
  },
  editorShell: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 280,
  },
  editorGutter: {
    width: 46,
    backgroundColor: '#08111D',
    borderRightWidth: 1,
    borderRightColor: DuocodePalette.border,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 8,
  },
  gutterLine: {
    color: '#57708D',
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resultBadge: {
    minWidth: 76,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resultBadgeSuccess: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
  },
  resultBadgeError: {
    backgroundColor: DuocodePalette.redSoft,
  },
  resultBadgeText: {
    color: DuocodePalette.surface,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  previewCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 16,
    gap: 6,
  },
  previewLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  previewValue: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  testCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 16,
    gap: 8,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  testTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  testStatusPass: {
    color: DuocodePalette.green,
  },
  testStatusFail: {
    color: DuocodePalette.red,
  },
  testLine: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.mono,
  },
  consoleBox: {
    backgroundColor: DuocodePalette.navySoft,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
  },
  consoleLine: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  solutionCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 16,
    gap: 10,
  },
  explanationCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 16,
    gap: 10,
  },
  solutionLabel: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  solutionCode: {
    color: DuocodePalette.text,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  explanationText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
