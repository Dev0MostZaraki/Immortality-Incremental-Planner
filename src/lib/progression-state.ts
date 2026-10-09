import { SUFFIXES } from "./endurance";
import type { NU } from "@/components/planner-fields";

export type PathItem = { id: number; name: string; level: string; cost: NU; gain: NU };
export type Milestone = { id: number; name: string; v: string; u: string };
export type Prog = {
  upName: string; mtLevel: string; upCost: NU; upGain: NU; nextCost: NU; nextGain: NU; comboGain: NU;
  path: PathItem[]; milestones: Milestone[]; resetBefore: NU; resetAfter: NU; resetLoss: NU;
  wiMult: string; wiFlat: NU; wiTarget: string;
  mtDisplayedCost: NU; mtPreviewCount: number;
};
export const PROG_DEFAULTS: Prog = {
  upName: "Upgrade", mtLevel: "",
  upCost: { v: "", u: "Qa" }, upGain: { v: "", u: "T" }, nextCost: { v: "", u: "Qa" }, nextGain: { v: "", u: "T" }, comboGain: { v: "", u: "T" },
  path: [], milestones: [], resetBefore: { v: "", u: "T" }, resetAfter: { v: "", u: "T" }, resetLoss: { v: "0", u: "" },
  wiMult: "1", wiFlat: { v: "0", u: "T" }, wiTarget: "1",
  mtDisplayedCost: { v: "", u: "Qa" }, mtPreviewCount: 5,
};
const NU_KEYS = ["upCost", "upGain", "nextCost", "nextGain", "comboGain", "resetBefore", "resetAfter", "resetLoss", "wiFlat", "mtDisplayedCost"] as const;
const isNU = (v: unknown): v is NU => !!v && typeof v === "object" && typeof (v as NU).v === "string" && SUFFIXES.some((u) => u === (v as NU).u);
const isStr = (v: unknown): v is string => typeof v === "string";

export function restoreProg(raw: unknown): Prog {
  const p = { ...PROG_DEFAULTS };
  if (!raw || typeof raw !== "object") return p;
  const x = raw as Record<string, unknown>;
  for (const k of NU_KEYS) { const v = x[k]; if (isNU(v)) p[k] = v; }
  for (const k of ["upName", "mtLevel", "wiMult", "wiTarget"] as const) { const v = x[k]; if (isStr(v)) p[k] = v; }
  // v1.3 used generic upCost/upGain as Muscle Training values. Preserve them as MT anchors on import.
  if (!isNU(x['mtDisplayedCost']) && isNU(x['upCost'])) p.mtDisplayedCost = x['upCost'];
  const n = x['mtPreviewCount'];
  if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10) p.mtPreviewCount = n <= 3 ? 3 : n <= 5 ? 5 : 10;
  if (Array.isArray(x['path'])) p.path = x['path'].filter((r): r is PathItem => !!r && typeof r.id === "number" && isStr(r.name) && isStr(r.level) && isNU(r.cost) && isNU(r.gain)).slice(0, 6);
  if (Array.isArray(x['milestones'])) p.milestones = x['milestones'].filter((r): r is Milestone => isNU(r) && typeof (r as Milestone).id === "number" && isStr((r as Milestone).name)).slice(0, 8);
  return p;
}