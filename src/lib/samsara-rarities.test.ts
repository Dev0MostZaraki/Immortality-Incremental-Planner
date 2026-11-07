import { describe, expect, it } from "vitest";
import {
  FORGE_4_DEEPSTONE_COST,
  PART_2_MILESTONE_ASHES_COST,
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
