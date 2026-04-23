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

  return Math.max(5, Math.round(Number(exercise.xpReward || 0) * 0.35));
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
      return 'Repasa completando lo que falta';
    case 'prediction':
      return 'Repasa prediciendo la salida';
    case 'debugging':
      return 'Repasa corrigiendo el error';
    default:
      return 'Repasa resolviendo el codigo';
  }
}

function buildPracticePromptLabel(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'pregunta que debes responder';
    case 'completion':
      return 'pieza que debes completar';
    case 'prediction':
      return 'salida que debes escribir';
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
      return `¿Que palabra, operador o expresion falta en el fragmento de ${shortTitle.toLowerCase()}?`;
    case 'prediction':
      return `¿Que salida exacta produce este fragmento de ${shortTitle.toLowerCase()}?`;
    case 'debugging':
      return `¿Que esta mal en este fragmento de ${shortTitle.toLowerCase()} y como se corrige?`;
    default:
      return exercise.prompt;
  }
}

function buildPracticeQuestionHint(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return 'Toca una sola opcion, no escribes nada y despues pulsa REVISAR.';
    case 'completion':
      return 'No copies todo el codigo. Escribe solo la pieza que falta.';
    case 'prediction':
      return 'Tu respuesta debe ser exactamente la salida final, sin texto extra.';
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
      return 'Vas a rehacer la misma idea clave. Escribe solo la pieza faltante y evita volver a copiar todo el fragmento.';
    case 'prediction':
      return 'Lee el codigo otra vez y escribe exactamente la salida final. La idea es comprobar si ya puedes seguir la logica sin ayuda.';
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
      return 'Responde solo con la pieza faltante.';
    case 'prediction':
      return 'Responde exactamente con la salida.';
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
      return ['Observa el fragmento.', 'Detecta la pieza faltante.', 'Escribe solo esa pieza y revisa.'];
    case 'prediction':
      return ['Sigue el flujo paso a paso.', 'Identifica la salida final.', 'Escribe solo el resultado exacto.'];
    case 'debugging':
      return ['Encuentra el error.', 'Piensa cual es la correccion minima.', 'Escribe solo esa correccion.'];
    default:
      return ['Lee el objetivo.', 'Corrige o completa la funcion.', 'Valida que el resultado pase.'];
  }
}

