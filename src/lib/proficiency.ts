// Deterministic Proficiency timing. Internal mechanics (verified in-game, see docs/mechanics-simulation-roadmap.md):
// +1 XP per second while training Endurance; each base level-up multiplies the then-current Gain by 1.15;
// the next requirement is round(requirement × 1.15), rounded at every transition. Entered Gain already
// contains the current Proficiency multiplier, so it is never multiplied by the absolute multiplier again.
import { parseNum } from "./endurance";
import { simulatePath, verdict, type PathRow, type Step } from "./planner";

export const PROF_GROWTH = 1.15;
export const PROF_XP_PER_SECOND = 1;
export const MAX_PROF_EVENTS = 10_000;

export type ProfState = { baseLevel: number; bonusLevel: number; xp: number; requirement: number };
export type ProfInput = { profBaseLevel: string; profBonusLevel: string; profXP: string; profRequirement: string };

const int = (s: string, min: number): number | null => {
  const p = parseNum(s);
  return p.ok === true && Number.isInteger(p.value) && p.value >= min && p.value <= 1e7 ? p.value : null;
};

/** Returns null unless base level, XP and requirement are valid; bonus may be empty (= 0). */
export function parseProf(x: ProfInput): ProfState | null {
  const baseLevel = int(x.profBaseLevel, 0);
  const requirement = x.profRequirement.trim() === "" && baseLevel !== null ? derivedRequirement(baseLevel) : int(x.profRequirement, 1);
  const xpP = parseNum(x.profXP);
  const xp = xpP.ok === true && Number.isFinite(xpP.value) && xpP.value >= 0 ? xpP.value : null;
  const bonusLevel = x.profBonusLevel.trim() === "" ? 0 : int(x.profBonusLevel, 0);
  if (baseLevel === null || requirement === null || xp === null || bonusLevel === null) return null;
  return { baseLevel, bonusLevel, xp, requirement };
}
/** Verified anchor: requirement for base level 42 → 43. Levels at or above it derive forward exactly. */
const REQUIREMENT_ANCHOR = { level: 42, requirement: 3731 } as const;
export function derivedRequirement(baseLevel: number): number | null {
  return baseLevel >= REQUIREMENT_ANCHOR.level && baseLevel <= 400 ? requirementAfter(REQUIREMENT_ANCHOR.requirement, baseLevel - REQUIREMENT_ANCHOR.level) : null;
}
export const nextRequirement = (requirement: number) => Math.round(requirement * PROF_GROWTH);
export const secondsToNext = (s: ProfState) => Math.max(0, s.requirement - s.xp) / PROF_XP_PER_SECOND;
export const effectiveLevel = (s: ProfState) => s.baseLevel + s.bonusLevel;
export const absoluteMultiplier = (s: ProfState) => PROF_GROWTH ** effectiveLevel(s);
export function requirementAfter(requirement: number, levels: number) {
  let r = requirement;
  for (let i = 0; i < levels; i++) r = nextRequirement(r);
  return r;
}
export function levelUp(s: ProfState): ProfState {
  return { ...s, baseLevel: s.baseLevel + 1, xp: Math.max(0, s.xp - s.requirement), requirement: nextRequirement(s.requirement) };
}
/** Applies any already-completed levels (xp ≥ requirement); each one is a level-up at time 0. */
export function normalizeProf(s: ProfState): { state: ProfState; levels: number } {
  let state = s, levels = 0;
  while (state.xp >= state.requirement && levels < MAX_PROF_EVENTS && Number.isFinite(state.requirement)) { state = levelUp(state); levels++; }
  return { state, levels };
}
/** Advances XP without Gain context (e.g. for display); levels returned are completed base level-ups. */
export function advanceProf(s: ProfState, seconds: number): { state: ProfState; levels: number } {
  let state = { ...s, xp: s.xp + Math.max(0, seconds) * PROF_XP_PER_SECOND };
  return normalizeProf(state);
}
export function profDerived(s: ProfState, gain: number | null) {
  return { effectiveLevel: effectiveLevel(s), secondsToNext: secondsToNext(s), nextBaseLevel: s.baseLevel + 1, gainAfterNext: gain === null ? null : gain * PROF_GROWTH };
}

