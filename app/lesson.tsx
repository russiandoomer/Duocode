import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

function getExerciseShortTitle(exercise: LearnerExercise) {
  const title = String(exercise.title || '');
  const parts = title.split('·').map((part) => part.trim()).filter(Boolean);

  return parts[parts.length - 1] || title;
}

function buildChallengeTitle(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Elige la respuesta correcta';
    case 'completion':
      return 'Escribe el concepto correcto';
    case 'prediction':
      return 'Escribe el resultado del codigo';
    case 'debugging':
      return 'Corrige el error del fragmento';
    default:
      return 'Escribe o corrige el codigo';
  }
}

function buildChallengeSubtitle(exercise: LearnerExercise) {
  return getExerciseShortTitle(exercise);
}

function buildChallengePromptLabel(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'pregunta que debes responder';
    case 'completion':
      return 'pregunta';
    case 'prediction':
      return 'pregunta';
    case 'debugging':
      return 'error que debes corregir';
    default:
      return 'reto que debes resolver';
  }
}

function buildChallengePromptHint(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return '';
    case 'completion':
      return 'Responde con una sola palabra o expresion corta.';
    case 'prediction':
      return 'Escribe solo lo que imprime el codigo al final.';
    case 'debugging':
      return 'Corrige solo la parte clave que esta mal para que el fragmento quede bien.';
    default:
      return 'Edita el codigo del editor hasta que el reto quede correcto.';
  }
}

function buildChallengeGuidance(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Aqui no escribes codigo. Solo debes leer la idea o el fragmento y escoger una sola opcion: la que mejor completa o explica el concepto.';
    case 'completion':
      return 'Lee la definicion del concepto y escribe la palabra clave que mejor la describe. No expliques, solo responde con la palabra o expresion corta.';
    case 'prediction':
      return 'Debes mirar el codigo y escribir exactamente lo que aparece en consola al final. Si imprime varias lineas, respeta el orden.';
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

  if (exercise.kind === 'completion') {
    return ['Lee la definicion.', 'Identifica el concepto principal.', 'Escribe solo la palabra correcta y revisa.'];
  }

  if (exercise.kind === 'prediction') {
    return ['Lee el codigo.', 'Sigue el valor paso a paso.', 'Escribe la salida final en print: ___.'];
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
      return 'Responde solo con la palabra clave o expresion corta correcta.';
    case 'prediction':
      return 'Responde exactamente con la salida del codigo. No expliques ni agregues texto extra.';
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
      return 'definicion del concepto';
    case 'prediction':
      return 'codigo a ejecutar';
    default:
      return 'fragmento de referencia';
  }
}

function findNextSequentialExercise(topic: LearnerTopic | null, currentExerciseId: string) {
  if (!topic) {
    return null;
  }

  const currentIndex = topic.exercises.findIndex((exercise) => exercise.id === currentExerciseId);

  if (currentIndex === -1) {
    return topic.exercises[0] || null;
  }

  return topic.exercises[currentIndex + 1] || null;
}

function findNextPendingExercise(topic: LearnerTopic | null, currentExerciseId: string) {
  if (!topic) {
    return null;
  }

  const currentIndex = topic.exercises.findIndex((exercise) => exercise.id === currentExerciseId);

  if (currentIndex === -1) {
    return topic.exercises.find((exercise) => !exercise.completed) || null;
  }

  return topic.exercises.slice(currentIndex + 1).find((exercise) => !exercise.completed) || null;
}

function getChoiceFeedbackState(
  optionId: string,
  selectedOptionId: string | null,
  evaluation: ExerciseEvaluationResponse | null
) {
  if (!evaluation) {
    return optionId === selectedOptionId ? 'selected' : 'idle';
  }

  if (optionId === evaluation.expectedSelectionId) {
    return 'correct';
  }

  if (optionId === (evaluation.submittedSelectionId || selectedOptionId)) {
    return evaluation.passed ? 'correct' : 'wrong';
  }

  return 'idle';
}

function getChoiceFeedbackLabel(choiceState: ReturnType<typeof getChoiceFeedbackState>) {
  switch (choiceState) {
    case 'correct':
      return 'ok';
    case 'wrong':
      return 'bad';
    case 'selected':
      return 'elegida';
    default:
      return null;
  }
}

function buildChoiceAnswerText(option: ReturnType<typeof getChoiceOption> | null) {
  if (!option) {
    return 'No disponible';
  }

  return option.detail ? `${option.label} - ${option.detail}` : option.label;
}

