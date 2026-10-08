import { describe, expect, it } from "vitest";
import { SUFFIXES, toValue } from "./endurance";
import { calculatePlan, compareGain, neighboringConversion, contextTargets } from "./planner";

function value(v: string, u: string) {
  const p = toValue(v, u);
  if (p.ok !== true) throw new Error("Invalid fixture");
  return p.value;
}
describe("Endurance unit and ETA assertions", () => {
  it.each([["Qa", "T"], ["Qi", "Qa"], ["Sx", "Qi"]])("1 %s = 1000 %s", (a, b) => {
    expect(value("1", a) / value("1", b)).toBeCloseTo(1000, 9);
  });
  it("500 Qa from 475 Qa at 454 T/s is 55.066 seconds", () => {
    expect(calculatePlan(value("475", "Qa"), value("500", "Qa"), value("454", "T")).secs).toBeCloseTo(55.066079295, 7);
  });
  it("100 Sx from 475 Qa is 220263271 seconds, about 2549 days", () => {
    const sec = calculatePlan(value("475", "Qa"), value("100", "Sx"), value("454", "T")).secs;
    expect(sec).toBeCloseTo(220263270.92511, 4);
    expect(sec / 86400).toBeCloseTo(2549.3434, 3);
  });
  it("every suffix increases by 1000", () => {
    SUFFIXES.slice(1).forEach((suffix, i) => expect(value("1", suffix) / value("1", SUFFIXES[i] ?? "")).toBeCloseTo(1000, 9));
  });
  it("accepts comma, dot and scientific notation", () => {
    expect(value("1,5e3", "Qa")).toBe(value("1.5", "Qi"));
  });
  it("lower or equal next gain is never recommended, including zero", () => {
    for (const next of [371.73, 454, 0]) expect(compareGain(475000, 500000, 454, next).recommendation).toBe("Nicht drücken");
  });
  it("uses a strict two-percent time-saving threshold", () => {
    expect(compareGain(0, 100, 100, 101).recommendation).toBe("Kaum Unterschied");
    expect(compareGain(0, 100, 100, 103).recommendation).toBe("Increase jetzt sinnvoll");
  });
  it("handles unreachable, reached and no-gain cases without NaN savings", () => {
    expect(compareGain(0, 100, 0, 0).saved).toBe(0);
    expect(compareGain(100, 100, 0, 100).saved).toBe(0);
    expect(compareGain(0, 100, 0, 100).pct).toBe(100);
  });
  it("shows nearby conversions and context targets", () => {
    expect(neighboringConversion({ v: "100", u: "Sx" })).toBe("100 Sx = 100.000 Qi = 100.000.000 Qa");
    expect(contextTargets("Qa")).toEqual([{ v: "100", u: "Qa" }, { v: "250", u: "Qa" }, { v: "500", u: "Qa" }, { v: "1", u: "Qi" }]);
  });
});