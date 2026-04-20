const { getContent } = require('./content-repository');
const { evaluateExerciseSubmission } = require('./evaluator');
const fallbackStore = require('./fallback-store');
const { getAllUsers, getUserById, sanitizeUser } = require('./auth-repository');
const { hasMysqlConfig, queryRows } = require('./mysql');

const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
let mysqlLearningAvailable;

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
  const normalized = String(value || '').trim();

  if (normalized.startsWith('choice:')) {
    return [`choice = ${normalized.slice('choice:'.length)}`];
  }

  if (normalized.startsWith('text:')) {
    return [`answer = ${normalized.slice('text:'.length)}`];
  }

  return normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 3);
}

function inferTopicLevel(topic) {
  const title = String(topic?.title || '').toLowerCase();

  if (title.includes('avanzado')) {
    return 'Avanzado';
  }

  if (title.includes('intermedio')) {
    return 'Intermedio';
  }

  return 'Básico';
}

function inferLevelId(level) {
  if (String(level || '').toLowerCase().includes('avanz')) {
    return 'advanced';
  }

  if (String(level || '').toLowerCase().includes('inter')) {
    return 'intermediate';
  }

  return 'basic';
}

function inferLevelNumber(levelId) {
  if (levelId === 'advanced') {
    return 3;
  }

  if (levelId === 'intermediate') {
    return 2;
  }

  return 1;
}

function getTopicPresentation(topic) {
  const level = topic.level || inferTopicLevel(topic);
  const levelId = topic.levelId || inferLevelId(level);
  const levelNumber = Number(topic.levelNumber || inferLevelNumber(levelId));
  const languageId = topic.languageId || topic.id.split('-')[0] || 'general';

  return {
    roadmapId: topic.roadmapId || 'roadmap-default',
    languageId,
    languageLabel: topic.languageLabel || topic.title.split('·')[0]?.trim() || topic.title,
    levelId,
    level,
    levelNumber,
    levelObjective: topic.levelObjective || 'Completa las unidades para abrir el siguiente nivel.',
    unitId: topic.unitId || `${languageId}-unit-${levelNumber}`,
    unitTitle: topic.unitTitle || `Unidad ${topic.unitNumber || 1}`,
    unitNumber: Number(topic.unitNumber || 1),
    lessonNumber: Number(topic.lessonNumber || 1),
    lessonGoal: topic.lessonGoal || topic.description,
    stageNumber: Number(topic.stageNumber || levelNumber),
    stageBadge: topic.stageBadge || `${languageId.toUpperCase()} NIVEL ${levelNumber}`,
    stageMessage: topic.stageMessage || topic.description,
    stageGoal: topic.stageGoal || 'Completa la unidad actual para seguir.',
    stageAccent: topic.stageAccent || '#38BDF8',
    stageGlyph: topic.stageGlyph || '</>',
    exampleCode: topic.exampleCode || null,
  };
}

function getExercisePresentation(exercise) {
  return {
    mode: exercise.mode || 'code',
    kind: exercise.kind || (exercise.mode === 'choice' ? 'multiple-choice' : 'code'),
    lessonTypeLabel: exercise.lessonTypeLabel || 'Codigo',
    nodeGlyph: exercise.nodeGlyph || '</>',
    choiceOptions: Array.isArray(exercise.choiceOptions) ? exercise.choiceOptions : [],
    codeSnippet: exercise.codeSnippet || null,
    inputPlaceholder: exercise.inputPlaceholder || null,
  };
}

function extractSelectedOptionId(submittedCode) {
  const normalized = String(submittedCode || '').trim();
  return normalized.startsWith('choice:') ? normalized.slice('choice:'.length) || null : null;
}

function extractSubmittedText(submittedCode) {
  const normalized = String(submittedCode || '').trim();
  return normalized.startsWith('text:') ? normalized.slice('text:'.length) || null : null;
}

