import { useEffect, useState } from "react";

/**
 * Hook that returns true only on the client side after hydration.
 * Use this to conditionally access browser APIs.
 *
 * @example
 * const isClient = useIsClient();
 * const theme = isClient ? localStorage.getItem('theme') : 'system';
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Safe wrapper for browser APIs that returns a default value on server.
 *
 * @example
 * const windowWidth = useBrowserAPI(() => window.innerWidth, 1024);
 */
export function useBrowserAPI<T>(
  browserFn: () => T,
  serverDefault: T
): T {
  const isClient = useIsClient();

  if (!isClient) {
    return serverDefault;
  }

  return browserFn();
}
