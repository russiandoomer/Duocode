import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';

const TOPICS_PER_PAGE = 5;

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
  const { width } = useWindowDimensions();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

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
  const practicePages = useMemo(() => {
    const pages = [];

    for (let index = 0; index < practiceTopics.length; index += TOPICS_PER_PAGE) {
      pages.push(practiceTopics.slice(index, index + TOPICS_PER_PAGE));
    }

    return pages;
  }, [practiceTopics]);
  const currentPageIndex = Math.floor(selectedTopicIndex / TOPICS_PER_PAGE);
  const pageWidth = Math.max(width - 72, 280);
  const totalPracticeXp = useMemo(
    () => selectedTopic?.exercises.reduce((total, exercise) => total + exercise.practiceXpReward, 0) || 0,
    [selectedTopic]
  );

  useEffect(() => {
    if (!selectedTopic) {
      return;
    }

    sliderRef.current?.scrollTo({
      x: currentPageIndex * pageWidth,
      animated: true,
    });
  }, [currentPageIndex, pageWidth, selectedTopic]);

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  function selectPageByIndex(pageIndex: number) {
    const nextPage = practicePages[pageIndex];

    if (!nextPage?.length) {
      return;
    }

    setSelectedTopicId(nextPage[0].id);
  }

  function handlePageScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextPageIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);

    if (nextPageIndex !== currentPageIndex) {
      selectPageByIndex(nextPageIndex);
    }
  }

  function openPracticeTopic() {
    if (!selectedTopic) {
      return;
    }

    setDetailVisible(false);

    router.push({
      pathname: '/practice',
      params: {
        topicId: selectedTopic.id,
      },
    });
  }

  function openPracticeDetail(topicId: string) {
    setSelectedTopicId(topicId);
    setDetailVisible(true);
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
            <Text style={styles.sectionMeta}>{`pagina ${currentPageIndex + 1}/${practicePages.length}`}</Text>
          </View>

          <View style={styles.sliderControls}>
            <Pressable
              style={[styles.navButton, currentPageIndex === 0 && styles.navButtonDisabled]}
              onPress={() => selectPageByIndex(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}>
              <Text style={styles.navButtonText}>← ANTERIOR</Text>
            </Pressable>

            <Pressable
              style={[
                styles.navButton,
                currentPageIndex === practicePages.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() => selectPageByIndex(currentPageIndex + 1)}
              disabled={currentPageIndex === practicePages.length - 1}>
              <Text style={styles.navButtonText}>SIGUIENTE →</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={sliderRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePageScrollEnd}
            contentContainerStyle={styles.slider}>
            {practicePages.map((pageTopics, pageIndex) => (
              <View key={`practice-page-${pageIndex + 1}`} style={[styles.slidePage, { width: pageWidth }]}>
                <Text style={styles.pageLabel}>{`bloque ${pageIndex + 1}`}</Text>
                <View style={styles.pageTopics}>
                  {pageTopics.map((topic, topicIndex) => {
                    const isSelected = topic.id === selectedTopic?.id;
                    return (
                      <Pressable
                        key={topic.id}
                        style={[styles.slide, isSelected && styles.slideSelected]}
                        onPress={() => openPracticeDetail(topic.id)}>
                        <View style={styles.slideHeader}>
                          <Text style={styles.slideEyebrow}>{`${topic.level} · ${pageIndex * TOPICS_PER_PAGE + topicIndex + 1}`}</Text>
                          {isSelected ? <Text style={styles.slideChip}>ACTIVO</Text> : null}
                        </View>
                        <Text style={styles.slideTitle}>{topic.title}</Text>
                        <Text style={styles.slideText}>{topic.lessonGoal}</Text>
                        <Text style={styles.slideMeta}>{`${topic.exercises.length} retos rehechos · ${topic.progressPercent}% de la leccion base`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.pagination}>
            {practicePages.map((_, pageIndex) => {
              const isActive = pageIndex === currentPageIndex;

              return (
                <Pressable
                  key={`practice-dot-${pageIndex + 1}`}
                  style={[styles.paginationDot, isActive && styles.paginationDotActive]}
                  onPress={() => selectPageByIndex(pageIndex)}>
                  <Text style={[styles.paginationDotText, isActive && styles.paginationDotTextActive]}>
                    {pageIndex + 1}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={detailVisible && Boolean(selectedTopic)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailVisible(false)} />

          <View style={styles.modalCard}>
            {selectedTopic ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalEyebrow}>{`${selectedTopic.level} · ${selectedTopic.unitTitle}`}</Text>
                    <Text style={styles.modalTitle}>{selectedTopic.title}</Text>
                    <Text style={styles.modalText}>
                      Repaso de una leccion ya completada. Aqui no avanzas contenido nuevo: solo refuerzas lo aprendido.
                    </Text>
                  </View>

                  <Pressable style={styles.modalCloseButton} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.modalCloseButtonText}>CERRAR</Text>
                  </Pressable>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>que vas a reforzar</Text>
                  <Text style={styles.modalSectionText}>{selectedTopic.lessonGoal}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>como funciona</Text>
                  <Text style={styles.modalSectionText}>
                    Rehaces la misma base de la leccion original con menor XP, para recordar mejor y responder con mas seguridad.
                  </Text>
                </View>

                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>{`${selectedTopic.exercises.length}`}</Text>
                    <Text style={styles.modalBadgeLabel}>retos</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>{`${totalPracticeXp} XP`}</Text>
                    <Text style={styles.modalBadgeLabel}>recompensa total</Text>
                  </View>

                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeValue}>35%</Text>
                    <Text style={styles.modalBadgeLabel}>del XP original</Text>
                  </View>
                </View>

                <Pressable style={styles.primaryButton} onPress={openPracticeTopic}>
                  <Text style={styles.primaryButtonText}>ABRIR REPASO</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    gap: 0,
  },
  slidePage: {
    gap: 12,
    paddingRight: 12,
  },
  pageLabel: {
    color: DuocodePalette.terminalBlue,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  pageTopics: {
    gap: 12,
  },
  slide: {
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
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  slideEyebrow: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  slideChip: {
    backgroundColor: '#163325',
    borderWidth: 1,
    borderColor: DuocodePalette.green,
    borderRadius: 999,
    color: DuocodePalette.code,
    fontSize: 10,
    fontFamily: Fonts.mono,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#305072',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  paginationDotActive: {
    backgroundColor: DuocodePalette.accent,
  },
  paginationDotText: {
    color: '#D7E7FC',
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  paginationDotTextActive: {
    color: DuocodePalette.surface,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.78)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalEyebrow: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  modalTitle: {
    color: DuocodePalette.text,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  modalText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalSection: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 6,
  },
  modalSectionLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  modalSectionText: {
    color: DuocodePalette.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  modalCloseButton: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalCloseButtonText: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalBadge: {
    flex: 1,
    minWidth: 120,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  modalBadgeValue: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    textAlign: 'center',
  },
  modalBadgeLabel: {
    color: DuocodePalette.muted,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
});
