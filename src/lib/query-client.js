import { QueryClient } from '@tanstack/react-query';

// Retry dengan jeda eksponensial khusus untuk error 429 (rate limit)
function retryFn(failureCount, error) {
  const is429 = error?.message?.includes("429") || error?.status === 429;
  if (is429 && failureCount < 3) return true;  // retry hingga 3x untuk 429
  if (!is429 && failureCount < 1) return true;  // retry 1x untuk error lain
  return false;
}

function retryDelayFn(failureCount, error) {
  const is429 = error?.message?.includes("429") || error?.status === 429;
  if (is429) return 2000 * (failureCount + 1); // 2s, 4s, 6s
  return 1000; // 1s untuk error lain
}

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,   // default: data fresh selama 5 menit
      retry: retryFn,
      retryDelay: retryDelayFn,
    },
  },
});