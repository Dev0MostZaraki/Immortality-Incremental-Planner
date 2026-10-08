import { describe, expect, it } from "vitest";
import { bestPrefix, compareGain, decide, naturalDuration, pathAdvice, resetCompare, simulatePath, upgradeROI, whatIf } from "./planner";

describe("Progression v2 arithmetic", () => {
  it("upgrade affordability ETA and zero wait when affordable", () => {
    expect(upgradeROI(50, 10, 1000, 100, 20).wait).toBe(5);
    expect(upgradeROI(150, 10, 1000, 100, 20).wait).toBe(0);
  });
  it("deducts purchase cost before continuing", () => {
    const p = simulatePath(150, 10, 1000, [{ cost: 100, gain: 20 }]);
    expect(p.rows[0]!.balance).toBe(50);
    expect(p.total).toBe(47.5);
  });
  it("recommends buying when it helps", () => {
    const r = upgradeROI(0, 10, 10000, 100, 100);
    expect(r.b).toBe(10 + 100);
    expect(r.recommendation).toBe("Jetzt kaufen sobald bezahlbar");
  });
  it("does not recommend when buying hurts or gain is not higher", () => {
    expect(upgradeROI(0, 10, 200, 150, 11).recommendation).toBe("Für dieses Ziel nicht kaufen");
    expect(upgradeROI(1e6, 10, 2e6, 1, 10).recommendation).toBe("Für dieses Ziel nicht kaufen");
  });
  it("simulates two sequential upgrades", () => {
    const p = simulatePath(0, 10, 1000, [{ cost: 100, gain: 20 }, { cost: 200, gain: 50 }]);
    expect(p.rows.map((r) => r.eta)).toEqual([10, 20]);
    expect(p.total).toBe(40);
  });
  it("selects the fastest prefix", () => {
    const b = bestPrefix(0, 10, 1000, [{ cost: 100, gain: 20 }, { cost: 900, gain: 21 }]);
    expect(b.totals.slice(0, 2)).toEqual([100, 60]); expect(b.totals[2]).toBeCloseTo(55 + 1000 / 21, 6);
    expect(b.best).toBe(1);
    expect(pathAdvice(1, 2)).toContain("bis Upgrade 1; Upgrade 2 verlängert");
  });
  it("increase comparison and decision ranking", () => {
    expect(compareGain(475e15, 500e15, 454e12, 371.73e12).recommendation).toBe("Nicht drücken");
    const d = decide(475e15, 454e12, 500e15, { next: 371.73e12, upCost: null, upGain: null, comboGain: null });
    expect(d.winner.id).toBe("A");
    expect(d.missing.length).toBeGreaterThan(0);
    expect(decide(0, 10, 10000, { next: 12, upCost: 100, upGain: 100, comboGain: null }).winner.id).toBe("C");
  });
  it("reset comparison", () => {
    expect(resetCompare(100, 10, 1100, 100, 100).recommendation).toBe("Reset lohnt sich");
    expect(resetCompare(100, 10, 1100, 10, 50).recommendation).toBe("Reset für dieses Ziel nicht sinnvoll");
  });
  it("what-if applies multiplier, flat gain and target multiplier", () => {
    expect(whatIf(0, 10, 100, 2, 5, 3).secs).toBe(12);
  });
  it("never leaks NaN or Infinity into visible strings", () => {
    const strings = [
      upgradeROI(0, 0, 100, 50, 0).recommendation, resetCompare(0, 0, 100, 0, 0).recommendation,
      decide(0, 0, 100, { next: 0, upCost: 10, upGain: 0, comboGain: 0 }).winner.label,
      naturalDuration(simulatePath(0, 0, 100, [{ cost: 10, gain: 5 }]).total), pathAdvice(0, 3),
    ];
    for (const s of strings) expect(s).not.toMatch(/NaN|Infinity/);
  });
});