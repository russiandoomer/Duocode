import fallbackJson from '@/data/duocode-content.json';
import type { DuocodeContent } from '@/types/duocode';

export const fallbackContent = fallbackJson as DuocodeContent;

let cachedContent: DuocodeContent | null = null;
let inflightRequest: Promise<DuocodeContent> | null = null;

function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
}

export async function getDuocodeContent(): Promise<DuocodeContent> {
  if (cachedContent) {
    return cachedContent;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    cachedContent = fallbackContent;
    return fallbackContent;
  }

  if (!inflightRequest) {
    inflightRequest = fetch(`${apiBaseUrl}/api/content`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return (await response.json()) as DuocodeContent;
      })
      .catch(() => fallbackContent)
      .finally(() => {
        inflightRequest = null;
      });
  }

  cachedContent = await inflightRequest;
  return cachedContent;
}
