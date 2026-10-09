import { translate, type Language } from "./i18n";
import { SUFFIXES, eta, fmtPlain, toValue } from "./endurance";

export type NumberUnit = { v: string; u: string };
export const YEAR_SECONDS = 365.2425 * 86400;

export function calculatePlan(current: number, target: number, gain: number) {
  return {
    remaining: Math.max(0, target - current),
    secs: eta(current, target, gain),
    pct: target > 0 ? Math.min(100, current / target * 100) : 100,
    reached: current >= target,
  };
}

export function compareGain(current: number, target: number, gain: number, next: number) {
  const a = eta(current, target, gain), b = eta(current, target, next);
  const saved = a === b ? 0 : a - b;
  const pct = Number.isFinite(a) && a > 0 ? saved / a * 100 : Number.isFinite(b) && b > 0 ? 100 : 0;
  const recommendation = next <= gain ? "Nicht drücken" : pct > 2 ? "Increase jetzt sinnvoll" : "Kaum Unterschied";
  return { a, b, saved, pct, recommendation };
}

/** Three adjacent scales, including the chosen scale; never silently normalizes the selection. */
export function neighboringConversion(value: NumberUnit, language: Language = "de"): string {
  const parsed = toValue(value.v, "");
  if (parsed.ok !== true) return "";
  const idx = SUFFIXES.findIndex((unit) => unit === value.u);
  if (idx < 0) return "";
  const indices = idx >= 2 ? [idx, idx - 1, idx - 2] : [idx, idx + 1, idx + 2];
  return indices.filter((i) => i < SUFFIXES.length).map((i) =>
    `${fmtPlain(parsed.value * 10 ** ((idx - i) * 3), 6, language)} ${SUFFIXES[i] || translate(language, "Einheiten")}`
  ).join(" = ");
}

export function contextTargets(unit: string): NumberUnit[] {
  const idx = SUFFIXES.findIndex((u) => u === unit);
  const values = unit === "Qa" ? ["100", "250", "500"] : ["1", "10", "100"];
  const targets = values.map((v) => ({ v, u: unit }));
  const next = SUFFIXES[idx + 1];
  if (idx >= 0 && next !== undefined) targets.push({ v: "1", u: next });
  return targets;
}

