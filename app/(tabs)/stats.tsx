import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DuocodePalette } from '@/constants/duocode-theme';
import { Fonts } from '@/constants/theme';
import { useLearnerDashboard } from '@/hooks/use-learner-dashboard';

function LoadingState() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.sectionCard}>
        <Text style={styles.title}>stats.json</Text>
        <Text style={styles.loadingText}>Cargando metricas, sesiones y avance por tema.</Text>
      </View>
    </ScrollView>
  );
}

function formatJoinedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function StatsScreen() {
  const { dashboard, loading } = useLearnerDashboard();

  if (loading || !dashboard) {
    return <LoadingState />;
  }

  const { stats, topics, user } = dashboard;
  const activeSession = stats.recentSessions[0];
  const maxXp = Math.max(...stats.weeklyActivity.map((item) => item.xp), 1);
  const completedTopics = topics.filter((topic) => topic.progressPercent >= 100).length;
  const inProgressTopics = topics.filter(
    (topic) => topic.progressPercent > 0 && topic.progressPercent < 100
  ).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>profile.dev</Text>
          <Text style={styles.subtitle}>{`${user.track} · ${user.focus}`}</Text>
        </View>

        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>{`LVL ${stats.level}`}</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarShell}>
            <Text style={styles.avatarText}>{user.name.slice(0, 2).toUpperCase()}</Text>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.profileBadges}>
              <Text style={styles.profileBadge}>{user.role === 'admin' ? 'admin' : 'student'}</Text>
              <Text style={styles.profileBadge}>{`${user.dailyGoalMinutes} min diarios`}</Text>
              <Text style={styles.profileBadge}>{`alta ${formatJoinedDate(user.createdAt)}`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileGrid}>
          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>track</Text>
            <Text style={styles.profileInfoValue}>{user.track}</Text>
          </View>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>focus</Text>
            <Text style={styles.profileInfoValue}>{user.focus}</Text>
          </View>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>temas cerrados</Text>
            <Text style={styles.profileInfoValue}>{`${completedTopics}`}</Text>
          </View>

          <View style={styles.profileInfoCard}>
            <Text style={styles.profileInfoLabel}>temas en curso</Text>
            <Text style={styles.profileInfoValue}>{`${inProgressTopics}`}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricCardLight]}>
          <Text style={styles.metricValueDark}>{`${(stats.totalXp / 1000).toFixed(1)}k`}</Text>
          <Text style={styles.metricLabelDark}>xp_total</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardAccent]}>
          <Text style={styles.metricValueLight}>{`${stats.precision}%`}</Text>
          <Text style={styles.metricLabelLight}>precision</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricCardLight]}>
          <Text style={styles.metricValueDark}>{stats.streak}</Text>
          <Text style={styles.metricLabelDark}>streak_days</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardLight]}>
          <Text style={styles.metricValueDark}>{stats.solvedChallenges}</Text>
          <Text style={styles.metricLabelDark}>solved</Text>
        </View>
      </View>

      {activeSession ? (
        <View style={styles.bigCard}>
          <View style={styles.codePreview}>
            {activeSession.lines.map((line) => (
              <Text key={line} style={styles.codeLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={styles.bigCardBody}>
            <View style={styles.bigCardHeader}>
              <Text style={styles.bigCardTitle}>{activeSession.title}</Text>
              <View
                style={[
                  styles.badge,
                  activeSession.status === 'COMPLETADO' ? styles.badgeSuccess : styles.badgePending,
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    activeSession.status === 'COMPLETADO'
                      ? styles.badgeTextSuccess
                      : styles.badgeTextPending,
                  ]}>
                  {activeSession.status}
                </Text>
              </View>
            </View>

            <Text style={styles.topicText}>{activeSession.topic}</Text>

            <View style={styles.statsRow}>
              <View>
                <Text style={styles.smallLabel}>score</Text>
                <Text style={styles.bigValue}>{`${activeSession.power}%`}</Text>
              </View>

              <View>
                <Text style={styles.smallLabel}>reward</Text>
                <Text style={styles.bigValue}>{`+${activeSession.reward} XP`}</Text>
              </View>

              <View>
                <Text style={styles.smallLabel}>accuracy</Text>
                <Text style={styles.bigValue}>{`${activeSession.accuracy}%`}</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${activeSession.power}%` }]} />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>topic_progress</Text>

        {topics.map((topic) => (
          <View key={topic.id} style={styles.topicRow}>
            <View style={styles.topicMain}>
              <Text style={styles.sessionTitle}>{topic.title}</Text>
              <Text style={styles.sessionMeta}>
                {`${topic.completedExercises}/${topic.exerciseCount} ejercicios · ${topic.estimatedMinutes} min`}
              </Text>
            </View>

            <View style={styles.topicAside}>
              <Text style={styles.sessionXp}>{`${topic.progressPercent}%`}</Text>
              <Text style={styles.sessionAccuracy}>{topic.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>activity_week</Text>

        <View style={styles.chartRow}>
          {stats.weeklyActivity.map((item) => (
            <View key={item.day} style={styles.chartItem}>
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartFill,
                    {
                      height: `${Math.max(18, (item.xp / maxXp) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartValue}>{item.xp}</Text>
              <Text style={styles.chartLabel}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>recent_sessions</Text>

        {stats.recentSessions.length === 0 ? (
          <Text style={styles.emptyText}>Aun no hay sesiones registradas.</Text>
        ) : (
          stats.recentSessions.map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionMain}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionMeta}>{session.topic}</Text>
              </View>

              <View style={styles.sessionAside}>
                <Text style={styles.sessionXp}>{`+${session.reward} XP`}</Text>
                <Text style={styles.sessionAccuracy}>{`${session.accuracy}% ok`}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DuocodePalette.background,
  },
  container: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 96,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: DuocodePalette.text,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: DuocodePalette.accent,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontFamily: Fonts.mono,
  },
  loadingText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  levelPill: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  levelPillText: {
    color: DuocodePalette.code,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  profileCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.borderStrong,
    padding: 18,
    gap: 18,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarShell: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: DuocodePalette.accentSoft,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: DuocodePalette.accent,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  profileCopy: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    color: DuocodePalette.text,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  profileEmail: {
    color: '#C8D7EE',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.mono,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileBadge: {
    backgroundColor: DuocodePalette.surfaceAlt,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    borderRadius: 999,
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileInfoCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: DuocodePalette.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 14,
    gap: 4,
  },
  profileInfoLabel: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  profileInfoValue: {
    color: DuocodePalette.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 26,
    padding: 20,
    minHeight: 110,
    justifyContent: 'center',
  },
  metricCardLight: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
  },
  metricCardAccent: {
    backgroundColor: DuocodePalette.surface,
    borderWidth: 1,
    borderColor: DuocodePalette.accent,
  },
  metricValueDark: {
    color: DuocodePalette.text,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  metricLabelDark: {
    color: DuocodePalette.code,
    fontSize: 14,
    marginTop: 6,
    fontFamily: Fonts.mono,
  },
  metricValueLight: {
    color: DuocodePalette.accent,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  metricLabelLight: {
    color: DuocodePalette.code,
    fontSize: 14,
    marginTop: 6,
    fontFamily: Fonts.mono,
  },
  bigCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    overflow: 'hidden',
  },
  codePreview: {
    backgroundColor: DuocodePalette.surfaceAlt,
    padding: 20,
    gap: 10,
    minHeight: 170,
    justifyContent: 'center',
  },
  codeLine: {
    color: DuocodePalette.code,
    fontSize: 15,
    fontFamily: Fonts.mono,
  },
  bigCardBody: {
    padding: 20,
    gap: 18,
  },
  bigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  bigCardTitle: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    fontFamily: Fonts.mono,
  },
  topicText: {
    color: DuocodePalette.muted,
    fontSize: 14,
    fontFamily: Fonts.mono,
    marginTop: -6,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeSuccess: {
    backgroundColor: '#0E2B1A',
  },
  badgePending: {
    backgroundColor: '#35260B',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  badgeTextSuccess: {
    color: DuocodePalette.green,
  },
  badgeTextPending: {
    color: DuocodePalette.amber,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  smallLabel: {
    color: DuocodePalette.code,
    fontSize: 13,
    fontFamily: Fonts.mono,
  },
  bigValue: {
    color: DuocodePalette.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
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
  sectionCard: {
    backgroundColor: DuocodePalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DuocodePalette.border,
    padding: 18,
    gap: 18,
  },
  sectionTitle: {
    color: DuocodePalette.text,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DuocodePalette.border,
  },
  topicMain: {
    flex: 1,
    gap: 4,
  },
  topicAside: {
    alignItems: 'flex-end',
    gap: 4,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartTrack: {
    width: '100%',
    maxWidth: 28,
    height: 96,
    justifyContent: 'flex-end',
    borderRadius: 999,
    backgroundColor: DuocodePalette.surfaceAlt,
    overflow: 'hidden',
  },
  chartFill: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: DuocodePalette.accent,
  },
  chartValue: {
    color: DuocodePalette.code,
    fontSize: 11,
    fontFamily: Fonts.mono,
  },
  chartLabel: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DuocodePalette.border,
    gap: 12,
  },
  sessionMain: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    color: DuocodePalette.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  sessionMeta: {
    color: DuocodePalette.muted,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  sessionAside: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessionXp: {
    color: DuocodePalette.accent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  sessionAccuracy: {
    color: DuocodePalette.code,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  emptyText: {
    color: DuocodePalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
