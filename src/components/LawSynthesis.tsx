import { useI18n } from "@/components/LanguageProvider";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { parseNum } from "@/lib/endurance";

import {
  LAWS, MATERIALS, MAT_SOURCE, MAX_LEVEL, MULTIPLIERS, clampLevel, coreRate, coreSeconds, farmSummary, lawTime, multiplier,
  planMaterials, sourceSettings, totalCost, type CoreUnit, type FarmSettings, type Levels, type Mat,
} from "@/lib/lawsynth";

type MatText = { base: string; obs: string; per: string };
type LS = {
  levels: Levels; toggles: boolean[]; custom: string; perDrop: string; mode: "source" | "measured";
  mats: Record<Mat, MatText>; inv: Record<Mat, string>; coreRate: string; coreUnit: CoreUnit; note: string;
  filter: "all" | "progress" | "remaining" | "done"; order: "bottleneck" | "cheapest"; showAll: boolean;
  scope: "all" | "selected"; check: Record<string, boolean>; farmAmt: string;
};
const KEY = "ii-lawsynth-v1";
const srcMats = (): Record<Mat, MatText> => Object.fromEntries(MATERIALS.map((m) => [m, { base: String(MAT_SOURCE[m].sec), obs: "", per: "" }])) as Record<Mat, MatText>;
const DEFAULTS: LS = {
  levels: Object.fromEntries(LAWS.map((l) => [l.id, { cur: 0, tgt: 0 }])), toggles: MULTIPLIERS.map(() => false), custom: "1", perDrop: "1",
  mode: "source", mats: srcMats(), inv: Object.fromEntries(MATERIALS.map((m) => [m, ""])) as Record<Mat, string>,
  coreRate: "", coreUnit: "cpm", note: "Bear", filter: "all", order: "bottleneck", showAll: false, scope: "all", check: {}, farmAmt: "10",
};
const str = (v: unknown, d: string) => (typeof v === "string" ? v.slice(0, 200) : d);
function restore(raw: string): LS {
  const x = JSON.parse(raw) as { [K in keyof LS]?: any };
  if (!x || typeof x !== "object") return DEFAULTS;
  const s: LS = { ...DEFAULTS, mats: srcMats(), inv: { ...DEFAULTS.inv }, levels: { ...DEFAULTS.levels } };
  for (const l of LAWS) { const v = x.levels?.[l.id]; if (v && typeof v.cur === "number" && typeof v.tgt === "number") s.levels[l.id] = { cur: clampLevel(v.cur), tgt: clampLevel(v.tgt) }; }
  if (Array.isArray(x.toggles)) s.toggles = MULTIPLIERS.map((_, i) => x.toggles[i] === true);
  for (const m of MATERIALS) {
    const v = x.mats?.[m]; if (v) s.mats[m] = { base: str(v.base, s.mats[m].base), obs: str(v.obs, ""), per: str(v.per, "") };
    s.inv[m] = str(x.inv?.[m], "");
  }
  s.custom = str(x.custom, "1"); s.perDrop = str(x.perDrop, "1"); s.coreRate = str(x.coreRate, ""); s.note = str(x.note, "Bear"); s.farmAmt = str(x.farmAmt, "10");
  if (x.mode === "measured") s.mode = "measured";
  if (["cps", "cpm", "sp1k"].includes(x.coreUnit)) s.coreUnit = x.coreUnit;
  if (["all", "progress", "remaining", "done"].includes(x.filter)) s.filter = x.filter;
  if (x.order === "cheapest") s.order = "cheapest";
  if (x.scope === "selected") s.scope = "selected";
  s.showAll = x.showAll === true;
  if (x.check && typeof x.check === "object") s.check = Object.fromEntries(Object.entries(x.check).filter(([, v]) => v === true)) as Record<string, boolean>;
  return s;
}
const num = (v: string) => { const p = parseNum(v); return p.ok === true ? p.value : null; };

const ACCENT: Record<number, string> = { 5: "border-l-primary/40", 10: "border-l-primary/70", 15: "border-l-primary" };

