import { fallbackContent } from '@/lib/duocode-content';
import {
  buildPracticeXpReward,
  readAttemptModeEnvelope,
  stripAttemptModeEnvelope,
  withAttemptModeEnvelope,
} from '@/lib/duocode-curriculum';
import { getStoredJson, setStoredJson } from '@/lib/persistent-storage';
import type {
  AuthUser,
  DuocodeContent,
  ExerciseEvaluationTest,
  LearnerAttemptMode,
  LearnerChoiceOption,
  LearnerExerciseKind,
  LearnerExerciseMode,
} from '@/types/duocode';

const LOCAL_STATE_KEY = 'duocode-local-state-v1';
const LOCAL_SESSION_PREFIX = 'local-session';
const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

type CatalogTestCase = {
  label: string;
  args: unknown[];
  expected: unknown;
  sortOrder: number;
};

type CatalogExercise = {
  id: string;
  title: string;
  prompt: string;
  instructions: string[];
  functionName: string;
  starterCode: string;
  solutionCode: string;
  explanation: string;
  xpReward: number;
  sortOrder: number;
  mode?: LearnerExerciseMode;
  kind?: LearnerExerciseKind;
  lessonTypeLabel?: string;
  nodeGlyph?: string;
  choiceOptions?: LearnerChoiceOption[];
  codeSnippet?: string | null;
  inputPlaceholder?: string | null;
  acceptedAnswers?: string[];
  testCases: CatalogTestCase[];
};

type CatalogTopic = {
  id: string;
  roadmapId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: string;
  sortOrder: number;
  languageId?: string;
  languageLabel?: string;
  levelId?: 'basic' | 'intermediate' | 'advanced';
  level?: 'Básico' | 'Intermedio' | 'Avanzado';
  levelNumber?: number;
  levelObjective?: string;
  unitId?: string;
  unitTitle?: string;
  unitNumber?: number;
  lessonNumber?: number;
  lessonGoal?: string;
  stageNumber?: number;
  stageBadge?: string;
  stageMessage?: string;
  stageGoal?: string;
  stageAccent?: string;
  stageGlyph?: string;
  exampleCode?: string | null;
  exercises: CatalogExercise[];
};

type LocalUserRecord = AuthUser & {
  password: string;
};

type LocalProgressRecord = {
  userId: number;
  exerciseId: string;
  isCompleted: boolean;
  bestScore: number;
  lastSubmittedCode: string;
  updatedAt: string;
  completedAt: string | null;
};

type LocalAttemptRecord = {
  id: number;
  userId: number;
  exerciseId: string;
  submittedCode: string;
  passed: boolean;
  score: number;
  consoleOutput: string[];
  testResults: ExerciseEvaluationTest[];
  createdAt: string;
};

type LocalSessionRecord = {
  token: string;
  userId: number;
};

type LocalAppState = {
  version: 1;
  users: LocalUserRecord[];
  progress: LocalProgressRecord[];
  attempts: LocalAttemptRecord[];
  session: LocalSessionRecord | null;
};

const { fallbackLearningData } = require('../data/javascript-course') as {
  fallbackLearningData: {
    users: Array<{
      id: number;
      name: string;
      email: string;
      role: 'student' | 'admin';
      track: string;
      focus: string;
      dailyGoalMinutes: number;
      createdAt: string;
    }>;
    topics: CatalogTopic[];
  };
};

const catalogTopics = cloneDeep(fallbackLearningData.topics).sort(
  (left: CatalogTopic, right: CatalogTopic) => left.sortOrder - right.sortOrder
);

let stateCache: LocalAppState | null = null;

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Number(score || 0)));
}

function buildLessonXpReward(xpReward: number, score: number) {
  return Math.max(0, Math.round(Number(xpReward || 0) * (clampScore(score) / 100)));
}

