import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';

const PRACTICE_CARD_WIDTH = 286;

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>loading.practice.hub()</Text>
        <Text style={styles.bodyText}>Estamos armando tu zona de repaso.</Text>
      </View>
    </ScrollView>
  );
}

export default function PracticeHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId?: string | string[] }>();
  const { dashboard, loading } = useLearnerDashboard();
  const sliderRef = useRef<ScrollView | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const requestedTopicId = Array.isArray(params.topicId) ? params.topicId[0] : params.topicId;
  const practiceTopics = useMemo(
    () =>
      (dashboard?.topics || [])
        .map((topic) => ({
          ...topic,
          exercises: topic.exercises.filter((exercise) => exercise.completed),
        }))
        .filter((topic) => topic.exercises.length > 0),
    [dashboard?.topics]
  );

  useEffect(() => {
    if (!practiceTopics.length) {
      setSelectedTopicId(null);
      return;
    }

    setSelectedTopicId((current) => {
      if (requestedTopicId && practiceTopics.some((topic) => topic.id === requestedTopicId)) {
        return requestedTopicId;
      }

      if (current && practiceTopics.some((topic) => topic.id === current)) {
        return current;
      }

      return practiceTopics[0].id;
    });
  }, [practiceTopics, requestedTopicId]);

  const selectedTopic = practiceTopics.find((topic) => topic.id === selectedTopicId) || practiceTopics[0] || null;
  const selectedTopicIndex = Math.max(
    0,
    practiceTopics.findIndex((topic) => topic.id === selectedTopic?.id)
  );
  const totalPracticeXp = useMemo(
    () => selectedTopic?.exercises.reduce((total, exercise) => total + exercise.practiceXpReward, 0) || 0,
    [selectedTopic]
  );

  useEffect(() => {
    if (!selectedTopic) {
      return;
    }

    sliderRef.current?.scrollTo({
      x: selectedTopicIndex * (PRACTICE_CARD_WIDTH + 14),
      animated: true,
    });
  }, [selectedTopic, selectedTopicIndex]);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function selectTopicByIndex(index: number) {
    const nextTopic = practiceTopics[index];

    if (!nextTopic) {
      return;
    }

    setSelectedTopicId(nextTopic.id);
  }

  function openPracticeTopic() {
    if (!selectedTopic) {
      return;
    }

    router.push({
      pathname: '/practice',
      params: {
        topicId: selectedTopic.id,
      },
    });
  }

  if (!practiceTopics.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Zona de practica</Text>
            <Text style={styles.bodyText}>
              Primero completa una leccion en `Clases`. Luego aqui la vuelves a hacer como repaso con solo el 35% del XP original.
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <BrandMark label={dashboard.settings.branding.logoLabel} size={66} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Zona de practica</Text>
              <Text style={styles.heroMeta}>repaso separado del avance principal</Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            Practica no es una clase nueva. Es la misma leccion que ya aprobaste, rehecha para fijar memoria y mantener agilidad. Por eso el XP baja al 35%.
          </Text>

          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>{`${practiceTopics.length}`}</Text>
              <Text style={styles.heroBadgeLabel}>temas listos</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeValue}>35%</Text>
              <Text style={styles.heroBadgeLabel}>del XP original</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>temas por practicar</Text>
            <Text style={styles.sectionMeta}>{`${selectedTopicIndex + 1}/${practiceTopics.length}`}</Text>
          </View>

          <View style={styles.sliderControls}>
            <Pressable
              style={[styles.navButton, selectedTopicIndex === 0 && styles.navButtonDisabled]}
              onPress={() => selectTopicByIndex(selectedTopicIndex - 1)}
              disabled={selectedTopicIndex === 0}>
              <Text style={styles.navButtonText}>← ANTERIOR</Text>
            </Pressable>

            <Pressable
              style={[
                styles.navButton,
                selectedTopicIndex === practiceTopics.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() => selectTopicByIndex(selectedTopicIndex + 1)}
              disabled={selectedTopicIndex === practiceTopics.length - 1}>
              <Text style={styles.navButtonText}>SIGUIENTE →</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={sliderRef}
            horizontal
            snapToInterval={PRACTICE_CARD_WIDTH + 14}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slider}>
            {practiceTopics.map((topic) => {
              const isSelected = topic.id === selectedTopic?.id;
              return (
                <Pressable
                  key={topic.id}
                  style={[styles.slide, isSelected && styles.slideSelected]}
                  onPress={() => setSelectedTopicId(topic.id)}>
                  <Text style={styles.slideEyebrow}>{topic.level}</Text>
                  <Text style={styles.slideTitle}>{topic.title}</Text>
                  <Text style={styles.slideText}>{topic.lessonGoal}</Text>
                  <Text style={styles.slideMeta}>{`${topic.exercises.length} retos rehechos · ${topic.progressPercent}% de la leccion base`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.pagination}>
            {practiceTopics.map((topic) => {
              const isActive = topic.id === selectedTopic?.id;
              return <View key={topic.id} style={[styles.paginationDot, isActive && styles.paginationDotActive]} />;
            })}
          </View>
        </View>

        {selectedTopic ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>contexto del tema</Text>

              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>que estas repasando</Text>
                <Text style={styles.contextValue}>{selectedTopic.lessonGoal}</Text>
              </View>

              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>de donde viene</Text>
                <Text style={styles.contextValue}>
                  Este repaso sale de la misma leccion que ya completaste en `Clases`. No desbloquea contenido nuevo; solo refuerza lo aprendido.
                </Text>
              </View>

              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>que ganas aqui</Text>
                <Text style={styles.contextValue}>
                  Rehaces los retos ya aprobados con menos recompensa, pero mantienes el tema fresco y mejoras seguridad al responder.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.practiceSummary}>
                <View style={styles.practiceSummaryCopy}>
                  <Text style={styles.contextLabel}>repaso seleccionado</Text>
                  <Text style={styles.practiceSummaryTitle}>{selectedTopic.title}</Text>
                  <Text style={styles.practiceSummaryText}>
                    {`${selectedTopic.exercises.length} retos disponibles · ${totalPracticeXp} XP en total si vuelves a completarlos.`}
                  </Text>
                </View>

                <Pressable style={styles.primaryButton} onPress={openPracticeTopic}>
                  <Text style={styles.primaryButtonText}>ABRIR REPASO</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
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
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: DuocodePalette.text,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  heroMeta: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  heroText: {
    color: '#C8D7EE',
    fontSize: 14,
    lineHeight: 21,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroBadge: {
    minWidth: 120,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  sliderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  navButton: {
    flex: 1,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    color: DuocodePalette.text,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  slider: {
    gap: 14,
    paddingRight: 14,
  },
  slide: {
    width: PRACTICE_CARD_WIDTH,
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
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  slideText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  slideMeta: {
    color: '#D2E1F8',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.mono,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#305072',
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: DuocodePalette.accent,
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
  practiceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  practiceSummaryCopy: {
    flex: 1,
    gap: 6,
  },
  practiceSummaryTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  practiceSummaryText: {
    color: '#C8D7EE',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
});