export type FarmResult = { time: number; balance: number; gain: number; prof: ProfState; levels: number; reached: boolean };
/** Farms from balance to goal, stepping only at Proficiency event boundaries. Target exactly at an event finishes first. */
export function farmTo(balance: number, goal: number, gain: number, prof: ProfState): FarmResult {
  let time = 0, bal = balance, g = gain, state = prof, levels = 0;
  while (true) {
    if (bal >= goal) return { time, balance: bal, gain: g, prof: state, levels, reached: true };
    if (!(g > 0) || !Number.isFinite(bal)) return { time: Infinity, balance: bal, gain: g, prof: state, levels, reached: false };
    const tTarget = (goal - bal) / g, tProf = secondsToNext(state);
    if (tTarget <= tProf || levels >= MAX_PROF_EVENTS || !Number.isFinite(tProf) || !Number.isFinite(g * PROF_GROWTH)) {
      return { time: time + tTarget, balance: goal, gain: g, prof: { ...state, xp: state.xp + tTarget * PROF_XP_PER_SECOND }, levels, reached: true };
    }
    time += tProf; bal += g * tProf; state = levelUp({ ...state, xp: state.xp + tProf * PROF_XP_PER_SECOND }); g *= PROF_GROWTH; levels++;
  }
}

export function profEta(current: number, target: number, gain: number, prof: ProfState) {
  const r = farmTo(current, target, gain, prof);
  return { secs: r.time, levels: r.levels, finalGain: r.gain, nextIn: secondsToNext(prof) };
}

/** Same semantics as simulatePath (farm, deduct cost, apply gain), with Proficiency events while farming.
 * Upgrade gains apply as ratios of the static step gains so Proficiency boosts stay compounded.
 * A purchase that only becomes affordable at/after the moment the target would be reached is pruned. */
export function simulatePathProf(current: number, gain: number, target: number, steps: Step[], prof: ProfState) {
  let time = 0, bal = current, g = gain, staticGain = gain, state = prof, levels = 0, ok = true, pruned = false;
  const rows: PathRow[] = steps.map((s) => {
    if (ok) {
      const toTarget = farmTo(bal, target, g, state);
      const r = farmTo(bal, s.cost, g, state);
      if (!r.reached) ok = false;
      else {
        if (r.time > 0 && toTarget.time <= r.time) pruned = true;
        time += r.time; bal = Math.max(r.balance, s.cost) - s.cost; state = r.prof; levels += r.levels;
        g = r.gain * (staticGain > 0 ? s.gain / staticGain : 1); staticGain = s.gain;
      }
    }
    return ok ? { eta: time, balance: bal, gain: g, reachable: true } : { eta: Infinity, balance: 0, gain: s.gain, reachable: false };
  });
  if (!ok) return { rows, total: Infinity, finalGain: g, pruned, levels };
  const end = farmTo(bal, target, g, state);
  return { rows, total: time + end.time, finalGain: g, pruned, levels: levels + end.levels };
}

/** Path simulation with optional Proficiency; null prof reproduces the static simulator exactly. */
export function simulateAny(current: number, gain: number, target: number, steps: Step[], prof: ProfState | null) {
  if (prof) return simulatePathProf(current, gain, target, steps, prof);
  return { ...simulatePath(current, gain, target, steps), pruned: false, levels: 0 };
}
/** Fastest purchase prefix; pruned prefixes are never chosen. */
export function bestPrefixAny(current: number, gain: number, target: number, steps: Step[], prof: ProfState | null) {
  const sims = [0, ...steps.map((_, i) => i + 1)].map((n) => simulateAny(current, gain, target, steps.slice(0, n), prof));
  const totals = sims.map((s) => s.total);
  let best = 0;
  totals.forEach((v, i) => { if (!sims[i]?.pruned && v < (totals[best] ?? Infinity) && verdict(totals[best] ?? Infinity, v) === "better") best = i; });
  return { totals, best, sims };
}