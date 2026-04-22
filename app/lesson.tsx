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

  return topic.exercises.find((exercise) => exercise.id === requestedExerciseId) || topic.exercises[0] || null;
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

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function handleBackToClasses() {
    router.replace({
      pathname: '/(tabs)/explore',
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
          ? { selectedOptionId, attemptMode: 'lesson' }
          : selectedExercise.mode === 'text'
            ? { answerText, attemptMode: 'lesson' }
            : { code: editorCode, attemptMode: 'lesson' }
      );

      setEvaluation(response);
      if (response.passed) {
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
          <Text style={styles.cardTitle}>retos de la leccion</Text>
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
              <Text style={styles.cardTitle}>{selectedExercise.title}</Text>
              <Text style={styles.promptText}>{selectedExercise.prompt}</Text>
              <View style={styles.pills}>
                <Text style={styles.pill}>{selectedExercise.lessonTypeLabel}</Text>
                <Text style={styles.pill}>{rewardLabel(selectedExercise)}</Text>
                <Text style={styles.pill}>{`mejor ${selectedExercise.bestScore}%`}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  {selectedExercise.mode === 'choice'
                    ? 'elige una opcion'
                    : selectedExercise.mode === 'text'
                      ? 'escribe la respuesta'
                      : 'editor de codigo'}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={handleReset}>
                    <Text style={styles.secondaryButtonText}>RESET</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={handleEvaluate} disabled={submitting}>
                    <Text style={styles.primaryButtonText}>{submitting ? 'REVISANDO...' : 'REVISAR'}</Text>
                  </Pressable>
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
                        onPress={() => setSelectedOptionId(option.id)}>
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
                  />
                </>
              ) : (
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
    fontSize: 15,
    lineHeight: 22,
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
  snippetLine: {
    color: DuocodePalette.code,
    fontSize: 13,
    lineHeight: 20,
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
