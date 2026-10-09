// Deterministic Muscle Training arithmetic. Defaults are an explicit community-observed model,
// never an official formula. User-entered displayed costs always anchor future projections.
import { SUFFIXES, parseNum, toValue } from "./endurance";
import { decide, verdict } from "./planner";
import { MUSCLE_TRAINING_MODEL } from "./muscle-training-model";
import type { Prog } from "./progression-state";
import type { ProfState } from "./proficiency";
import { bestCandidate, candidates, timeline, type PlannedStep, type SimState } from "./route-engine";

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
  return Array.from({ length: Math.max(0, Math.min(MUSCLE_TRAINING_MODEL.maxLevel, Math.floor(count))) }, (_, i) => anchor * multiplier ** i);
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

/** All remaining levels up to the cap; display limits never truncate the calculation horizon. */
export function modelSteps(p: Prog, gain: number | null, count: number = MUSCLE_TRAINING_MODEL.maxLevel) {
  const a = effectiveAssumptions(p), cost = effectiveCurrentCost(p);
  const level = parseLevel(p.mtLevel);
  if (gain === null || level === null) return [];
  return projectedCosts(cost, a.costMultiplier, count).slice(0, a.maxLevel - level).map((c, i) => ({ cost: c, gain: gainAfter(gain, a.gainMultiplier, i + 1) }));
}

function startState(p: Prog, current: number, gain: number, prof: ProfState | null): SimState {
  return { time: 0, endurance: current, gain, prof, mtLevel: parseLevel(p.mtLevel) };
}
export function plannedSteps(p: Prog): PlannedStep[] {
  return modelSteps(p, 1).map((s) => ({ cost: s.cost, mult: MUSCLE_TRAINING_MODEL.gainMultiplier }));
}

/** Global Muscle Training optimum over every valid prefix (exhaustive up to the level cap). */
export function evaluateMtPlan(p: Prog, current: number, gain: number, target: number, prof: ProfState | null = null) {
  const steps = plannedSteps(p);
  const list = candidates(startState(p, current, gain, prof), target, steps);
  const best = bestCandidate(list);
  const rows = list.map((c) => ({ ...c, totalCost: c.cumulativeCost, finalGain: c.gain, purchase: c.purchases ? { eta: c.stopTime } : null }));
  return { steps, prefix: { totals: list.map((c) => c.total), best }, rows, best: rows[best] ?? rows[0] };
}

export type MtAction = "buy-now" | "farm-to-buy" | "farm-target" | "increase-first";
export type MtOption = { id: "baseline" | "muscle" | "increase" | "increase-muscle"; total: number; purchases: number; finalGain: number; profLevels: number };

/** Global route search: direct farm, every MT prefix, temporary Increase, and Increase + every MT prefix. */
export function evaluateMtDecision(p: Prog, current: number, gain: number, target: number, next: number | null, prof: ProfState | null = null) {
  const plan = evaluateMtPlan(p, current, gain, target, prof);
  if (!plan.best) return null;
  const base = plan.rows[0];
  const baseline: MtOption = { id: "baseline", total: base?.total ?? Infinity, purchases: 0, finalGain: gain, profLevels: base?.profLevels ?? 0 };
  const options: MtOption[] = [baseline];
  plan.rows.slice(1).forEach((row) => options.push({ id: "muscle", total: row.total, purchases: row.purchases, finalGain: row.finalGain, profLevels: row.profLevels }));
  const after = next !== null ? evaluateMtPlan(p, current, next, target, prof) : null;
  after?.rows.forEach((row) => options.push({ id: row.purchases ? "increase-muscle" : "increase", total: row.total, purchases: row.purchases, finalGain: row.finalGain, profLevels: row.profLevels }));
  const ranked = [...options].sort((a, b) => a.total - b.total || a.purchases - b.purchases || (a.id === "baseline" ? -1 : b.id === "baseline" ? 1 : 0));
  const candidate = ranked[0] ?? baseline;
  const winner = candidate.id !== "baseline" && verdict(baseline.total, candidate.total) !== "better" ? baseline : candidate;
  const runnerUp = ranked.find((o) => o !== winner && !(o.id === winner.id && o.purchases === winner.purchases)) ?? null;
  const source = winner.id === "increase-muscle" ? after : plan;
  const firstPurchase = winner.purchases > 0 ? source?.rows[1]?.purchase ?? null : null;
  const action: MtAction = winner.id === "baseline" ? "farm-target" : winner.id.startsWith("increase") ? "increase-first" : firstPurchase?.eta === 0 ? "buy-now" : "farm-to-buy";
  const events = timeline(startState(p, current, gain, prof), target, plan.steps.slice(0, winner.purchases), winner.id.startsWith("increase") ? next : null);
  return { plan, baseline, options: ranked, winner, runnerUp, firstPurchase, action, saved: baseline.total - winner.total, events };
}

/** The page and copied summary compare the same sequential MT prefixes. */
/** Scenario times come from the shared route engine so copied summaries match the public route. */
export function decideProgression(p: Prog, current: number, gain: number, target: number, next: number | null, prof: ProfState | null = null) {
  const plan = parseLevel(p.mtLevel) !== null ? evaluateMtPlan(p, current, gain, target, prof) : null;
  const afterIncrease = plan && next !== null ? evaluateMtPlan(p, current, next, target, prof) : null;
  return decide(current, gain, target, {
    next,
    upCost: plan ? effectiveCurrentCost(p) : nuValue(p.upCost),
    upGain: plan ? effectiveUpGain(p, gain) : nuValue(p.upGain),
    comboGain: plan ? null : nuValue(p.comboGain),
    ...(plan ? { upgradeSteps: modelSteps(p, gain, plan.prefix.best), upgradeLabel: "Bester Muscle-Training-Plan", upgradeSecs: plan.best?.total } : {}),
    ...(afterIncrease ? { comboSteps: modelSteps(p, next, afterIncrease.prefix.best), comboLabel: "Increase, dann Muscle Training", comboSecs: afterIncrease.best?.total } : {}),
  });
}