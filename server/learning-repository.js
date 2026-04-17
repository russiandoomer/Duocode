const { getContent } = require('./content-repository');
const { evaluateExerciseSubmission } = require('./evaluator');
const fallbackStore = require('./fallback-store');
const { getAllUsers, getUserById, sanitizeUser } = require('./auth-repository');
const { hasMysqlConfig, queryRows } = require('./mysql');

const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function safeJsonParse(value, fallbackValue = null) {
  if (value == null) {
    return fallbackValue;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
}

function linesFromCode(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 3);
}

function mapTopics(topicRows, exerciseRows, testCaseRows) {
  return topicRows
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((topic) => {
      const exercises = exerciseRows
        .filter((exercise) => exercise.topicId === topic.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((exercise) => ({
          ...exercise,
          testCases: testCaseRows
            .filter((testCase) => testCase.exerciseId === exercise.id)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        }));

      return {
        ...topic,
        exercises,
      };
    });
}

async function loadLearningCatalog() {
  if (hasMysqlConfig()) {
    const [topicRows, exerciseRows, testCaseRows] = await Promise.all([
      queryRows(
        'SELECT id, roadmap_id AS roadmapId, title, description, estimated_minutes AS estimatedMinutes, status_label AS status, sort_order AS sortOrder FROM learning_topics ORDER BY sort_order ASC'
      ),
      queryRows(
        'SELECT id, topic_id AS topicId, title, prompt, instructions_json AS instructions, function_name AS functionName, starter_code AS starterCode, solution_code AS solutionCode, explanation, xp_reward AS xpReward, sort_order AS sortOrder FROM learning_exercises ORDER BY sort_order ASC'
      ),
      queryRows(
        'SELECT exercise_id AS exerciseId, label, args_json AS args, expected_json AS expected, sort_order AS sortOrder FROM exercise_test_cases ORDER BY sort_order ASC'
      ),
    ]);

    const normalizedExercises = exerciseRows.map((exercise) => ({
      ...exercise,
      instructions: safeJsonParse(exercise.instructions, []),
    }));

    const normalizedTests = testCaseRows.map((testCase) => ({
      ...testCase,
      args: safeJsonParse(testCase.args, []),
      expected: safeJsonParse(testCase.expected, null),
    }));

    return mapTopics(topicRows, normalizedExercises, normalizedTests);
  }

  return fallbackStore.getTopics();
}

async function loadUserProgress(userId) {
  if (hasMysqlConfig()) {
    return await queryRows(
      'SELECT user_id AS userId, exercise_id AS exerciseId, is_completed AS isCompleted, best_score AS bestScore, last_submitted_code AS lastSubmittedCode, updated_at AS updatedAt, completed_at AS completedAt FROM user_exercise_progress WHERE user_id = ?',
      [userId]
    );
  }

  return fallbackStore.getProgress().filter((item) => Number(item.userId) === Number(userId));
}

async function loadUserAttempts(userId) {
  if (hasMysqlConfig()) {
    const rows = await queryRows(
      'SELECT id, user_id AS userId, exercise_id AS exerciseId, submitted_code AS submittedCode, passed, score, console_output_json AS consoleOutput, test_results_json AS testResults, created_at AS createdAt FROM exercise_attempts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map((row) => ({
      ...row,
      consoleOutput: safeJsonParse(row.consoleOutput, []),
      testResults: safeJsonParse(row.testResults, []),
    }));
  }

  return fallbackStore
    .getAttempts()
    .filter((item) => Number(item.userId) === Number(userId))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

async function loadAllProgress() {
  if (hasMysqlConfig()) {
    return await queryRows(
      'SELECT user_id AS userId, exercise_id AS exerciseId, is_completed AS isCompleted, best_score AS bestScore, last_submitted_code AS lastSubmittedCode, updated_at AS updatedAt, completed_at AS completedAt FROM user_exercise_progress'
    );
  }

  return fallbackStore.getProgress();
}

