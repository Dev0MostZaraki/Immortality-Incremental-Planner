import { describe, expect, it } from "vitest";
import {
  ashesRequiredForSoulThreads,
  ashesPerSecondFromCooldown,
  bestKarmicRoute,
  bestKarmicResetRoute,
  calculateMarkOutcome,
  calculateMarkFarmRecommendation,
  calculateSoulThreadYield,
  compareSamsaraPurchase,
  exactMarkProbability,
  MARK_FARM_PACES,
  KARMIC_COST_ANCHORS,
  karmicUpgradeCost,
  karmicUpgradeEffect,
  karmicUpgradeTotalCost,
  KARMIC_PATHS,
  SAMSARA_MILESTONES,
  SOUL_THREAD_COST_ANCHORS,
  soulThreadBonusMultiplier,
  soulThreadMilestoneMultiplier,
  soulThreadUpgradeEffect,
  soulThreadUpgradeCost,
  THREAD_MARKS,
  THREADS_PATH,
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
  it("includes all observed milestone costs", () => {
    const milestone = (id: number) => SAMSARA_MILESTONES.find((entry) => entry.id === id)!;
    expect(SAMSARA_MILESTONES.map((entry) => entry.id)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(milestone(9).cost).toBe(220e15);
    expect(milestone(10).cost).toBe(2.4e21);
    expect(milestone(11).cost).toBe(4.7e21);
    expect(milestone(12).cost).toBe(66e24);
    expect(milestone(12).bonuses).toEqual(["×50 Ashes", "×2 Path Luck", "^1.0018 Qi"]);
    expect(milestone(13).cost).toBe(2.2e27);
    expect(milestone(14).cost).toBe(5.3e27);
    expect(milestone(14).bonuses).toEqual([
      "×100 Ashes",
      "×3 Path Bulk",
      "×3 Path Speed",
      "^1.0005 Qi",
    ]);
    expect(milestone(15).cost).toBe(4.1e30);
    expect(milestone(16).cost).toBe(39e30);
    expect(SAMSARA_MILESTONES.slice(0, -1).every((entry) => entry.cost !== null)).toBe(true);
    expect(milestone(17).cost).toBeNull();
    expect(milestone(17).bonuses).toEqual(["×100 Threads", "^1.0005 Qi"]);
  });
  it("keeps only standard base values and bonuses for Karmic Path and Thread Mark", () => {
    expect(KARMIC_PATHS.map((path) => path.baseMps)).toEqual([
      "1 / 1",
      "1 / 1M",
      "1 / 3.2M",
      "1 / 490M",
      "1 / 3.8Qn",
      "1 / 810Qn",
      "1 / 6.7No",
      "1 / 38No",
    ]);
    expect(KARMIC_PATHS.find((path) => path.name === "Cinder")?.other).toContain("×100Qa Qi");
    expect(KARMIC_PATHS.find((path) => path.name === "Wraithflame")).toMatchObject({
      ashes: 4,
      baseMps: "1 / 3.8Qn",
    });
    expect(KARMIC_PATHS.find((path) => path.name === "Soulbrand")).toMatchObject({
      ashes: 5,
      baseMps: "1 / 810Qn",
    });
    expect(THREADS_PATH.rollCost).toBe(170e12);
    expect(THREAD_MARKS).toHaveLength(8);
    expect(THREAD_MARKS.find((mark) => mark.name === "Weft")).toMatchObject({
      baseMps: "1 / 470M",
    });
    expect(THREAD_MARKS.find((mark) => mark.name === "Weaver's End")?.bonuses).toEqual([
      "×5 Soul Threads",
      "^1.0015 Qi",
    ]);
  });
  it("reproduces the observed Soul Threads effects and costs", () => {
    expect(soulThreadUpgradeEffect("moreThreads", 18)).toBeCloseTo(112.46, 2);
    expect(soulThreadUpgradeEffect("moreThreads", 19)).toBeCloseTo(146.19, 2);
    expect(soulThreadUpgradeEffect("ashesBoost", 18)).toBeCloseTo(1477.89, 1);
    expect(soulThreadUpgradeEffect("luckBoost", 21)).toBeCloseTo(4987.89, 1);
    expect(soulThreadUpgradeEffect("pathLuck", 17)).toBeCloseTo(44.41, 2);
    expect(soulThreadUpgradeEffect("pathLuck", 18)).toBeCloseTo(55.51, 2);
    for (const anchor of SOUL_THREAD_COST_ANCHORS) {
      const modeled = soulThreadUpgradeCost(anchor.upgrade, anchor.level)!;
      expect(Math.abs(modeled - anchor.displayed) / anchor.displayed).toBeLessThan(0.005);
    }
  });
  it("reproduces the video-observed Soul Threads reset sequence", () => {
    expect(soulThreadMilestoneMultiplier(13)).toBe(90);
    expect(soulThreadMilestoneMultiplier(14)).toBe(900);
    expect(soulThreadBonusMultiplier(["soulbrand"])).toBe(2);

    const oneHit = calculateSoulThreadYield({
      runGeneratedAshes: 56.11e12,
      moreThreadsLevel: 20,
      nextMilestoneId: 14,
      bonusIds: ["soulbrand"],
    })!;
    expect(oneHit.eligible).toBe(true);
    expect(oneHit.totalMultiplier).toBeCloseTo(190.05 * 1800, -1);
    expect(oneHit.pendingThreads).toBeCloseTo(3.62e9, -7);

    const fourHits = calculateSoulThreadYield({
      runGeneratedAshes: 224.45e12,
      moreThreadsLevel: 20,
      nextMilestoneId: 14,
      bonusIds: ["soulbrand"],
    })!;
    expect(fourHits.pendingThreads).toBeCloseTo(7.25e9, -7);
    expect(
      ashesRequiredForSoulThreads({
        targetThreads: 8.1e9,
        moreThreadsLevel: 20,
        nextMilestoneId: 14,
        bonusIds: ["soulbrand"],
      }),
    ).toBeCloseTo(280.32e12, -10);
  });
  it("keeps the reset locked below 500K generated Ashes", () => {
    const result = calculateSoulThreadYield({
      runGeneratedAshes: 499_999,
      moreThreadsLevel: 0,
      nextMilestoneId: 2,
    })!;
    expect(result.eligible).toBe(false);
    expect(result.pendingThreads).toBe(0);
  });
  it("reproduces the tiered Karmic and Threads Path chances", () => {
    const karmicRarities = KARMIC_PATHS.map((mark) => mark.baseRarity),
      threadRarities = THREAD_MARKS.map((mark) => mark.baseRarity);
    expect(1 / exactMarkProbability(karmicRarities, 2, 253.92e6)!).toBeCloseTo(2.08, 2);
    expect(exactMarkProbability(karmicRarities, 2, 507.84e6)).toBe(0);
    expect(1 / exactMarkProbability(karmicRarities, 3, 253.92e6)!).toBeCloseTo(1.93, 2);
    expect(1 / exactMarkProbability(karmicRarities, 6, 253.92e6)!).toBeCloseTo(32.03e21, -19);
    expect(1 / exactMarkProbability(karmicRarities, 7, 253.92e6)!).toBeCloseTo(149.65e21, -19);
    expect(1 / exactMarkProbability(threadRarities, 0, 253.92e6)!).toBeCloseTo(2.18, 2);
    expect(1 / exactMarkProbability(threadRarities, 1, 253.92e6)!).toBeCloseTo(2.56, 2);
    expect(1 / exactMarkProbability(threadRarities, 2, 253.92e6)!).toBeCloseTo(9.77, 2);
  });

  it("recommends MPS and Luck targets for a selected farming pace", () => {
    const rarities = KARMIC_PATHS.map((mark) => mark.baseRarity),
      recommendation = calculateMarkFarmRecommendation({
        rarities,
        markIndex: 6,
        luck: 2.04e9,
        marksPerSecond: 3.27e18,
        averageHitSeconds: MARK_FARM_PACES[1].averageHitSeconds,
      });
    expect(recommendation).not.toBeNull();
    expect(recommendation?.currentAverageSeconds).toBeCloseTo(1219.37, 1);
    expect(recommendation?.recommendedMps).toBeCloseTo(44.3e18, -16);
    expect(recommendation?.recommendedLuck).toBeCloseTo(27.64e9, -7);
    expect(recommendation?.currentMeetsGoal).toBe(false);
  });

  it("keeps Luck recommendations below the selected tier sweet spot", () => {
    const rarities = KARMIC_PATHS.map((mark) => mark.baseRarity),
      recommendation = calculateMarkFarmRecommendation({
        rarities,
        markIndex: 0,
        luck: 1e6,
        marksPerSecond: 1,
        averageHitSeconds: 1,
      });
    expect(recommendation?.recommendedMps).toBeNull();
    expect(recommendation?.recommendedLuck).toBeNull();
    expect(recommendation?.luckSweetSpot).toBe(1);
  });
  it("applies Copy to awarded marks without changing the hit chance", () => {
    const outcome = calculateMarkOutcome({
      rarities: KARMIC_PATHS.map((mark) => mark.baseRarity),
      markIndex: 4,
      luck: 507.84e6,
      marksPerSecond: 88.04e15,
      copy: 5,
    })!;
    expect(outcome.denominator).toBeCloseTo(7.52e9, -7);
    expect(outcome.copiesPerSecond).toBeCloseTo(outcome.hitsPerSecond * 5);
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
  it("plans upgrades against cumulative run Ashes without losing spent progress", () => {
    const result = bestKarmicResetRoute({
      currentAshes: 0,
      runGeneratedAshes: 0,
      ashesPerSecond: 1,
      targetRunAshes: 1000,
      levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
      maxPurchases: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeLessThan(1000);
    expect(result!.purchases[0]).toMatchObject({
      id: "ashesBoost",
      level: 1,
      cost: 10,
      farmAshes: 10,
      runAshesAfter: 10,
    });
  });
  it("recommends an immediate reset when the run target is already reached", () => {
    expect(
      bestKarmicResetRoute({
        currentAshes: 2,
        runGeneratedAshes: 1000,
        ashesPerSecond: 1,
        targetRunAshes: 1000,
        levels: { ashesBoost: 0, moreAshes: 0, punchSpeed: 0 },
      }),
    ).toMatchObject({ total: 0, purchases: [] });
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
