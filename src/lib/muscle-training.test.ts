import { describe, expect, it } from "vitest";
import { fmtSuffix, toValue } from "./endurance";
import { calibrate, derivedBaseCost, deriveCostMultiplier, effectiveCurrentCost, effectiveUpGain, evaluateMtDecision, evaluateMtPlan, expectedNextCost, gainAfter, modelSteps, decideProgression, OBSERVED_MT, projectedCosts, toNU } from "./muscle-training";
import { PROG_DEFAULTS, restoreProg } from "./progression-state";
import { translate } from "./i18n";

const unit = (n: number, u: string) => { const p = toValue(String(n), u); if (p.ok !== true) throw new Error(); return p.value; };
const sx = (n: number) => unit(n, "Sx");
const back = (x: { v: string; u: string }) => { const p = toValue(x.v, x.u); if (p.ok !== true) throw new Error(); return p.value; };

describe("Muscle Training v2 static model", () => {
  it("sets the static first purchase cost to 1000", () => { expect(OBSERVED_MT.baseCost).toBe(1000); });
  it("sets the static cost multiplier to 2.1", () => { expect(OBSERVED_MT.costMultiplier).toBe(2.1); });
  it("sets the static gain multiplier to 1.4", () => { expect(OBSERVED_MT.gainMultiplier).toBe(1.4); });
  it("sets the static maximum level to 150", () => { expect(OBSERVED_MT.maxLevel).toBe(150); });
  it("uses canonical observed costs at levels 0, 1, 2 and 59", () => {
    expect(expectedNextCost(1000, 2.1, 0)).toBe(1000);
    expect(expectedNextCost(1000, 2.1, 1)).toBe(2100);
    expect(expectedNextCost(1000, 2.1, 2)).toBeCloseTo(4410, 12);
    expect(expectedNextCost(1000, 2.1, 59)).toBeCloseTo(1000 * 2.1 ** 59, 0);
    expect(fmtSuffix(expectedNextCost(1000, 2.1, 59) ?? 0, 2, "en")).toBe("10.26 Sx");
  });
  it("accepts both observed screenshot fixtures within displayed precision", () => {
    const lv59 = expectedNextCost(1000, 2.1, 59), lv60 = expectedNextCost(1000, 2.1, 60);
    expect(calibrate(sx(10.26), lv59)?.status).toBe("match");
    expect(calibrate(sx(21.54), lv60)?.status).toBe("match");
    expect(calibrate(sx(21.54), lv60)?.differencePct).toBeLessThan(0.5);
  });
  it("anchors row +1 to displayed 10.26 Sx and keeps full precision forward", () => {
    const costs = projectedCosts(sx(10.26), 2.1, 4);
    [10.26, 21.546, 45.2466, 95.01786].forEach((v, i) => expect((costs[i] ?? 0) / sx(1)).toBeCloseTo(v, 6));
    expect(costs[0]).toBe(sx(10.26));
  });
  it("derives a ~1000 base and returns the current level cost", () => {
    const base = derivedBaseCost(sx(10.26), 2.1, 59);
    expect(base).not.toBeNull();
    expect((base ?? 0) / 1000).toBeCloseTo(1, 3);
    expect((base ?? 0) * 2.1 ** 59 / sx(10.26)).toBeCloseTo(1, 12);
  });
  it("applies ×1.4 gain and crosses suffixes", () => {
    expect(gainAfter(sx(2), 1.4, 1) / sx(1)).toBeCloseTo(2.8, 9);
    expect(gainAfter(sx(2), 1.4, 2) / sx(1)).toBeCloseTo(3.92, 9);
    expect(gainAfter(sx(2), 1.4, 3) / sx(1)).toBeCloseTo(5.488, 9);
    expect(toNU(gainAfter(sx(800), 1.4, 1))).toEqual({ v: "1.12", u: "Sp" });
    const huge = gainAfter(sx(800), 1.4, 150); expect(back(toNU(huge)) / huge).toBeCloseTo(1, 9);
  });
  it("derives a multiplier from two observations", () => {
    expect(deriveCostMultiplier(100, 140)).toBeCloseTo(1.4, 12);
  });
  it("uses the model without displayed cost and lets displayed cost override it", () => {
    const modeled = { ...PROG_DEFAULTS, mtLevel: "2" };
    expect(effectiveCurrentCost(modeled)).toBeCloseTo(4410, 12);
    expect(effectiveCurrentCost({ ...modeled, mtDisplayedCost: { v: "5000", u: "" } })).toBe(5000);
  });
  it("ignores saved custom and manual overrides in the public model", () => {
    const custom = { ...PROG_DEFAULTS, mtMode: "custom" as const, mtLevel: "2", mtBaseCost: { v: "10", u: "" }, mtCostMultiplier: "3", mtGainMultiplier: "2", mtAutoGain: false, mtManualGain: { v: "25", u: "" } };
    expect(effectiveCurrentCost(custom)).toBeCloseTo(4410, 12);
    expect(effectiveUpGain(custom, 10)).toBe(14);
  });
  it("never projects above max level 150", () => {
    expect(modelSteps({ ...PROG_DEFAULTS, mtLevel: "149", mtPreviewCount: 10 }, 10)).toHaveLength(1);
    expect(evaluateMtPlan({ ...PROG_DEFAULTS, mtLevel: "150" }, 0, 10, 1000)?.rows.map((r) => r.purchases)).toEqual([0]);
    expect(effectiveCurrentCost({ ...PROG_DEFAULTS, mtLevel: "150" })).toBeNull();
  });
  it("aligns the next-step scenario with the entire selected Muscle Training prefix", () => {
    const p = { ...PROG_DEFAULTS, mtLevel: "0", mtDisplayedCost: { v: "100", u: "" } };
    const plan = evaluateMtPlan(p, 50, 10, 10000);
    const decision = decideProgression(p, 50, 10, 10000, null);
    expect(plan?.prefix.best).toBeGreaterThan(1);
    expect(decision.scenarios.find((s) => s.id === "C")?.secs).toBe(plan?.best?.total);
  });
  it("sequential recommendation deducts costs and can select a profitable prefix", () => {
    const p = { ...PROG_DEFAULTS, mtLevel: "0", mtDisplayedCost: { v: "100", u: "" }, mtCostMultiplier: "2", mtGainMultiplier: "2", mtPreviewCount: 3 };
    const result = evaluateMtPlan(p, 50, 10, 10000);
    expect(result?.rows[1]?.purchase?.balance).toBe(0);
    expect(result?.prefix.best).toBeGreaterThan(0);
  });
  it("can correctly prefer buying none", () => {
    const p = { ...PROG_DEFAULTS, mtLevel: "0", mtDisplayedCost: { v: "900", u: "" }, mtGainMultiplier: "1.01", mtPreviewCount: 3 };
    expect(evaluateMtPlan(p, 0, 10, 1000)?.prefix.best).toBe(0);
  });
  it("returns player actions for buy now, farm to buy, skip and Increase first", () => {
    const cheap = { ...PROG_DEFAULTS, mtLevel: "0", mtDisplayedCost: { v: "100", u: "" }, mtPreviewCount: 3 };
    expect(evaluateMtDecision(cheap, 100, 10, 10000, null)?.action).toBe("buy-now");
    expect(evaluateMtDecision(cheap, 0, 10, 10000, null)?.action).toBe("farm-to-buy");
    const costly = { ...cheap, mtDisplayedCost: { v: "900", u: "" } };
    expect(evaluateMtDecision(costly, 0, 10, 1000, null)?.action).toBe("farm-target");
    expect(evaluateMtDecision(costly, 0, 10, 10000, 100)?.action).toBe("increase-first");
  });
  it("migrates v1.3 anchors, drops model overrides and has no screenshot defaults", () => {
    const restored = restoreProg({ mtLevel: "12", upCost: { v: "44", u: "Qi" }, upGain: { v: "5", u: "T" }, mtPreviewCount: 3 });
    expect(restored.mtDisplayedCost).toEqual({ v: "44", u: "Qi" });
    expect(Object.keys(restored)).not.toContain("mtGainMultiplier");
    expect([PROG_DEFAULTS.mtLevel, PROG_DEFAULTS.mtDisplayedCost.v]).toEqual(["", ""]);
    expect([PROG_DEFAULTS.upCost.v, PROG_DEFAULTS.upGain.v]).toEqual(["", ""]);
    expect(JSON.stringify(PROG_DEFAULTS)).not.toMatch(/10\.26|21\.54|94\.97|234\.49/);
  });
  it("translates the guided model", () => {
    expect(translate("en", "Bester Plan")).toBe("Best Plan");
    expect(translate("en", "Warum dieser Plan")).toBe("Why this plan");
    expect(translate("en", "Angezeigten Spielpreis verwenden")).toBe("Use displayed game cost");
  });
});