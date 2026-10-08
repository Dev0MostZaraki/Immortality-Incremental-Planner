import { localeFor, type Language } from "./i18n";
// Assertions verified: 1Qa=1000T, 1Qi=1000Qa, 1Sx=1000Qi.
// Example math: (500Qa-475Qa)/454T/s = 25e15/454e12 ≈ 55.066s.
// Example math: (100Sx-475Qa)/454T/s ≈ 220,263,271s (≈ 2549d).
// Note: IEEE 754 doubles lose unit precision > 9e15 (MAX_SAFE_INTEGER).
// At 100Sx (1e23), the smallest representable step is ~1.6e7.
// Endurance math: every suffix step is x1000. Values are plain doubles (safe up to ~1e308).
export const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad",
  "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg",
  "Ocvg", "Novg", "Tg",
] as const;
export type Suffix = (typeof SUFFIXES)[number];

export const suffixPower = (s: string) => Math.max(0, SUFFIXES.indexOf(s as Suffix)) * 3;

export type Parsed = { ok: true; value: number } | { ok: false; error: string } | { ok: "empty" };

/** Accepts "1,5", "1.5", "1e20", "1,2e5". Spaces/underscores ignored. */
export function parseNum(raw: string): Parsed {
  const s = raw.trim().replace(/[\s_']/g, "");
  if (!s) return { ok: "empty" };
  const norm = s.replace(",", ".");
  if (!/^\d*\.?\d+(e[+-]?\d+)?$|^\d+\.?(e[+-]?\d+)?$/i.test(norm))
    return { ok: false, error: "Ungültige Zahl – nutze z. B. 454 oder 3,5 oder 1e20" };
  const v = Number(norm);
  if (!Number.isFinite(v)) return { ok: false, error: "Zahl ist zu groß" };
  if (v < 0) return { ok: false, error: "Nur positive Werte" };
  return { ok: true, value: v };
}

export function toValue(raw: string, unit: string): Parsed {
  const p = parseNum(raw);
  if (p.ok !== true) return p;
  const v = p.value * Math.pow(10, suffixPower(unit));
  if (!Number.isFinite(v)) return { ok: false, error: "Wert ist zu groß" };
  return { ok: true, value: v };
}

const nf = (d: number, language: Language = "de") =>
  new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function fmtPlain(v: number, d = 2, language: Language = "de") {
  return nf(d, language).format(v);
}

/** Formats with best suffix, e.g. 25000000000000000 -> "25 Qa". */
export function fmtSuffix(v: number, d = 3, language: Language = "de"): string {
  if (!Number.isFinite(v)) return "∞";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs < 1000) return nf(d, language).format(v);
  
  const expStr = abs.toExponential(12);
  const exponent = parseInt(expStr.split("e")[1] ?? "0", 10);
  let idx = Math.floor(exponent / 3);
  
  if (idx >= SUFFIXES.length) return fmtSci(v, language);
  
  let mant = v / Math.pow(10, idx * 3);
  if (Math.abs(parseFloat(mant.toFixed(d))) >= 1000 && idx < SUFFIXES.length - 1) {
    idx++;
    mant /= 1000;
  }
  
  return `${nf(d, language).format(mant)} ${SUFFIXES[idx]}`;
}

export function fmtSci(v: number, language: Language = "de") {
  const [m, e] = v.toExponential(3).split("e");
  return `${nf(3, language).format(Number(m))}e${Number(e)}`;
}

const MIN = 60, HOUR = 3600, DAY = 86400, MONTH = 30.436875 * DAY, YEAR = 365.2425 * DAY;

export function fmtDuration(sec: number, language: Language = "de"): string {
  if (!Number.isFinite(sec)) return "∞";
  if (sec < 1) return sec <= 0 ? "0 s" : `${nf(2, language).format(sec)} s`;
  if (sec >= YEAR * 1e6) return `${fmtSuffix(sec / YEAR, 2, language)} ${language === "en" ? "years" : "Jahre"}`;
  const parts: [number, string][] = [
    [YEAR, language === "en" ? "yr" : "J"], [MONTH, language === "en" ? "mo" : "Mon"], [DAY, language === "en" ? "d" : "T"], [HOUR, language === "en" ? "hr" : "Std"], [MIN, language === "en" ? "min" : "Min"], [1, "s"],
  ];
  const out: string[] = [];
  let rest = sec;
  for (const [size, label] of parts) {
    if (out.length >= 3) break;
    if (rest >= size || out.length > 0) {
      const n = Math.floor(rest / size);
      rest -= n * size;
      if (n > 0 || out.length > 0) out.push(`${n.toLocaleString(localeFor(language))} ${label}`);
    }
  }
  return out.filter((p) => !p.startsWith("0 ")).join(" ") || "0 s";
}

export function fmtFinish(sec: number, now: number, language: Language = "de") {
  if (!Number.isFinite(sec) || sec > 1e11) return language === "en" ? "– (too far in the future)" : "– (zu weit in der Zukunft)";
  const d = new Date(now + sec * 1000);
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleString(localeFor(language), {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export const DURATION_UNITS = [
  { id: "s", label: "Sekunden", f: 1 },
  { id: "m", label: "Minuten", f: MIN },
  { id: "h", label: "Stunden", f: HOUR },
  { id: "d", label: "Tage", f: DAY },
  { id: "y", label: "Jahre", f: YEAR },
] as const;

export const eta = (current: number, target: number, gain: number) =>
  target <= current ? 0 : gain > 0 ? (target - current) / gain : Infinity;