// Deterministic Muscle Training arithmetic. Defaults are an explicit community-observed model,
// never an official formula. User-entered displayed costs always anchor future projections.
import { SUFFIXES, parseNum, toValue } from "./endurance";
import { bestPrefix, decide, simulatePath, verdict } from "./planner";
import { MUSCLE_TRAINING_MODEL } from "./muscle-training-model";
import type { Prog } from "./progression-state";

export type NU = { v: string; u: string };
export type Calibration = { differencePct: number; status: "match" | "close" | "mismatch" };
export const OBSERVED_MT = MUSCLE_TRAINING_MODEL;

const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;
export const nuValue = (x: NU): number | null => { const p = toValue(x.v, x.u); return p.ok === true ? p.value : null; };
export const parseMultiplier = (s: string): number | null => { const p = parseNum(s); return p.ok === true && positive(p.value) ? p.value : null; };
export const parseLevel = (s: string, maxLevel: number = OBSERVED_MT.maxLevel): number | null => {
  const p = parseNum(s);
  return p.ok === true && Number.isInteger(p.value) && p.value >= 0 && p.value <= maxLevel ? p.value : null;
};

export function gainAfter(gain: number, multiplier: number, purchases: number): number { return gain * multiplier ** purchases; }
export function gainPreview(gain: number, multiplier: number, count: number): number[] {
  return Array.from({ length: clampPreview(count) }, (_, i) => gainAfter(gain, multiplier, i + 1));
}
export function deriveCostMultiplier(a: number | null, b: number | null): number | null { return positive(a) && positive(b) ? b / a : null; }
export function expectedNextCost(base: number | null, multiplier: number | null, currentLevel: number | null): number | null {
  return positive(base) && positive(multiplier) && currentLevel !== null && Number.isInteger(currentLevel) && currentLevel >= 0
    ? base * multiplier ** currentLevel : null;
}
/** +1 is the entered/model next price unchanged; +k is anchor × multiplier^(k-1). */
export function projectedCosts(anchor: number | null, multiplier: number | null, count: number): number[] {
  if (!positive(anchor) || !positive(multiplier)) return [];
  return Array.from({ length: clampPreview(count) }, (_, i) => anchor * multiplier ** i);
}
export function derivedBaseCost(currentCost: number | null, multiplier: number | null, level: number | null): number | null {
  return positive(currentCost) && positive(multiplier) && level !== null && Number.isInteger(level) && level >= 0 ? currentCost / multiplier ** level : null;
}
export function baseCostDiffPct(observed: number | null, derived: number | null): number | null {
  return positive(observed) && positive(derived) ? (observed / derived - 1) * 100 : null;
}
export function calibrate(displayed: number | null, expected: number | null): Calibration | null {
  if (!positive(displayed) || !positive(expected)) return null;
  const differencePct = Math.abs(displayed / expected - 1) * 100;
  return { differencePct, status: differencePct <= 0.5 ? "match" : differencePct <= 2 ? "close" : "mismatch" };
}
export const clampPreview = (n: number) => ([3, 5, 10].includes(n) ? n : 5);

export function effectiveAssumptions(_p: Prog) {
  // Legacy override fields remain portable, but never alter the public static model.
  return { base: MUSCLE_TRAINING_MODEL.baseCost, ...MUSCLE_TRAINING_MODEL, derivedCostMultiplier: false };
}

/** Current displayed price wins. Without it, use the observed/custom base model. */
export function effectiveCurrentCost(p: Prog): number | null {
  const level = parseLevel(p.mtLevel);
  if (level === null || level === MUSCLE_TRAINING_MODEL.maxLevel) return null;
  const displayed = nuValue(p.mtDisplayedCost);
  if (p.mtDisplayedCost.v.trim() !== "") return positive(displayed) ? displayed : null;
  const a = effectiveAssumptions(p);
  return expectedNextCost(a.base, a.costMultiplier, level);
}
export function effectiveUpGain(p: Prog, gain: number | null): number | null {
  return gain !== null ? gainAfter(gain, MUSCLE_TRAINING_MODEL.gainMultiplier, 1) : null;
}

export function toNU(n: number): NU {
  if (!Number.isFinite(n) || n <= 0) return { v: "0", u: "" };
  const idx = Math.min(SUFFIXES.length - 1, Math.max(0, Math.floor(Math.log10(n) / 3)));
  const scaled = n / 10 ** (idx * 3);
  if (scaled >= 1e6) return { v: n.toExponential(6), u: "" };
  return { v: String(Number(scaled.toPrecision(10))), u: SUFFIXES[idx] ?? "" };
}

