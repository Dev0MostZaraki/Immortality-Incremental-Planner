import { localeFor, type Language } from "./i18n";
import { fmtPlain } from "./endurance";

/** Readable local finish time; precision of the underlying ETA is unchanged. */
export function readableFinish(sec: number, now: number, language: Language = "de", timeZone?: string): string {
  if (!Number.isFinite(sec) || sec > 1e11) return language === "en" ? "– (too far in the future)" : "– (zu weit in der Zukunft)";
  const date = new Date(now + sec * 1000);
  if (!Number.isFinite(date.getTime())) return "–";
  const current = new Date(now);
  const year = new Intl.DateTimeFormat(localeFor(language), { year: "numeric", timeZone });
  const differentYear = year.format(date) !== year.format(current);
  const day = new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short", day: "numeric", month: "short", ...(differentYear ? { year: "numeric" as const } : {}), timeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat(localeFor(language), { hour: language === "de" ? "2-digit" : "numeric", minute: "2-digit", timeZone }).format(date);
  return `${day} · ${time}${language === "de" ? " Uhr" : ""}`;
}

/** Alternate total-hour view for medium durations, with exact seconds secondary. */
export function alternateDuration(sec: number, language: Language = "de"): string {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const exact = `${fmtPlain(sec, 3, language)} s`;
  if (sec < 3600 || sec >= 365.2425 * 86400) return exact;
  return `${fmtPlain(Math.floor(sec / 3600), 0, language)}h ${Math.floor(sec % 3600 / 60)}m · ${exact}`;
}