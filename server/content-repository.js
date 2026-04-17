const fallbackContent = require('../data/duocode-content.json');
const { hasMysqlConfig, pingMysql, queryRows } = require('./mysql');

function parseCodeLines(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  return [];
}

async function loadMysqlContent() {
  const [
    brandingRows,
    profileRows,
    roadmapRows,
    classRows,
    categoryRows,
    resourceRows,
    modeRows,
    statsRows,
    weeklyRows,
    sessionRows,
    deployRows,
    checklistRows,
  ] = await Promise.all([
    queryRows('SELECT * FROM branding_config LIMIT 1'),
    queryRows('SELECT * FROM profile_config LIMIT 1'),
    queryRows('SELECT * FROM roadmaps ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM featured_classes ORDER BY sort_order ASC'),
    queryRows('SELECT id FROM resource_categories ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM resources ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM challenge_modes ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM stats_summary LIMIT 1'),
    queryRows('SELECT * FROM weekly_activity ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM recent_sessions ORDER BY sort_order ASC'),
    queryRows('SELECT * FROM deploy_config LIMIT 1'),
    queryRows('SELECT item_text FROM deploy_checklist ORDER BY sort_order ASC'),
  ]);

  const branding = brandingRows[0];
  const profile = profileRows[0];
  const stats = statsRows[0];
  const deploy = deployRows[0];

  if (!branding || !profile || !stats || !deploy) {
    throw new Error('Missing required MySQL seed data');
  }

  return {
    branding: {
      appName: branding.app_name,
      headline: branding.headline,
      tagline: branding.tagline,
      heroSnippet: branding.hero_snippet,
      logoLabel: branding.logo_label,
      logoHint: branding.logo_hint,
    },
    profile: {
      name: profile.name,
      handle: profile.handle,
      track: profile.track,
      nextClass: profile.next_class,
      currentFocus: profile.current_focus,
      dailyGoal: profile.daily_goal,
      repositoryStatus: profile.repository_status,
    },
    roadmaps: roadmapRows.map((row) => ({
      id: row.id,
      title: row.title,
      stack: row.stack,
      classes: row.classes_count,
      lessons: row.lessons_count,
      level: row.level_label,
      duration: row.duration_label,
      progress: row.progress_percent,
      status: row.status_label,
      next: row.next_label,
    })),
    featuredClasses: classRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      level: row.level_label,
      duration: row.duration_label,
      lessons: row.lessons_count,
      tag: row.tag_label,
      status: row.status_label,
    })),
    categories: categoryRows.map((row) => row.id),
    resources: resourceRows.map((row) => ({
      id: row.id,
      label: row.label,
      title: row.title,
      meta: row.meta,
      type: row.type_label,
    })),
    challengeModes: modeRows.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      color: row.color_hex,
    })),
    stats: {
      level: stats.level_value,
      totalXp: stats.total_xp,
      precision: stats.precision_percent,
      streak: stats.streak_days,
      solvedChallenges: stats.solved_challenges,
      totalMinutes: stats.total_minutes,
      weeklyActivity: weeklyRows.map((row) => ({
        day: row.day_label,
        xp: row.xp_value,
      })),
      recentSessions: sessionRows.map((row) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        status: row.status_label,
        power: row.power_percent,
        reward: row.reward_xp,
        accuracy: row.accuracy_percent,
        lines: parseCodeLines(row.code_lines),
      })),
    },
    deploy: {
      repositoryName: deploy.repository_name,
      frontendPlatform: deploy.frontend_platform,
      backendPlatform: deploy.backend_platform,
      frontendBuildCommand: deploy.frontend_build_command,
      backendStartCommand: deploy.backend_start_command,
      envVarName: deploy.env_var_name,
      githubChecklist: checklistRows.map((row) => row.item_text),
    },
  };
}

async function getContent() {
  if (!hasMysqlConfig()) {
    return fallbackContent;
  }

  try {
    return await loadMysqlContent();
  } catch {
    return fallbackContent;
  }
}

async function getDataSource() {
  if (!hasMysqlConfig()) {
    return 'fallback';
  }

  try {
    await pingMysql();
    return 'mysql';
  } catch {
    return 'fallback';
  }
}

module.exports = {
  fallbackContent,
  getContent,
  getDataSource,
};
