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
        <Text style={styles.cardTitle}>loading.practice.session()</Text>
        <Text style={styles.bodyText}>Estamos preparando tu repaso activo.</Text>
      </View>
    </ScrollView>
  );
}

function getSafePracticeXp(exercise: LearnerExercise) {
  const reward = Number(exercise.practiceXpReward);

  if (Number.isFinite(reward) && reward > 0) {
    return reward;
  }

  return Math.max(5, Math.round(Number(exercise.xpReward || 0) * 0.5));
}

function rewardLabel(exercise: LearnerExercise) {
  return `+${getSafePracticeXp(exercise)} XP practica`;
}

function findInitialExercise(topic: LearnerTopic | null, requestedExerciseId?: string) {
  if (!topic) {
    return null;
  }

  const requestedExercise = topic.exercises.find((exercise) => exercise.id === requestedExerciseId);

  if (requestedExercise) {
    return requestedExercise;
  }

  return topic.exercises[0] || null;
}

function buildPracticeTitle(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Repasa y elige la opcion correcta';
    case 'completion':
      return 'Repasa escribiendo el concepto correcto';
    case 'prediction':
      return 'Repasa escribiendo el resultado del codigo';
    case 'debugging':
      return 'Repasa corrigiendo el error';
    default:
      return 'Repasa resolviendo el codigo';
  }
}

function buildPracticeSubtitle(exercise: LearnerExercise) {
  return getExerciseShortTitle(exercise);
}

function buildPracticePromptLabel(exercise: LearnerExercise) {
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

function getExerciseShortTitle(exercise: LearnerExercise) {
  const title = String(exercise.title || '');
  const parts = title.split('·').map((part) => part.trim()).filter(Boolean);

  return parts[parts.length - 1] || title;
}

function buildPracticeQuestion(exercise: LearnerExercise) {
  const shortTitle = getExerciseShortTitle(exercise);

  switch (exercise.kind) {
    case 'multiple-choice':
      return `¿Que opcion describe correctamente ${shortTitle.toLowerCase()}?`;
    case 'completion':
      return '¿Que palabra clave describe correctamente esta idea?';
    case 'prediction':
      return '¿Cual es el resultado de este codigo?';
    case 'debugging':
      return `¿Que esta mal en este fragmento de ${shortTitle.toLowerCase()} y como se corrige?`;
    default:
      return exercise.prompt;
  }
}

function buildPracticeQuestionHint(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return '';
    case 'completion':
      return 'Responde con una sola palabra o expresion corta.';
    case 'prediction':
      return 'Escribe solo lo que imprime el codigo al final.';
    case 'debugging':
      return 'Tu respuesta debe decir cual es la correccion principal del error.';
    default:
      return 'Resuelve el reto directamente en el editor.';
  }
}

function buildPracticeGuidance(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Este repaso vuelve a comprobar si recuerdas la idea central. Solo selecciona una opcion y confirma tu respuesta.';
    case 'completion':
      return 'Lee la definicion del concepto y escribe la palabra clave que mejor la describe. No expliques, solo responde con la palabra o expresion corta.';
    case 'prediction':
      return 'Lee el codigo otra vez y escribe exactamente lo que aparece en consola al final. Si imprime varias lineas, respeta el orden.';
    case 'debugging':
      return 'Aqui vuelves a detectar el error principal. Corrige la palabra, simbolo o parte incorrecta del fragmento.';
    default:
      return 'Rehace la solucion del reto con una respuesta limpia. La meta es confirmar que el procedimiento ya te sale de memoria.';
  }
}

function buildPracticeAnswerRule(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Responde seleccionando una sola opcion.';
    case 'completion':
      return 'Responde solo con la palabra clave o expresion corta correcta.';
    case 'prediction':
      return 'Responde exactamente con la salida del codigo.';
    case 'debugging':
      return 'Responde con la correccion principal.';
    default:
      return 'Responde editando el codigo del editor.';
  }
}

function buildPracticeSteps(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return ['Recuerda la idea base.', 'Compara opciones.', 'Confirma una sola respuesta.'];
    case 'completion':
      return ['Lee la definicion.', 'Identifica el concepto principal.', 'Escribe solo la palabra correcta y revisa.'];
    case 'prediction':
      return ['Lee el codigo.', 'Sigue el valor paso a paso.', 'Escribe la salida final en print: ___.'];
    case 'debugging':
      return ['Encuentra el error.', 'Piensa cual es la correccion minima.', 'Escribe solo esa correccion.'];
    default:
      return ['Lee el objetivo.', 'Corrige o completa la funcion.', 'Valida que el resultado pase.'];
  }
}

