import { describe, expect, it } from "vitest";
import { bestCandidate, candidates, farm, timeline, type SimState } from "./route-engine";
import { evaluateMtDecision, evaluateMtPlan, plannedSteps } from "./muscle-training";
import { simulatePathProf, derivedRequirement, parseProf, type ProfState } from "./proficiency";
import { PROG_DEFAULTS } from "./progression-state";

const prof = (xp: number, requirement: number, baseLevel = 42): ProfState => ({ baseLevel, bonusLevel: 0, xp, requirement });
const st = (endurance: number, gain: number, p: ProfState | null = null, mtLevel: number | null = 0): SimState => ({ time: 0, endurance, gain, prof: p, mtLevel });
const C60 = 1000 * 2.1 ** 60;
const lv = (n: string) => ({ ...PROG_DEFAULTS, mtLevel: n });

/** Independent brute force: every prefix through the older per-path simulator. */
function brute(level: string, current: number, gain: number, target: number, p: ProfState) {
  const steps = plannedSteps(lv(level));
  let best = 0, bestT = Infinity;
  for (let k = 0; k <= steps.length; k++) {
    const sGain = steps.slice(0, k).map((s, i) => ({ cost: s.cost, gain: gain * 1.4 ** (i + 1) }));
    const r = simulatePathProf(current, gain, target, sGain, p);
    if (r.pruned) break;
    if (r.total < bestT) { bestT = r.total; best = k; }
  }
  return best;
}

describe("global Muscle Training optimizer", () => {
  it("finds an optimum within the next 3 levels", () => {
    const r = evaluateMtPlan(lv("60"), 0, C60, C60 * 30);
    expect(r.prefix.best).toBeGreaterThan(0);
    expect(r.prefix.best).toBeLessThanOrEqual(3);
  });
  it("finds an optimum within the next 10 levels", () => {
    const r = evaluateMtPlan(lv("60"), 0, C60, C60 * 1e3);
    expect(r.prefix.best).toBeGreaterThan(3);
    expect(r.prefix.best).toBeLessThanOrEqual(10);
  });
  it("regression: Lv60 with true optimum beyond Lv70 returns that optimum", () => {
    const p = prof(0, 3731);
    const r = evaluateMtPlan(lv("60"), 0, C60 / 10, C60 * 1e6, p);
    expect(60 + r.prefix.best).toBeGreaterThan(70);
    expect(r.prefix.best).toBe(brute("60", 0, C60 / 10, C60 * 1e6, p));
    expect(evaluateMtDecision(lv("60"), 0, C60 / 10, C60 * 1e6, null, p)?.winner.purchases).toBe(r.prefix.best);
  });
  it("visible detail settings never change the best plan", () => {
    const a = evaluateMtPlan({ ...lv("60"), mtPreviewCount: 3 }, 0, C60 / 10, C60 * 1e6);
    const b = evaluateMtPlan({ ...lv("60"), mtPreviewCount: 10 }, 0, C60 / 10, C60 * 1e6);
    expect(a.prefix.best).toBe(b.prefix.best);
    expect(a.rows.length).toBe(b.rows.length);
  });
  it("prunes purchases costing at least the target", () => {
    const list = candidates(st(0, 1), 100, [{ cost: 50, mult: 2 }, { cost: 100, mult: 1e9 }]);
    expect(list.map((c) => c.purchases)).toEqual([0, 1]);
  });
  it("prunes purchases affordable only once the target is reached", () => {
    // Balance is absolute, so affordability after the target happens exactly when cost ≥ target, also with Proficiency.
    const late = candidates(st(0, 1, prof(0, 5)), 50, [{ cost: 40, mult: 1 }, { cost: 45, mult: 9 }, { cost: 60, mult: 1e9 }]);
    expect(late.map((c) => c.purchases)).toEqual([0, 1, 2]);
    late.slice(1).forEach((c, i) => expect(c.stopTime).toBeLessThan(late[i]!.total));
  });
  it("is safe at Lv150", () => {
    const r = evaluateMtPlan(lv("150"), 0, 10, 1e9, prof(0, 100));
    expect(r.rows.map((x) => x.purchases)).toEqual([0]);
    expect(evaluateMtDecision(lv("150"), 0, 10, 1e9, null)?.action).toBe("farm-target");
  });
  it("chooses direct farming unless a purchase materially wins", () => {
    expect(bestCandidate([{ total: 100 } as never, { total: 99 } as never])).toBe(0);
    expect(bestCandidate([{ total: 100 } as never, { total: 80 } as never, { total: 70 } as never])).toBe(2);
  });
});

describe("Proficiency inside the event engine", () => {
  it("advances +1 XP per second", () => {
    expect(farm(st(0, 1, prof(10, 1000)), 100).state.prof?.xp).toBe(110);
  });
  it("handles multiple level-ups while waiting for a purchase", () => {
    const events = timeline(st(0, 1, prof(0, 10)), 1e9, [{ cost: 100, mult: 2 }]);
    const before = events.filter((e, i) => e.kind === "prof" && i < events.findIndex((x) => x.kind === "mt"));
    expect(before.length).toBeGreaterThanOrEqual(3);
  });
  it("level-up before and after a purchase", () => {
    const r = candidates(st(0, 1, prof(0, 50)), 400, [{ cost: 100, mult: 2 }]);
    expect(r[1]?.stopTime).toBeCloseTo(50 + 50 / 1.15, 10);
    expect(r[1]?.profLevels).toBeGreaterThanOrEqual(2);
  });
  it("counts multiple levels before target and ties finish before the level", () => {
    expect(candidates(st(0, 1, prof(0, 100)), 100, [])[0]?.profLevels).toBe(0);
    expect(candidates(st(0, 1, prof(0, 100)), 500, [])[0]?.profLevels).toBe(3);
  });
  it("derives requirements from the verified recurrence", () => {
    expect(derivedRequirement(43)).toBe(4291);
    expect(derivedRequirement(56)).toBe(26403);
    expect(derivedRequirement(66)).toBe(106814);
    expect(derivedRequirement(10)).toBeNull();
    expect(parseProf({ profBaseLevel: "43", profBonusLevel: "", profXP: "2352", profRequirement: "" })?.requirement).toBe(4291);
  });
});

describe("route timeline", () => {
  it("is chronological with correct state after each event and ends at the target", () => {
    const events = timeline(st(0, 1, prof(0, 50), 10), 400, [{ cost: 100, mult: 2 }]);
    expect(events[0]?.kind).toBe("now");
    expect(events.at(-1)?.kind).toBe("target");
    expect(events.at(-1)?.endurance).toBe(400);
    for (let i = 1; i < events.length; i++) expect(events[i]!.time).toBeGreaterThanOrEqual(events[i - 1]!.time);
    const mt = events.find((e) => e.kind === "mt");
    expect(mt?.endurance).toBe(0);
    expect(mt?.mtLevel).toBe(11);
    expect(mt?.gain).toBeCloseTo(2 * 1.15, 12);
    expect(events.at(-1)?.time).toBeCloseTo(candidates(st(0, 1, prof(0, 50), 10), 400, [{ cost: 100, mult: 2 }])[1]!.total, 9);
  });
  it("puts Increase first when chosen", () => {
    const d = evaluateMtDecision({ ...PROG_DEFAULTS, mtLevel: "0", mtDisplayedCost: { v: "900", u: "" } }, 0, 10, 10000, 100);
    expect(d?.events[1]?.kind).toBe("increase");
  });
});