export function LawSynthesis() {
  const { t: tr, fmtPlain, fmtSuffix, fmtFinish, naturalDuration } = useI18n();

  const amt = (n: number) => fmtPlain(n, 0);
  const cores = (n: number) => n >= 1000 ? fmtSuffix(n, 2) : amt(n);
  const [s, setS] = useState<LS>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS(restore(raw)); } catch { /* keep defaults */ }
    setLoaded(true); setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }, [s, loaded]);
  const set = <K extends keyof LS>(k: K, v: LS[K]) => setS((p) => ({ ...p, [k]: v }));
  const setLevel = (id: string, cur: number, tgt: number) => {
    const c = clampLevel(cur); set("levels", { ...s.levels, [id]: { cur: c, tgt: Math.max(c, clampLevel(tgt)) } });
  };

  const fs: FarmSettings = useMemo(() => ({
    mult: multiplier(s.toggles, num(s.custom) ?? 1), perDrop: num(s.perDrop) ?? 1, mode: s.mode,
    mats: Object.fromEntries(MATERIALS.map((m) => [m, { base: num(s.mats[m].base) ?? MAT_SOURCE[m].sec, observed: num(s.mats[m].obs), perDrop: num(s.mats[m].per) }])) as FarmSettings["mats"],
  }), [s]);
  const rate = coreRate(num(s.coreRate), s.coreUnit);
  const have = Object.fromEntries(MATERIALS.map((m) => [m, num(s.inv[m]) ?? 0])) as Record<Mat, number>;
  const total = totalCost(s.levels);
  const plan = planMaterials(total.mats, have, fs);
  const coreT = coreSeconds(total.cores, rate);
  const fullTotal = plan.total + (coreT ?? 0);
  const allLevels = LAWS.length * MAX_LEVEL, curLevels = LAWS.reduce((a, l) => a + (s.levels[l.id]?.cur ?? 0), 0);
  const planned = LAWS.reduce((a, l) => a + Math.max(0, (s.levels[l.id]?.tgt ?? 0) - (s.levels[l.id]?.cur ?? 0)), 0);
  const empty = total.levels === 0;

  const goalLevels: Levels = s.scope === "all" ? Object.fromEntries(LAWS.map((l) => [l.id, { cur: s.levels[l.id]?.cur ?? 0, tgt: MAX_LEVEL }])) : s.levels;
  const goal = totalCost(goalLevels);
  const goalPlan = planMaterials(goal.mats, have, fs);
  const goalCoreT = coreSeconds(goal.cores, rate);
  const order = (rows: typeof plan.rows) => [...rows].sort((a, b) => s.order === "bottleneck" ? b.eta - a.eta : a.eta - b.eta);
  const routeRows = order(plan.rows).filter((r) => s.showAll || r.need > 0);
  const goalRows = order(goalPlan.rows).filter((r) => r.missing > 0);
  const toggleCheck = (k: string) => set("check", { ...s.check, [k]: !s.check[k] });

  const copy = async () => {
    const text = [
      farmSummary(s.scope === "all" ? tr("Max Laws") : tr("Gewählte Laws"), goalRows, goal.cores, amt, tr("keine Materialien")),
      tr("Erwartete Materialzeit (nacheinander): {p0}{p1}", { p0: naturalDuration(goalPlan.total), p1: goalCoreT === null ? tr(" · Core-Zeit nicht enthalten") : tr(" · inkl. Cores: {p0}", { p0: naturalDuration(goalPlan.total + goalCoreT) }) }),
      tr("Multiplikator ×{p0} · {p1}", { p0: fmtPlain(fs.mult, 3), p1: tr(s.mode === "measured" ? "Eigene Messwerte" : "Quellschätzung") }),
    ].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };
  const farmed = (m: Mat) => { const a = num(s.farmAmt); if (a !== null) set("inv", { ...s.inv, [m]: String((num(s.inv[m]) ?? 0) + a) }); };

  const visible = LAWS.filter((l) => {
    const lv = s.levels[l.id] ?? { cur: 0, tgt: 0 };
    return s.filter === "all" || (s.filter === "progress" && lv.cur > 0 && lv.cur < MAX_LEVEL) || (s.filter === "remaining" && lv.tgt > lv.cur) || (s.filter === "done" && lv.cur === MAX_LEVEL);
  });

  return (
    <div className="space-y-6" data-testid="lawsynth">
      {/* Sticky mini summary */}
      {!empty && <div className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-x-5 gap-y-1 border-b bg-background/95 px-4 py-2 text-xs backdrop-blur sm:-mx-6 sm:px-6" data-testid="sticky">
        <span>Cores <b className="font-mono">{cores(total.cores)}</b></span>
        <span>{tr("Material-ETA")} <b className="font-mono">{naturalDuration(plan.total)}</b></span>
        {plan.bottleneck && <span>{tr("Engpass")} <b>{plan.bottleneck.mat}</b> · {plan.bottleneck.mark}</span>}
      </div>}

      {/* B) Dashboard */}
      <section className="result-panel p-5 sm:p-6" aria-labelledby="ls-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ls-h" className="text-xl font-semibold">Law Synthesis</h2>
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" onClick={() => set("levels", Object.fromEntries(LAWS.map((l) => [l.id, { cur: s.levels[l.id]?.cur ?? 0, tgt: MAX_LEVEL }])))}>{tr("Alle Ziele auf 10")}</Button>
            <Button variant="ghost" size="sm" onClick={() => set("levels", DEFAULTS.levels)}><RotateCcw />{tr("Alles leeren")}</Button>
          </div>
        </div>
        {empty ? (
          <div className="my-6" data-testid="ls-empty">
            <p className="text-lg font-semibold">{tr("Noch keine Law-Stufen geplant.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tr("Setze bei einer Law ein Ziel über dem aktuellen Level – oder plane alle Laws bis Level 10.")}</p>
          </div>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
              <Stat label="Beast Cores" value={cores(total.cores)} testid="ls-cores" />
              <Stat label={tr("Material-ETA (erwartet)")} value={naturalDuration(plan.total)} testid="ls-mat-eta" />
              <Stat label={tr("Gesamt inkl. Cores")} value={coreT === null ? tr("Core-Zeit nicht enthalten") : naturalDuration(fullTotal)} testid="ls-total" />
              <Stat label={tr("Fertig am")} value={now === null ? "–" : fmtFinish(fullTotal, now)} />
              <Stat label={tr("Engpass")} value={plan.bottleneck ? `${plan.bottleneck.mat} · ${plan.bottleneck.mark}` : tr("Alles vorrätig")} />
              <Stat label={tr("Offene Stufen")} value={amt(total.levels)} />
              <Stat label={tr("Multiplikator")} value={`×${fmtPlain(fs.mult, 3)}`} testid="ls-mult" />
              <Stat label={tr("Datenbasis")} value={s.mode === "measured" ? tr("Eigene Messwerte") : tr("Quellschätzung")} />
            </dl>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{tr("Fortschritt (aktuell / alle Laws max)")}</span><span className="font-mono">{curLevels} / {allLevels} {tr("· geplant +")}{planned}</span></div>
              <Progress value={curLevels / allLevels * 100} aria-label={tr("Law-Fortschritt")} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{plan.rows.filter((r) => r.need > 0).map((r) => <span key={r.mat} className="rounded border px-2 py-1 font-mono text-xs">{amt(r.need)} {r.mat}</span>)}</div>
          </>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{tr("Erwartete Durchschnittswerte – echtes RNG kann deutlich abweichen. Materialzeiten werden nacheinander addiert (eine Mark zur Zeit).")}</p>
      </section>

      {/* D + E) Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tr("Farm-Einstellungen")} right={<Button variant="ghost" size="sm" onClick={() => setS((p) => ({ ...p, toggles: DEFAULTS.toggles, custom: "1", perDrop: "1", mode: "source", mats: srcMats() }))}><RotateCcw />{tr("Quellwerte")}</Button>}>
          <div className="grid gap-2 sm:grid-cols-2">{MULTIPLIERS.map((name, i) => (
            <label key={name} className="flex items-center gap-2 text-sm"><Checkbox checked={s.toggles[i] === true} onCheckedChange={(v) => set("toggles", s.toggles.map((t, j) => j === i ? v === true : t))} aria-label={`${name} ×2`} />{name} <span className="font-mono text-xs text-muted-foreground">×2</span></label>))}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TextField id="ls-custom" label={tr("Eigener Multiplikator ×")} value={s.custom} onChange={(v) => set("custom", v)} />
            <TextField id="ls-per" label={tr("Materialien pro Drop")} value={s.perDrop} onChange={(v) => set("perDrop", v)} />
          </div>
          <div className="mt-4 inline-flex rounded-md border bg-secondary p-1" role="group" aria-label={tr("Datenbasis")}>
            <Button size="sm" variant={s.mode === "source" ? "default" : "ghost"} aria-pressed={s.mode === "source"} onClick={() => set("mode", "source")}>{tr("Quellschätzung")}</Button>
            <Button size="sm" variant={s.mode === "measured" ? "default" : "ghost"} aria-pressed={s.mode === "measured"} onClick={() => set("mode", "measured")}>{tr("Meine Messwerte")}</Button>
          </div>
          <code className="mt-3 block break-words font-mono text-xs text-primary">{tr("Eff. s/Material = (Basis-s/Drop ÷ ×")}{fmtPlain(fs.mult, 3)}{tr(") ÷ Materialien pro Drop · Messwert: gemessene s/Drop ÷ Materialien pro Drop")}</code>
          <p className="mt-1 text-xs text-muted-foreground">{tr("Gemessene Werte enthalten deine Boni bereits und werden nicht nochmals geteilt.")}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">{tr("Werte pro Material bearbeiten")}</summary>
            <div className="mt-3 space-y-2">{MATERIALS.map((m) => {
              const x = s.mats[m], edited = num(x.base) !== MAT_SOURCE[m].sec;
              const upd = (p: Partial<MatText>) => set("mats", { ...s.mats, [m]: { ...x, ...p } });
              return <div key={m} className="grid grid-cols-[5rem_repeat(3,minmax(0,1fr))] items-end gap-2">
                <span className="pb-2 text-sm">{m}{edited && <span className="block text-[10px] text-primary">{tr("eigener Wert")}</span>}</span>
                <TextField id={`b-${m}`} label={tr("Basis s/Drop")} value={x.base} onChange={(v) => upd({ base: v })} small />
                <TextField id={`o-${m}`} label={tr("Gemessen s/Drop")} value={x.obs} onChange={(v) => upd({ obs: v })} small />
                <TextField id={`p-${m}`} label={tr("Pro Drop")} value={x.per} onChange={(v) => upd({ per: v })} small />
              </div>;
            })}</div>
          </details>
        </Card>
        <Card title="Beast Cores">
          <div className="flex min-w-0 gap-2">
            <TextField id="ls-core" label={tr("Core-Rate (optional)")} value={s.coreRate} onChange={(v) => set("coreRate", v)} />
            <div className="min-w-0"><label htmlFor="ls-core-u" className="mb-1 block text-xs font-medium">{tr("Einheit")}</label>
              <select id="ls-core-u" value={s.coreUnit} onChange={(e) => set("coreUnit", e.target.value as CoreUnit)} className="field h-[42px] px-2 text-sm outline-none">
                <option value="cps">Cores / s</option><option value="cpm">Cores / min</option><option value="sp1k">{tr("s pro 1k Cores")}</option>
              </select></div>
          </div>
          <p className="mt-2 text-sm" data-testid="core-status">{rate === null ? tr("Core-Zeit nicht enthalten – keine Rate eingetragen.") : tr("{p0} Cores/s · {p1} für {p2} Cores", { p0: fmtPlain(rate, 3), p1: naturalDuration(coreT ?? 0), p2: cores(total.cores) })}</p>
          <div className="mt-4"><TextField id="ls-note" label={tr("Deine Route / Notiz (keine verifizierte Formel)")} value={s.note} onChange={(v) => set("note", v)} /></div>
          <details className="mt-5 text-xs text-muted-foreground" data-testid="source-drawer">
            <summary className="cursor-pointer text-sm font-medium text-foreground">{tr("Quelle & Annahmen")}</summary>
            <p className="mt-2">{tr("Law-Kosten & Basis-Dropschätzungen: Astral3nt Immortality Incremental Hub, Stand Okt. 2026 (fest eingebettet, kein Abruf). Fan-gepflegt, nicht offiziell; kann sich mit Spiel-Patches ändern.")}</p>
            <p className="mt-2"><b className="text-foreground">{tr("Quelldaten:")}</b> {tr("Kosten, Chancen, s/Drop, Marks, ×2-Boni.")} <b className="text-foreground">{tr("Deine Overrides:")}</b> {tr("eigener Multiplikator, Basis-/Messwerte, Pro-Drop, Core-Rate, Inventar.")}</p>
            <Button className="mt-2" variant="outline" size="sm" onClick={() => set("mats", srcMats())}>{tr("Quellwerte wiederherstellen")}</Button>
          </details>
        </Card>
      </div>

      {/* C) Law cards */}
      <section aria-labelledby="laws-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="laws-h" className="text-base font-semibold">Laws</h2>
          <div className="inline-flex flex-wrap rounded-md border bg-secondary p-1" role="group" aria-label={tr("Filter")}>
            {([["all", tr("Alle")], ["progress", tr("In Arbeit")], ["remaining", tr("Offen")], ["done", tr("Fertig")]] as const).map(([k, l]) =>
              <Button key={k} size="sm" variant={s.filter === k ? "default" : "ghost"} aria-pressed={s.filter === k} onClick={() => set("filter", k)}>{l}</Button>)}
          </div>
        </div>
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Keine Laws in diesem Filter.")}</p> :
          <div className="grid gap-4 md:grid-cols-2">{visible.map((l) => {
            const lv = s.levels[l.id] ?? { cur: 0, tgt: 0 };
            const t = lawTime(l, lv.cur, lv.tgt, fs, rate);
            const soft = t.levels === 0;
            return <article key={l.id} data-testid={`law-${l.id}`} className={`panel min-w-0 border-l-4 p-4 ${ACCENT[l.step]} ${soft ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{`Law of ${l.name}`}</h3><span className="font-mono text-xs text-muted-foreground">Lv {lv.cur} → {lv.tgt}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <LevelSelect id={`${l.id}-cur`} label={tr("Aktuelles Level")} value={lv.cur} onChange={(v) => setLevel(l.id, v, lv.tgt)} />
                <LevelSelect id={`${l.id}-tgt`} label={tr("Ziel-Level")} value={lv.tgt} min={lv.cur} onChange={(v) => setLevel(l.id, lv.cur, v)} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" disabled={lv.tgt >= MAX_LEVEL} onClick={() => setLevel(l.id, lv.cur, lv.tgt + 1)}><Plus />1</Button>
                <Button size="sm" variant="outline" onClick={() => setLevel(l.id, lv.cur, MAX_LEVEL)}>Max</Button>
                <Button size="sm" variant="ghost" disabled={soft} onClick={() => setLevel(l.id, lv.tgt, lv.tgt)}>{tr("Erledigt")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setLevel(l.id, 0, 0)}>Reset</Button>
              </div>
              <Progress className="mt-3 h-1.5" value={lv.cur / MAX_LEVEL * 100} aria-label={tr("{p0} Fortschritt", { p0: l.name })} />
              {soft ? <p className="mt-3 text-xs text-muted-foreground">{lv.cur === MAX_LEVEL ? tr("Maximiert ✓") : tr("Keine Stufen geplant.")}</p> : <>
                <ul className="mt-3 space-y-1 text-sm">{t.parts.map((p) => <li key={p.mat} className="flex flex-wrap justify-between gap-x-2"><span><b className="font-mono">{amt(p.amount)}</b> {p.mat} <span className="text-xs text-muted-foreground">· {MAT_SOURCE[p.mat].mark}</span></span><span className="font-mono text-xs text-muted-foreground">{naturalDuration(p.secs)}</span></li>)}</ul>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-2"><Stat label="Beast Cores" value={cores(t.cores)} /><Stat label={t.core === null ? tr("Materialzeit (ohne Cores)") : tr("Zeit inkl. Cores")} value={naturalDuration(t.core === null ? t.mat : t.total)} /></dl>
              </>}
            </article>;
          })}</div>}
      </section>

      {/* F) Route */}
      <Card title={tr("Material-Route")} right={<div className="flex flex-wrap gap-1">
        <Button size="sm" variant={s.order === "bottleneck" ? "default" : "ghost"} aria-pressed={s.order === "bottleneck"} onClick={() => set("order", "bottleneck")}>{tr("Engpass zuerst")}</Button>
        <Button size="sm" variant={s.order === "cheapest" ? "default" : "ghost"} aria-pressed={s.order === "cheapest"} onClick={() => set("order", "cheapest")}>{tr("Schnellste zuerst")}</Button>
        <Button size="sm" variant="outline" aria-pressed={s.showAll} onClick={() => set("showAll", !s.showAll)}>{s.showAll ? tr("Nur benötigte") : tr("Alle 11")}</Button></div>}>
        <div className="mb-3 flex max-w-xs items-end gap-2"><TextField id="ls-farm" label={tr("„Gefarmt“ fügt hinzu")} value={s.farmAmt} onChange={(v) => set("farmAmt", v)} /></div>
        {routeRows.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Keine Materialien benötigt.")}</p> :
          <div className="space-y-2" data-testid="route">{routeRows.map((r, i) => (
            <div key={r.mat} className={`grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 border-l-2 py-2 pl-3 text-sm sm:grid-cols-[2rem_minmax(0,1.6fr)_repeat(6,minmax(0,1fr))_auto] sm:items-center ${r.missing > 0 ? "border-primary" : "border-border opacity-70"}`}>
              <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <span className="min-w-0"><b>{r.mat}</b><span className="block text-xs font-medium text-primary">{r.mark}</span></span>
              <Cell l={tr("Benötigt")} v={amt(r.need)} />
              <div className="min-w-0"><label htmlFor={`inv-r-${r.mat}`} className="text-[10px] text-muted-foreground">{tr("Vorrat")}</label><input id={`inv-r-${r.mat}`} inputMode="decimal" value={s.inv[r.mat]} placeholder="0" onChange={(e) => set("inv", { ...s.inv, [r.mat]: e.target.value })} className="field w-full px-2 py-1 font-mono text-xs outline-none" /></div>
              <Cell l={tr("Fehlt")} v={amt(r.missing)} />
              <Cell l={tr("Ø s/Drop")} v={fmtPlain(r.base, 2)} />
              <Cell l={r.measured ? tr("Eff. s (gemessen)") : tr("Eff. s")} v={fmtPlain(r.eff, 2)} />
              <Cell l="ETA" v={naturalDuration(r.eta)} />
              <Button size="sm" variant="ghost" onClick={() => farmed(r.mat)} disabled={num(s.farmAmt) === null}>{tr("Gefarmt")}</Button>
            </div>))}</div>}
        <p className="mt-3 text-sm">{tr("Summe nacheinander:")} <b className="font-mono">{naturalDuration(plan.total)}</b> <span className="text-xs text-muted-foreground">{tr("(Parallel-Modus nicht verfügbar)")}</span></p>
      </Card>

      {/* G) Inventory */}
      <Card title={tr("Meine Materialien")} right={<Button size="sm" variant="ghost" onClick={() => set("inv", DEFAULTS.inv)}>{tr("Inventar leeren")}</Button>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{MATERIALS.map((m) => {
          const r = plan.rows.find((x) => x.mat === m);
          if (!r) return null;
          return <div key={m} className="min-w-0"><TextField id={`inv-${m}`} label={m} value={s.inv[m]} onChange={(v) => set("inv", { ...s.inv, [m]: v })} small />
            {r.surplus > 0 && <p className="mt-0.5 text-[11px] text-success">{tr("Überschuss")} {amt(r.surplus)}</p>}</div>;
        })}</div>
      </Card>

      {/* H) Goal plan */}
      <Card title={tr("Zielplan")} right={<div className="flex flex-wrap gap-1">
        <Button size="sm" variant={s.scope === "all" ? "default" : "ghost"} aria-pressed={s.scope === "all"} onClick={() => set("scope", "all")}>{tr("Alle Laws maximieren")}</Button>
        <Button size="sm" variant={s.scope === "selected" ? "default" : "ghost"} aria-pressed={s.scope === "selected"} onClick={() => set("scope", "selected")}>{tr("Nur gewählte Ziele")}</Button>
        <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />}{tr("Zusammenfassung kopieren")}</Button></div>}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={tr("Beast Cores offen")} value={cores(goal.cores)} testid="goal-cores" />
          <Stat label={tr("Material-ETA")} value={naturalDuration(goalPlan.total)} />
          <Stat label={tr("Inkl. Cores")} value={goalCoreT === null ? tr("Core-Zeit nicht enthalten") : naturalDuration(goalPlan.total + goalCoreT)} />
          <Stat label={tr("Stufen offen")} value={amt(goal.levels)} />
        </dl>
        <p className="mt-3 break-words rounded border bg-background px-3 py-2 font-mono text-xs" data-testid="goal-summary">{farmSummary(s.scope === "all" ? tr("Max Laws") : tr("Gewählte Laws"), goalRows, goal.cores, amt, tr("keine Materialien"))}</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div><h3 className="mb-2 text-sm font-medium">{tr("Farm-Reihenfolge nach Mark")}</h3>
            {goalRows.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Nichts zu farmen.")}</p> :
              <ul className="space-y-1.5">{goalRows.map((r) => <Check2 key={r.mat} k={`m-${r.mat}`} checked={!!s.check[`m-${r.mat}`]} onToggle={toggleCheck}><b>{r.mark}</b> – {amt(r.missing)} {r.mat} <span className="font-mono text-xs text-muted-foreground">{naturalDuration(r.eta)}</span></Check2>)}</ul>}</div>
          <div><h3 className="mb-2 text-sm font-medium">Laws</h3>
            <ul className="space-y-1.5">{LAWS.filter((l) => (goalLevels[l.id]?.tgt ?? 0) > (goalLevels[l.id]?.cur ?? 0)).map((l) => <Check2 key={l.id} k={`l-${l.id}`} checked={!!s.check[`l-${l.id}`]} onToggle={toggleCheck}>{`Law of ${l.name}`} Lv {goalLevels[l.id]?.cur} → {goalLevels[l.id]?.tgt}</Check2>)}</ul></div>
        </div>
        <Button className="mt-3" size="sm" variant="ghost" onClick={() => set("check", {})}>{tr("Checkliste zurücksetzen")}</Button>
      </Card>
    </div>
  );
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return <section className="panel min-w-0 p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{title}</h2>{right}</div>{children}</section>;
}
function Stat({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-mono text-sm font-medium" data-testid={testid}>{value}</dd></div>;
}
function Cell({ l, v }: { l: string; v: string }) {
  return <span className="min-w-0"><span className="block text-[10px] text-muted-foreground">{l}</span><span className="break-words font-mono text-xs">{v}</span></span>;
}
function TextField({ id, label, value, onChange, small }: { id: string; label: string; value: string; onChange: (v: string) => void; small?: boolean }) {
  const bad = value.trim() !== "" && parseNum(value).ok === false && !id.startsWith("ls-note");
  return <div className="min-w-0 flex-1"><label htmlFor={id} className={`mb-1 block font-medium ${small ? "text-[10px]" : "text-xs"}`}>{label}</label>
    <input id={id} inputMode={id === "ls-note" ? "text" : "decimal"} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={bad}
      className={`field w-full font-mono outline-none ${small ? "px-2 py-1.5 text-xs" : "px-3 py-2.5"} ${bad ? "border-destructive" : ""}`} /></div>;
}
function LevelSelect({ id, label, value, min = 0, onChange }: { id: string; label: string; value: number; min?: number; onChange: (v: number) => void }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className="field w-full px-2 py-2 font-mono text-sm outline-none">
      {Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i).filter((i) => i >= min).map((i) => <option key={i} value={i}>{i}</option>)}
    </select></div>;
}
function Check2({ k, checked, onToggle, children }: { k: string; checked: boolean; onToggle: (k: string) => void; children: ReactNode }) {
  return <li className="flex items-start gap-2 text-sm"><Checkbox id={k} checked={checked} onCheckedChange={() => onToggle(k)} className="mt-0.5" /><label htmlFor={k} className={checked ? "text-muted-foreground line-through" : ""}>{children}</label></li>;
}