async function canUseMysqlLearning() {
  if (!hasMysqlConfig()) {
    return false;
  }

  if (typeof mysqlLearningAvailable === 'boolean') {
    return mysqlLearningAvailable;
  }

  try {
    const rows = await queryRows(
      'SELECT id FROM learning_topics WHERE id IN (?, ?, ?) LIMIT 1',
      ['js-basic-u1-l1', 'js-intermediate-u1-l1', 'js-advanced-u1-l1']
    );
    mysqlLearningAvailable = rows.length > 0;
  } catch {
    mysqlLearningAvailable = false;
  }

  return mysqlLearningAvailable;
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
  if (await canUseMysqlLearning()) {
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
  if (await canUseMysqlLearning()) {
    return await queryRows(
      'SELECT user_id AS userId, exercise_id AS exerciseId, is_completed AS isCompleted, best_score AS bestScore, last_submitted_code AS lastSubmittedCode, updated_at AS updatedAt, completed_at AS completedAt FROM user_exercise_progress WHERE user_id = ?',
      [userId]
    );
  }

  return fallbackStore.getProgress().filter((item) => Number(item.userId) === Number(userId));
}

async function loadUserAttempts(userId) {
  if (await canUseMysqlLearning()) {
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
  if (await canUseMysqlLearning()) {
    return await queryRows(
      'SELECT user_id AS userId, exercise_id AS exerciseId, is_completed AS isCompleted, best_score AS bestScore, last_submitted_code AS lastSubmittedCode, updated_at AS updatedAt, completed_at AS completedAt FROM user_exercise_progress'
    );
  }

  return fallbackStore.getProgress();
}

async function loadAllAttempts() {
  if (await canUseMysqlLearning()) {
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
    const topicPresentation = getTopicPresentation(topic);
    const exercises = topic.exercises.map((exercise) => {
      const progress = progressByExercise.get(exercise.id);
      const exercisePresentation = getExercisePresentation(exercise);

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
        mode: exercisePresentation.mode,
        kind: exercisePresentation.kind,
        lessonTypeLabel: exercisePresentation.lessonTypeLabel,
        nodeGlyph: exercisePresentation.nodeGlyph,
        choiceOptions: exercisePresentation.choiceOptions,
        lastSubmittedText:
          exercisePresentation.mode === 'text'
            ? extractSubmittedText(progress?.lastSubmittedCode || '')
            : null,
        codeSnippet: exercisePresentation.codeSnippet,
        inputPlaceholder: exercisePresentation.inputPlaceholder,
        lastSelectedOptionId:
          exercisePresentation.mode === 'choice'
            ? extractSelectedOptionId(progress?.lastSubmittedCode || '')
            : null,
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
      languageId: topicPresentation.languageId,
      languageLabel: topicPresentation.languageLabel,
      levelId: topicPresentation.levelId,
      level: topicPresentation.level,
      levelNumber: topicPresentation.levelNumber,
      levelObjective: topicPresentation.levelObjective,
      unitId: topicPresentation.unitId,
      unitTitle: topicPresentation.unitTitle,
      unitNumber: topicPresentation.unitNumber,
      lessonNumber: topicPresentation.lessonNumber,
      lessonGoal: topicPresentation.lessonGoal,
      stageNumber: topicPresentation.stageNumber,
      stageBadge: topicPresentation.stageBadge,
      stageMessage: topicPresentation.stageMessage,
      stageGoal: topicPresentation.stageGoal,
      stageAccent: topicPresentation.stageAccent,
      stageGlyph: topicPresentation.stageGlyph,
      exampleCode: topicPresentation.exampleCode,
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

  if (await canUseMysqlLearning()) {
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

async function evaluateExerciseForUser(userId, exerciseId, submission) {
  const definition = await findExerciseDefinition(exerciseId);

  if (!definition) {
    throw new Error('Ejercicio no encontrado');
  }

  const exercisePresentation = getExercisePresentation(definition.exercise);
  let submittedCode = String(submission?.code || '');
  let submittedSelectionId = null;
  let submittedText = null;

  if (exercisePresentation.mode === 'choice') {
    submittedSelectionId = String(submission?.selectedOptionId || '').trim();

    if (!submittedSelectionId) {
      throw new Error('Debes elegir una opcion antes de evaluar.');
    }

    const isKnownOption = exercisePresentation.choiceOptions.some(
      (option) => option.id === submittedSelectionId
    );

    if (!isKnownOption) {
      throw new Error('La opcion seleccionada no existe para esta leccion.');
    }

    submittedCode = `choice:${submittedSelectionId}`;
  } else if (exercisePresentation.mode === 'text') {
    submittedText = String(submission?.answerText || '').trim();

    if (!submittedText) {
      throw new Error('Debes escribir una respuesta antes de evaluar.');
    }

    submittedCode = `text:${submittedText}`;
  } else if (submittedCode.trim().length === 0) {
    throw new Error('Debes escribir codigo antes de evaluar.');
  }

  const evaluation = await evaluateExerciseSubmission(
    {
      ...definition.exercise,
      mode: exercisePresentation.mode,
    },
    submittedCode
  );
  await saveAttemptAndProgress(userId, definition.exercise, submittedCode, evaluation);

  return {
    exerciseId,
    topicId: definition.topic.id,
    ...evaluation,
    mode: exercisePresentation.mode,
    kind: exercisePresentation.kind,
    submittedSelectionId,
    submittedText,
    expectedSelectionId:
      exercisePresentation.mode === 'choice'
        ? String(definition.exercise.testCases[0]?.expected || '')
        : null,
    expectedText:
      exercisePresentation.mode === 'text'
        ? String(definition.exercise.testCases[0]?.expected || '')
        : null,
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
