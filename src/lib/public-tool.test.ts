import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULTS, ENDURANCE_KEY, restoreState } from "./planner-state";
import { LAW_DEFAULTS, LAW_KEY, restoreLaw } from "./law-state";
import { clearLawTargets } from "./lawsynth";
import { APP_VERSION, clearAppData, exportBackup, importBackup, parseBackup } from "./backup";
import { LANGUAGE_KEY } from "./i18n";
import { contextTargets } from "./planner";

describe("public planner data rules", () => {
  beforeEach(() => localStorage.clear());
  it("starts without personal calculator or upgrade values", () => {
    expect([DEFAULTS.gain.v, DEFAULTS.cur.v, DEFAULTS.target.v, DEFAULTS.next.v, DEFAULTS.prog.mtLevel, DEFAULTS.prog.upCost.v, DEFAULTS.prog.upGain.v]).toEqual(["", "", "", "", "", "", ""]);
    expect(DEFAULTS.prog.milestones).toEqual([]);
    expect(Object.keys(DEFAULTS)).not.toContain("strengthReset");
    expect(Object.keys(DEFAULTS.prog)).not.toContain("strength");
    expect(Object.keys(DEFAULTS.prog)).not.toContain("persev");
  });
  it("keeps saved calculator and upgrade values", () => {
    const saved = { ...DEFAULTS, gain: { v: "800", u: "T" }, prog: { ...DEFAULTS.prog, mtLevel: "63" } };
    expect(restoreState(JSON.stringify(saved)).gain).toEqual({ v: "800", u: "T" });
    expect(restoreState(JSON.stringify(saved)).prog.mtLevel).toBe("63");
  });
  it("clears targets without changing current law levels", () => {
    expect(clearLawTargets({ perception: { cur: 7, tgt: 10 }, life: { cur: 4, tgt: 6 } })['perception']).toEqual({ cur: 7, tgt: 7 });
    expect(clearLawTargets({ life: { cur: 4, tgt: 6 } })['life']).toEqual({ cur: 4, tgt: 4 });
  });
  it("clamps restored targets to current and remembers the Settings tab", () => {
    const result = restoreLaw(JSON.stringify({ levels: { perception: { cur: 8, tgt: 2 } }, tab: "settings" }));
    expect(result.levels['perception']).toEqual({ cur: 8, tgt: 8 });
    expect(result.tab).toBe("settings");
  });
  it("defaults to Plan with no invented core route", () => {
    expect(LAW_DEFAULTS.tab).toBe("plan");
    expect(LAW_DEFAULTS.note).toBe("");
    expect(LAW_DEFAULTS.coreRate).toBe("");
  });
  it.each([
    ["Qa", ["100 Qa", "250 Qa", "500 Qa", "1 Qi"]],
    ["Qi", ["1 Qi", "10 Qi", "100 Qi", "1 Sx"]],
    ["Sx", ["1 Sx", "10 Sx", "100 Sx", "1 Sp"]],
    ["Sp", ["1 Sp", "10 Sp", "100 Sp", "1 Oc"]],
  ])("generates contextual %s targets", (unit, expected) => {
    expect(contextTargets(unit as string).map((v) => `${v.v} ${v.u}`)).toEqual(expected);
  });
  it("round-trips both planners, settings and language in a versioned backup", () => {
    const endurance = { ...DEFAULTS, gain: { v: "99", u: "Qi" }, prog: { ...DEFAULTS.prog, mtLevel: "12" } };
    const law = { ...LAW_DEFAULTS, inv: { ...LAW_DEFAULTS.inv, Morrow: "111" }, levels: { ...LAW_DEFAULTS.levels, life: { cur: 3, tgt: 9 } }, tab: "settings" };
    localStorage.setItem(ENDURANCE_KEY, JSON.stringify(endurance)); localStorage.setItem(LAW_KEY, JSON.stringify(law)); localStorage.setItem(LANGUAGE_KEY, "en");
    const raw = exportBackup(localStorage); expect(parseBackup(raw).version).toBe(APP_VERSION);
    localStorage.clear(); importBackup(raw, localStorage);
    expect(JSON.parse(localStorage.getItem(ENDURANCE_KEY) ?? "{}")).toEqual(endurance);
    expect(JSON.parse(localStorage.getItem(LAW_KEY) ?? "{}")).toEqual(law);
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en");
  });
  it.each(["not json", "{}", '{"__proto__":{}}', '{"version":"9.0.0"}'])("rejects malformed or unsupported backups without writing data: %s", (raw) => {
    localStorage.setItem(LANGUAGE_KEY, "de");
    expect(() => importBackup(raw, localStorage)).toThrow();
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("de");
    expect(localStorage.getItem(LAW_KEY)).toBeNull();
  });
  it("rejects invalid nested levels and units", () => {
    const data = JSON.parse(exportBackup(localStorage)); data.law.levels.life = { cur: 8, tgt: 2 };
    expect(() => importBackup(JSON.stringify(data), localStorage)).toThrow();
    data.law.levels.life = { cur: 0, tgt: 0 }; data.endurance.gain.u = "invalid";
    expect(() => importBackup(JSON.stringify(data), localStorage)).toThrow();
  });
  it("clears only app records, not unrelated local storage", () => {
    localStorage.setItem("other-app", "keep"); localStorage.setItem(LAW_KEY, "{}"); localStorage.setItem(ENDURANCE_KEY, "{}"); localStorage.setItem(LANGUAGE_KEY, "en");
    clearAppData(localStorage);
    expect(localStorage.getItem("other-app")).toBe("keep");
    expect([LAW_KEY, ENDURANCE_KEY, LANGUAGE_KEY].map((k) => localStorage.getItem(k))).toEqual([null, null, null]);
  });
});