function buildSnippetLabel(exercise: LearnerExercise) {
  switch (exercise.kind) {
    case 'prediction':
      return 'fragmento a analizar';
    case 'debugging':
      return 'fragmento con error';
    case 'completion':
      return 'fragmento base';
    default:
      return 'fragmento de apoyo';
  }
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
  const [celebrationVisible, setCelebrationVisible] = useState(false);
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
      exercises: topic.exercises.filter((exercise) => exercise.completed),
    };
  }, [dashboard?.topics, requestedTopicId]);

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
      setHydratedExerciseId(selectedExercise.id);
      setShowGuidance(false);
    }
  }, [hydratedExerciseId, selectedExercise]);

  const selectedChoiceOption =
    selectedExercise?.mode === 'choice' ? getChoiceOption(selectedExercise, selectedOptionId) : null;
  const correctChoiceOption =
    selectedExercise?.mode === 'choice' && evaluation
      ? getChoiceOption(selectedExercise, evaluation.expectedSelectionId || null)
      : null;
  const totalPracticeXp = useMemo(
    () => selectedTopic?.exercises.reduce((total, exercise) => total + getSafePracticeXp(exercise), 0) || 0,
    [selectedTopic]
  );

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleBackToPracticeHub() {
    router.replace({
      pathname: '/(tabs)/game',
      params: selectedTopic ? { topicId: selectedTopic.id } : undefined,
    });
  }

  async function handleEvaluate() {
    if (!selectedExercise) {
      return;
    }

    setSubmitting(true);

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
      if (response.passed) {
        setCelebrationVisible(true);
      }
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
            Rehaces un tema que ya aprobaste para fijarlo mejor con solo el 35% del XP original.
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
              <Text style={styles.heroBadgeValue}>35%</Text>
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
                  Practica sirve para volver a hacer la misma leccion cuando ya la aprobaste. Te ayuda a recordar mejor sin mezclarlo con el avance principal.
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
              <Text style={styles.challengeSubtitle}>{getExerciseShortTitle(selectedExercise)}</Text>
              <View style={styles.promptShell}>
                <Text style={styles.promptLabel}>{buildPracticePromptLabel(selectedExercise)}</Text>
                <Text style={styles.promptText}>{buildPracticeQuestion(selectedExercise)}</Text>
                <Text style={styles.promptHint}>{buildPracticeQuestionHint(selectedExercise)}</Text>
              </View>
              <View style={styles.pills}>
                <Text style={styles.pill}>{selectedExercise.lessonTypeLabel}</Text>
                <Text style={styles.pill}>{rewardLabel(selectedExercise)}</Text>
                <Text style={styles.pill}>solo repaso</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>que debes hacer</Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={handleReset}>
                    <Text style={styles.secondaryButtonText}>RESET</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={handleEvaluate} disabled={submitting}>
                    <Text style={styles.primaryButtonText}>{submitting ? 'REVISANDO...' : 'REVISAR'}</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[styles.guideToggle, showGuidance && styles.guideToggleActive]}
                onPress={() => setShowGuidance((current) => !current)}>
                <Text style={styles.guideToggleText}>{showGuidance ? 'HIDE GUIA' : 'SHOW GUIA'}</Text>
                <Text style={styles.guideToggleHint}>
                  {showGuidance
                    ? 'Oculta los pasos extra y deja visible solo el reto.'
                    : 'Abre una ayuda corta si quieres ver como responder este reto.'}
                </Text>
              </Pressable>

              {showGuidance ? (
                <View style={styles.guidanceCard}>
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
                </View>
              ) : null}

              {selectedExercise.mode === 'choice' ? (
                <View style={styles.optionList}>
                  <View style={styles.choiceInfoCard}>
                    <Text style={styles.choiceInfoEyebrow}>elige 1 opcion</Text>
                    <Text style={styles.choiceInfoText}>
                      Toca la tarjeta que mejor responde la pregunta. Cuando ya la tengas elegida, pulsa `REVISAR`.
                    </Text>
                  </View>
                  {selectedExercise.choiceOptions.map((option) => {
                    const isActive = option.id === selectedOptionId;
                    const optionBadge = option.id.toUpperCase();
                    const optionHeading = option.label?.trim() || `Opcion ${optionBadge}`;
                    const optionBody = option.detail?.trim() || optionHeading;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.optionCard, isActive && styles.optionCardSelected]}
                        onPress={() => setSelectedOptionId(option.id)}>
                        <View style={styles.optionHeader}>
                          <Text style={styles.optionBadge}>{optionBadge}</Text>
                          <Text style={styles.optionTitle}>{optionHeading}</Text>
                          {isActive ? <Text style={styles.optionStatus}>elegida</Text> : null}
                        </View>
                        <Text style={styles.optionDetail}>{optionBody}</Text>
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
                        <Text key={`${selectedExercise.id}-practice-snippet-${index + 1}`} style={styles.snippetLine}>
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
                    onChangeText={setEditorCode}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    style={styles.codeInput}
                  />
                </>
              )}
            </View>

            {evaluation ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.resultCopy}>
                    <Text style={styles.cardTitle}>{evaluation.passed ? 'repaso correcto' : 'necesita ajuste'}</Text>
                    <Text style={styles.bodyText}>
                      {evaluation.passed
                        ? 'Este repaso no abre contenido nuevo: solo refuerza la memoria del tema y suma XP reducido.'
                        : 'Compara tu respuesta con lo esperado y vuelve a intentarlo.'}
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
        title={selectedExercise?.title || 'Repaso completado'}
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
    backgroundColor: '#0F1A2D',
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
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
  guideToggleHint: {
    color: '#C9D9F0',
    fontSize: 12,
    lineHeight: 18,
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
  choiceInfoCard: {
    backgroundColor: '#0F1A2D',
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  choiceInfoEyebrow: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  choiceInfoText: {
    color: '#D7E6FB',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
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
  optionTitle: {
    flex: 1,
    color: '#CFE0F8',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
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
