/**
 * Timezone-aware timestamp formatting.
 *
 * SSR requires the server and the client's first (hydration) render to produce
 * byte-identical HTML. `Date.prototype.toLocaleString` without an explicit
 * `timeZone` uses the runtime's local timezone — which differs between the
 * Node server and the visitor's browser — so it must never be used in
 * SSR-rendered output. Instead a single resolved timezone is threaded through
 * the app (see `useTimezone`) and passed explicitly here.
 */

export const DEFAULT_TIMEZONE = "UTC";

/**
 * Validate an IANA timezone string. An invalid `timeZone` makes
 * `toLocaleString` throw a `RangeError`, which would crash SSR — so untrusted
 * input (the `tz` cookie) must be checked before use.
 */
export const isValidTimeZone = (
  tz: string | undefined | null,
): tz is string => {
  if (!tz) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Normalize any candidate timezone to a guaranteed-valid one. */
export const resolveTimeZone = (tz: string | undefined | null): string =>
  isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;

/** The browser's own timezone, or UTC if it cannot be determined. */
export const getBrowserTimeZone = (): string => {
  try {
    return resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/**
 * Format a UNIX timestamp (in seconds) as a human-readable date/time in the
 * given timezone. Used for the "Age" / "Date Time" columns. The `en-US` locale
 * plus explicit options and `timeZone` make the output deterministic across
 * the server and every client.
 */
export const formatTimestamp = (
  timestampSeconds: number,
  timeZone: string,
): string =>
  new Date(timestampSeconds * 1000).toLocaleString("en-US", {
    ...DATE_TIME_OPTIONS,
    timeZone: resolveTimeZone(timeZone),
  });