export function modelSteps(p: Prog, gain: number | null, count = p.mtPreviewCount) {
  const a = effectiveAssumptions(p), cost = effectiveCurrentCost(p);
  const level = parseLevel(p.mtLevel);
  if (gain === null || level === null) return [];
  return projectedCosts(cost, a.costMultiplier, count).slice(0, a.maxLevel - level).map((c, i) => ({ cost: c, gain: gainAfter(gain, a.gainMultiplier, i + 1) }));
}

export function evaluateMtPlan(p: Prog, current: number, gain: number, target: number) {
  const steps = modelSteps(p, gain);
  if (!steps.length && parseLevel(p.mtLevel) !== MUSCLE_TRAINING_MODEL.maxLevel) return null;
  const prefix = bestPrefix(current, gain, target, steps);
  const simulations = prefix.totals.map((total, purchases) => {
    const sim = simulatePath(current, gain, target, steps.slice(0, purchases));
    return { purchases, total, cost: steps[purchases - 1]?.cost ?? 0, totalCost: steps.slice(0, purchases).reduce((sum, step) => sum + step.cost, 0), finalGain: purchases ? (steps[purchases - 1]?.gain ?? gain) : gain, purchase: purchases ? sim.rows[purchases - 1] ?? null : null };
  });
  return { steps, prefix, rows: simulations, best: simulations[prefix.best] ?? simulations[0] };
}

export type MtAction = "buy-now" | "farm-to-buy" | "farm-target" | "increase-first";
export type MtOption = { id: "baseline" | "muscle" | "increase" | "increase-muscle"; total: number; purchases: number; finalGain: number };

/** Player-facing decision over the same deterministic prefixes used by the journey. */
export function evaluateMtDecision(p: Prog, current: number, gain: number, target: number, next: number | null) {
  const plan = evaluateMtPlan(p, current, gain, target);
  if (!plan?.best) return null;
  const baseline: MtOption = { id: "baseline", total: plan.rows[0]?.total ?? Infinity, purchases: 0, finalGain: gain };
  const options: MtOption[] = [baseline];
  if (plan.best.purchases > 0) options.push({ id: "muscle", total: plan.best.total, purchases: plan.best.purchases, finalGain: plan.best.finalGain });
  if (next !== null) {
    options.push({ id: "increase", total: plan.rows[0]?.total === 0 ? 0 : simulatePath(current, next, target, []).total, purchases: 0, finalGain: next });
    const after = evaluateMtPlan(p, current, next, target);
    if (after?.best && after.best.purchases > 0) options.push({ id: "increase-muscle", total: after.best.total, purchases: after.best.purchases, finalGain: after.best.finalGain });
  }
  const ranked = [...options].sort((a, b) => a.total - b.total || (a.id === "baseline" ? -1 : b.id === "baseline" ? 1 : 0));
  const candidate = ranked[0] ?? baseline;
  const winner = candidate.id !== "baseline" && verdict(baseline.total, candidate.total) !== "better" ? baseline : candidate;
  const runnerUp = ranked.find((option) => option !== winner) ?? null;
  const firstPurchase = winner.purchases > 0
    ? simulatePath(current, winner.id === "increase-muscle" && next !== null ? next : gain, target, modelSteps(p, winner.id === "increase-muscle" ? next : gain).slice(0, 1)).rows[0] ?? null
    : null;
  const action: MtAction = winner.id === "baseline" ? "farm-target" : winner.id.startsWith("increase") ? "increase-first" : firstPurchase?.eta === 0 ? "buy-now" : "farm-to-buy";
  return { plan, baseline, options: ranked, winner, runnerUp, firstPurchase, action, saved: baseline.total - winner.total };
}

/** The page and copied summary compare the same sequential MT prefixes. */
export function decideProgression(p: Prog, current: number, gain: number, target: number, next: number | null) {
  const plan = evaluateMtPlan(p, current, gain, target);
  const afterIncrease = next !== null ? evaluateMtPlan(p, current, next, target) : null;
  return decide(current, gain, target, {
    next,
    upCost: plan ? effectiveCurrentCost(p) : nuValue(p.upCost),
    upGain: plan ? effectiveUpGain(p, gain) : nuValue(p.upGain),
    comboGain: plan ? null : nuValue(p.comboGain),
    ...(plan ? { upgradeSteps: plan.steps.slice(0, plan.prefix.best), upgradeLabel: "Bester Muscle-Training-Plan" } : {}),
    ...(afterIncrease ? { comboSteps: afterIncrease.steps.slice(0, afterIncrease.prefix.best), comboLabel: "Increase, dann Muscle Training" } : {}),
  });
}