async function loadAllAttempts() {
  if (hasMysqlConfig()) {
    const rows = await queryRows(
      'SELECT id, user_id AS userId, exercise_id AS exerciseId, submitted_code AS submittedCode, passed, score, console_output_json AS consoleOutput, test_results_json AS testResults, created_at AS createdAt FROM exercise_attempts ORDER BY created_at DESC'
    );

    return rows.map((row) => ({
      ...row,
      consoleOutput: safeJsonParse(row.consoleOutput, []),
      testResults: safeJsonParse(row.testResults, []),
    }));
  }

  return fallbackStore
    .getAttempts()
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function buildTopicProgress(topics, progressRows) {
  const progressByExercise = new Map(progressRows.map((item) => [item.exerciseId, item]));

  return topics.map((topic) => {
    const exercises = topic.exercises.map((exercise) => {
      const progress = progressByExercise.get(exercise.id);

      return {
        id: exercise.id,
        title: exercise.title,
        prompt: exercise.prompt,
        instructions: exercise.instructions,
        functionName: exercise.functionName,
        starterCode: exercise.starterCode,
        xpReward: exercise.xpReward,
        completed: Boolean(progress?.isCompleted),
        bestScore: Number(progress?.bestScore ?? 0),
        lastSubmittedCode: progress?.lastSubmittedCode || exercise.starterCode,
      };
    });

    const completedCount = exercises.filter((exercise) => exercise.completed).length;
    const progressPercent = exercises.length === 0 ? 0 : Math.round((completedCount / exercises.length) * 100);

    return {
      id: topic.id,
      roadmapId: topic.roadmapId,
      title: topic.title,
      description: topic.description,
      estimatedMinutes: topic.estimatedMinutes,
      status: topic.status,
      progressPercent,
      exerciseCount: exercises.length,
      completedExercises: completedCount,
      exercises,
    };
  });
}

function buildLearnerStats(userId, topics, progressRows, attempts) {
  const progressByExercise = new Map(progressRows.map((item) => [item.exerciseId, item]));
  const exerciseCatalog = topics.flatMap((topic) => topic.exercises.map((exercise) => ({ ...exercise, topicTitle: topic.title })));
  const exerciseById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const completedExercises = progressRows.filter((item) => item.isCompleted);
  const solvedChallenges = completedExercises.length;
  const totalXp = completedExercises.reduce((total, item) => total + (exerciseById.get(item.exerciseId)?.xpReward || 0), 0);
  const precision =
    progressRows.length === 0
      ? 0
      : Math.round(progressRows.reduce((total, item) => total + Number(item.bestScore || 0), 0) / progressRows.length);
  const totalMinutes = completedExercises.reduce(
    (total, item) => total + Math.max(10, Math.round((exerciseById.get(item.exerciseId)?.xpReward || 0) / 4)),
    0
  );

  const attemptDays = new Set(
    attempts
      .map((attempt) => String(attempt.createdAt).slice(0, 10))
      .filter(Boolean)
  );

  const weeklyActivityMap = new Map(
    WEEKDAY_LABELS.map((label) => [label, 0])
  );

  for (const attempt of attempts) {
    const exercise = exerciseById.get(attempt.exerciseId);
    const date = new Date(attempt.createdAt);
    const dayLabel = WEEKDAY_LABELS[date.getDay()];
    weeklyActivityMap.set(dayLabel, (weeklyActivityMap.get(dayLabel) || 0) + (exercise?.xpReward || 20));
  }

  const recentSessions = attempts.slice(0, 5).map((attempt) => {
    const exercise = exerciseById.get(attempt.exerciseId);

    return {
      id: `${attempt.id}`,
      title: exercise?.title || attempt.exerciseId,
      topic: exercise?.topicTitle || 'Sin tema',
      status: attempt.passed ? 'COMPLETADO' : 'REVISION',
      power: attempt.score,
      reward: exercise?.xpReward || 0,
      accuracy: attempt.score,
      lines: linesFromCode(attempt.submittedCode),
    };
  });

  return {
    userId,
    level: Math.max(1, Math.floor(totalXp / 180) + 1),
    totalXp,
    precision,
    streak: attemptDays.size,
    solvedChallenges,
    totalMinutes,
    weeklyActivity: WEEKDAY_LABELS.map((label) => ({
      day: label,
      xp: weeklyActivityMap.get(label) || 0,
    })),
    recentSessions,
  };
}

async function buildLearnerDashboard(userId) {
  const [content, user, topics, progressRows, attempts] = await Promise.all([
    getContent(),
    getUserById(userId),
    loadLearningCatalog(),
    loadUserProgress(userId),
    loadUserAttempts(userId),
  ]);

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const topicProgress = buildTopicProgress(topics, progressRows);
  const stats = buildLearnerStats(userId, topics, progressRows, attempts);

  return {
    user: sanitizeUser(user),
    settings: content,
    topics: topicProgress,
    stats,
  };
}

async function findExerciseDefinition(exerciseId) {
  const topics = await loadLearningCatalog();

  for (const topic of topics) {
    const exercise = topic.exercises.find((item) => item.id === exerciseId);

    if (exercise) {
      return {
        topic,
        exercise,
      };
    }
  }

  return null;
}

async function saveAttemptAndProgress(userId, exercise, submittedCode, evaluation) {
  const now = new Date().toISOString();
  const currentProgressRows = await loadUserProgress(userId);
  const currentProgress = currentProgressRows.find((item) => item.exerciseId === exercise.id);

  if (hasMysqlConfig()) {
    await queryRows(
      'INSERT INTO exercise_attempts (user_id, exercise_id, submitted_code, passed, score, console_output_json, test_results_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        userId,
        exercise.id,
        submittedCode,
        evaluation.passed ? 1 : 0,
        evaluation.score,
        JSON.stringify(evaluation.consoleOutput),
        JSON.stringify(evaluation.tests),
      ]
    );

    await queryRows(
      `INSERT INTO user_exercise_progress (user_id, exercise_id, is_completed, best_score, last_submitted_code, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         is_completed = IF(VALUES(is_completed) = 1, 1, is_completed),
         best_score = GREATEST(best_score, VALUES(best_score)),
         last_submitted_code = VALUES(last_submitted_code),
         updated_at = NOW(),
         completed_at = IF(completed_at IS NULL AND VALUES(is_completed) = 1, VALUES(completed_at), completed_at)`,
      [
        userId,
        exercise.id,
        evaluation.passed ? 1 : 0,
        evaluation.score,
        submittedCode,
        evaluation.passed ? new Date() : null,
      ]
    );

    return;
  }

  fallbackStore.addAttempt({
    userId,
    exerciseId: exercise.id,
    submittedCode,
    passed: evaluation.passed,
    score: evaluation.score,
    consoleOutput: evaluation.consoleOutput,
    testResults: evaluation.tests,
    createdAt: now,
  });

  fallbackStore.upsertProgress({
    userId,
    exerciseId: exercise.id,
    isCompleted: currentProgress?.isCompleted ? true : evaluation.passed,
    bestScore: Math.max(Number(currentProgress?.bestScore || 0), evaluation.score),
    lastSubmittedCode: submittedCode,
    updatedAt: now,
    completedAt: currentProgress?.completedAt || (evaluation.passed ? now : null),
  });
}

