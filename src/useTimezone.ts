import {
  createContext,
  createElement,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEFAULT_TIMEZONE, resolveTimeZone } from "./utils/timestamp";

/**
 * The timezone used to format every SSR-rendered timestamp. Defaults to UTC;
 * the real value is supplied by `TimezoneProvider`.
 */
export const TimezoneContext = createContext<string>(DEFAULT_TIMEZONE);

/** Returns the timezone timestamps should be formatted in. */
export const useTimezone = (): string => useContext(TimezoneContext);

const TZ_COOKIE = "tz";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

declare global {
  interface Window {
    /** Timezone the server resolved for this request (from the `tz` cookie). */
    __TZ__?: string;
  }
}

interface TimezoneProviderProps {
  /**
   * Timezone the server rendered with. The first client render must use this
   * exact value so hydration matches the server HTML. On the server this is
   * the `tz` cookie value (UTC if absent); on the client it is `window.__TZ__`.
   */
  initialTimeZone?: string;
  children: ReactNode;
}

/**
 * Provides the timezone for timestamp formatting.
 *
 * The first render uses `initialTimeZone` so server output and client
 * hydration agree. After mount, the browser's real timezone is read; if it
 * differs from the server's guess (first-ever visit with no cookie, or a
 * stale cookie after travel) the displayed times update and the `tz` cookie
 * is refreshed so the next server render is correct. That update happens
 * after hydration completes, so it is not a hydration mismatch.
 */
export const TimezoneProvider: FC<TimezoneProviderProps> = ({
  initialTimeZone,
  children,
}) => {
  const [timeZone, setTimeZone] = useState<string>(
    resolveTimeZone(initialTimeZone),
  );

  useEffect(() => {
    let real: string;
    try {
      real = resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      return;
    }
    if (real !== timeZone) {
      setTimeZone(real);
    }
    // Keep the cookie in sync so the next SSR request renders correctly.
    document.cookie =
      `${TZ_COOKIE}=${encodeURIComponent(real)};path=/;` +
      `max-age=${ONE_YEAR_SECONDS};samesite=lax`;
    // Runs once on mount; `timeZone` here is intentionally the initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createElement(TimezoneContext.Provider, { value: timeZone }, children);
};
