import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { CodeCelebrationOverlay } from '@/components/duocode/code-celebration-overlay';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';
import { extractChoiceSelection, getChoiceOption } from '@/lib/duocode-curriculum';
import type { ExerciseEvaluationResponse, LearnerExercise, LearnerTopic } from '@/types/duocode';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>loading.lesson()</Text>
        <Text style={styles.bodyText}>Estamos preparando tu clase actual.</Text>
      </View>
    </ScrollView>
  );
}

function rewardLabel(exercise: LearnerExercise) {
  return `+${exercise.xpReward} XP aprendizaje`;
}

function findInitialExercise(topic: LearnerTopic | null, requestedExerciseId?: string) {
  if (!topic) {
    return null;
  }

  const requestedExercise = topic.exercises.find((exercise) => exercise.id === requestedExerciseId);

  if (requestedExercise && !requestedExercise.completed) {
    return requestedExercise;
  }

  return (
    topic.exercises.find((exercise) => !exercise.completed) ||
    requestedExercise ||
    topic.exercises[topic.exercises.length - 1] ||
    null
  );
}

function buildModeMix(topic: LearnerTopic) {
  const choiceCount = topic.exercises.filter((exercise) => exercise.mode === 'choice').length;
  const textCount = topic.exercises.filter((exercise) => exercise.mode === 'text').length;
  const codeCount = topic.exercises.filter((exercise) => exercise.mode === 'code').length;
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

  return parts.join(' · ');
}

function buildChallengeTitle(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Elige la respuesta correcta';
    case 'completion':
      return 'Completa lo que falta';
    case 'prediction':
      return 'Escribe que salida produce';
    case 'debugging':
      return 'Corrige el error del fragmento';
    default:
      return 'Escribe o corrige el codigo';
  }
}

function buildChallengeGuidance(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Aqui no escribes codigo. Solo debes leer la idea o el fragmento y escoger una sola opcion: la que mejor completa o explica el concepto.';
    case 'completion':
      return 'Debes averiguar que palabra, operador o expresion falta. Escribe solo esa pieza faltante, no copies todo el codigo.';
    case 'prediction':
      return 'Debes mirar el fragmento y responder exactamente que saldria al ejecutarlo. Si imprime algo en consola, escribe esa salida tal como aparece.';
    case 'debugging':
      return 'Debes detectar que esta mal en el fragmento. Corrige la palabra, simbolo o parte incorrecta para que la idea quede bien escrita.';
    default:
      return 'Debes editar el codigo del editor. Mantén la estructura base y cambia solo lo necesario para que la solucion funcione.';
  }
}

function buildChallengeSteps(exercise: LearnerExercise) {
  if (exercise.instructions.length) {
    return exercise.instructions.slice(0, 3);
  }

  switch (exercise.mode) {
    case 'choice':
      return ['Lee la idea principal.', 'Compara las opciones.', 'Elige una sola respuesta y revisa.'];
    case 'text':
      return ['Observa el ejemplo.', 'Identifica la parte faltante.', 'Escribe solo esa pieza y revisa.'];
    default:
      return ['Lee el objetivo del reto.', 'Completa o corrige la funcion.', 'Revisa y ejecuta la validacion.'];
  }
}

function buildChallengeAnswerRule(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Responde seleccionando una opcion. No escribas texto.';
    case 'completion':
      return 'Responde solo con la pieza faltante: una palabra, operador o expresion corta.';
    case 'prediction':
      return 'Responde exactamente con la salida esperada. No expliques, no agregues texto extra.';
    case 'debugging':
      return 'Responde con la correccion necesaria. Si el error es pequeno, escribe solo la parte correcta; si hace falta, corrige la linea clave.';
    default:
      return 'Responde editando el codigo completo dentro del editor.';
  }
}

function buildSnippetLabel(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'prediction':
      return 'fragmento que debes analizar';
    case 'debugging':
      return 'fragmento con error';
    case 'completion':
      return 'fragmento base';
    default:
      return 'fragmento de referencia';
  }
}

