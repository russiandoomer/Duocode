import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getLocalAdminDashboard } from '@/lib/local-learning';
import type { AdminDashboard } from '@/types/duocode';

export function useAdminDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    getLocalAdminDashboard(user.id)
      .then((response) => {
        setDashboard(response);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id, user?.role]);

  return {
    dashboard,
    loading,
  };
}
