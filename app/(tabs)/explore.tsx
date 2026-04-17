import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>loading classes...</Text>
        <Text style={styles.loadingText}>Estamos preparando tus clases, temas y recursos.</Text>
      </View>
    </ScrollView>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { dashboard, loading } = useLearnerDashboard();

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  const { settings, topics, user } = dashboard;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>classroom.tsx</Text>
        <Text style={styles.subtitle}>{`Ruta activa: ${user.track}`}</Text>
      </View>

      <TextInput
        placeholder={`buscar('${user.focus}')`}
        placeholderTextColor={DuocodePalette.muted}
        style={styles.searchInput}
      />

      <Text style={styles.sectionTitle}>categorias</Text>
      <View style={styles.categoriesRow}>
        {settings.categories.map((category, index) => (
          <Pressable
            key={category}
            style={[styles.categoryChip, index === 0 && styles.categoryChipActive]}
            onPress={() => Alert.alert('duocode', `Categoria activa: ${category}`)}>
            <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>
              {`<${category} />`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>temas_del_alumno</Text>
      {topics.map((topic) => (
        <Pressable key={topic.id} style={styles.topicCard} onPress={() => router.push('/(tabs)/game')}>
          <View style={styles.topicHeader}>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{topic.exercises.length}</Text>
            </View>

            <View style={styles.topicBody}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDescription}>{topic.description}</Text>
            </View>
          </View>

          <View style={styles.topicMetaRow}>
            <Text style={styles.topicMeta}>{`${topic.completedExercises}/${topic.exerciseCount} resueltos`}</Text>
            <Text style={styles.topicMeta}>{`${topic.estimatedMinutes} min`}</Text>
            <Text style={styles.topicMeta}>{topic.status}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${topic.progressPercent}%` }]} />
          </View>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>clases_recomendadas</Text>
      {settings.featuredClasses.map((item, index) => (
        <Pressable
          key={item.id}
          style={styles.classCard}
          onPress={() => Alert.alert('duocode', `Clase sugerida: ${item.title}`)}>
          <View style={[styles.resourceThumb, index === 0 ? styles.thumbSoft : styles.thumbMuted]}>
            <Text style={styles.resourceThumbText}>{item.tag}</Text>
          </View>

          <View style={styles.classBody}>
            <Text style={styles.resourceTitle}>{item.title}</Text>
            <Text style={styles.classDescription}>{item.description}</Text>
            <View style={styles.classMetaRow}>
              <Text style={styles.classMeta}>{item.level}</Text>
              <Text style={styles.classMeta}>{item.duration}</Text>
              <Text style={styles.classMeta}>{`${item.lessons} lessons`}</Text>
            </View>
          </View>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>recursos</Text>
      {settings.resources.map((resource, index) => (
        <Pressable
          key={resource.id}
          style={styles.resourceCard}
          onPress={() => Alert.alert('duocode', `Recurso: ${resource.title}`)}>
          <View style={[styles.resourceThumb, index === 0 ? styles.thumbSoft : styles.thumbMuted]}>
            <Text style={styles.resourceThumbText}>{resource.label}</Text>
          </View>

          <View style={styles.resourceBody}>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            <Text style={styles.resourceMeta}>{resource.meta}</Text>
          </View>

          <Text style={styles.resourceArrow}>{'>_'}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DuocodePalette.background,
  },
  container: {
    padding: 24,
    paddingBottom: 96,
    gap: 18,
  },
  loadingCard: {
    marginTop: 32,
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 24,
    gap: 10,
  },
  loadingTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  loadingText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    marginTop: 8,
    gap: 4,
  },
  title: {
    color: DuocodePalette.text,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: DuocodePalette.code,
    fontSize: 14,
    fontFamily: Fonts.mono,
  },
  searchInput: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: DuocodePalette.text,
    fontFamily: Fonts.mono,
  },
  sectionTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  categoryChipActive: {
    backgroundColor: DuocodePalette.accentSoft,
    borderColor: DuocodePalette.accent,
  },
  categoryText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  categoryTextActive: {
    color: DuocodePalette.accent,
  },
  topicCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 14,
  },
  topicHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  topicBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DuocodePalette.accentSoft,
  },
  topicBadgeText: {
    color: DuocodePalette.accent,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicBody: {
    flex: 1,
    gap: 6,
  },
  topicTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicDescription: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  topicMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: DuocodePalette.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DuocodePalette.accent,
  },
  classCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
  },
  classBody: {
    flex: 1,
    gap: 6,
  },
  classDescription: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  classMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  resourceCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  resourceThumb: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSoft: {
    backgroundColor: DuocodePalette.accentSoft,
  },
  thumbMuted: {
    backgroundColor: DuocodePalette.surfaceMuted,
  },
  resourceThumbText: {
    color: DuocodePalette.accent,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  resourceBody: {
    flex: 1,
    gap: 4,
  },
  resourceTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  resourceMeta: {
    color: DuocodePalette.code,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  resourceArrow: {
    color: DuocodePalette.accent,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
});
