import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import type { ExerciseEvaluationResponse, LearnerDashboard } from '@/types/duocode';
import { useAuth } from '@/hooks/use-auth';

type ExerciseSubmissionPayload = {
  code?: string;
  selectedOptionId?: string | null;
  answerText?: string | null;
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
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState<LearnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshDashboard() {
    if (!token || user?.role !== 'student') {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<LearnerDashboard>('/api/learner/dashboard', {}, token);
      setDashboard(response);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, [token, user?.role]);

  async function evaluateExercise(exerciseId: string, payload: ExerciseSubmissionPayload) {
    if (!token) {
      throw new Error('No autenticado');
    }

    const response = await apiRequest<ExerciseEvaluationResponse>(
      `/api/exercises/${exerciseId}/evaluate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    );

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
