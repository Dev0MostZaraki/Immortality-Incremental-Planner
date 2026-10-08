import { describe, expect, it } from "vitest";
import { LANGUAGE_KEY, restoreLanguage, translate } from "./i18n";
import { fmtPlain, fmtFinish, fmtDuration } from "./endurance";
import { compareGain, naturalDuration, pathAdvice, upgradeROI } from "./planner";

describe("language and presentation", () => {
  it("defaults to German and validates stored preferences", () => {
    expect(restoreLanguage(null)).toBe("de");
    expect(restoreLanguage("fr")).toBe("de");
    expect(restoreLanguage("en")).toBe("en");
    expect(LANGUAGE_KEY).toBe("ii-planner-language-v1");
  });
  it("switches translations back without changing calculations", () => {
    const result = compareGain(475e15, 500e15, 454e12, 371.73e12);
    expect(translate("en", result.recommendation)).toBe("Do not Increase");
    expect(translate("de", result.recommendation)).toBe("Nicht drücken");
    expect(result.a).toBeCloseTo(55.066079295, 6);
  });
  it("localizes upgrade, reset and parameterized path decisions", () => {
    expect(translate("en", upgradeROI(0, 1, 100, 10, 10).recommendation)).toBe("Buy as soon as affordable");
    expect(translate("en", "Reset lohnt sich")).toBe("Reset is worth it");
    expect(translate("en", pathAdvice(1, 2))).toBe("The path through upgrade 1 is worthwhile for your current target; upgrade 2 increases the time to target.");
    expect(translate("en", "Upgrade-Kosten und Gain nach Upgrade fehlt – Upgrade kann nicht bewertet werden.")).toBe("Missing upgrade cost and post-upgrade Gain — upgrade cannot be evaluated.");
  });
  it("formats numbers, durations and finish timestamps by locale", () => {
    expect(fmtPlain(1234.5, 1, "de")).toBe("1.234,5");
    expect(fmtPlain(1234.5, 1, "en")).toBe("1,234.5");
    expect(fmtDuration(8040, "de")).toBe("2 Std 14 Min");
    expect(fmtDuration(8040, "en")).toBe("2 hr 14 min");
    expect(naturalDuration(55.07, "en")).toBe("55.07 seconds");
    const now = Date.UTC(2026, 9, 8, 12);
    expect(fmtFinish(0, now, "de")).toContain("08.10.2026");
    expect(fmtFinish(0, now, "en")).toContain("10/08/2026");
  });
  it("keeps material names and translates summary parameters", () => {
    expect(translate("en", "Restzeit: {p0} ({p1} Sekunden)", { p0: "55.07 seconds", p1: "55.066" })).toBe("Time remaining: 55.07 seconds (55.066 seconds)");
    expect(translate("en", "Meine Materialien")).toBe("My Materials");
    expect(translate("en", "Morrow @ Miasma Mark")).toBe("Morrow @ Miasma Mark");
  });
});