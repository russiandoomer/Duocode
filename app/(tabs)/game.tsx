import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { CodeCelebrationOverlay } from '@/components/duocode/code-celebration-overlay';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { extractChoiceSelection, getChoiceOption } from '@/lib/duocode-curriculum';
import type { ExerciseEvaluationResponse, LearnerExercise } from '@/types/duocode';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>loading.practice()</Text>
        <Text style={styles.panelBodyText}>
          Estamos preparando tus temas, ejercicios y tests del laboratorio.
        </Text>
      </View>
    </ScrollView>
  );
}

function isExerciseReviewed(exercise: LearnerExercise) {
  return (
    exercise.completed ||
    exercise.bestScore > 0 ||
    exercise.lastSubmittedCode.trim() !== exercise.starterCode.trim()
  );
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[]; exerciseId?: string | string[] }>();
  const { dashboard, loading, evaluateExercise } = useLearnerDashboard();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [hydratedExerciseId, setHydratedExerciseId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ExerciseEvaluationResponse | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const allTopics = useMemo(() => dashboard?.topics || [], [dashboard?.topics]);
  const requestedTopicFromAll = allTopics.find((topic) => topic.id === requestedTopicId) || null;
  const requestedExerciseFromAll =
    requestedTopicFromAll?.exercises.find((exercise) => exercise.id === requestedExerciseId) || null;

  const practiceTopics = useMemo(() => {
    if (!allTopics.length) {
      return [];
    }

    const reviewTopics = allTopics
      .map((topic) => ({
        ...topic,
        exercises: topic.exercises.filter(isExerciseReviewed),
      }))
      .filter((topic) => topic.exercises.length > 0);

    if (!requestedTopicFromAll) {
      return reviewTopics;
    }

    const requestedTopicEntry = {
      ...requestedTopicFromAll,
      exercises: requestedTopicFromAll.exercises,
    };

    const hasRequestedTopic = reviewTopics.some((topic) => topic.id === requestedTopicFromAll.id);

    if (!hasRequestedTopic) {
      return [requestedTopicEntry, ...reviewTopics];
    }

    return reviewTopics.map((topic) => (topic.id === requestedTopicFromAll.id ? requestedTopicEntry : topic));
  }, [allTopics, requestedTopicFromAll]);

  useEffect(() => {
    if (!practiceTopics.length) {
      setSelectedTopicId(null);
      return;
    }

    setSelectedTopicId((current) => {
      if (
        requestedTopicId &&
        practiceTopics.some((topic) => topic.id === requestedTopicId) &&
        current !== requestedTopicId
      ) {
        return requestedTopicId;
      }

      if (current && practiceTopics.some((topic) => topic.id === current)) {
        return current;
      }

      return practiceTopics[0].id;
    });
  }, [practiceTopics, requestedTopicId]);

  const selectedTopic =
    practiceTopics.find((topic) => topic.id === selectedTopicId) || practiceTopics[0] || null;

  const isLessonLaunch = Boolean(
    selectedTopic &&
      selectedExerciseId &&
      requestedTopicFromAll &&
      requestedExerciseFromAll &&
      selectedTopic.id === requestedTopicFromAll.id &&
      selectedExerciseId === requestedExerciseFromAll.id &&
      !isExerciseReviewed(requestedExerciseFromAll)
  );

  useEffect(() => {
    if (!selectedTopic?.exercises.length) {
      setSelectedExerciseId(null);
      return;
    }

    const defaultExercise =
      selectedTopic.exercises.find((exercise) => exercise.id === requestedExerciseId) ||
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

  useEffect(() => {
    if (!selectedExercise) {
      setEditorCode('');
      setSelectedOptionId(null);
      setAnswerText('');
      setEvaluation(null);
      setHydratedExerciseId(null);
      return;
    }

    if (hydratedExerciseId !== selectedExercise.id) {
      setEditorCode(selectedExercise.lastSubmittedCode || selectedExercise.starterCode);
      setSelectedOptionId(
        selectedExercise.mode === 'choice'
          ? selectedExercise.lastSelectedOptionId || extractChoiceSelection(selectedExercise.lastSubmittedCode)
          : null
      );
      setAnswerText(selectedExercise.mode === 'text' ? selectedExercise.lastSubmittedText || '' : '');
      setEvaluation(null);
      setHydratedExerciseId(selectedExercise.id);
    }
  }, [hydratedExerciseId, selectedExercise]);

  const selectedChoiceOption =
    selectedExercise?.mode === 'choice' ? getChoiceOption(selectedExercise, selectedOptionId) : null;
  const correctChoiceOption =
    selectedExercise?.mode === 'choice' && evaluation
      ? getChoiceOption(selectedExercise, evaluation.expectedSelectionId || null)
      : null;

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  async function handleRunTests() {
    if (!selectedExercise) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await evaluateExercise(
        selectedExercise.id,
        selectedExercise.mode === 'choice'
          ? { selectedOptionId }
          : selectedExercise.mode === 'text'
            ? {
                answerText,
              }
            : {
              code: editorCode,
              }
      );
      setEvaluation(response);
      if (response.passed) {
        setCelebrationVisible(true);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo evaluar la practica');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (!selectedExercise) {
      return;
    }

    if (selectedExercise.mode === 'choice') {
      setSelectedOptionId(null);
    } else if (selectedExercise.mode === 'text') {
      setAnswerText('');
    } else {
      setEditorCode(selectedExercise.starterCode);
    }

    setEvaluation(null);
  }

  if (!practiceTopics.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroRow}>
            <BrandMark label={dashboard.settings.branding.logoLabel} size={72} />

            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>practice-replay.ts</Text>
              <Text style={styles.heroSubtitle}>Todavia no tienes clases terminadas para repasar.</Text>
              <Text style={styles.heroMeta}>Completa primero una clase y luego vuelve aqui para repetirla.</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>practice_locked</Text>
            <Text style={styles.panelBodyText}>
              `Clases` ahora es el espacio para estudiar por tecnologia. `Practica` queda reservado para volver a hacer ejercicios que ya viste, revisar tus errores y consolidar memoria.
            </Text>

            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.primaryButtonText}>IR A CLASES</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <BrandMark label={dashboard.settings.branding.logoLabel} size={72} />

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{isLessonLaunch ? 'lesson-lab.ts' : 'practice-replay.ts'}</Text>
            <Text style={styles.heroSubtitle}>
              {selectedTopic
                ? `${selectedTopic.unitTitle} · Leccion ${selectedTopic.lessonNumber} · ${isLessonLaunch ? 'clase activa' : 'repaso guiado'}`
                : 'Sin tema'}
            </Text>
            <Text style={styles.heroMeta}>
              {selectedExercise
                ? `review=${selectedExercise.functionName} · mode=${selectedExercise.lessonTypeLabel} · score=${selectedExercise.bestScore}%`
                : 'review=none'}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelChrome}>
            <Text style={styles.panelChromeText}>{isLessonLaunch ? 'lesson.scope()' : 'practice.scope()'}</Text>
          </View>

          <Text style={styles.panelTitle}>{isLessonLaunch ? 'leccion_activa' : 'repaso_de_lo_aprendido'}</Text>
          <Text style={styles.panelBodyText}>
            {isLessonLaunch
              ? 'Llegaste desde Clases. Aqui puedes resolver la leccion actual en el laboratorio y despues volver a Practica para repetirla cuando ya la hayas trabajado.'
              : 'Aqui solo aparecen ejercicios que ya tocaste antes. Puedes rehacerlos, corregirlos y ver claramente que fallo y cual era la solucion correcta.'}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelChrome}>
            <Text style={styles.panelChromeText}>{isLessonLaunch ? 'topics.current()' : 'topics.reviewable()'}</Text>
          </View>

          <Text style={styles.panelTitle}>{isLessonLaunch ? 'tema y repaso' : 'temas para practicar'}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
            {practiceTopics.map((topic) => {
              const isSelected = topic.id === selectedTopic?.id;

              return (
                <Pressable
                  key={topic.id}
                  style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                  onPress={() => setSelectedTopicId(topic.id)}>
                      <Text style={[styles.topicChipText, isSelected && styles.topicChipTextSelected]}>
                    {`${topic.unitTitle} · L${topic.lessonNumber}`}
                      </Text>
                      <Text style={[styles.topicChipMeta, isSelected && styles.topicChipMetaSelected]}>
                    {`${topic.level} · ${topic.exercises.length} ejercicios · ${topic.progressPercent}%`}
                      </Text>
                    </Pressable>
                  );
            })}
          </ScrollView>
        </View>

        {selectedTopic ? (
          <View style={styles.panel}>
          <View style={styles.panelChrome}>
            <Text style={styles.panelChromeText}>{isLessonLaunch ? 'lesson.queue()' : 'review.queue()'}</Text>
          </View>

          <Text style={styles.panelTitle}>{isLessonLaunch ? 'lecciones del tema' : 'practicas disponibles'}</Text>

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
                      <Text style={styles.exerciseMeta}>
                        {`${exercise.lessonTypeLabel} · ${exercise.xpReward} XP · mejor score ${exercise.bestScore}%`}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, styles.statusBadgeReview]}>
                      <Text style={[styles.statusBadgeText, styles.statusTextReview]}>
                        {exercise.completed ? 'REPLAY' : isLessonLaunch ? 'LECCION' : 'REVISAR'}
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
                <Text style={styles.panelChromeText}>{isLessonLaunch ? 'briefing.lesson()' : 'briefing.replay()'}</Text>
              </View>

              <Text style={styles.panelTitle}>{isLessonLaunch ? 'lesson_brief' : 'practice_brief'}</Text>
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
                  <Text style={styles.exerciseInfoLabel}>modo</Text>
                  <Text style={styles.exerciseInfoValue}>{selectedExercise.lessonTypeLabel}</Text>
                </View>

                <View style={styles.exerciseInfoCard}>
                  <Text style={styles.exerciseInfoLabel}>mejor intento</Text>
                  <Text style={styles.exerciseInfoValue}>{`${selectedExercise.bestScore}%`}</Text>
                </View>
              </View>
            </View>

            {selectedExercise.mode === 'choice' ? (
              <View style={styles.panel}>
                <View style={styles.panelChrome}>
                  <Text style={styles.panelChromeText}>selector.runtime()</Text>
                </View>

                <View style={styles.editorHeader}>
                  <Text style={styles.panelTitle}>choose_answer</Text>

                  <View style={styles.editorActions}>
                    <Pressable style={styles.secondaryButton} onPress={handleReset}>
                      <Text style={styles.secondaryButtonText}>LIMPIAR</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                      onPress={handleRunTests}
                      disabled={submitting}>
                      <Text style={styles.primaryButtonText}>
                        {submitting ? 'CHECKING...' : 'CHECK ANSWER'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.optionList}>
                  {selectedExercise.choiceOptions.map((option) => {
                    const isActive = option.id === selectedOptionId;

                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.optionCard, isActive && styles.optionCardSelected]}
                        onPress={() => setSelectedOptionId(option.id)}>
                        <View style={[styles.optionBullet, isActive && styles.optionBulletSelected]}>
                          <Text style={[styles.optionBulletText, isActive && styles.optionBulletTextSelected]}>
                            {option.label[0]}
                          </Text>
                        </View>

                        <View style={styles.optionCopy}>
                          <Text style={styles.optionTitle}>{option.label}</Text>
                          <Text style={styles.optionDetail}>{option.detail}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : selectedExercise.mode === 'text' ? (
              <View style={styles.panel}>
                <View style={styles.panelChrome}>
                  <Text style={styles.panelChromeText}>answer.runtime()</Text>
                </View>

                <View style={styles.editorHeader}>
                  <Text style={styles.panelTitle}>write_answer</Text>

                  <View style={styles.editorActions}>
                    <Pressable style={styles.secondaryButton} onPress={handleReset}>
                      <Text style={styles.secondaryButtonText}>RESET</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                      onPress={handleRunTests}
                      disabled={submitting}>
                      <Text style={styles.primaryButtonText}>{submitting ? 'CHECKING...' : 'CHECK ANSWER'}</Text>
                    </Pressable>
                  </View>
                </View>

                {selectedExercise.codeSnippet ? (
                  <View style={styles.answerSnippet}>
                    {selectedExercise.codeSnippet.split('\n').map((line, index) => (
                      <Text key={`${selectedExercise.id}-snippet-${index + 1}`} style={styles.answerSnippetLine}>
                        {line || ' '}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textAlignVertical="top"
                  placeholder={selectedExercise.inputPlaceholder || 'Escribe tu respuesta'}
                  placeholderTextColor={DuocodePalette.muted}
                  style={styles.answerInput}
                />
              </View>
            ) : (
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
                      <Text style={styles.primaryButtonText}>{submitting ? 'RUNNING...' : 'RUN TESTS'}</Text>
                    </Pressable>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                </ScrollView>
              </View>
            )}

            {evaluation ? (
              <View style={styles.panel}>
                <View style={styles.panelChrome}>
                  <Text style={styles.panelChromeText}>
                    {evaluation.passed ? 'compiler.pass()' : 'compiler.fail()'}
                  </Text>
                </View>

                <View style={styles.resultHeader}>
                  <View style={styles.resultTextWrap}>
                    <Text style={styles.panelTitle}>feedback</Text>
                    <Text style={styles.panelBodyText}>
                      {evaluation.passed
                        ? 'Volviste a resolverlo bien. Ya esta consolidado.'
                        : 'Todavia hay fallos. Mira cada test y compara con la solucion correcta.'}
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

                {selectedExercise.mode === 'choice' ? (
                  <View style={styles.choiceResultGrid}>
                    <View style={styles.choiceResultCard}>
                      <Text style={styles.previewLabel}>respuesta_seleccionada</Text>
                      <Text style={styles.choiceResultTitle}>
                        {selectedChoiceOption?.label || 'Sin opcion seleccionada'}
                      </Text>
                      <Text style={styles.choiceResultDetail}>
                        {selectedChoiceOption?.detail || 'Selecciona una opcion para evaluar.'}
                      </Text>
                    </View>

                    <View style={styles.choiceResultCard}>
                      <Text style={styles.previewLabel}>respuesta_correcta</Text>
                      <Text style={styles.choiceResultTitle}>
                        {correctChoiceOption?.label || 'No disponible'}
                      </Text>
                      <Text style={styles.choiceResultDetail}>
                        {correctChoiceOption?.detail || 'La respuesta correcta aparecera aqui.'}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {selectedExercise.mode === 'text' ? (
                  <View style={styles.choiceResultGrid}>
                    <View style={styles.choiceResultCard}>
                      <Text style={styles.previewLabel}>respuesta_enviada</Text>
                      <Text style={styles.choiceResultTitle}>
                        {evaluation.submittedText || 'Sin respuesta enviada'}
                      </Text>
                      <Text style={styles.choiceResultDetail}>
                        Texto capturado desde la caja de respuesta.
                      </Text>
                    </View>

                    <View style={styles.choiceResultCard}>
                      <Text style={styles.previewLabel}>respuesta_correcta</Text>
                      <Text style={styles.choiceResultTitle}>
                        {evaluation.expectedText || 'No disponible'}
                      </Text>
                      <Text style={styles.choiceResultDetail}>
                        Compara esta salida con tu respuesta para detectar la diferencia exacta.
                      </Text>
                    </View>
                  </View>
                ) : null}

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

                {selectedExercise.mode === 'code' ? (
                  <View style={styles.solutionCard}>
                    <Text style={styles.solutionLabel}>solucion_correcta</Text>
                    <Text style={styles.solutionCode}>{evaluation.correctSolution}</Text>
                  </View>
                ) : null}

                <View style={styles.explanationCard}>
                  <Text style={styles.solutionLabel}>explicacion</Text>
                  <Text style={styles.explanationText}>{evaluation.explanation}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <CodeCelebrationOverlay
        visible={celebrationVisible && Boolean(evaluation?.passed && selectedExercise)}
        title={selectedExercise?.title || 'Practice complete'}
        score={evaluation?.score || 0}
        xpReward={selectedExercise?.xpReward || 0}
        onDismiss={() => setCelebrationVisible(false)}
      />
    </SafeAreaView>
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
    paddingBottom: 140,
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
    gap: 4,
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
    minWidth: 220,
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
  optionList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 20,
    padding: 14,
  },
  optionCardSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  optionBullet: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DuocodePalette.navySoft,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
  },
  optionBulletSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: '#12324B',
  },
  optionBulletText: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  optionBulletTextSelected: {
    color: DuocodePalette.accent,
  },
  optionCopy: {
    flex: 1,
    gap: 5,
  },
  optionTitle: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  optionDetail: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
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
  statusBadgeReview: {
    backgroundColor: '#0A2741',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  statusTextReview: {
    color: DuocodePalette.terminalBlue,
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
    flexWrap: 'wrap',
  },
  exerciseInfoCard: {
    flex: 1,
    minWidth: 140,
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
    flexWrap: 'wrap',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  answerSnippet: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  answerSnippetLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  answerInput: {
    minHeight: 140,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.mono,
  },
  editorShell: {
    minWidth: 680,
    maxWidth: 920,
    width: '100%',
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 340,
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
  editorInput: {
    minHeight: 340,
    minWidth: 520,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.mono,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  resultTextWrap: {
    flex: 1,
    minWidth: 220,
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
  choiceResultGrid: {
    gap: 12,
  },
  choiceResultCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 16,
    gap: 8,
  },
  choiceResultTitle: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  choiceResultDetail: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
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
