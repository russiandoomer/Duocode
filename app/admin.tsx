import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand/brand-mark';
import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useAuth } from '@/hooks/use-auth';

export default function AdminScreen() {
  const { dashboard, loading } = useAdminDashboard();
  const { logout, user } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <BrandMark size={70} />
          <View style={styles.headerText}>
            <Text style={styles.title}>admin-dashboard.ts</Text>
            <Text style={styles.subtitle}>Solo metricas y temas que necesitan avanzar</Text>
            <Text style={styles.adminMeta}>{user ? `${user.name} · ${user.email}` : 'Admin'}</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </Pressable>
      </View>

      {loading || !dashboard ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Cargando metricas del admin...</Text>
        </View>
      ) : (
        <>
          <View style={styles.metricGrid}>
            {dashboard.metrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>topics_to_advance</Text>

            {dashboard.topics.map((topic) => (
              <View key={topic.id} style={styles.topicRow}>
                <View style={styles.topicMain}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicMeta}>{`Siguiente ejercicio: ${topic.nextExercise}`}</Text>
                  <Text style={styles.topicMeta}>{`Estado: ${topic.status}`}</Text>
                </View>

                <View style={styles.topicAside}>
                  <Text style={styles.topicRate}>{`${topic.completionRate}%`}</Text>
                  <Text style={styles.topicSmall}>{`${topic.averageScore}% promedio`}</Text>
                  <Text style={styles.topicSmall}>{`${topic.completedUsers}/${topic.startedUsers || 0} alumnos`}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DuocodePalette.background,
  },
  container: {
    padding: 24,
    gap: 18,
    paddingBottom: 40,
  },
  header: {
    gap: 16,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: DuocodePalette.text,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  adminMeta: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutText: {
    color: DuocodePalette.accent,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  loadingCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 20,
  },
  loadingText: {
    color: DuocodePalette.code,
    fontFamily: Fonts.mono,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    width: '47%',
    backgroundColor: DuocodePalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 8,
  },
  metricLabel: {
    color: DuocodePalette.code,
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  metricValue: {
    color: DuocodePalette.text,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 24,
  },
  sectionCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: DuocodePalette.text,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DuocodePalette.border,
  },
  topicMain: {
    flex: 1,
    gap: 4,
  },
  topicTitle: {
    color: DuocodePalette.text,
    fontWeight: '800',
    fontSize: 15,
    fontFamily: Fonts.mono,
  },
  topicMeta: {
    color: DuocodePalette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  topicAside: {
    alignItems: 'flex-end',
    gap: 4,
  },
  topicRate: {
    color: DuocodePalette.accent,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    fontSize: 14,
  },
  topicSmall: {
    color: DuocodePalette.code,
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
});