function buildSnippetLabel(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'prediction':
      return 'codigo a ejecutar';
    case 'debugging':
      return 'fragmento con error';
    case 'completion':
      return 'definicion del concepto';
    default:
      return 'fragmento de apoyo';
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

function isPracticeEligible(exercise: LearnerExercise) {
  return Boolean(
    exercise.completed ||
      exercise.lastSubmittedCode ||
      exercise.lastSubmittedText ||
      exercise.lastSelectedOptionId
  );
}

export default function PracticeScreen() {
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
  const [showGuidance, setShowGuidance] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const requestedExerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;

  const selectedTopic = useMemo(() => {
    const topic = dashboard?.topics.find((item) => item.id === requestedTopicId) || null;

    if (!topic) {
      return null;
    }

    return {
      ...topic,
      exercises: topic.exercises.filter((exercise) => isPracticeEligible(exercise)),
    };
  }, [dashboard?.topics, requestedTopicId]);

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

  const totalPracticeXp = useMemo(
    () => selectedTopic?.exercises.reduce((total, exercise) => total + getSafePracticeXp(exercise), 0) || 0,
    [selectedTopic]
  );

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleBackToPracticeHub() {
    setResultOverlay(null);
    router.replace({
      pathname: '/(tabs)/game',
      params: selectedTopic ? { topicId: selectedTopic.id } : undefined,
    });
  }

  function handleNextExercise() {
    const nextExerciseId = resultOverlay?.nextExerciseId || queuedNextExerciseId;

    if (!nextExerciseId) {
      setResultOverlay(null);
      handleBackToPracticeHub();
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
          ? { selectedOptionId, attemptMode: 'practice' }
          : selectedExercise.mode === 'text'
            ? { answerText, attemptMode: 'practice' }
            : { code: editorCode, attemptMode: 'practice' }
      );

      setEvaluation(response);
      const nextTopicFromDashboard = response.dashboard.topics.find((topic) => topic.id === response.topicId);
      const nextTopic = nextTopicFromDashboard
        ? {
            ...nextTopicFromDashboard,
            exercises: nextTopicFromDashboard.exercises.filter((exercise) => isPracticeEligible(exercise)),
          }
        : selectedTopic;
      const nextSequentialExercise = findNextSequentialExercise(nextTopic, selectedExercise.id);
      const nextExerciseId = nextSequentialExercise?.id || null;
      const nextCorrectChoiceOption =
        selectedExercise.mode === 'choice'
          ? getChoiceOption(selectedExercise, response.expectedSelectionId || null)
          : null;

      setQueuedNextExerciseId(nextExerciseId);
      setResultOverlay({
        headline: response.passed ? 'RESPUESTA CORRECTA' : 'RESPONDISTE MAL',
        title: selectedExercise.title || 'Resultado del repaso',
        score: response.score,
        xpReward: response.xpEarned,
        variant: response.passed ? 'pass' : 'fail',
        answerValue: buildResultAnswerValue(selectedExercise, response, nextCorrectChoiceOption),
        explanation: response.explanation || '',
        actionLabel: nextExerciseId ? 'SIGUIENTE PREGUNTA' : 'VOLVER A PRACTICA',
        nextExerciseId,
      });
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo evaluar el repaso');
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

  if (!selectedTopic || !selectedTopic.exercises.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>repaso no disponible</Text>
            <Text style={styles.bodyText}>
              Esta vista se abre desde `Practica` y solo muestra lecciones que ya completaste antes.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleBackToPracticeHub}>
              <Text style={styles.primaryButtonText}>VOLVER A PRACTICA</Text>
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
            <Pressable style={styles.backButton} onPress={handleBackToPracticeHub}>
              <Text style={styles.backButtonText}>← VOLVER A PRACTICA</Text>
              <Text style={styles.backButtonHint}>Regresa al carrusel de temas cuando quieras cambiar de repaso.</Text>
            </Pressable>
            <BrandMark label={dashboard.settings.branding.logoLabel} size={58} />
          </View>

          <Text style={styles.heroEyebrow}>REPASO DE LA MISMA LECCION</Text>
          <Text style={styles.heroTitle}>{selectedTopic.title}</Text>
          <Text style={styles.heroText}>
            Aqui refuerzas retos que ya aprobaste o que ya intentaste antes, siempre con el 50% del XP original.
          </Text>

          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`${selectedTopic.exercises.length}`}</Text>
              <Text style={styles.heroBadgeLabel}>retos listos</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`${totalPracticeXp} XP`}</Text>
              <Text style={styles.heroBadgeLabel}>recompensa total</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>50%</Text>
              <Text style={styles.heroBadgeLabel}>del XP original</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>contexto del repaso</Text>
            <Pressable
              style={[styles.guideToggle, showContext && styles.guideToggleActive]}
              onPress={() => setShowContext((current) => !current)}>
              <Text style={styles.guideToggleText}>{showContext ? 'HIDE CONTEXTO' : 'SHOW CONTEXTO'}</Text>
            </Pressable>
          </View>
          <Text style={styles.bodyText}>Vuelves a hacer la misma idea, pero como repaso rapido y con menor XP.</Text>
          {showContext ? (
            <View style={styles.contextList}>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>que estas reheciendo</Text>
                <Text style={styles.contextValue}>{selectedTopic.lessonGoal}</Text>
              </View>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>por que existe practica</Text>
                <Text style={styles.contextValue}>
                    Practica sirve para reforzar la misma leccion despues de haberla resuelto o intentado. Te ayuda a recordar mejor sin mezclarlo con el avance principal.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>retos de repaso</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {selectedTopic.exercises.map((exercise) => {
              const isSelected = exercise.id === selectedExercise?.id;
              return (
                <Pressable
                  key={exercise.id}
                  style={[styles.tab, isSelected && styles.tabSelected]}
                  onPress={() => setSelectedExerciseId(exercise.id)}>
                  <Text style={[styles.tabTitle, isSelected && styles.tabTitleSelected]}>{exercise.title}</Text>
                  <Text style={styles.tabMeta}>{rewardLabel(exercise)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {selectedExercise ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>reto de repaso actual</Text>
              <Text style={styles.challengeTitle}>{buildPracticeTitle(selectedExercise)}</Text>
              <Text style={styles.challengeSubtitle}>{buildPracticeSubtitle(selectedExercise)}</Text>
              <View style={styles.promptShell}>
                <Text style={styles.promptLabel}>{buildPracticePromptLabel(selectedExercise)}</Text>
                <Text style={styles.promptText}>{buildPracticeQuestion(selectedExercise)}</Text>
                {buildPracticeQuestionHint(selectedExercise) ? (
                  <Text style={styles.promptHint}>{buildPracticeQuestionHint(selectedExercise)}</Text>
                ) : null}
              </View>
              <View style={styles.pills}>
                <Text style={styles.pill}>{selectedExercise.lessonTypeLabel}</Text>
                <Text style={styles.pill}>{rewardLabel(selectedExercise)}</Text>
                <Text style={styles.pill}>solo repaso</Text>
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
                      <Text style={styles.guidanceLead}>{buildPracticeGuidance(selectedExercise)}</Text>
                      <View style={styles.answerRuleBox}>
                        <Text style={styles.answerRuleLabel}>como debes responder</Text>
                        <Text style={styles.answerRuleText}>{buildPracticeAnswerRule(selectedExercise)}</Text>
                      </View>
                      <View style={styles.guidanceSteps}>
                        {buildPracticeSteps(selectedExercise).map((step, index) => (
                          <View key={`${selectedExercise.id}-practice-step-${index + 1}`} style={styles.guidanceStep}>
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
                        onPress={() => handleSelectOption(option.id)}>
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
                          <Text key={`${selectedExercise.id}-practice-snippet-${index + 1}`} style={styles.snippetLine}>
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
                  />
                </>
              ) : (
                <>
                  {selectedExercise.codeSnippet ? (
                    <View style={styles.snippetBox}>
                      <Text style={styles.snippetLabel}>{buildSnippetLabel(selectedExercise)}</Text>
                      {selectedExercise.codeSnippet.split('\n').map((line, index) => (
                        <Text key={`${selectedExercise.id}-practice-code-${index + 1}`} style={styles.snippetLine}>
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
                  />
                </>
              )}

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
            </View>

          </>
        ) : null}
      </ScrollView>

      <CodeCelebrationOverlay
        visible={Boolean(resultOverlay)}
        headline={resultOverlay?.headline}
        title={resultOverlay?.title || 'Resultado del repaso'}
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
    flex: 1,
    backgroundColor: '#133258',
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  backButtonText: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  backButtonHint: {
    color: '#C7D9F7',
    fontSize: 12,
    lineHeight: 18,
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
  contextList: {
    gap: 10,
  },
  contextItem: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  contextLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  contextValue: {
    color: DuocodePalette.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    fontFamily: Fonts.mono,
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
  promptText: {
    color: DuocodePalette.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  promptHint: {
    color: '#D4E2F8',
    fontSize: 13,
    lineHeight: 19,
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
    paddingVertical: 10,
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
