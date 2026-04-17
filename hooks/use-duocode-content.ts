import { startTransition, useEffect, useState } from 'react';

import { fallbackContent, getDuocodeContent } from '@/lib/duocode-content';
import type { DuocodeContent } from '@/types/duocode';

export function useDuocodeContent() {
  const [content, setContent] = useState<DuocodeContent>(fallbackContent);
  const [loading, setLoading] = useState(Boolean(process.env.EXPO_PUBLIC_API_URL));

  useEffect(() => {
    let isMounted = true;

    getDuocodeContent()
      .then((nextContent) => {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setContent(nextContent);
        });
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { content, loading };
}
