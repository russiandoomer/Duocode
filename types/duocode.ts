export type RoadmapItem = {
  id: string;
  title: string;
  stack: string;
  classes: number;
  lessons: number;
  level: string;
  duration: string;
  progress: number;
  status: string;
  next: string;
};

export type FeaturedClass = {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  lessons: number;
  tag: string;
  status: string;
};

export type ResourceItem = {
  id: string;
  label: string;
  title: string;
  meta: string;
  type: string;
};

export type ChallengeMode = {
  id: string;
  label: string;
  description: string;
  color: string;
};

export type WeeklyActivity = {
  day: string;
  xp: number;
};

export type RecentSession = {
  id: string;
  title: string;
  topic: string;
  status: string;
  mode: 'lesson' | 'practice';
  power: number;
  reward: number;
  accuracy: number;
  lines: string[];
};

export type DuocodeContent = {
  branding: {
    appName: string;
    headline: string;
    tagline: string;
    heroSnippet: string;
    logoLabel: string;
    logoHint: string;
  };
  profile: {
    name: string;
    handle: string;
    track: string;
    nextClass: string;
    currentFocus: string;
    dailyGoal: string;
    repositoryStatus: string;
  };
  roadmaps: RoadmapItem[];
  featuredClasses: FeaturedClass[];
  categories: string[];
  resources: ResourceItem[];
  challengeModes: ChallengeMode[];
  stats: {
    level: number;
    totalXp: number;
    precision: number;
    streak: number;
    solvedChallenges: number;
    totalMinutes: number;
    weeklyActivity: WeeklyActivity[];
    recentSessions: RecentSession[];
  };
  deploy: {
    repositoryName: string;
    frontendPlatform: string;
    backendPlatform: string;
    frontendBuildCommand: string;
    backendStartCommand: string;
    envVarName: string;
    githubChecklist: string[];
  };
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin';
  track: string;
  focus: string;
  dailyGoalMinutes: number;
  createdAt: string;
};

export type LearnerChoiceOption = {
  id: string;
  label: string;
  detail: string;
};

export type LearnerAttemptMode = 'lesson' | 'practice';

export type LearnerExerciseMode = 'choice' | 'text' | 'code';
export type LearnerExerciseKind =
  | 'multiple-choice'
  | 'completion'
  | 'prediction'
  | 'debugging'
  | 'code';

export type LearnerExercise = {
  id: string;
  title: string;
  prompt: string;
  instructions: string[];
  functionName: string;
  starterCode: string;
  xpReward: number;
  practiceXpReward: number;
  completed: boolean;
  bestScore: number;
  lastSubmittedCode: string;
  mode: LearnerExerciseMode;
  kind: LearnerExerciseKind;
  lessonTypeLabel: string;
  nodeGlyph: string;
  choiceOptions: LearnerChoiceOption[];
  lastSelectedOptionId?: string | null;
  lastSubmittedText?: string | null;
  lastAttemptMode?: LearnerAttemptMode | null;
  codeSnippet?: string | null;
  inputPlaceholder?: string | null;
};

export type LearnerTopic = {
  id: string;
  roadmapId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: string;
  progressPercent: number;
  exerciseCount: number;
  completedExercises: number;
  exercises: LearnerExercise[];
  languageId: string;
  languageLabel: string;
  levelId: 'basic' | 'intermediate' | 'advanced';
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  levelNumber: number;
  levelObjective: string;
  unitId: string;
  unitTitle: string;
  unitNumber: number;
  lessonNumber: number;
  lessonGoal: string;
  stageNumber: number;
  stageBadge: string;
  stageMessage: string;
  stageGoal: string;
  stageAccent: string;
  stageGlyph: string;
  exampleCode?: string | null;
};

export type LearnerStats = {
  userId: number;
  level: number;
  totalXp: number;
  precision: number;
  streak: number;
  solvedChallenges: number;
  totalMinutes: number;
  weeklyActivity: WeeklyActivity[];
  recentSessions: RecentSession[];
};

export type LearnerDashboard = {
  user: AuthUser;
  settings: DuocodeContent;
  topics: LearnerTopic[];
  stats: LearnerStats;
};

export type ExerciseEvaluationTest = {
  label: string;
  pass: boolean;
  argsPreview: string;
  expectedPreview: string;
  receivedPreview: string;
  consoleOutput: string[];
};

export type ExerciseEvaluationResponse = {
  exerciseId: string;
  topicId: string;
  passed: boolean;
  score: number;
  previewResult: string;
  consoleOutput: string[];
  tests: ExerciseEvaluationTest[];
  correctSolution: string;
  explanation: string;
  xpEarned: number;
  attemptMode: LearnerAttemptMode;
  mode: LearnerExerciseMode;
  kind: LearnerExerciseKind;
  submittedSelectionId?: string | null;
  submittedText?: string | null;
  expectedSelectionId?: string | null;
  expectedText?: string | null;
  dashboard: LearnerDashboard;
};

export type AdminMetric = {
  label: string;
  value: string;
};

export type AdminTopicMetric = {
  id: string;
  title: string;
  status: string;
  completionRate: number;
  startedUsers: number;
  completedUsers: number;
  averageScore: number;
  nextExercise: string;
};

export type AdminLearnerSummary = {
  id: number;
  name: string;
  email: string;
  track: string;
  totalXp: number;
  completedExercises: number;
  lastActive: string;
};

export type AdminDashboard = {
  admin: AuthUser | null;
  settings: DuocodeContent;
  metrics: AdminMetric[];
  topics: AdminTopicMetric[];
  learners: AdminLearnerSummary[];
};