function buildResultAnswerValue(
  exercise: LearnerExercise | null,
  evaluation: ExerciseEvaluationResponse | null,
  correctChoiceOption: ReturnType<typeof getChoiceOption> | null
) {
  if (!exercise || !evaluation) {
    return null;
  }

  if (exercise.mode === 'choice') {
    return buildChoiceAnswerText(correctChoiceOption);
  }

  if (exercise.mode === 'text') {
    return evaluation.expectedText || evaluation.correctSolution || 'No disponible';
  }

  return evaluation.correctSolution || 'No disponible';
}

type ResultOverlayState = {
  headline: string;
  title: string;
  score: number;
  xpReward: number;
  variant: 'pass' | 'fail';
  answerValue: string | null;
  explanation: string;
  actionLabel: string;
  nextExerciseId: string | null;
};

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
  const [resultOverlay, setResultOverlay] = useState<ResultOverlayState | null>(null);
  const [queuedNextExerciseId, setQueuedNextExerciseId] = useState<string | null>(null);
  const [attemptStateByExerciseId, setAttemptStateByExerciseId] = useState<Record<string, 'pass' | 'fail'>>({});
  const [showGuidance, setShowGuidance] = useState(false);
  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const selectedTopic = useMemo(
    () => dashboard?.topics.find((topic) => topic.id === requestedTopicId) || null,
    [dashboard?.topics, requestedTopicId]
  );

  useEffect(() => {
    setSelectedExerciseId((current) => {
      if (!selectedTopic) {
        return null;
      }

      if (resultOverlay && current) {
        return current;
      }

      if (current && selectedTopic.exercises.some((exercise) => exercise.id === current)) {
        return current;
      }

      return findInitialExercise(selectedTopic, requestedExerciseId)?.id || null;
    });
  }, [requestedExerciseId, resultOverlay, selectedTopic]);

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
      setResultOverlay(null);
      setShowGuidance(false);
      return;
    }

    if (hydratedExerciseId !== selectedExercise.id) {
      setEditorCode(selectedExercise.lastSubmittedCode || selectedExercise.starterCode);
      setAnswerText(selectedExercise.lastSubmittedText || '');
      setSelectedOptionId(
        selectedExercise.lastSelectedOptionId || extractChoiceSelection(selectedExercise.lastSubmittedCode)
      );
      setEvaluation(null);
      setResultOverlay(null);
      setHydratedExerciseId(selectedExercise.id);
      setShowGuidance(false);
    }
  }, [hydratedExerciseId, selectedExercise]);

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
  const lessonProgressPercent = useMemo(
    () =>
      selectedTopic?.exerciseCount
        ? Math.round(
            selectedTopic.exercises.reduce((total, exercise) => total + Number(exercise.bestScore || 0), 0) /
              selectedTopic.exerciseCount
          )
        : 0,
    [selectedTopic]
  );

  useEffect(() => {
    setAttemptStateByExerciseId({});
  }, [selectedTopic?.id]);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleBackToClasses() {
    setResultOverlay(null);
    router.replace({
      pathname: '/(tabs)/explore',
      params: selectedTopic ? { topicId: selectedTopic.id } : undefined,
    });
  }

  function handleNextExercise() {
    const nextExerciseId = resultOverlay?.nextExerciseId || queuedNextExerciseId;

    if (!nextExerciseId) {
      setResultOverlay(null);
      handleBackToClasses();
      return;
    }

    setResultOverlay(null);
    setSelectedExerciseId(nextExerciseId);
    setQueuedNextExerciseId(null);
    setEvaluation(null);
  }

  function clearReviewFeedback() {
    setEvaluation(null);
    setResultOverlay(null);
    setQueuedNextExerciseId(null);
  }

  function handleSelectOption(optionId: string) {
    setSelectedOptionId(optionId);
    clearReviewFeedback();
  }

  function handleAnswerTextChange(nextValue: string) {
    setAnswerText(nextValue);
    clearReviewFeedback();
  }

  function handleEditorCodeChange(nextValue: string) {
    setEditorCode(nextValue);
    clearReviewFeedback();
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
      setAttemptStateByExerciseId((current) => ({
        ...current,
        [selectedExercise.id]: response.passed ? 'pass' : 'fail',
      }));
      const nextTopic =
        response.dashboard.topics.find((topic) => topic.id === response.topicId) || selectedTopic;
      const nextPendingExercise = findNextPendingExercise(nextTopic, selectedExercise.id);
      const nextExerciseId = nextPendingExercise?.id || null;
      const nextCorrectChoiceOption =
        selectedExercise.mode === 'choice'
          ? getChoiceOption(selectedExercise, response.expectedSelectionId || null)
          : null;

      setQueuedNextExerciseId(nextExerciseId);
      setResultOverlay({
        headline: response.passed ? 'RESPUESTA CORRECTA' : 'RESPONDISTE MAL',
        title: selectedExercise.title || 'Resultado de la leccion',
        score: response.score,
        xpReward: response.xpEarned,
        variant: response.passed ? 'pass' : 'fail',
        answerValue: buildResultAnswerValue(selectedExercise, response, nextCorrectChoiceOption),
        explanation: response.explanation || '',
        actionLabel: nextExerciseId ? 'SIGUIENTE PREGUNTA' : 'VOLVER A CLASES',
        nextExerciseId,
      });
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
    setResultOverlay(null);
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
          <Text style={styles.heroText}>{selectedTopic.stageGoal}</Text>

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
                  ? `Ya completaste esta leccion con ${lessonProgressPercent}% de avance.`
                  : `Llevas ${lessonProgressPercent}% de avance. ${completedExercises} correctos y ${remainingExercises} por resolver.`}
              </Text>
            </View>

            <View style={styles.routeCounter}>
              <Text style={styles.routeCounterValue}>{`${lessonProgressPercent}%`}</Text>
              <Text style={styles.routeCounterLabel}>avance</Text>
            </View>
          </View>

          <View style={styles.routeSteps}>
            {selectedTopic.exercises.map((exercise, index) => {
              const localAttemptState = attemptStateByExerciseId[exercise.id];
              const isPassed = exercise.completed || localAttemptState === 'pass';
              const isFailed = !exercise.completed && localAttemptState === 'fail';
              const isCurrent = exercise.id === selectedExercise?.id && !isPassed && !isFailed;

              return (
                <View
                  key={exercise.id}
                  style={[
                    styles.routeStep,
                    isPassed && styles.routeStepDone,
                    isFailed && styles.routeStepBad,
                    isCurrent && styles.routeStepCurrent,
                  ]}>
                  <Text
                    style={[
                      styles.routeStepIndex,
                      isPassed && styles.routeStepIndexDone,
                      isFailed && styles.routeStepIndexBad,
                      isCurrent && styles.routeStepIndexCurrent,
                    ]}>
                    {isPassed ? 'OK' : isFailed ? 'BAD' : index + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {selectedExercise ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>reto actual</Text>
              <Text style={styles.challengeTitle}>{buildChallengeTitle(selectedExercise)}</Text>
              <Text style={styles.challengeSubtitle}>{buildChallengeSubtitle(selectedExercise)}</Text>
              <View style={styles.promptShell}>
                <Text style={styles.promptLabel}>{buildChallengePromptLabel(selectedExercise)}</Text>
                <Text style={styles.promptText}>{selectedExercise.prompt}</Text>
                {buildChallengePromptHint(selectedExercise) ? (
                  <Text style={styles.promptHint}>{buildChallengePromptHint(selectedExercise)}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.card}>
              <Modal
                transparent
                animationType="fade"
                visible={showGuidance}
                onRequestClose={() => setShowGuidance(false)}>
                <View style={styles.guideModalOverlay}>
                  <Pressable style={styles.guideModalBackdrop} onPress={() => setShowGuidance(false)} />

                  <View style={styles.guideModalCard}>
                    <View style={styles.guideModalHeader}>
                      <View style={styles.guideModalTitleGroup}>
                        <Text style={styles.guideModalEyebrow}>ayuda rapida</Text>
                        <Text style={styles.guideModalTitle}>Como resolver este reto</Text>
                      </View>

                      <Pressable style={styles.guideCloseButton} onPress={() => setShowGuidance(false)}>
                        <Text style={styles.guideCloseButtonText}>CERRAR</Text>
                      </Pressable>
                    </View>

                    <ScrollView
                      style={styles.guideModalScroll}
                      contentContainerStyle={styles.guideModalContent}
                      showsVerticalScrollIndicator={false}>
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
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {selectedExercise.mode === 'choice' ? (
                <View style={styles.optionList}>
                  {selectedExercise.choiceOptions.map((option) => {
                    const optionState = getChoiceFeedbackState(option.id, selectedOptionId, evaluation);
                    const statusLabel = getChoiceFeedbackLabel(optionState);
                    const optionBadge = option.id.toUpperCase();
                    const optionHeading = option.label?.trim() || `Opcion ${optionBadge}`;
                    const optionBody = option.detail?.trim() || optionHeading;
                    return (
                      <Pressable
                        key={option.id}
                        style={[
                          styles.optionCard,
                          optionState === 'selected' && styles.optionCardSelected,
                          optionState === 'correct' && styles.optionCardCorrect,
                          optionState === 'wrong' && styles.optionCardWrong,
                        ]}
                        onPress={() => handleSelectOption(option.id)}
                        disabled={selectedExercise.completed}>
                        <View style={styles.optionHeader}>
                          <Text
                            style={[
                              styles.optionBadge,
                              optionState === 'correct' && styles.optionBadgeCorrect,
                              optionState === 'wrong' && styles.optionBadgeWrong,
                            ]}>
                            {optionBadge}
                          </Text>
                          <Text
                            style={[
                              styles.optionTitle,
                              optionState === 'correct' && styles.optionTitleCorrect,
                              optionState === 'wrong' && styles.optionTitleWrong,
                            ]}>
                            {optionHeading}
                          </Text>
                          {statusLabel ? (
                            <Text
                              style={[
                                styles.optionStatus,
                                optionState === 'correct' && styles.optionStatusCorrect,
                                optionState === 'wrong' && styles.optionStatusWrong,
                              ]}>
                              {statusLabel}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.optionDetail}>{optionBody}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : selectedExercise.mode === 'text' ? (
                <>
                  {selectedExercise.codeSnippet ? (
                    selectedExercise.kind === 'completion' ? (
                      <View style={styles.conceptBox}>
                        <Text style={styles.snippetLabel}>{buildSnippetLabel(selectedExercise)}</Text>
                        <Text style={styles.conceptText}>{selectedExercise.codeSnippet}</Text>
                      </View>
                    ) : (
                      <View style={styles.snippetBox}>
                        <Text style={styles.snippetLabel}>{buildSnippetLabel(selectedExercise)}</Text>
                        {selectedExercise.codeSnippet.split('\n').map((line, index) => (
                          <Text key={`${selectedExercise.id}-snippet-${index + 1}`} style={styles.snippetLine}>
                            {line || ' '}
                          </Text>
                        ))}
                      </View>
                    )
                  ) : null}
                  {selectedExercise.kind === 'prediction' ? (
                    <View style={styles.outputHintBox}>
                      <Text style={styles.outputHintText}>print: ___</Text>
                    </View>
                  ) : null}
                  <TextInput
                    value={answerText}
                    onChangeText={handleAnswerTextChange}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    placeholder={selectedExercise.inputPlaceholder || 'Escribe tu respuesta'}
                    placeholderTextColor={DuocodePalette.muted}
                    style={[
                      styles.answerInput,
                      evaluation?.passed && styles.answerInputPass,
                      evaluation && !evaluation.passed && styles.answerInputFail,
                    ]}
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
                    onChangeText={handleEditorCodeChange}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    style={[
                      styles.codeInput,
                      evaluation?.passed && styles.answerInputPass,
                      evaluation && !evaluation.passed && styles.answerInputFail,
                    ]}
                    editable={!selectedExercise.completed}
                  />
                </>
              )}

              {selectedExercise.completed ? (
                <View style={styles.footerActionRow}>
                  {queuedNextExerciseId ? (
                    <Pressable style={[styles.primaryButton, styles.footerActionButton]} onPress={handleNextExercise}>
                      <Text style={styles.primaryButtonText}>SIGUIENTE RETO</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.primaryButton, styles.footerActionButton]}
                      onPress={handleBackToClasses}>
                      <Text style={styles.primaryButtonText}>VOLVER A CLASES</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.footerActionRow}>
                  <Pressable
                    style={[styles.guideActionButton, styles.footerActionButton]}
                    onPress={() => setShowGuidance(true)}>
                    <Text style={styles.guideActionButtonText}>VER AYUDA RAPIDA</Text>
                  </Pressable>
                  {selectedExercise.mode === 'code' ? (
                    <Pressable style={[styles.secondaryButton, styles.footerActionButton]} onPress={handleReset}>
                      <Text style={styles.secondaryButtonText}>RESET</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.primaryButton, styles.footerActionButton]}
                    onPress={handleEvaluate}
                    disabled={submitting}>
                    <Text style={styles.primaryButtonText}>{submitting ? 'REVISANDO...' : 'REVISAR'}</Text>
                  </Pressable>
                </View>
              )}
            </View>

          </>
        ) : null}
      </ScrollView>

      <CodeCelebrationOverlay
        visible={Boolean(resultOverlay)}
        headline={resultOverlay?.headline}
        title={resultOverlay?.title || 'Resultado de la leccion'}
        score={resultOverlay?.score || 0}
        xpReward={resultOverlay?.xpReward || 0}
        variant={resultOverlay?.variant || 'pass'}
        answerLabel="respuesta correcta"
        answerValue={resultOverlay?.answerValue || null}
        explanation={resultOverlay?.explanation || ''}
        actionLabel={resultOverlay?.actionLabel || null}
        onAction={handleNextExercise}
        disableBackdropDismiss
        onDismiss={() => setResultOverlay(null)}
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
    minWidth: 44,
    height: 38,
    borderRadius: 18,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  routeStepDone: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderColor: DuocodePalette.terminalGreen,
  },
  routeStepBad: {
    backgroundColor: DuocodePalette.redSoft,
    borderColor: DuocodePalette.red,
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
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  routeStepIndexDone: {
    color: DuocodePalette.terminalGreen,
    fontSize: 11,
  },
  routeStepIndexBad: {
    color: DuocodePalette.red,
    fontSize: 11,
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
  promptHint: {
    color: '#D4E2F8',
    fontSize: 13,
    lineHeight: 19,
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
  guideToggle: {
    alignSelf: 'flex-start',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  guideToggleActive: {
    borderColor: DuocodePalette.accent,
    backgroundColor: '#112743',
  },
  guideToggleText: {
    color: DuocodePalette.accent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  guideActionButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guideActionButtonText: {
    color: DuocodePalette.accent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    alignItems: 'stretch',
  },
  footerActionButton: {
    flex: 1,
  },
  guideModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  guideModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.78)',
  },
  guideModalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '78%',
    alignSelf: 'center',
    backgroundColor: '#101F33',
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  guideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  guideModalTitleGroup: {
    flex: 1,
    gap: 4,
  },
  guideModalEyebrow: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  guideModalTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  guideCloseButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  guideCloseButtonText: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  guideModalScroll: {
    flexGrow: 0,
  },
  guideModalContent: {
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
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    color: DuocodePalette.accent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    textAlign: 'center',
    lineHeight: 26,
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
  optionCardCorrect: {
    borderColor: DuocodePalette.terminalGreen,
    backgroundColor: DuocodePalette.terminalGreenSoft,
  },
  optionCardWrong: {
    borderColor: DuocodePalette.red,
    backgroundColor: DuocodePalette.redSoft,
  },
  optionTitle: {
    flex: 1,
    color: '#CFE0F8',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  optionTitleCorrect: {
    color: DuocodePalette.code,
  },
  optionTitleWrong: {
    color: '#FFB4C2',
  },
  optionStatus: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 999,
    color: DuocodePalette.accent,
    fontSize: 10,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  optionStatusCorrect: {
    backgroundColor: DuocodePalette.terminalGreenSoft,
    borderColor: DuocodePalette.terminalGreen,
    color: DuocodePalette.code,
  },
  optionStatusWrong: {
    backgroundColor: DuocodePalette.redSoft,
    borderColor: DuocodePalette.red,
    color: '#FFB4C2',
  },
  optionBadgeCorrect: {
    backgroundColor: DuocodePalette.codeSoft,
    borderColor: DuocodePalette.terminalGreen,
    color: DuocodePalette.code,
  },
  optionBadgeWrong: {
    backgroundColor: DuocodePalette.redSoft,
    borderColor: DuocodePalette.red,
    color: '#FFB4C2',
  },
  optionDetail: {
    color: DuocodePalette.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
  snippetBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  conceptBox: {
    backgroundColor: '#12233A',
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  snippetLabel: {
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontFamily: Fonts.mono,
    marginBottom: 4,
  },
  conceptText: {
    color: DuocodePalette.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  snippetLine: {
    color: DuocodePalette.code,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: Fonts.mono,
  },
  outputHintBox: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outputHintText: {
    color: DuocodePalette.code,
    fontSize: 14,
    fontWeight: '900',
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
  answerInputPass: {
    borderColor: DuocodePalette.terminalGreen,
    backgroundColor: DuocodePalette.terminalGreenSoft,
  },
  answerInputFail: {
    borderColor: DuocodePalette.red,
    backgroundColor: DuocodePalette.redSoft,
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
