import { describe, expect, it } from "vitest";
import { readableFinish, alternateDuration } from "./presentation";

describe("readable presentation without arithmetic changes", () => {
  const now = Date.UTC(2026, 9, 8, 14, 2);
  const finish = Date.UTC(2026, 9, 9, 17, 19, 47);
  it("formats German finish without seconds", () => {
    expect(readableFinish((finish - now) / 1000, now, "de", "UTC")).toBe("Fr., 9. Okt. · 17:19 Uhr");
  });
  it("formats English finish without seconds", () => {
    expect(readableFinish((finish - now) / 1000, now, "en", "UTC")).toBe("Fri, Oct 9 · 5:19 PM");
  });
  it("includes year for distant targets", () => {
    expect(readableFinish(400 * 86400, now, "en", "UTC")).toContain("2027");
  });
  it("retains exact seconds with alternate total hours", () => {
    expect(alternateDuration(97087, "en")).toBe("26h 58m · 97,087 s");
    expect(alternateDuration(97087, "de")).toBe("26h 58m · 97.087 s");
  });
  it("handles zero and unreachable duration safely", () => {
    expect(alternateDuration(0)).toBe("");
    expect(readableFinish(Infinity, now, "en")).toBe("– (too far in the future)");
  });
});