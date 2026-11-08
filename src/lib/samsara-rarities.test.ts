import { describe, expect, it } from "vitest";
import {
  FORGE_4_DEEPSTONE_COST,
  PART_2_MILESTONE_ASHES_COST,
  DEEPSTONE_PATHS,
  DEEPSTONE_UPGRADE_SNAPSHOTS,
  RARITY_FORGES,
  compareForge4Routes,
} from "./samsara-rarities";

describe("World 10 Part 2 forge routes", () => {
  it("adds mutually exclusive Ashes and Deepstone farming time", () => {
    const result = compareForge4Routes({
      currentDeepstones: 0,
      deepstonesPerSecond: 1e9,
      currentAshes: PART_2_MILESTONE_ASHES_COST,
      ashesPerSecond: null,
      milestonePurchased: false,
    });
    expect(result.directSeconds).toBe(60);
    expect(result.milestoneFarmSeconds).toBe(0);
    expect(result.milestoneRouteSeconds).toBe(20);
    expect(result.recommendation).toBe("milestone");
  });

  it("records the confirmed Forge 5 data without inventing later forges", () => {
    expect(RARITY_FORGES[4]).toMatchObject({
      id: 5,
      cost: "75 Td Karmic Ashes",
      status: "confirmed",
    });
    expect(RARITY_FORGES[4].bonuses).toContain("×3 Rarity Luck");
    expect(RARITY_FORGES[5]).toMatchObject({ id: 6, cost: "Unknown", status: "unknown" });
  });

  it("keeps the Path reference focused on base chance, required copies, and full bonuses", () => {
    expect(DEEPSTONE_PATHS.find((path) => path.name === "Bedrock")).toMatchObject({
      baseDisplay: "1 / 100 Qa",
      copiesToFull: "500 K",
    });
    expect(DEEPSTONE_PATHS.find((path) => path.name === "Vein")?.copiesToFull).toBe("50 K");
    expect(DEEPSTONE_PATHS.find((path) => path.name === "Magmacore")).toMatchObject({
      baseDisplay: "1 / 190 Sx",
      copiesToFull: "5 K",
      bonuses: ["×10 T Qi", "×2 Dao Path Bulk", "×10 Karmic Ashes"],
    });
    expect(DEEPSTONE_PATHS.find((path) => path.name === "Abyssal Ore")).toMatchObject({
      baseDisplay: "1 / 5.5 Sp",
      copiesToFull: "1 K",
      bonuses: ["×1 Oc Qi", "×5 Deepstones", "×3 Rarity Luck"],
    });
    expect(DEEPSTONE_PATHS.find((path) => path.name === "Shard")?.copiesToFull).toBe("Unknown");
  });

  it("includes the new high-level Deepstone upgrade measurements", () => {
    expect(DEEPSTONE_UPGRADE_SNAPSHOTS[0].rows).toContainEqual([
      18,
      "×1.48 K",
      "×2.22 K",
      "2.19 T",
    ]);
    expect(DEEPSTONE_UPGRADE_SNAPSHOTS[2].rows).toContainEqual([13, "×3.45", "×3.8", "1 T"]);
    expect(DEEPSTONE_UPGRADE_SNAPSHOTS[0].rows).toContainEqual([
      24,
      "×16.83 K",
      "×25.25 K",
      "878.58 Qa",
    ]);
    expect(DEEPSTONE_UPGRADE_SNAPSHOTS[1].rows).toContainEqual([
      22,
      "×321.18",
      "×417.54",
      "4.81 Qi",
    ]);
    expect(DEEPSTONE_UPGRADE_SNAPSHOTS[2].rows).toContainEqual([19, "×6.12", "×6.73", "13.01 Qi"]);
  });

  it("does not multiply an already boosted measured rate again", () => {
    const result = compareForge4Routes({
      currentDeepstones: 30e9,
      deepstonesPerSecond: 3e9,
      currentAshes: 0,
      ashesPerSecond: null,
      milestonePurchased: true,
    });
    expect(result.directSeconds).toBe(10);
    expect(result.postMilestoneDeepstonesPerSecond).toBe(3e9);
    expect(result.milestoneRouteSeconds).toBeNull();
    expect(result.recommendation).toBe("direct");
  });

  it("recognizes when Forge 4 is already affordable", () => {
    const result = compareForge4Routes({
      currentDeepstones: FORGE_4_DEEPSTONE_COST,
      deepstonesPerSecond: null,
      currentAshes: 0,
      ashesPerSecond: null,
      milestonePurchased: false,
    });
    expect(result.recommendation).toBe("ready");
    expect(result.deepstonesNeeded).toBe(0);
  });
});
