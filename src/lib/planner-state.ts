import { DURATION_UNITS, SUFFIXES } from "./endurance";
import type { NU } from "@/components/planner-fields";
import { PROG_DEFAULTS, restoreProg, type Prog } from "./progression-state";

export type Target = NU & { id: number };
export type State = {
  gain: NU; cur: NU; target: NU; next: NU;
  dur: NU; proj: NU; targets: Target[];
  mode: "calculator" | "muscle" | "tools";
  scenarioA: NU | null; scenarioB: NU | null; scenarioC: NU;
  custom: NU; savedCustom: NU | null; prog: Prog; tool: "endurance" | "law";
};
export const DEFAULTS: State = {
  gain: { v: "", u: "T" }, cur: { v: "", u: "Qa" }, target: { v: "", u: "Qa" },
  next: { v: "", u: "T" }, dur: { v: "2", u: "h" }, proj: { v: "1", u: "d" }, targets: [],
  mode: "calculator", scenarioA: null, scenarioB: null, scenarioC: { v: "", u: "T" },
  custom: { v: "", u: "Qa" }, savedCustom: null, prog: PROG_DEFAULTS, tool: "endurance",
};
export const ENDURANCE_KEY = "ii-endurance-calc-v1";

function isNU(v: unknown, duration = false): v is NU {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return typeof x['v'] === "string" && typeof x['u'] === "string" &&
    (duration ? DURATION_UNITS.some((d) => d.id === x['u']) : SUFFIXES.some((u) => u === x['u']));
}
export function restoreState(raw: string): State {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object") return DEFAULTS;
  const x = data as Record<string, unknown>;
  const restored = { ...DEFAULTS };
  for (const key of ["gain", "cur", "target", "next", "custom", "scenarioC"] as const) {
    const value = x[key];
    if (isNU(value)) restored[key] = value;
  }
  for (const key of ["dur", "proj"] as const) {
    const value = x[key];
    if (isNU(value, true)) restored[key] = value;
  }
  for (const key of ["scenarioA", "scenarioB", "savedCustom"] as const) {
    const value = x[key];
    if (isNU(value)) restored[key] = value;
  }
  if (x['mode'] === "calculator" || x['mode'] === "muscle" || x['mode'] === "tools") restored.mode = x['mode'];
  else if (x['mode'] === "progression") restored.mode = "muscle";
  else if (x['mode'] === "advanced") restored.mode = "tools";
  restored.prog = restoreProg(x['prog']);
  if (x['tool'] === "law") restored.tool = "law";
  if (Array.isArray(x['targets'])) restored.targets = x['targets'].filter((v): v is Target =>
    isNU(v) && "id" in v && typeof v.id === "number").slice(0, 10);
  return restored;
}