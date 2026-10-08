// Deterministic Muscle Training arithmetic. The gain multiplier is a user/community assumption;
// cost scaling is only produced from user-supplied or user-observed values, never guessed.
import { SUFFIXES, parseNum, toValue } from "./endurance";
import type { Prog, PathItem } from "./progression-state";

type NU = { v: string; u: string };
const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;
const nuValue = (x: NU): number | null => { const p = toValue(x.v, x.u); return p.ok === true ? p.value : null; };
export const parseMultiplier = (s: string): number | null => { const p = parseNum(s); return p.ok === true && p.value > 0 && Number.isFinite(p.value) ? p.value : null; };

/** Gain after n purchases: currentGain × multiplier^n. */
export function gainAfter(gain: number, multiplier: number, n: number): number { return gain * multiplier ** n; }
export function gainPreview(gain: number, multiplier: number, count: number): number[] {
  return Array.from({ length: clampPreview(count) }, (_, i) => gainAfter(gain, multiplier, i + 1));
}
/** Multiplier inferred from two consecutive observed costs (B / A); null when not derivable. */
export function deriveCostMultiplier(a: number | null, b: number | null): number | null {
  return positive(a) && positive(b) ? b / a : null;
}
/** Sequential purchase costs. Row 0 is the current next purchase (= current cost), row k = cost × multiplier^k. */
export function projectedCosts(currentCost: number | null, multiplier: number | null, count: number): number[] {
  if (!positive(currentCost) || !positive(multiplier)) return [];
  return Array.from({ length: clampPreview(count) }, (_, k) => currentCost * multiplier ** k);
}
/** Cost at a level offset from the base/first cost: base × multiplier^offset. */
export function costAtLevel(base: number | null, multiplier: number | null, offset: number): number | null {
  return positive(base) && positive(multiplier) && Number.isInteger(offset) && offset >= 0 ? base * multiplier ** offset : null;
}
/** Observed model: next cost at level n = base × multiplier^n, so base = displayed next cost ÷ multiplier^n. */
export function derivedBaseCost(currentCost: number | null, multiplier: number | null, level: number | null): number | null {
  return positive(currentCost) && positive(multiplier) && level !== null && Number.isInteger(level) && level >= 0 ? currentCost / multiplier ** level : null;
}
/** Percent difference of an observed base cost vs the derived one (display rounding causes small drift). */
export function baseCostDiffPct(observed: number | null, derived: number | null): number | null {
  return positive(observed) && positive(derived) ? (observed / derived - 1) * 100 : null;
}
export const clampPreview = (n: number) => Math.min(10, Math.max(1, Math.round(Number.isFinite(n) ? n : 3)));

/** Cost multiplier in effect: two observed costs win (user evidence); otherwise the editable entry (default = community value). */
export function effectiveCostMultiplier(p: Prog): { value: number | null; derived: boolean } {
  const derived = deriveCostMultiplier(nuValue(p.mtObservedCostA), nuValue(p.mtObservedCostB));
  if (derived !== null) return { value: derived, derived: true };
  return { value: parseMultiplier(p.mtCostMultiplier), derived: false };
}
/** Current next-purchase cost: entered upgrade cost, else base cost × multiplier^level when both are known. */
export function effectiveCurrentCost(p: Prog): number | null {
  const entered = nuValue(p.upCost);
  if (entered !== null) return entered;
  const level = parseNum(p.mtLevel);
  return level.ok === true ? costAtLevel(nuValue(p.mtBaseCost), effectiveCostMultiplier(p).value, level.value) : null;
}
/** Post-upgrade gain used by ROI/decisions: auto (gain × multiplier) or the manual entry. */
export function effectiveUpGain(p: Prog, gain: number | null): number | null {
  if (!p.mtAutoGain) return nuValue(p.upGain);
  const m = parseMultiplier(p.mtGainMultiplier);
  return gain !== null && m !== null ? gainAfter(gain, m, 1) : null;
}

/** Converts a number to a suffix-unit input pair that parses back to the same value. */
export function toNU(n: number): NU {
  if (!Number.isFinite(n) || n <= 0) return { v: "0", u: "" };
  const idx = Math.min(SUFFIXES.length - 1, Math.max(0, Math.floor(Math.log10(n) / 3)));
  const scaled = n / 10 ** (idx * 3);
  if (scaled >= 1e6) return { v: n.toExponential(6), u: "" };
  return { v: String(Number(scaled.toPrecision(10))), u: SUFFIXES[idx] ?? "" };
}

/** Generated path rows; empty unless current cost, cost multiplier and gain multiplier are all known. */
export function generatePath(p: Prog, gain: number | null, idBase = Date.now()): PathItem[] {
  const gm = parseMultiplier(p.mtGainMultiplier), cm = effectiveCostMultiplier(p).value;
  if (gain === null || gm === null) return [];
  const costs = projectedCosts(effectiveCurrentCost(p), cm, p.mtPreviewCount);
  const level = parseNum(p.mtLevel);
  return costs.map((cost, i) => ({
    id: idBase + i, name: "Muscle Training",
    level: level.ok === true && Number.isInteger(level.value) ? String(level.value + i + 1) : "",
    cost: toNU(cost), gain: toNU(gainAfter(gain, gm, i + 1)),
  }));
}