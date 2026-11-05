import { describe, expect, it } from "vitest";
import {
  ashesPerSecondFromCooldown,
  bestKarmicRoute,
  compareSamsaraPurchase,
  KARMIC_COST_ANCHORS,
  karmicUpgradeCost,
  karmicUpgradeEffect,
  karmicUpgradeTotalCost,
  SAMSARA_MILESTONES,
} from "./samsara";
describe("Samsara World 10 cost models", () => {
  it("derives production from the displayed Ashes and cooldown", () => {
    expect(ashesPerSecondFromCooldown(24.16e12, 0.09)).toBeCloseTo(268_444_444_444_444.44, -1);
    expect(ashesPerSecondFromCooldown(100, 0)).toBeNull();
    expect(ashesPerSecondFromCooldown(-1, 1)).toBeNull();
  });
  it("reproduces every displayed cost anchor within UI rounding", () => {
    for (const anchor of KARMIC_COST_ANCHORS) {
      const modeled = karmicUpgradeCost(anchor.upgrade, anchor.level)!;
      expect(Math.abs(modeled - anchor.displayed) / anchor.displayed).toBeLessThan(0.002);
    }
  });
  it("sums sequential prices without crossing level caps", () => {
    expect(karmicUpgradeTotalCost("ashesBoost", 0, 3)).toBeCloseTo(51.856, 3);
    expect(karmicUpgradeTotalCost("moreAshes", 29, 2)).toBeNull();
  });
  it("calculates verified per-level effects", () => {
    expect(karmicUpgradeEffect("ashesBoost", 45)).toBeCloseTo(3657.26, 1);
    expect(karmicUpgradeEffect("moreAshes", 16)).toBeCloseTo(656.8408, 3);
    expect(karmicUpgradeEffect("punchSpeed", 25)).toBeCloseTo(10.8347, 3);
  });
  it("includes the observed milestone 8 and 9 costs and keeps later costs unknown", () => {
    expect(SAMSARA_MILESTONES[7].cost).toBe(220e15);
    expect(SAMSARA_MILESTONES[8].cost).toBe(2.4e21);
    expect(SAMSARA_MILESTONES.slice(0, 9).every((m) => m.cost !== null)).toBe(true);
    expect(SAMSARA_MILESTONES.slice(9).every((m) => m.cost === null)).toBe(true);
  });
});
describe("Samsara purchase comparison and routes", () => {
  it("includes waiting, spending, post-purchase gain and payback", () => {
    expect(
      compareSamsaraPurchase({
        currentAshes: 0,
        ashesPerSecond: 10,
        targetAshes: 1000,
        displayedCost: 100,
        postPurchaseGain: 20,
      }),
    ).toEqual({
      affordIn: 10,
      withoutPurchase: 100,
      withPurchase: 60,
      saved: 40,
      balanceAfterPurchase: 0,
      payback: 10,
      recommendation: "buy",
    });
  });
  it("finds a faster multi-purchase prefix", () => {
    const result = bestKarmicRoute({
      currentAshes: 0,
      ashesPerSecond: 1,
      targetAshes: 1000,
      levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
      maxPurchases: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeLessThan(1000);
    expect(result!.purchases.length).toBeGreaterThan(0);
  });
  it("rejects invalid gains", () => {
    expect(
      compareSamsaraPurchase({
        currentAshes: 0,
        ashesPerSecond: 0,
        targetAshes: 1,
        displayedCost: 1,
        postPurchaseGain: 1,
      }),
    ).toBeNull();
  });
});