export function naturalDuration(sec: number, language: Language = "de"): string {
  if (!Number.isFinite(sec)) return translate(language, "Nicht erreichbar");
  if (sec <= 0) return language === "en" ? "0 seconds" : "0 Sekunden";
  if (sec < 60) return `${fmtPlain(sec, 2, language)} ${language === "en" ? "seconds" : "Sekunden"}`;
  const sizes: [number, string, string][] = [
    [YEAR_SECONDS, "Jahr", "Jahre"], [86400, "Tag", "Tage"],
    [3600, "Stunde", "Stunden"], [60, "Minute", "Minuten"], [1, "Sekunde", "Sekunden"],
  ];
  let rest = sec;
  const parts: string[] = [];
  for (const [size, singular, plural] of sizes) {
    const amount = Math.floor(rest / size);
    if (amount > 0) {
      const english: Record<string, string> = { Jahr: "year", Jahre: "years", Tag: "day", Tage: "days", Stunde: "hr", Stunden: "hr", Minute: "min", Minuten: "min", Sekunde: "second", Sekunden: "seconds" };
      const unit = amount === 1 ? singular : plural;
      parts.push(`${fmtPlain(amount, 0, language)} ${language === "en" ? english[unit] : unit}`);
      rest -= amount * size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}
/* ---------- Progression v2: pure arithmetic on user-entered costs and gains ---------- */
export type Verdict = "better" | "same" | "worse";
export type Step = { cost: number; gain: number };
export type PathRow = { eta: number; balance: number; gain: number; reachable: boolean };

/** B vs A (seconds). "better" only when B is more than 2 % faster. */
export function verdict(a: number, b: number): Verdict {
  if (a === b) return "same";
  if (!Number.isFinite(a)) return Number.isFinite(b) ? "better" : "same";
  if (!Number.isFinite(b)) return "worse";
  if (a === 0) return b > 0 ? "worse" : "same";
  const pct = (a - b) / a * 100;
  return pct > 2 ? "better" : pct < -2 ? "worse" : "same";
}

export function savedPct(a: number, b: number) {
  const saved = a === b ? 0 : a - b;
  const pct = Number.isFinite(a) && a > 0 ? (Number.isFinite(saved) ? saved / a * 100 : -Infinity) : Number.isFinite(b) && b > 0 && !Number.isFinite(a) ? 100 : 0;
  return { saved, pct };
}

/** Farm until each cost is affordable, deduct cost, switch gain, then farm to target. */
export function simulatePath(current: number, gain: number, target: number, steps: Step[]) {
  let time = 0, bal = current, g = gain, ok = true;
  const rows: PathRow[] = steps.map((s) => {
    if (ok) {
      const wait = s.cost <= bal ? 0 : g > 0 ? (s.cost - bal) / g : Infinity;
      if (!Number.isFinite(wait)) ok = false;
      else { time += wait; bal = Math.max(bal, s.cost) - s.cost; g = s.gain; }
    }
    return ok ? { eta: time, balance: bal, gain: g, reachable: true } : { eta: Infinity, balance: 0, gain: s.gain, reachable: false };
  });
  const total = ok ? time + eta(bal, target, g) : Infinity;
  return { rows, total, finalGain: g };
}

export function bestPrefix(current: number, gain: number, target: number, steps: Step[]) {
  const totals = steps.map((_, i) => simulatePath(current, gain, target, steps.slice(0, i + 1)).total);
  totals.unshift(eta(current, target, gain));
  let best = 0;
  totals.forEach((v, i) => { if (v < (totals[best] ?? Infinity) && verdict(totals[best] ?? Infinity, v) === "better") best = i; });
  return { totals, best };
}

export function pathAdvice(best: number, count: number): string {
  if (count === 0) return "Noch keine Upgrades im Pfad.";
  if (best === 0) return "Für dein aktuelles Ziel lohnt sich kein Upgrade aus dem Pfad – weiter farmen.";
  if (best === count) return `Für dein aktuelles Ziel lohnt sich der komplette Pfad bis Upgrade ${count}.`;
  return `Für dein aktuelles Ziel lohnt sich der Pfad bis Upgrade ${best}; Upgrade ${best + 1} verlängert die Zielzeit.`;
}

export const UPGRADE_LABEL: Record<Verdict, string> = { better: "Jetzt kaufen sobald bezahlbar", same: "Kaum Unterschied", worse: "Für dieses Ziel nicht kaufen" };
export const RESET_LABEL: Record<Verdict, string> = { better: "Reset lohnt sich", same: "Kaum Unterschied", worse: "Reset für dieses Ziel nicht sinnvoll" };

export function upgradeROI(current: number, gain: number, target: number, cost: number, post: number) {
  const a = eta(current, target, gain);
  const b = simulatePath(current, gain, target, [{ cost, gain: post }]).total;
  const wait = cost <= current ? 0 : gain > 0 ? (cost - current) / gain : Infinity;
  const v: Verdict = post <= gain ? "worse" : verdict(a, b);
  return {
    a, b, wait, remaining: Math.max(0, cost - current), ...savedPct(a, b),
    gainDelta: post - gain, gainPct: gain > 0 ? (post - gain) / gain * 100 : 0,
    verdict: v, recommendation: UPGRADE_LABEL[v], noSpeedGain: post <= gain,
  };
}

export function resetCompare(current: number, before: number, target: number, after: number, lost: number) {
  const a = eta(current, target, before);
  const b = eta(Math.max(0, current - lost), target, after);
  const v: Verdict = after <= before && lost >= 0 && b >= a ? "worse" : verdict(a, b);
  return { a, b, ...savedPct(a, b), verdict: v, recommendation: RESET_LABEL[v] };
}

export function whatIf(current: number, gain: number, target: number, mult: number, flat: number, targetMult: number) {
  const g = gain * mult + flat, t = target * targetMult;
  return { gain: g, target: t, secs: eta(current, t, g), base: eta(current, target, gain) };
}

export type DecisionInput = { next: number | null; upCost: number | null; upGain: number | null; comboGain: number | null; upgradeSteps?: Step[]; upgradeLabel?: string; comboSteps?: Step[]; comboLabel?: string; upgradeSecs?: number | undefined; comboSecs?: number | undefined };
export type Scenario = { id: "A" | "B" | "C" | "D"; label: string; secs: number };

export function decide(current: number, gain: number, target: number, x: DecisionInput) {
  const sc: Scenario[] = [{ id: "A", label: "Weiter farmen", secs: eta(current, target, gain) }];
  const missing: string[] = [];
  if (x.next !== null) sc.push({ id: "B", label: "Increase jetzt", secs: eta(current, target, x.next) });
  else missing.push("Nächster Gain fehlt – Increase kann nicht bewertet werden.");
  if (x.upgradeSteps) sc.push({ id: "C", label: x.upgradeLabel ?? "Upgrade kaufen sobald bezahlbar", secs: x.upgradeSecs ?? simulatePath(current, gain, target, x.upgradeSteps).total });
  else if (x.upCost !== null && x.upGain !== null) sc.push({ id: "C", label: "Upgrade kaufen sobald bezahlbar", secs: simulatePath(current, gain, target, [{ cost: x.upCost, gain: x.upGain }]).total });
  else missing.push(`${[x.upCost === null && "Upgrade-Kosten", x.upGain === null && "Gain nach Upgrade"].filter(Boolean).join(" und ")} fehlt – Upgrade kann nicht bewertet werden.`);
  if (x.next !== null && x.comboSteps) sc.push({ id: "D", label: x.comboLabel ?? "Increase jetzt, dann Upgrade", secs: x.comboSecs ?? simulatePath(current, x.next, target, x.comboSteps).total });
  else if (x.next !== null && x.upCost !== null && x.comboGain !== null) sc.push({ id: "D", label: "Increase jetzt, dann Upgrade", secs: simulatePath(current, x.next, target, [{ cost: x.upCost, gain: x.comboGain }]).total });
  else if (x.next !== null && x.upCost !== null) missing.push("Gain nach Increase + Upgrade fehlt – Kombi-Szenario wird nicht geschätzt.");
  const base: Scenario = sc[0] ?? { id: "A", label: "Weiter farmen", secs: eta(current, target, gain) };
  const ranked = [...sc].sort((p, q) => p.secs - q.secs || (p.id === "A" ? -1 : q.id === "A" ? 1 : 0));
  let winner = ranked[0] ?? base;
  if (winner.id !== "A" && verdict(base.secs, winner.secs) !== "better") winner = base;
  const second = ranked.find((r) => r !== winner) ?? null;
  return { scenarios: ranked, winner, second, missing };
}