import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  evaluateLocalExerciseForUser,
  getLocalLearnerDashboard,
} from '@/lib/local-learning';
import type {
  ExerciseEvaluationResponse,
  LearnerAttemptMode,
  LearnerDashboard,
} from '@/types/duocode';

type ExerciseSubmissionPayload = {
  code?: string;
  selectedOptionId?: string | null;
  answerText?: string | null;
  attemptMode?: LearnerAttemptMode;
};

type LearnerDashboardContextValue = {
  dashboard: LearnerDashboard | null;
  loading: boolean;
  refreshDashboard: () => Promise<void>;
  evaluateExercise: (
    exerciseId: string,
    payload: ExerciseSubmissionPayload
  ) => Promise<ExerciseEvaluationResponse>;
};

const LearnerDashboardContext = createContext<LearnerDashboardContextValue | null>(null);

export function LearnerDashboardProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<LearnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshDashboard() {
    if (!user || user.role !== 'student') {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getLocalLearnerDashboard(user.id);
      setDashboard(response);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, [user?.id, user?.role]);

  async function evaluateExercise(exerciseId: string, payload: ExerciseSubmissionPayload) {
    if (!user) {
      throw new Error('No autenticado');
    }

    const response = await evaluateLocalExerciseForUser(user.id, exerciseId, payload);
    setDashboard(response.dashboard);
    return response;
  }

  return (
    <LearnerDashboardContext.Provider
      value={{
        dashboard,
        loading,
        refreshDashboard,
        evaluateExercise,
      }}>
      {children}
    </LearnerDashboardContext.Provider>
  );
}

export function useLearnerDashboard() {
  const context = useContext(LearnerDashboardContext);

  if (!context) {
    throw new Error('useLearnerDashboard must be used within LearnerDashboardProvider');
  }

  return context;
}
