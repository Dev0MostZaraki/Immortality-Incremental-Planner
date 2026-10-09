// Unified deterministic event engine shared by Plan and Muscle Training.
// Advances directly between events (Proficiency level-up, purchase affordable, target reached).
// Unverified mechanics (Strength, Perseverance) are intentionally absent; new event kinds plug in here.
import { PROF_GROWTH, MAX_PROF_EVENTS, levelUp, secondsToNext, type ProfState } from "./proficiency";
import { verdict } from "./planner";

export type RouteEventKind = "now" | "increase" | "prof" | "mt" | "target";
export type RouteEvent = { kind: RouteEventKind; time: number; endurance: number; gain: number; mtLevel: number | null; profLevel: number | null };
export type SimState = { time: number; endurance: number; gain: number; prof: ProfState | null; mtLevel: number | null };
/** A planned purchase: absolute cost and multiplicative Gain change. */
export type PlannedStep = { cost: number; mult: number };
export type Candidate = { purchases: number; cost: number; cumulativeCost: number; nextCost: number | null; gain: number; stopTime: number; total: number; profLevels: number };

const snap = (kind: RouteEventKind, s: SimState): RouteEvent => ({ kind, time: s.time, endurance: s.endurance, gain: s.gain, mtLevel: s.mtLevel, profLevel: s.prof?.baseLevel ?? null });

/** Farms until `goal`. A goal exactly at a level-up boundary is reached before the level-up. */
export function farm(start: SimState, goal: number, events?: RouteEvent[]): { state: SimState; reached: boolean } {
  let s = { ...start }, n = 0;
  while (true) {
    if (s.endurance >= goal) return { state: s, reached: true };
    if (!(s.gain > 0) || !Number.isFinite(s.endurance)) return { state: { ...s, time: Infinity }, reached: false };
    const tGoal = (goal - s.endurance) / s.gain;
    const tProf = s.prof ? secondsToNext(s.prof) : Infinity;
    if (tGoal <= tProf || n >= MAX_PROF_EVENTS || !Number.isFinite(s.gain * PROF_GROWTH)) {
      return { state: { ...s, time: s.time + tGoal, endurance: goal, prof: s.prof ? { ...s.prof, xp: s.prof.xp + tGoal } : null }, reached: true };
    }
    const prof = s.prof as ProfState;
    s = { ...s, time: s.time + tProf, endurance: s.endurance + s.gain * tProf, gain: s.gain * PROF_GROWTH, prof: levelUp({ ...prof, xp: prof.xp + tProf }) };
    n++;
    events?.push(snap("prof", s));
  }
}

function buy(s: SimState, step: PlannedStep): SimState {
  return { ...s, endurance: Math.max(s.endurance, step.cost) - step.cost, gain: s.gain * step.mult, mtLevel: s.mtLevel === null ? null : s.mtLevel + 1 };
}

/** Every valid purchase prefix, exhaustively, independent of any display limit.
 * Stops only when the next purchase costs ≥ target, cannot become affordable, or is affordable only once the target is already reached. */
export function candidates(start: SimState, target: number, steps: PlannedStep[]): Candidate[] {
  const base = start.prof?.baseLevel ?? 0;
  let s = start, cum = 0, fin = farm(s, target);
  const out: Candidate[] = [{ purchases: 0, cost: 0, cumulativeCost: 0, nextCost: steps[0]?.cost ?? null, gain: s.gain, stopTime: start.time, total: fin.state.time, profLevels: (fin.state.prof?.baseLevel ?? 0) - base }];
  for (let k = 0; k < steps.length; k++) {
    const step = steps[k] as PlannedStep;
    if (start.endurance >= target || step.cost >= target) break;
    const afford = farm(s, step.cost);
    if (!afford.reached) break;
    if (afford.state.time > s.time && fin.state.time <= afford.state.time) break;
    s = buy(afford.state, step); cum += step.cost; fin = farm(s, target);
    out.push({ purchases: k + 1, cost: step.cost, cumulativeCost: cum, nextCost: steps[k + 1]?.cost ?? null, gain: s.gain, stopTime: s.time, total: fin.state.time, profLevels: (fin.state.prof?.baseLevel ?? 0) - base });
  }
  return out;
}

/** Index of the globally fastest candidate; a purchase must beat direct farming materially. */
export function bestCandidate(list: Candidate[]): number {
  let best = 0;
  list.forEach((c, i) => { if (c.total < (list[best]?.total ?? Infinity)) best = i; });
  return best > 0 && verdict(list[0]?.total ?? Infinity, list[best]?.total ?? Infinity) !== "better" ? 0 : best;
}

/** Chronological events for a route: optional Increase at t=0, then purchases, then target. */
export function timeline(start: SimState, target: number, steps: PlannedStep[], increaseGain: number | null = null): RouteEvent[] {
  const events: RouteEvent[] = [snap("now", start)];
  let s = start;
  if (increaseGain !== null) { s = { ...s, gain: increaseGain }; events.push(snap("increase", s)); }
  for (const step of steps) {
    const r = farm(s, step.cost, events);
    if (!r.reached) return events;
    s = buy(r.state, step); events.push(snap("mt", s));
  }
  const end = farm(s, target, events);
  if (end.reached) events.push(snap("target", end.state));
  return events;
}