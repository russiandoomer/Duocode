import { useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { AdminDashboard } from '@/types/duocode';

export function useAdminDashboard() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    apiRequest<AdminDashboard>('/api/admin/dashboard', {}, token)
      .then((response) => {
        setDashboard(response);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, user?.role]);

  return {
    dashboard,
    loading,
  };
}
