import type {
  LearnerChoiceOption,
  LearnerExercise,
  LearnerTopic,
} from '@/types/duocode';

type LessonState = 'completed' | 'in-progress' | 'available' | 'locked';

export type DecoratedLesson = LearnerTopic & {
  isLocked: boolean;
  lessonState: LessonState;
  buttonLabel: string;
};

export type CourseUnitGroup = {
  id: string;
  title: string;
  unitNumber: number;
  levelId: LearnerTopic['levelId'];
  level: LearnerTopic['level'];
  progressPercent: number;
  lessonCount: number;
  completedLessons: number;
  isLocked: boolean;
  lessons: DecoratedLesson[];
};

export type CourseLevelGroup = {
  id: LearnerTopic['levelId'];
  name: LearnerTopic['level'];
  levelNumber: number;
  objective: string;
  progressPercent: number;
  isLocked: boolean;
  units: CourseUnitGroup[];
};

export function serializeChoiceSubmission(selectedOptionId: string) {
  return `choice:${selectedOptionId}`;
}

export function serializeTextSubmission(answerText: string) {
  return `text:${answerText.trim()}`;
}

export function buildChoiceSubmissionCode(functionName: string, selectedOptionId: string) {
  return `function ${functionName}() {\n  return ${JSON.stringify(selectedOptionId)};\n}\n`;
}

export function extractChoiceSelection(submittedCode: string) {
  const normalized = String(submittedCode || '').trim();

  if (normalized.startsWith('choice:')) {
    return normalized.slice('choice:'.length) || null;
  }

  const match = normalized.match(/return\s+['"`]([^'"`]+)['"`]/);
  return match?.[1] || null;
}

export function extractTextSubmission(submittedCode: string) {
  const normalized = String(submittedCode || '').trim();

  if (normalized.startsWith('text:')) {
    return normalized.slice('text:'.length) || null;
  }

  return null;
}

export function getChoiceOption(
  exercise: Pick<LearnerExercise, 'choiceOptions'>,
  optionId: string | null | undefined
): LearnerChoiceOption | null {
  if (!optionId) {
    return null;
  }

  return exercise.choiceOptions.find((option) => option.id === optionId) || null;
}

function getLessonButtonLabel(lessonState: LessonState) {
  switch (lessonState) {
    case 'completed':
      return 'REPASAR';
    case 'in-progress':
      return 'CONTINUAR';
    case 'available':
      return 'EMPEZAR';
    default:
      return 'BLOQUEADO';
  }
}

export function groupCourseTopics(topics: LearnerTopic[]) {
  const orderedTopics = topics
    .slice()
    .sort((left, right) => {
      if (left.levelNumber !== right.levelNumber) {
        return left.levelNumber - right.levelNumber;
      }

      if (left.unitNumber !== right.unitNumber) {
        return left.unitNumber - right.unitNumber;
      }

      return left.lessonNumber - right.lessonNumber;
    });

  const levels = new Map<string, LearnerTopic[]>();

  orderedTopics.forEach((topic) => {
    const bucket = levels.get(topic.levelId) || [];
    bucket.push(topic);
    levels.set(topic.levelId, bucket);
  });

  const orderedLevels = Array.from(levels.values()).sort(
    (left, right) => left[0].levelNumber - right[0].levelNumber
  );

  return orderedLevels.map((levelTopics, levelIndex) => {
    const levelReference = levelTopics[0];
    const unitsMap = new Map<string, LearnerTopic[]>();

    levelTopics.forEach((topic) => {
      const bucket = unitsMap.get(topic.unitId) || [];
      bucket.push(topic);
      unitsMap.set(topic.unitId, bucket);
    });

    const units = Array.from(unitsMap.values())
      .sort((left, right) => left[0].unitNumber - right[0].unitNumber)
      .map((unitTopics, unitIndex, unitList) => {
        const previousUnit = unitList[unitIndex - 1];
        const unitProgress =
          unitTopics.length === 0
            ? 0
            : Math.round(
                unitTopics.reduce((total, topic) => total + topic.progressPercent, 0) / unitTopics.length
              );
        const isUnitLocked =
          (levelIndex > 0 &&
            orderedLevels[levelIndex - 1].some((topic) => topic.progressPercent < 100)) ||
          (unitIndex > 0 && previousUnit.some((topic) => topic.progressPercent < 100));

        const lessons: DecoratedLesson[] = unitTopics.map((topic, lessonIndex) => {
          const previousLesson = unitTopics[lessonIndex - 1];
          const isLocked = isUnitLocked || (lessonIndex > 0 && previousLesson.progressPercent < 100);
          const lessonState: LessonState =
            topic.progressPercent >= 100
              ? 'completed'
              : isLocked
                ? 'locked'
                : topic.progressPercent > 0
                  ? 'in-progress'
                  : 'available';

          return {
            ...topic,
            isLocked,
            lessonState,
            buttonLabel: getLessonButtonLabel(lessonState),
          };
        });

        return {
          id: unitTopics[0].unitId,
          title: unitTopics[0].unitTitle,
          unitNumber: unitTopics[0].unitNumber,
          levelId: unitTopics[0].levelId,
          level: unitTopics[0].level,
          progressPercent: unitProgress,
          lessonCount: lessons.length,
          completedLessons: lessons.filter((lesson) => lesson.progressPercent >= 100).length,
          isLocked: isUnitLocked,
          lessons,
        } satisfies CourseUnitGroup;
      });

    const levelProgress =
      units.length === 0
        ? 0
        : Math.round(units.reduce((total, unit) => total + unit.progressPercent, 0) / units.length);

    return {
      id: levelReference.levelId,
      name: levelReference.level,
      levelNumber: levelReference.levelNumber,
      objective: levelReference.levelObjective,
      progressPercent: levelProgress,
      isLocked:
        levelIndex > 0 && orderedLevels[levelIndex - 1].some((topic) => topic.progressPercent < 100),
      units,
    } satisfies CourseLevelGroup;
  });
}