async function evaluateExerciseForUser(userId, exerciseId, submittedCode) {
  const definition = await findExerciseDefinition(exerciseId);

  if (!definition) {
    throw new Error('Ejercicio no encontrado');
  }

  const evaluation = evaluateExerciseSubmission(definition.exercise, submittedCode);
  await saveAttemptAndProgress(userId, definition.exercise, submittedCode, evaluation);

  return {
    exerciseId,
    topicId: definition.topic.id,
    ...evaluation,
    dashboard: await buildLearnerDashboard(userId),
  };
}

async function buildAdminDashboard(adminUserId) {
  const [content, users, topics, allProgress, allAttempts, adminUser] = await Promise.all([
    getContent(),
    getAllUsers(),
    loadLearningCatalog(),
    loadAllProgress(),
    loadAllAttempts(),
    getUserById(adminUserId),
  ]);

  const sanitizedAdmin = sanitizeUser(adminUser);
  const learners = users.filter((user) => user.role === 'student');
  const exerciseById = new Map(
    topics.flatMap((topic) => topic.exercises.map((exercise) => [exercise.id, { ...exercise, topicTitle: topic.title }]))
  );
  const totalAttempts = allAttempts.length;
  const successfulAttempts = allAttempts.filter((attempt) => attempt.passed).length;
  const passRate = totalAttempts === 0 ? 0 : Math.round((successfulAttempts / totalAttempts) * 100);

  const metrics = [
    { label: 'students', value: `${learners.length}` },
    { label: 'attempts', value: `${totalAttempts}` },
    { label: 'pass_rate', value: `${passRate}%` },
    { label: 'topics', value: `${topics.length}` },
  ];

  const topicMetrics = topics.map((topic) => {
    const topicExerciseIds = topic.exercises.map((exercise) => exercise.id);
    const topicProgress = allProgress.filter((item) => topicExerciseIds.includes(item.exerciseId));
    const startedUsers = new Set(topicProgress.map((item) => item.userId)).size;
    const completedUsers = new Set(
      topicProgress.filter((item) => item.isCompleted).map((item) => item.userId)
    ).size;
    const averageScore =
      topicProgress.length === 0
        ? 0
        : Math.round(topicProgress.reduce((total, item) => total + Number(item.bestScore || 0), 0) / topicProgress.length);
    const completionRate =
      learners.length === 0 || topic.exercises.length === 0
        ? 0
        : Math.round((completedUsers / learners.length) * 100);

    return {
      id: topic.id,
      title: topic.title,
      status: topic.status,
      completionRate,
      startedUsers,
      completedUsers,
      averageScore,
      nextExercise: topic.exercises.find((exercise) => {
        const completions = topicProgress.filter((item) => item.exerciseId === exercise.id && item.isCompleted).length;
        return completions < learners.length;
      })?.title || 'Tema completado',
    };
  });

  const learnerSummaries = await Promise.all(
    learners.map(async (user) => {
      const dashboard = await buildLearnerDashboard(user.id);
      const lastAttempt = allAttempts.find((attempt) => Number(attempt.userId) === Number(user.id));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        track: user.track || user.track_label,
        totalXp: dashboard.stats.totalXp,
        completedExercises: dashboard.stats.solvedChallenges,
        lastActive: lastAttempt?.createdAt || user.createdAt || user.created_at,
      };
    })
  );

  return {
    admin: sanitizedAdmin,
    settings: content,
    metrics,
    topics: topicMetrics,
    learners: learnerSummaries,
  };
}

module.exports = {
  buildAdminDashboard,
  buildLearnerDashboard,
  evaluateExerciseForUser,
};