function findNextPendingExercise(topic: LearnerTopic | null, currentExerciseId: string) {
  if (!topic) {
    return null;
  }

  const currentIndex = topic.exercises.findIndex((exercise) => exercise.id === currentExerciseId);

  if (currentIndex === -1) {
    return topic.exercises.find((exercise) => !exercise.completed) || null;
  }

  return (
    topic.exercises.slice(currentIndex + 1).find((exercise) => !exercise.completed) ||
    topic.exercises.find((exercise) => !exercise.completed) ||
    null
  );
}

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[]; exerciseId?: string | string[] }>();
  const { dashboard, loading, evaluateExercise } = useLearnerDashboard();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [hydratedExerciseId, setHydratedExerciseId] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ExerciseEvaluationResponse | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [queuedNextExerciseId, setQueuedNextExerciseId] = useState<string | null>(null);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const selectedTopic = useMemo(
    () => dashboard?.topics.find((topic) => topic.id === requestedTopicId) || null,
    [dashboard?.topics, requestedTopicId]
  );

  useEffect(() => {
    const initialExercise = findInitialExercise(selectedTopic, requestedExerciseId);
    setSelectedExerciseId(initialExercise?.id || null);
  }, [requestedExerciseId, selectedTopic]);

  const selectedExercise =
    selectedTopic?.exercises.find((exercise) => exercise.id === selectedExerciseId) ||
    findInitialExercise(selectedTopic, requestedExerciseId);

  useEffect(() => {
    if (!selectedExercise) {
      setHydratedExerciseId(null);
      setEditorCode('');
      setAnswerText('');
      setSelectedOptionId(null);
      setEvaluation(null);
      return;
    }

    if (hydratedExerciseId !== selectedExercise.id) {
      setEditorCode(selectedExercise.lastSubmittedCode || selectedExercise.starterCode);
      setAnswerText(selectedExercise.lastSubmittedText || '');
      setSelectedOptionId(
        selectedExercise.lastSelectedOptionId || extractChoiceSelection(selectedExercise.lastSubmittedCode)
      );
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
  const totalLessonXp = useMemo(
    () => selectedTopic?.exercises.reduce((total, exercise) => total + exercise.xpReward, 0) || 0,
    [selectedTopic]
  );
  const completedExercises = useMemo(
    () => selectedTopic?.exercises.filter((exercise) => exercise.completed).length || 0,
    [selectedTopic]
  );
  const currentExerciseIndex = useMemo(
    () => selectedTopic?.exercises.findIndex((exercise) => exercise.id === selectedExercise?.id) ?? -1,
    [selectedExercise?.id, selectedTopic]
  );
  const remainingExercises = Math.max((selectedTopic?.exerciseCount || 0) - completedExercises, 0);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleBackToClasses() {
    router.replace({
      pathname: '/(tabs)/explore',
      params: selectedTopic ? { topicId: selectedTopic.id } : undefined,
    });
  }

  function handleNextExercise() {
    if (!queuedNextExerciseId) {
      return;
    }

    setSelectedExerciseId(queuedNextExerciseId);
    setQueuedNextExerciseId(null);
    setEvaluation(null);
  }

  async function handleEvaluate() {
    if (!selectedExercise) {
      return;
    }

    setSubmitting(true);
    setQueuedNextExerciseId(null);

    try {
      const response = await evaluateExercise(
        selectedExercise.id,
        selectedExercise.mode === 'choice'
          ? { selectedOptionId, attemptMode: 'lesson' }
          : selectedExercise.mode === 'text'
            ? { answerText, attemptMode: 'lesson' }
            : { code: editorCode, attemptMode: 'lesson' }
      );

      setEvaluation(response);
      if (response.passed) {
        const updatedTopic =
          response.dashboard.topics.find((topic) => topic.id === selectedTopic?.id) || selectedTopic;
        const nextPendingExercise = findNextPendingExercise(updatedTopic, selectedExercise.id);

        setQueuedNextExerciseId(nextPendingExercise?.id || null);
        setCelebrationVisible(true);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo evaluar la leccion');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (!selectedExercise) {
      return;
    }

    setEvaluation(null);
    setQueuedNextExerciseId(null);
    if (selectedExercise.mode === 'choice') {
      setSelectedOptionId(null);
    } else if (selectedExercise.mode === 'text') {
      setAnswerText('');
    } else {
      setEditorCode(selectedExercise.starterCode);
    }
  }

  if (!selectedTopic) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>leccion no encontrada</Text>
            <Text style={styles.bodyText}>Esta vista se abre desde el camino de `Clases`.</Text>
            <Pressable style={styles.primaryButton} onPress={handleBackToClasses}>
              <Text style={styles.primaryButtonText}>VOLVER A CLASES</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Pressable style={styles.backButton} onPress={handleBackToClasses}>
              <Text style={styles.backButtonText}>VOLVER A CLASES</Text>
            </Pressable>
            <BrandMark label={dashboard.settings.branding.logoLabel} size={58} />
          </View>

          <Text style={styles.heroEyebrow}>
            {selectedTopic.level} · {selectedTopic.unitTitle}
          </Text>
          <Text style={styles.heroTitle}>{selectedTopic.title}</Text>
          <Text style={styles.heroText}>{selectedTopic.lessonGoal}</Text>

          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`L${selectedTopic.lessonNumber}`}</Text>
              <Text style={styles.heroBadgeLabel}>leccion</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`${selectedTopic.exerciseCount}`}</Text>
              <Text style={styles.heroBadgeLabel}>retos</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`${totalLessonXp} XP`}</Text>
              <Text style={styles.heroBadgeLabel}>recompensa</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>que vas a tocar</Text>
          <View style={styles.summaryList}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>concepto</Text>
              <Text style={styles.summaryValue}>{selectedTopic.description}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>dinamica</Text>
              <Text style={styles.summaryValue}>{buildModeMix(selectedTopic) || 'reto guiado'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>meta</Text>
              <Text style={styles.summaryValue}>{selectedTopic.stageGoal}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ruta de la leccion</Text>
          <View style={styles.routeSummary}>
            <View style={styles.routeSummaryCopy}>
              <Text style={styles.routeEyebrow}>
                {selectedExercise && currentExerciseIndex >= 0
                  ? `reto ${currentExerciseIndex + 1} de ${selectedTopic.exerciseCount}`
                  : `leccion de ${selectedTopic.exerciseCount} retos`}
              </Text>
              <Text style={styles.routeTitle}>
                {selectedTopic.exercises.every((exercise) => exercise.completed)
                  ? 'Leccion completada'
                  : selectedExercise
                    ? buildChallengeTitle(selectedExercise)
                    : 'Preparando reto'}
              </Text>
              <Text style={styles.routeText}>
                {selectedTopic.exercises.every((exercise) => exercise.completed)
                  ? 'Ya resolviste todos los retos de esta leccion. La segunda vuelta la haces luego en Practica.'
                  : `${completedExercises} resueltos · ${remainingExercises} pendientes. Aqui solo se muestra el reto actual para que no te distraigas.`}
              </Text>
            </View>

            <View style={styles.routeCounter}>
              <Text style={styles.routeCounterValue}>{`${completedExercises}/${selectedTopic.exerciseCount}`}</Text>
              <Text style={styles.routeCounterLabel}>avance</Text>
            </View>
          </View>

          <View style={styles.routeSteps}>
            {selectedTopic.exercises.map((exercise, index) => {
              const isCurrent = exercise.id === selectedExercise?.id;

              return (
                <View
                  key={exercise.id}
                  style={[
                    styles.routeStep,
                    exercise.completed && styles.routeStepDone,
                    isCurrent && styles.routeStepCurrent,
                  ]}>
                  <Text
                    style={[
                      styles.routeStepIndex,
                      exercise.completed && styles.routeStepIndexDone,
                      isCurrent && styles.routeStepIndexCurrent,
                    ]}>
                    {exercise.completed ? 'OK' : index + 1}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.routeHint}>
            Los retos ya resueltos se cierran en esta vista. Al final vuelven como repaso en `Practica`.
          </Text>
        </View>

        {selectedExercise ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>reto actual</Text>
              <Text style={styles.challengeTitle}>{buildChallengeTitle(selectedExercise)}</Text>
              <Text style={styles.challengeSubtitle}>{selectedExercise.title}</Text>
              <View style={styles.promptShell}>
                <Text style={styles.promptLabel}>pregunta</Text>
                <Text style={styles.promptText}>{selectedExercise.prompt}</Text>
              </View>
              <View style={styles.pills}>
                <Text style={styles.pill}>{selectedExercise.lessonTypeLabel}</Text>
                <Text style={styles.pill}>{rewardLabel(selectedExercise)}</Text>
                <Text style={styles.pill}>{`mejor ${selectedExercise.bestScore}%`}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>que debes hacer</Text>
                {selectedExercise.completed ? (
                  queuedNextExerciseId ? (
                    <Pressable style={styles.primaryButton} onPress={handleNextExercise}>
                      <Text style={styles.primaryButtonText}>SIGUIENTE RETO</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.primaryButton} onPress={handleBackToClasses}>
                      <Text style={styles.primaryButtonText}>VOLVER A CLASES</Text>
                    </Pressable>
                  )
                ) : (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.secondaryButton} onPress={handleReset}>
                      <Text style={styles.secondaryButtonText}>RESET</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={handleEvaluate} disabled={submitting}>
                      <Text style={styles.primaryButtonText}>{submitting ? 'REVISANDO...' : 'REVISAR'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.guidanceCard}>
                <Text style={styles.guidanceLead}>{buildChallengeGuidance(selectedExercise)}</Text>
                <View style={styles.answerRuleBox}>
                  <Text style={styles.answerRuleLabel}>como debes responder</Text>
                  <Text style={styles.answerRuleText}>{buildChallengeAnswerRule(selectedExercise)}</Text>
                </View>
                <View style={styles.guidanceSteps}>
                  {buildChallengeSteps(selectedExercise).map((step, index) => (
                    <View key={`${selectedExercise.id}-step-${index + 1}`} style={styles.guidanceStep}>
                      <Text style={styles.guidanceStepIndex}>{index + 1}</Text>
                      <Text style={styles.guidanceStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {selectedExercise.mode === 'choice' ? (
                <View style={styles.optionList}>
                  {selectedExercise.choiceOptions.map((option) => {
                    const isActive = option.id === selectedOptionId;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.optionCard, isActive && styles.optionCardSelected]}
                        onPress={() => setSelectedOptionId(option.id)}
                        disabled={selectedExercise.completed}>
                        <Text style={styles.optionTitle}>{option.label}</Text>
                        <Text style={styles.optionDetail}>{option.detail}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : selectedExercise.mode === 'text' ? (
                <>
                  {selectedExercise.codeSnippet ? (
                    <View style={styles.snippetBox}>
                      <Text style={styles.snippetLabel}>{buildSnippetLabel(selectedExercise)}</Text>
                      {selectedExercise.codeSnippet.split('\n').map((line, index) => (
                        <Text key={`${selectedExercise.id}-snippet-${index + 1}`} style={styles.snippetLine}>
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
                    editable={!selectedExercise.completed}
                  />
                </>
              ) : (
                <>
                  {selectedExercise.codeSnippet ? (
                    <View style={styles.snippetBox}>
                      <Text style={styles.snippetLabel}>{buildSnippetLabel(selectedExercise)}</Text>
                      {selectedExercise.codeSnippet.split('\n').map((line, index) => (
                        <Text key={`${selectedExercise.id}-code-snippet-${index + 1}`} style={styles.snippetLine}>
                          {line || ' '}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <TextInput
                    value={editorCode}
                    onChangeText={setEditorCode}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    style={styles.codeInput}
                    editable={!selectedExercise.completed}
                  />
                </>
              )}
            </View>

            {evaluation ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.resultCopy}>
                    <Text style={styles.cardTitle}>{evaluation.passed ? 'resultado correcto' : 'necesita ajuste'}</Text>
                    <Text style={styles.bodyText}>
                      {evaluation.passed
                        ? 'Esta solucion suma el XP completo de la leccion.'
                        : 'Ajusta tu respuesta y vuelve a intentarlo.'}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, evaluation.passed ? styles.scoreBadgePass : styles.scoreBadgeFail]}>
                    <Text style={styles.scoreBadgeText}>{`${evaluation.score}%`}</Text>
                    <Text style={styles.scoreBadgeMeta}>{`+${evaluation.xpEarned} XP`}</Text>
                  </View>
                </View>

                {selectedExercise.mode === 'choice' ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackLabel}>tu respuesta</Text>
                    <Text style={styles.feedbackText}>{selectedChoiceOption?.label || 'Sin seleccion'}</Text>
                    <Text style={styles.feedbackLabel}>correcta</Text>
                    <Text style={styles.feedbackText}>{correctChoiceOption?.label || 'No disponible'}</Text>
                  </View>
                ) : null}

                {selectedExercise.mode === 'text' ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackLabel}>tu respuesta</Text>
                    <Text style={styles.feedbackText}>{evaluation.submittedText || 'Sin respuesta'}</Text>
                    <Text style={styles.feedbackLabel}>correcta</Text>
                    <Text style={styles.feedbackText}>{evaluation.expectedText || 'No disponible'}</Text>
                  </View>
                ) : null}

                {evaluation.tests.slice(0, 3).map((test) => (
                  <View key={test.label} style={styles.testCard}>
                    <Text style={styles.testTitle}>{`${test.label} · ${test.pass ? 'PASS' : 'FAIL'}`}</Text>
                    <Text style={styles.testLine}>{`esperado: ${test.expectedPreview}`}</Text>
                    <Text style={styles.testLine}>{`recibido: ${test.receivedPreview}`}</Text>
                  </View>
                ))}

                {!evaluation.passed && selectedExercise.mode === 'code' ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackLabel}>solucion correcta</Text>
                    <Text style={styles.snippetLine}>{evaluation.correctSolution}</Text>
                  </View>
                ) : null}

                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>explicacion</Text>
                  <Text style={styles.bodyText}>{evaluation.explanation}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <CodeCelebrationOverlay
        visible={celebrationVisible && Boolean(evaluation?.passed && selectedExercise)}
        title={selectedExercise?.title || 'Leccion completada'}
        score={evaluation?.score || 0}
        xpReward={evaluation?.xpEarned || 0}
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
  heroCard: {
    backgroundColor: '#0C1730',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 20,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backButtonText: {
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  heroTitle: {
    color: DuocodePalette.text,
    fontSize: 27,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroText: {
    color: '#C8D7EE',
    fontSize: 14,
    lineHeight: 21,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroBadge: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#12243C',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  heroBadgeValue: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroBadgeLabel: {
    color: '#A7C0E2',
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  card: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  bodyText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  summaryLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  summaryValue: {
    color: DuocodePalette.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  routeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeSummaryCopy: {
    flex: 1,
    gap: 6,
  },
  routeEyebrow: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  routeTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  routeText: {
    color: '#C5D5EB',
    fontSize: 13,
    lineHeight: 19,
  },
  routeCounter: {
    minWidth: 88,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  routeCounterValue: {
    color: DuocodePalette.terminalBlue,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  routeCounterLabel: {
    color: '#A7C0E2',
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  routeSteps: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  routeStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStepDone: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderColor: DuocodePalette.green,
  },
  routeStepCurrent: {
    backgroundColor: DuocodePalette.accentSoft,
    borderColor: DuocodePalette.accent,
    shadowColor: DuocodePalette.accent,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  routeStepIndex: {
    color: '#9CB6D8',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  routeStepIndexDone: {
    color: DuocodePalette.code,
  },
  routeStepIndexCurrent: {
    color: DuocodePalette.accent,
  },
  routeHint: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  tabRow: {
    gap: 12,
  },
  tab: {
    width: 240,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  tabSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  tabTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  tabTitleSelected: {
    color: DuocodePalette.accent,
  },
  tabMeta: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  promptText: {
    color: DuocodePalette.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  promptShell: {
    backgroundColor: '#12233A',
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  promptLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  challengeTitle: {
    color: DuocodePalette.text,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  challengeSubtitle: {
    color: DuocodePalette.terminalBlue,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 999,
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  secondaryButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  guidanceCard: {
    backgroundColor: '#101F33',
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  guidanceLead: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 21,
  },
  answerRuleBox: {
    backgroundColor: '#0F1A2D',
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  answerRuleLabel: {
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  answerRuleText: {
    color: '#D8E6FB',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  guidanceSteps: {
    gap: 10,
  },
  guidanceStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guidanceStepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    color: DuocodePalette.accent,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    textAlign: 'center',
    lineHeight: 22,
  },
  guidanceStepText: {
    flex: 1,
    color: '#C5D5EB',
    fontSize: 13,
    lineHeight: 19,
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  optionCardSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  optionTitle: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  optionDetail: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  snippetBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  snippetLabel: {
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontFamily: Fonts.mono,
    marginBottom: 4,
  },
  snippetLine: {
    color: DuocodePalette.code,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: Fonts.mono,
  },
  answerInput: {
    minHeight: 150,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 16,
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.mono,
  },
  codeInput: {
    minHeight: 280,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 16,
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.mono,
  },
  resultCopy: {
    flex: 1,
    gap: 6,
  },
  scoreBadge: {
    minWidth: 98,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  scoreBadgePass: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
  },
  scoreBadgeFail: {
    backgroundColor: DuocodePalette.redSoft,
  },
  scoreBadgeText: {
    color: DuocodePalette.surface,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  scoreBadgeMeta: {
    color: DuocodePalette.surface,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  feedbackBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  feedbackLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  feedbackText: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  testCard: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  testTitle: {
    color: DuocodePalette.text,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  testLine: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