function buildLessonXpDelta(xpReward: number, previousBestScore: number, nextScore: number) {
  return Math.max(
    0,
    buildLessonXpReward(xpReward, nextScore) - buildLessonXpReward(xpReward, previousBestScore)
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user: LocalUserRecord): AuthUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function buildGeneratedName(email: string) {
  const base = normalizeEmail(email).split('@')[0] || 'estudiante local';
  return base
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function createSeedUser(role: 'student' | 'admin', password: string) {
  const sourceUser =
    fallbackLearningData.users.find((user) =>
      role === 'admin' ? user.role === 'admin' : user.email === 'student@duocode.dev'
    ) || fallbackLearningData.users.find((user) => user.role === role);

  if (!sourceUser) {
    return {
      id: role === 'admin' ? 1 : 2,
      name: role === 'admin' ? 'Admin Duocode' : 'Student Duocode',
      email: role === 'admin' ? 'admin@duocode.dev' : 'student@duocode.dev',
      password,
      role,
      track: role === 'admin' ? 'Program Oversight' : fallbackContent.profile.track,
      focus:
        role === 'admin'
          ? 'Metricas del curso, progresion editorial y seguimiento general.'
          : fallbackContent.profile.currentFocus,
      dailyGoalMinutes: role === 'admin' ? 0 : 45,
      createdAt: new Date().toISOString(),
    } satisfies LocalUserRecord;
  }

  return {
    id: sourceUser.id,
    name: sourceUser.name,
    email: sourceUser.email,
    password,
    role: sourceUser.role,
    track: sourceUser.track,
    focus: sourceUser.focus,
    dailyGoalMinutes: sourceUser.dailyGoalMinutes,
    createdAt: sourceUser.createdAt,
  } satisfies LocalUserRecord;
}

function createDefaultState(): LocalAppState {
  return {
    version: 1,
    users: [createSeedUser('admin', 'admin12345'), createSeedUser('student', 'demo12345')],
    progress: [],
    attempts: [],
    session: null,
  };
}

async function readState() {
  if (stateCache) {
    return cloneDeep(stateCache);
  }

  const storedState = await getStoredJson<LocalAppState>(LOCAL_STATE_KEY);

  if (storedState?.version === 1) {
    stateCache = storedState;
    return cloneDeep(stateCache);
  }

  stateCache = createDefaultState();
  await setStoredJson(LOCAL_STATE_KEY, stateCache);
  return cloneDeep(stateCache);
}

async function writeState(nextState: LocalAppState) {
  stateCache = cloneDeep(nextState);
  await setStoredJson(LOCAL_STATE_KEY, stateCache);
}

function buildSettingsForUser(user: AuthUser): DuocodeContent {
  return {
    ...fallbackContent,
    profile: {
      ...fallbackContent.profile,
      name: user.name,
      handle: normalizeEmail(user.email).split('@')[0] || fallbackContent.profile.handle,
      track: user.track,
      currentFocus: user.focus,
      dailyGoal: `${user.dailyGoalMinutes} min`,
      repositoryStatus: 'Guardado en este dispositivo',
    },
  };
}

function inferTopicLevel(topic: CatalogTopic) {
  const title = String(topic?.title || '').toLowerCase();

  if (title.includes('avanzado')) {
    return 'Avanzado' as const;
  }

  if (title.includes('intermedio')) {
    return 'Intermedio' as const;
  }

  return 'Básico' as const;
}

function inferLevelId(level: string) {
  if (level.toLowerCase().includes('avanz')) {
    return 'advanced' as const;
  }

  if (level.toLowerCase().includes('inter')) {
    return 'intermediate' as const;
  }

  return 'basic' as const;
}

function inferLevelNumber(levelId: 'basic' | 'intermediate' | 'advanced') {
  if (levelId === 'advanced') return 3;
  if (levelId === 'intermediate') return 2;
  return 1;
}

function getTopicPresentation(topic: CatalogTopic) {
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

function buildExercisePrompt(exercise: CatalogExercise & { normalizedTitle: string }) {
  if (String(exercise.prompt || '').trim()) {
    return String(exercise.prompt).trim();
  }

  const topicTitle = exercise.normalizedTitle || String(exercise.title || '').trim();

  switch (exercise.kind) {
    case 'multiple-choice':
      return `Lee la idea principal de "${topicTitle}" y selecciona la opcion que mejor la describe.`;
    case 'completion':
      return `¿Que palabra clave describe correctamente esta idea?`;
    case 'prediction':
      return `¿Cual es el resultado de este codigo?`;
    case 'debugging':
      return `Encuentra el error del fragmento de "${topicTitle}" y escribe la correccion principal para arreglarlo.`;
    default:
      return (
        exercise.prompt ||
        `Resuelve el reto de "${topicTitle}" editando la funcion del editor hasta que pase las pruebas.`
      );
  }
}

function buildExerciseInstructions(exercise: CatalogExercise) {
  switch (exercise.kind) {
    case 'multiple-choice':
      return [
        'Lee la idea o el fragmento con calma.',
        'Compara las opciones y elige una sola respuesta.',
        'No escribas codigo en esta actividad.',
      ];
    case 'completion':
      return [
        'Lee la definicion del concepto con calma.',
        'Piensa que palabra clave describe mejor esa idea.',
        'Escribe solo esa palabra o expresion corta.',
      ];
    case 'prediction':
      return [
        'Mira el codigo linea por linea.',
        'Piensa que valor aparece al final en consola.',
        'Escribe solo la salida final en el espacio print: ___.',
      ];
    case 'debugging':
      return [
        'Busca la palabra, simbolo o parte incorrecta del fragmento.',
        'Identifica la correccion minima necesaria para arreglarlo.',
        'Responde con la correccion principal, no con una explicacion larga.',
      ];
    default:
      return [
        'Lee el objetivo completo del reto.',
        'Edita la funcion manteniendo la estructura base.',
        'Prueba una solucion clara y valida el resultado.',
      ];
  }
}

function buildExercisePlaceholder(exercise: CatalogExercise) {
  switch (exercise.kind) {
    case 'completion':
      return 'Escribe la palabra clave';
    case 'prediction':
      return 'print: ___';
    case 'debugging':
      return 'Escribe la correccion principal';
    default:
      return exercise.inputPlaceholder || null;
  }
}

function getExercisePresentation(exercise: CatalogExercise) {
  const mode = exercise.mode || 'code';
  const kind = exercise.kind || (exercise.mode === 'choice' ? 'multiple-choice' : 'code');
  const normalizedTitle = String(exercise.title || '').replace(/^[^·]+·\s*/u, '').trim();

  return {
    mode,
    kind,
    lessonTypeLabel: exercise.lessonTypeLabel || 'Codigo',
    nodeGlyph: exercise.nodeGlyph || '</>',
    choiceOptions: Array.isArray(exercise.choiceOptions) ? exercise.choiceOptions : [],
    codeSnippet: exercise.codeSnippet || null,
    inputPlaceholder: buildExercisePlaceholder({ ...exercise, mode, kind }),
    prompt: buildExercisePrompt({ ...exercise, mode, kind, normalizedTitle }),
    instructions: buildExerciseInstructions({ ...exercise, mode, kind }),
  };
}

function extractSelectedOptionId(submittedCode: string) {
  const normalized = stripAttemptModeEnvelope(submittedCode).trim();
  return normalized.startsWith('choice:') ? normalized.slice('choice:'.length) || null : null;
}

function extractSubmittedText(submittedCode: string) {
  const normalized = stripAttemptModeEnvelope(submittedCode).trim();
  return normalized.startsWith('text:') ? normalized.slice('text:'.length) || null : null;
}

function buildTopicProgress(topics: CatalogTopic[], progressRows: LocalProgressRecord[]) {
  const progressByExercise = new Map(progressRows.map((item) => [item.exerciseId, item]));

  return topics.map((topic) => {
    const topicPresentation = getTopicPresentation(topic);
    const exercises = topic.exercises
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((exercise) => {
        const progress = progressByExercise.get(exercise.id);
        const exercisePresentation = getExercisePresentation(exercise);

        return {
          id: exercise.id,
          title: exercise.title,
          prompt: exercisePresentation.prompt,
          instructions: exercisePresentation.instructions,
          functionName: exercise.functionName,
          starterCode: exercise.starterCode,
          xpReward: exercise.xpReward,
          practiceXpReward: buildPracticeXpReward(exercise.xpReward),
          completed: Boolean(progress?.isCompleted),
          bestScore: Number(progress?.bestScore ?? 0),
          lastSubmittedCode: stripAttemptModeEnvelope(progress?.lastSubmittedCode || '') || exercise.starterCode,
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
          lastAttemptMode: progress?.lastSubmittedCode
            ? readAttemptModeEnvelope(progress.lastSubmittedCode)
            : null,
        };
      });

    const completedCount = exercises.filter((exercise) => exercise.completed).length;
    const progressPercent =
      exercises.length === 0
        ? 0
        : Math.round(
            exercises.reduce((total, exercise) => total + clampScore(exercise.bestScore), 0) / exercises.length
          );

    return {
      id: topic.id,
      roadmapId: topicPresentation.roadmapId,
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

function linesFromCode(value: string) {
  const normalized = stripAttemptModeEnvelope(value).trim();

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

function buildLearnerStats(
  userId: number,
  topics: CatalogTopic[],
  progressRows: LocalProgressRecord[],
  attempts: LocalAttemptRecord[]
) {
  const exerciseCatalog = topics.flatMap((topic) =>
    topic.exercises.map((exercise) => ({ ...exercise, topicTitle: topic.title }))
  );
  const exerciseById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  const completedExercises = progressRows.filter((item) => item.isCompleted);
  const solvedChallenges = completedExercises.length;
  const precision =
    progressRows.length === 0
      ? 0
      : Math.round(progressRows.reduce((total, item) => total + Number(item.bestScore || 0), 0) / progressRows.length);
  const attemptDays = new Set(
    attempts.map((attempt) => String(attempt.createdAt).slice(0, 10)).filter(Boolean)
  );

  const weeklyActivityMap = new Map(WEEKDAY_LABELS.map((label) => [label, 0]));
  const rewardByAttemptId = new Map<number, { reward: number; attemptMode: LearnerAttemptMode }>();
  const chronologicalAttempts = attempts
    .slice()
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const lessonBestScoreByExercise = new Map<string, number>();
  let totalXp = 0;
  let totalMinutes = 0;

  for (const attempt of chronologicalAttempts) {
    const exercise = exerciseById.get(attempt.exerciseId);
    const attemptMode = readAttemptModeEnvelope(attempt.submittedCode);
    let reward = 0;

    if (exercise) {
      if (attemptMode === 'practice') {
        reward = attempt.passed ? buildPracticeXpReward(exercise.xpReward) : 0;
      } else {
        const previousBestScore = lessonBestScoreByExercise.get(attempt.exerciseId) || 0;
        const nextScore = Math.max(previousBestScore, clampScore(attempt.score));
        reward = buildLessonXpDelta(exercise.xpReward, previousBestScore, nextScore);
        lessonBestScoreByExercise.set(attempt.exerciseId, nextScore);
      }
    }

    rewardByAttemptId.set(attempt.id, { reward, attemptMode });

    if (reward > 0) {
      totalXp += reward;
      totalMinutes += Math.max(attemptMode === 'practice' ? 4 : 10, Math.round(reward / 4));

      const date = new Date(attempt.createdAt);
      const dayLabel = WEEKDAY_LABELS[date.getDay()];
      weeklyActivityMap.set(dayLabel, (weeklyActivityMap.get(dayLabel) || 0) + reward);
    }
  }

  const recentSessions = attempts.slice(0, 5).map((attempt) => {
    const exercise = exerciseById.get(attempt.exerciseId);
    const rewardInfo = rewardByAttemptId.get(attempt.id) || {
      reward: 0,
      attemptMode: readAttemptModeEnvelope(attempt.submittedCode),
    };

    return {
      id: `${attempt.id}`,
      title: exercise?.title || attempt.exerciseId,
      topic: exercise?.topicTitle || 'Sin tema',
      status: attempt.passed
        ? rewardInfo.attemptMode === 'practice'
          ? 'PRACTICADO'
          : 'COMPLETADO'
        : 'REVISION',
      mode: rewardInfo.attemptMode,
      power: attempt.score,
      reward: rewardInfo.reward,
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

function normalizeValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .toLowerCase();
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

function formatValue(value: unknown) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value === undefined) {
    return 'undefined';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function evaluateChoiceExercise(exercise: CatalogExercise, submittedCode: string) {
  const expected = String(exercise.testCases[0]?.expected || '').trim();
  const received = extractSelectedOptionId(submittedCode) || '';
  const passed = received === expected;

  return {
    passed,
    score: passed ? 100 : 0,
    previewResult: received || 'Sin seleccion',
    consoleOutput: [] as string[],
    tests: [
      {
        label: exercise.testCases[0]?.label || 'Respuesta correcta',
        pass: passed,
        argsPreview: '[]',
        expectedPreview: expected,
        receivedPreview: received || 'Sin seleccion',
        consoleOutput: [],
      },
    ] satisfies ExerciseEvaluationTest[],
    correctSolution: exercise.solutionCode,
    explanation: exercise.explanation,
  };
}

function evaluateTextExercise(exercise: CatalogExercise, submittedCode: string) {
  const expected = String(exercise.testCases[0]?.expected || '').trim();
  const received = extractSubmittedText(submittedCode) || '';
  const acceptedAnswers =
    Array.isArray(exercise.acceptedAnswers) && exercise.acceptedAnswers.length
      ? exercise.acceptedAnswers
      : [expected];
  const passed = acceptedAnswers.some((answer) => normalizeText(received) === normalizeText(answer));
  const acceptedPreview = acceptedAnswers.join(' o ');

  return {
    passed,
    score: passed ? 100 : 0,
    previewResult: received || 'Sin respuesta',
    consoleOutput: [] as string[],
    tests: [
      {
        label: exercise.testCases[0]?.label || 'Respuesta esperada',
        pass: passed,
        argsPreview: '[]',
        expectedPreview: acceptedPreview,
        receivedPreview: received || 'Sin respuesta',
        consoleOutput: [],
      },
    ] satisfies ExerciseEvaluationTest[],
    correctSolution: exercise.solutionCode || acceptedPreview,
    explanation: exercise.explanation,
  };
}

async function evaluateCodeExercise(exercise: CatalogExercise, submittedCode: string) {
  const normalizedCode = stripAttemptModeEnvelope(submittedCode);
  const tests: ExerciseEvaluationTest[] = [];
  let passCount = 0;

  for (const testCase of exercise.testCases) {
    const consoleOutput: string[] = [];
    const moduleRef: { exports: unknown } = { exports: {} };
    const consoleRef = {
      log: (...values: unknown[]) => {
        consoleOutput.push(values.map((value) => formatValue(value)).join(' '));
      },
    };
    let received: unknown;
    let runtimeError: string | null = null;

    try {
      const loadSolution = new Function(
        'console',
        'module',
        'exports',
        `
        "use strict";
        ${normalizedCode}
        return typeof ${exercise.functionName} === 'function'
          ? ${exercise.functionName}
          : typeof module.exports === 'function'
            ? module.exports
            : typeof module.exports?.${exercise.functionName} === 'function'
              ? module.exports.${exercise.functionName}
              : null;
      `
      ) as (consoleValue: typeof consoleRef, moduleValue: typeof moduleRef, exportsValue: unknown) => unknown;

      const solution = loadSolution(consoleRef, moduleRef, moduleRef.exports);

      if (typeof solution !== 'function') {
        throw new Error(`No se encontro la funcion ${exercise.functionName}`);
      }

      received = await solution(...testCase.args);
    } catch (error) {
      runtimeError = error instanceof Error ? error.message : 'Error desconocido';
    }

    const passed = runtimeError ? false : valuesEqual(received, testCase.expected);

    if (passed) {
      passCount += 1;
    }

    tests.push({
      label: testCase.label,
      pass: passed,
      argsPreview: formatValue(testCase.args),
      expectedPreview: formatValue(testCase.expected),
      receivedPreview: runtimeError || formatValue(received),
      consoleOutput,
    });
  }

  const score =
    exercise.testCases.length === 0 ? 0 : Math.round((passCount / exercise.testCases.length) * 100);

  return {
    passed: passCount === exercise.testCases.length,
    score,
    previewResult: tests[0]?.receivedPreview ?? '',
    consoleOutput: tests.flatMap((test) => test.consoleOutput),
    tests,
    correctSolution: exercise.solutionCode,
    explanation: exercise.explanation,
  };
}

async function evaluateExerciseSubmission(exercise: CatalogExercise, submittedCode: string) {
  const mode = exercise.mode || 'code';

  if (mode === 'choice') {
    return evaluateChoiceExercise(exercise, submittedCode);
  }

  if (mode === 'text') {
    return evaluateTextExercise(exercise, submittedCode);
  }

  return evaluateCodeExercise(exercise, submittedCode);
}

function findExerciseDefinition(exerciseId: string) {
  for (const topic of catalogTopics) {
    const exercise = topic.exercises.find((item) => item.id === exerciseId);

    if (exercise) {
      return { topic, exercise };
    }
  }

  return null;
}

function createSession(userId: number) {
  return {
    token: `${LOCAL_SESSION_PREFIX}:${userId}:${Date.now()}`,
    userId,
  } satisfies LocalSessionRecord;
}

function buildUserRecord(partialUser: {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'admin';
  track: string;
  focus: string;
  dailyGoalMinutes: number;
  createdAt: string;
}) {
  return {
    id: partialUser.id,
    name: partialUser.name,
    email: normalizeEmail(partialUser.email),
    password: partialUser.password,
    role: partialUser.role,
    track: partialUser.track,
    focus: partialUser.focus,
    dailyGoalMinutes: partialUser.dailyGoalMinutes,
    createdAt: partialUser.createdAt,
  } satisfies LocalUserRecord;
}

export async function bootstrapLocalAuth() {
  const state = await readState();

  if (!state.session) {
    return null;
  }

  const user = state.users.find((item) => Number(item.id) === Number(state.session?.userId));

  if (!user) {
    state.session = null;
    await writeState(state);
    return null;
  }

  return {
    token: state.session.token,
    user: sanitizeUser(user),
  };
}

export async function loginLocalAccount(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('Ingresa un email para continuar.');
  }

  if (String(password || '').trim().length < 4) {
    throw new Error('Ingresa una clave corta para guardar tu perfil local.');
  }

  const state = await readState();
  let user = state.users.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (!user) {
    const nextId = Math.max(0, ...state.users.map((item) => Number(item.id) || 0)) + 1;
    user = buildUserRecord({
      id: nextId,
      name: buildGeneratedName(normalizedEmail),
      email: normalizedEmail,
      password,
      role: 'student',
      track: fallbackContent.profile.track,
      focus: fallbackContent.profile.currentFocus,
      dailyGoalMinutes: 45,
      createdAt: new Date().toISOString(),
    });
    state.users.push(user);
  } else if (user.password !== password) {
    throw new Error('La clave local no coincide con la guardada en este dispositivo.');
  }

  state.session = createSession(user.id);
  await writeState(state);

  return {
    token: state.session.token,
    user: sanitizeUser(user),
  };
}

export async function registerLocalAccount(name: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (name.trim().length < 3) {
    throw new Error('El nombre debe tener al menos 3 caracteres.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Ingresa un email valido.');
  }

  if (password.length < 8) {
    throw new Error('La clave local debe tener al menos 8 caracteres.');
  }

  const state = await readState();
  const existingUser = state.users.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (existingUser) {
    state.session = createSession(existingUser.id);
    await writeState(state);

    return {
      token: state.session.token,
      user: sanitizeUser(existingUser),
    };
  }

  const nextId = Math.max(0, ...state.users.map((item) => Number(item.id) || 0)) + 1;
  const nextUser = buildUserRecord({
    id: nextId,
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'student',
    track: fallbackContent.profile.track,
    focus: fallbackContent.profile.currentFocus,
    dailyGoalMinutes: 45,
    createdAt: new Date().toISOString(),
  });

  state.users.push(nextUser);
  state.session = createSession(nextUser.id);
  await writeState(state);

  return {
    token: state.session.token,
    user: sanitizeUser(nextUser),
  };
}

export async function logoutLocalAccount() {
  const state = await readState();
  state.session = null;
  await writeState(state);
}

export async function getLocalLearnerDashboard(userId: number) {
  const state = await readState();
  const user = state.users.find((item) => Number(item.id) === Number(userId));

  if (!user) {
    throw new Error('Usuario local no encontrado');
  }

  const progressRows = state.progress.filter((item) => Number(item.userId) === Number(userId));
  const attempts = state.attempts
    .filter((item) => Number(item.userId) === Number(userId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return {
    user: sanitizeUser(user),
    settings: buildSettingsForUser(sanitizeUser(user)),
    topics: buildTopicProgress(catalogTopics, progressRows),
    stats: buildLearnerStats(userId, catalogTopics, progressRows, attempts),
  };
}

export async function getLocalAdminDashboard(userId: number) {
  const state = await readState();
  const adminUser = state.users.find((item) => Number(item.id) === Number(userId));
  const learners = state.users.filter((user) => user.role === 'student');
  const totalAttempts = state.attempts.length;
  const successfulAttempts = state.attempts.filter((attempt) => attempt.passed).length;
  const passRate = totalAttempts === 0 ? 0 : Math.round((successfulAttempts / totalAttempts) * 100);

  const metrics = [
    { label: 'students', value: `${learners.length}` },
    { label: 'attempts', value: `${totalAttempts}` },
    { label: 'pass_rate', value: `${passRate}%` },
    { label: 'topics', value: `${catalogTopics.length}` },
  ];

  const topicMetrics = catalogTopics.map((topic) => {
    const topicExerciseIds = topic.exercises.map((exercise) => exercise.id);
    const topicProgress = state.progress.filter((item) => topicExerciseIds.includes(item.exerciseId));
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
      nextExercise:
        topic.exercises.find((exercise) => {
          const completions = topicProgress.filter(
            (item) => item.exerciseId === exercise.id && item.isCompleted
          ).length;
          return completions < learners.length;
        })?.title || 'Tema completado',
    };
  });

  const learnerSummaries = await Promise.all(
    learners.map(async (user) => {
      const dashboard = await getLocalLearnerDashboard(user.id);
      const lastAttempt = state.attempts.find((attempt) => Number(attempt.userId) === Number(user.id));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        track: user.track,
        totalXp: dashboard.stats.totalXp,
        completedExercises: dashboard.stats.solvedChallenges,
        lastActive: lastAttempt?.createdAt || user.createdAt,
      };
    })
  );

  return {
    admin: adminUser ? sanitizeUser(adminUser) : null,
    settings: buildSettingsForUser(
      adminUser ? sanitizeUser(adminUser) : sanitizeUser(createSeedUser('admin', 'admin12345'))
    ),
    metrics,
    topics: topicMetrics,
    learners: learnerSummaries,
  };
}

export async function evaluateLocalExerciseForUser(
  userId: number,
  exerciseId: string,
  submission: {
    code?: string;
    selectedOptionId?: string | null;
    answerText?: string | null;
    attemptMode?: LearnerAttemptMode;
  }
) {
  const state = await readState();
  const definition = findExerciseDefinition(exerciseId);

  if (!definition) {
    throw new Error('Ejercicio no encontrado');
  }

  const exercisePresentation = getExercisePresentation(definition.exercise);
  const attemptMode: LearnerAttemptMode =
    submission?.attemptMode === 'practice' ? 'practice' : 'lesson';
  let submittedCode = String(submission?.code || '');
  let submittedSelectionId: string | null = null;
  let submittedText: string | null = null;

  if (exercisePresentation.mode === 'choice') {
    submittedSelectionId = String(submission?.selectedOptionId || '').trim();

    if (!submittedSelectionId) {
      throw new Error('Debes elegir una opcion antes de revisar.');
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
      throw new Error('Debes escribir una respuesta antes de revisar.');
    }

    submittedCode = `text:${submittedText}`;
  } else if (submittedCode.trim().length === 0) {
    throw new Error('Debes escribir codigo antes de revisar.');
  }

  const evaluation = await evaluateExerciseSubmission(
    {
      ...definition.exercise,
      mode: exercisePresentation.mode,
      kind: exercisePresentation.kind,
    },
    withAttemptModeEnvelope(submittedCode, attemptMode)
  );

  const currentProgress = state.progress.find(
    (item) => Number(item.userId) === Number(userId) && item.exerciseId === definition.exercise.id
  );
  const previousBestScore = Number(currentProgress?.bestScore || 0);
  const xpEarned =
    attemptMode === 'practice'
      ? evaluation.passed
        ? buildPracticeXpReward(definition.exercise.xpReward)
        : 0
      : buildLessonXpDelta(definition.exercise.xpReward, previousBestScore, evaluation.score);
  const storedSubmission = withAttemptModeEnvelope(submittedCode, attemptMode);
  const now = new Date().toISOString();
  const nextAttemptId = Math.max(0, ...state.attempts.map((item) => Number(item.id) || 0)) + 1;

  state.attempts.unshift({
    id: nextAttemptId,
    userId,
    exerciseId: definition.exercise.id,
    submittedCode: storedSubmission,
    passed: evaluation.passed,
    score: evaluation.score,
    consoleOutput: evaluation.consoleOutput,
    testResults: evaluation.tests,
    createdAt: now,
  });

  const nextProgress: LocalProgressRecord = {
    userId,
    exerciseId: definition.exercise.id,
    isCompleted: currentProgress?.isCompleted ? true : evaluation.passed,
    bestScore: Math.max(Number(currentProgress?.bestScore || 0), evaluation.score),
    lastSubmittedCode: storedSubmission,
    updatedAt: now,
    completedAt: currentProgress?.completedAt || (evaluation.passed ? now : null),
  };
  const progressIndex = state.progress.findIndex(
    (item) => Number(item.userId) === Number(userId) && item.exerciseId === definition.exercise.id
  );

  if (progressIndex === -1) {
    state.progress.push(nextProgress);
  } else {
    state.progress[progressIndex] = nextProgress;
  }

  await writeState(state);

  return {
    exerciseId,
    topicId: definition.topic.id,
    ...evaluation,
    xpEarned,
    attemptMode,
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
        ? definition.exercise.kind === 'debugging' && String(definition.exercise.solutionCode || '').trim()
          ? String(definition.exercise.solutionCode).trim()
          : Array.isArray(definition.exercise.acceptedAnswers) && definition.exercise.acceptedAnswers.length
            ? definition.exercise.acceptedAnswers.join(' o ')
            : String(definition.exercise.testCases[0]?.expected || '')
        : null,
    dashboard: await getLocalLearnerDashboard(userId),
  };
}
