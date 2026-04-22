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
        <Text style={styles.cardTitle}>loading.workspace()</Text>
        <Text style={styles.bodyText}>Estamos preparando tu laboratorio.</Text>
      </View>
    </ScrollView>
  );
}

function rewardLabel(exercise: LearnerExercise, sessionMode: 'lesson' | 'practice') {
  return sessionMode === 'lesson'
    ? `+${exercise.xpReward} XP aprendizaje`
    : `+${exercise.practiceXpReward} XP practica`;
}

function findInitialExercise(topic: LearnerTopic | null, requestedExerciseId?: string) {
  if (!topic) {
    return null;
  }

  return topic.exercises.find((exercise) => exercise.id === requestedExerciseId) || topic.exercises[0] || null;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[]; exerciseId?: string | string[]; sessionMode?: string | string[] }>();
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
  const requestedSessionMode = Array.isArray(params.sessionMode) ? params.sessionMode[0] : params.sessionMode;
  const sessionMode = requestedSessionMode === 'lesson' ? 'lesson' : 'practice';

  const allTopics = useMemo(() => dashboard?.topics || [], [dashboard?.topics]);
  const lessonTopic = allTopics.find((topic) => topic.id === requestedTopicId) || null;
  const practiceTopics = useMemo(
    () =>
      allTopics
        .map((topic) => ({
          ...topic,
          exercises: topic.exercises.filter((exercise) => exercise.completed),
        }))
        .filter((topic) => topic.exercises.length > 0),
    [allTopics]
  );
  const availableTopics = useMemo(
    () => (sessionMode === 'lesson' ? (lessonTopic ? [lessonTopic] : []) : practiceTopics),
    [lessonTopic, practiceTopics, sessionMode]
  );

  useEffect(() => {
    if (!availableTopics.length) {
      setSelectedTopicId(null);
      return;
    }

    setSelectedTopicId((current) => {
      if (requestedTopicId && availableTopics.some((topic) => topic.id === requestedTopicId)) {
        return requestedTopicId;
      }

      if (current && availableTopics.some((topic) => topic.id === current)) {
        return current;
      }

      return availableTopics[0].id;
    });
  }, [availableTopics, requestedTopicId]);

  const selectedTopic = availableTopics.find((topic) => topic.id === selectedTopicId) || availableTopics[0] || null;

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

  if (loading || !dashboard) {
    return <LoadingState />;
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
          ? { selectedOptionId, attemptMode: sessionMode }
          : selectedExercise.mode === 'text'
            ? { answerText, attemptMode: sessionMode }
            : { code: editorCode, attemptMode: sessionMode }
      );

      setEvaluation(response);
      if (response.passed) {
        setCelebrationVisible(true);
      }
    } catch (error) {
      Alert.alert('duocode', error instanceof Error ? error.message : 'No se pudo evaluar la actividad');
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

  if (sessionMode === 'practice' && !practiceTopics.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>practice.mode</Text>
            <Text style={styles.bodyText}>Primero completa una leccion. Luego aqui la repites con 35% del XP original.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.primaryButtonText}>IR A CLASES</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sessionMode === 'lesson' && !lessonTopic) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>leccion no encontrada</Text>
            <Text style={styles.bodyText}>Esta pantalla de aprendizaje se abre desde `Clases`.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/explore')}>
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
        <View style={styles.hero}>
          <BrandMark label={dashboard.settings.branding.logoLabel} size={68} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{sessionMode === 'lesson' ? 'lesson.mode' : 'practice.mode'}</Text>
            <Text style={styles.heroMeta}>
              {selectedTopic ? `${selectedTopic.unitTitle} · Leccion ${selectedTopic.lessonNumber}` : 'Sin tema activo'}
            </Text>
            <Text style={styles.bodyText}>
              {sessionMode === 'lesson'
                ? 'Aprendes con XP completo y desbloqueas progreso.'
                : 'Repasas temas ya terminados con XP reducido.'}
            </Text>
          </View>
        </View>

        {sessionMode === 'practice' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>temas para practicar</Text>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slider}>
              {practiceTopics.map((topic) => {
                const isSelected = topic.id === selectedTopic?.id;
                return (
                  <Pressable key={topic.id} style={[styles.slide, isSelected && styles.slideSelected]} onPress={() => setSelectedTopicId(topic.id)}>
                    <Text style={styles.slideEyebrow}>{topic.level}</Text>
                    <Text style={styles.slideTitle}>{topic.title}</Text>
                    <Text style={styles.slideText}>{topic.lessonGoal}</Text>
                    <Text style={styles.slideMeta}>{`${topic.completedExercises} completados · ${topic.progressPercent}%`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {selectedTopic ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{sessionMode === 'lesson' ? 'retos de la leccion' : 'retos de repaso'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {selectedTopic.exercises.map((exercise) => {
                const isSelected = exercise.id === selectedExercise?.id;
                return (
                  <Pressable key={exercise.id} style={[styles.tab, isSelected && styles.tabSelected]} onPress={() => setSelectedExerciseId(exercise.id)}>
                    <Text style={[styles.tabTitle, isSelected && styles.tabTitleSelected]}>{exercise.title}</Text>
                    <Text style={styles.tabMeta}>{rewardLabel(exercise, sessionMode)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {selectedExercise ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{selectedExercise.title}</Text>
              <Text style={styles.promptText}>{selectedExercise.prompt}</Text>
              <View style={styles.pills}>
                <Text style={styles.pill}>{selectedExercise.lessonTypeLabel}</Text>
                <Text style={styles.pill}>{rewardLabel(selectedExercise, sessionMode)}</Text>
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
                      <Pressable key={option.id} style={[styles.optionCard, isActive && styles.optionCardSelected]} onPress={() => setSelectedOptionId(option.id)}>
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
                        ? sessionMode === 'lesson'
                          ? 'Esta resolucion suma el XP completo de aprendizaje.'
                          : 'Este repaso suma solo el XP reducido.'
                        : 'Compara tu respuesta con lo esperado y vuelve a intentar.'}
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
        title={selectedExercise?.title || 'Actividad completada'}
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
  hero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: DuocodePalette.surface,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroMeta: {
    color: DuocodePalette.accent,
    fontSize: 13,
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
  slider: {
    gap: 14,
    paddingRight: 12,
  },
  slide: {
    width: 280,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 16,
    gap: 8,
  },
  slideSelected: {
    borderColor: DuocodePalette.accent,
    backgroundColor: DuocodePalette.accentSoft,
  },
  slideEyebrow: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  slideTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  slideText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  slideMeta: {
    color: DuocodePalette.surface,
    fontSize: 12,
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
