import { useI18n } from "@/components/LanguageProvider";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUFFIXES, eta, parseNum } from "@/lib/endurance";
import { bestPrefix, compareGain, decide, pathAdvice, resetCompare, simulatePath, upgradeROI, whatIf, type Verdict } from "@/lib/planner";
import { Hint, UnitField, val, type NU } from "./planner-fields";

export type PathItem = { id: number; name: string; level: string; cost: NU; gain: NU };
export type Milestone = { id: number; name: string; v: string; u: string };
export type Prog = {
  strength: NU; persev: NU; upName: string; mtLevel: string; upCost: NU; upGain: NU; nextCost: NU; nextGain: NU; comboGain: NU;
  path: PathItem[]; milestones: Milestone[]; resetBefore: NU; resetAfter: NU; resetLoss: NU;
  wiMult: string; wiFlat: NU; wiTarget: string;
};
export const PROG_DEFAULTS: Prog = {
  strength: { v: "", u: "Qa" }, persev: { v: "", u: "" }, upName: "Muscle Training", mtLevel: "45",
  upCost: { v: "", u: "Qa" }, upGain: { v: "", u: "T" }, nextCost: { v: "", u: "Qa" }, nextGain: { v: "", u: "T" }, comboGain: { v: "", u: "T" },
  path: [], milestones: [], resetBefore: { v: "", u: "T" }, resetAfter: { v: "", u: "T" }, resetLoss: { v: "0", u: "" },
  wiMult: "1,25", wiFlat: { v: "0", u: "T" }, wiTarget: "1",
};
const NU_KEYS = ["strength", "persev", "upCost", "upGain", "nextCost", "nextGain", "comboGain", "resetBefore", "resetAfter", "resetLoss", "wiFlat"] as const;
const isNU = (v: unknown): v is NU => !!v && typeof v === "object" && typeof (v as NU).v === "string" && SUFFIXES.some((u) => u === (v as NU).u);
const isStr = (v: unknown): v is string => typeof v === "string";

export function restoreProg(raw: unknown): Prog {
  const p = { ...PROG_DEFAULTS };
  if (!raw || typeof raw !== "object") return p;
  const x = raw as Record<string, unknown>;
  for (const k of NU_KEYS) { const v = x[k]; if (isNU(v)) p[k] = v; }
  for (const k of ["upName", "mtLevel", "wiMult", "wiTarget"] as const) { const v = x[k]; if (isStr(v)) p[k] = v; }
  if (Array.isArray(x['path'])) p.path = x['path'].filter((r): r is PathItem => !!r && typeof r.id === "number" && isStr(r.name) && isStr(r.level) && isNU(r.cost) && isNU(r.gain)).slice(0, 6);
  if (Array.isArray(x['milestones'])) p.milestones = x['milestones'].filter((r): r is Milestone => isNU(r) && typeof (r as Milestone).id === "number" && isStr((r as Milestone).name)).slice(0, 8);
  return p;
}

const TONE: Record<Verdict, string> = { better: "border-success text-success", same: "border-border text-muted-foreground", worse: "border-destructive text-destructive" };
const STATUS: Record<Verdict, string> = { better: "Vorteil", same: "Neutral", worse: "Nachteil" };
const num = (s: string) => { const p = parseNum(s); return p.ok === true ? p.value : null; };


type Core = { gain: NU; cur: NU; target: NU; next: NU };
type Props = {
  core: Core; setCore: (k: keyof Core, v: NU) => void; g: number | null; c: number | null; t: number | null; n: number | null;
  p: Prog; setP: (v: Prog | ((p: Prog) => Prog)) => void; now: number | null; onCopy: () => void; copied: boolean;
};

export function ProgressionPlanner({ core, setCore, g, c, t, n, p, setP, now, onCopy, copied }: Props) {
  const { t: tr, fmtPlain, fmtSuffix, fmtDuration, fmtFinish, naturalDuration } = useI18n();

  const diff = (saved: number) => !Number.isFinite(saved) ? tr(saved > 0 ? "Ziel wird erst so erreichbar" : "Ziel wird unerreichbar") : `${saved < 0 ? "−" : "+"}${fmtDuration(Math.abs(saved))}`;
  const set = <K extends keyof Prog>(k: K, v: Prog[K]) => setP((x) => ({ ...x, [k]: v }));
  const ready = g !== null && c !== null && t !== null;
  const upCost = val(p.upCost), upGain = val(p.upGain), nextCost = val(p.nextCost), nextGain = val(p.nextGain), comboGain = val(p.comboGain);
  const steps = p.path.flatMap((r) => { const cost = val(r.cost), gain = val(r.gain); return cost !== null && gain !== null ? [{ cost, gain }] : []; });
  const pathValid = steps.length === p.path.length;
  const f = (k: keyof Prog & string, label: string, suffix?: string, help?: string) => {
    const v = p[k] as NU;
    return <Field id={`p-${k}`} label={label} value={v} onChange={(x) => set(k, x as never)} suffix={suffix} help={help} />;
  };

  return (
    <div className="space-y-6" data-testid="progression">
      {/* 5) Decision engine */}
      <section className="result-panel p-5 sm:p-6" aria-labelledby="decide-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="decide-h" className="text-lg font-semibold">{tr("Nächster sinnvoller Schritt")}</h2>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" className="h-auto whitespace-normal text-left" onClick={onCopy} disabled={!ready}>{copied ? <Check /> : <Copy />}{tr("Progression-Zusammenfassung kopieren")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setP(PROG_DEFAULTS)}><RotateCcw />{tr("Progression zurücksetzen")}</Button>
          </div>
        </div>
        {!ready ? <Hint>{tr("Bitte Gain, aktuelle Endurance und Ziel eingeben.")}</Hint> : <Decision c={c} g={g} t={t} x={{ next: n, upCost, upGain, comboGain }} now={now} />}
        <div className="mt-4 max-w-md">{f("comboGain", tr("Gain nach Increase + Upgrade (optional, Annahme)"), "/ s", tr("Nur damit wird das Kombi-Szenario D berechnet."))}</div>
      </section>

      {/* 2) Snapshot */}
      <Card title={tr("Aktueller Stand")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="p-gain" label={tr("Aktueller Gain *")} value={core.gain} onChange={(v) => setCore("gain", v)} suffix="/ s" />
          <Field id="p-cur" label={tr("Aktuelle Endurance *")} value={core.cur} onChange={(v) => setCore("cur", v)} />
          <Field id="p-target" label={tr("Ziel *")} value={core.target} onChange={(v) => setCore("target", v)} />
          <Field id="p-next" label={tr("Nächster Gain (Increase)")} value={core.next} onChange={(v) => setCore("next", v)} suffix="/ s" />
          {f("strength", tr("Strength (nur Notiz)"))}
          {f("persev", tr("Perseverance (nur Notiz)"))}
          <TextField id="p-level" label={tr("{p0} Level", { p0: p.upName || "Upgrade" })} value={p.mtLevel} onChange={(v) => set("mtLevel", v)} />
          <TextField id="p-name" label={tr("Upgrade-Name")} value={p.upName} onChange={(v) => set("upName", v)} />
          {f("upCost", tr("Upgrade-Kosten"))}
          {f("upGain", tr("Gain nach Upgrade (Annahme)"), "/ s")}
          {f("nextCost", tr("Nächste Upgrade-Kosten (optional)"))}
          {f("nextGain", tr("Gain nach nächstem Upgrade (optional)"), "/ s")}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{tr("* Pflicht. Strength und Perseverance werden gespeichert, fließen aber in keine Rechnung ein.")}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Increase">
          {!ready ? <Hint>{tr("Basiswerte fehlen.")}</Hint> : n === null ? <Hint>{tr("Nächsten Gain eintragen, um Increase zu bewerten.")}</Hint> : (() => {
            const r = compareGain(c, t, g, n);
            const v: Verdict = r.recommendation === "Increase jetzt sinnvoll" ? "better" : r.recommendation === "Nicht drücken" ? "worse" : "same";
            return <><Rows rows={[[tr("Ohne Increase"), naturalDuration(r.a)], [tr("Increase jetzt"), naturalDuration(r.b)], [tr("Differenz"), diff(r.saved)]]} />
              <Explain v={v} rec={tr(r.recommendation)} facts={tr("ETA {p0} vs. {p1}.", { p0: naturalDuration(r.a), p1: naturalDuration(r.b) })} assumption={tr("Nächster Gain {p0}/s (deine Eingabe).", { p0: fmtSuffix(n) })} testid="prog-increase" /></>;
          })()}
        </Card>
        <Card title={`Upgrade-ROI · ${p.upName || "Upgrade"}${p.mtLevel ? ` (Lv. ${p.mtLevel})` : ""}`}>
          {!ready ? <Hint>{tr("Basiswerte fehlen.")}</Hint> : upCost === null || upGain === null ? <Hint>{tr("Upgrade-Kosten und Gain nach Upgrade eintragen – ohne diese Werte gibt es keine Empfehlung.")}</Hint> : (() => {
            const r = upgradeROI(c, g, t, upCost, upGain);
            const two = nextCost !== null && nextGain !== null ? simulatePath(c, g, t, [{ cost: upCost, gain: upGain }, { cost: nextCost, gain: nextGain }]) : null;
            return <>
              {t <= c && <Hint>{tr("Ziel bereits erreicht – Kauf spart hier keine Zeit.")}</Hint>}
              {t <= upCost && t > c && <Hint>{tr("Ziel liegt unter den Upgrade-Kosten – nach dem Kauf musst du neu farmen.")}</Hint>}
              <Rows rows={[
                [tr("Bezahlbar in"), r.wait === 0 ? tr("Jetzt bezahlbar") : naturalDuration(r.wait)],
                [tr("Fehlende Endurance"), fmtSuffix(r.remaining)],
                [tr("Gain-Zuwachs"), `${r.gainDelta < 0 ? "−" : "+"}${fmtSuffix(Math.abs(r.gainDelta))}/s (${fmtPlain(r.gainPct, 2)} %)`],
                [tr("A · Nicht kaufen"), naturalDuration(r.a)],
                [tr("B · Warten, kaufen, weiter"), naturalDuration(r.b)],
                [tr("Zeit gespart / verloren"), diff(r.saved)],
                ...(two ? [[tr("Mit nächstem Upgrade"), naturalDuration(two.total)] as [string, string]] : []),
              ]} />
              <Explain v={r.verdict} rec={tr(r.recommendation)} testid="upgrade-rec"
                facts={tr("Kosten {p0} werden abgezogen; danach läuft der neue Gain bis {p1}.", { p0: fmtSuffix(upCost), p1: fmtSuffix(t) })}
                assumption={tr("Gain nach Kauf {p0}/s (deine Eingabe).{p1}", { p0: fmtSuffix(upGain), p1: r.noSpeedGain ? tr(" Nicht höher als jetzt – keine Empfehlung.") : "" })} />
            </>;
          })()}
        </Card>
      </div>

      {/* 4) Path */}
      <Card title={tr("Upgrade-Pfad")} right={<Button variant="outline" size="sm" disabled={p.path.length >= 6} onClick={() => set("path", [...p.path, { id: Date.now(), name: `Upgrade ${p.path.length + 1}`, level: "", cost: { v: "", u: "Qa" }, gain: { v: "", u: "T" } }])}>{tr("+ Upgrade (")}{p.path.length}/6)</Button>}>
        {p.path.length === 0 ? <Hint>{tr("Füge Upgrades in Kaufreihenfolge hinzu: Kosten und Gain danach.")}</Hint> : <PathEditor p={p} set={set} />}
        {ready && p.path.length > 0 && (pathValid ? <PathResult c={c} g={g} t={t} steps={steps} names={p.path.map((r) => r.name)} /> : <p className="mt-4 text-sm text-muted-foreground">{tr("Bitte Kosten und Gain für jedes Upgrade eintragen.")}</p>)}
      </Card>

      {/* 6) Milestones */}
      <Card title="Milestones" right={<div className="flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" disabled={p.milestones.length > 0} onClick={() => set("milestones", [["Muscle Training", upCost !== null ? p.upCost.v : "316,13", upCost !== null ? p.upCost.u : "Qa"], ["500 Qa", "500", "Qa"], ["1 Qi", "1", "Qi"], ["10 Qi", "10", "Qi"]].map(([name, v, u], i) => ({ id: Date.now() + i, name: name ?? "", v: v ?? "", u: u ?? "" })))}>{tr("Beispiele")}</Button>
        <Button variant="outline" size="sm" disabled={p.milestones.length >= 8} onClick={() => set("milestones", [...p.milestones, { id: Date.now(), name: "", v: "", u: core.target.u }])}>+ ({p.milestones.length}/8)</Button></div>}>
        {p.milestones.length === 0 ? <Hint>{tr("Bis zu 8 Ziele oder Kosten mit Namen.")}</Hint> : <>
          <div className="mb-4 grid gap-2 md:grid-cols-2">{p.milestones.map((m, i) => (
            <div key={m.id} className="flex min-w-0 gap-2">
              <input aria-label={tr("Milestone {p0} Name", { p0: i + 1 })} value={m.name} placeholder={tr("Name")} onChange={(e) => set("milestones", p.milestones.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))} className="field w-28 min-w-0 px-2 text-sm outline-none" />
              <UnitField id={`ms-${m.id}`} label={`Milestone ${i + 1}`} value={m} onChange={(v) => set("milestones", p.milestones.map((x) => x.id === m.id ? { ...x, ...v } : x))} />
              <Button variant="ghost" size="icon" aria-label={tr("Milestone {p0} entfernen", { p0: i + 1 })} onClick={() => set("milestones", p.milestones.filter((x) => x.id !== m.id))}><X /></Button>
            </div>))}</div>
          {ready && <MilestoneTable ms={p.milestones} c={c} g={g} steps={pathValid && steps.length ? steps : null} now={now} />}
        </>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 7) Reset */}
        <Card title={tr("Reset / Perseverance Vergleich")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {f("resetBefore", tr("Gain vor Reset"), "/ s", tr("Leer = aktueller Gain"))}
            {f("resetAfter", tr("Erwarteter Gain nach Reset (Annahme)"), "/ s")}
            <div className="sm:col-span-2">{f("resetLoss", tr("Verlorene Endurance / Kosten"), undefined, tr("Strength kann separat zurückgesetzt werden – nicht modelliert."))}</div>
          </div>
          {(() => {
            const before = val(p.resetBefore) ?? g, after = val(p.resetAfter), loss = val(p.resetLoss) ?? 0;
            if (!ready || before === null) return <Hint>{tr("Basiswerte fehlen.")}</Hint>;
            if (after === null) return <Hint>{tr("Erwarteten Gain nach Reset eintragen.")}</Hint>;
            const r = resetCompare(c, before, t, after, loss);
            return <><Rows rows={[[tr("Ohne Reset"), naturalDuration(r.a)], [tr("Nach Reset"), naturalDuration(r.b)], [tr("Differenz"), diff(r.saved)]]} />
              <Explain v={r.verdict} rec={tr(r.recommendation)} testid="reset-rec" facts={tr("{p0} Endurance abgezogen, dann {p1}/s bis zum Ziel.", { p0: fmtSuffix(loss), p1: fmtSuffix(after) })} assumption={tr("Gain nach Reset ist deine Eingabe – keine Vorhersage versteckter Spielformeln.")} /></>;
          })()}
        </Card>
        {/* 8) What-if */}
        <Card title={tr("Was wäre wenn")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField id="wi-mult" label="Gain ×" value={p.wiMult} onChange={(v) => set("wiMult", v)} />
            {f("wiFlat", tr("+ Gain flach"), "/ s")}
            <TextField id="wi-target" label={tr("Ziel ×")} value={p.wiTarget} onChange={(v) => set("wiTarget", v)} />
          </div>
          {(() => {
            const m = num(p.wiMult), tm = num(p.wiTarget), flat = val(p.wiFlat) ?? 0;
            if (!ready) return <Hint>{tr("Basiswerte fehlen.")}</Hint>;
            if (m === null || tm === null) return <Hint error>{tr("Multiplikatoren als Zahl eingeben, z. B. 1,25.")}</Hint>;
            const r = whatIf(c, g, t, m, flat, tm);
            return <Rows rows={[[tr("Neuer Gain"), `${fmtSuffix(r.gain)}/s`], [tr("Neues Ziel"), fmtSuffix(r.target)], ["ETA", naturalDuration(r.secs)], [tr("Fertig am"), now === null ? "–" : fmtFinish(r.secs, now)]]} />;
          })()}
        </Card>
      </div>
    </div>
  );
}

function Decision({ c, g, t, x, now }: { c: number; g: number; t: number; x: Parameters<typeof decide>[3]; now: number | null }) {
  const { t: tr, fmtDuration, fmtFinish, naturalDuration } = useI18n();

  const d = decide(c, g, t, x);
  const gap = d.second ? d.second.secs - d.winner.secs : 0;
  return <div className="mt-4" aria-live="polite">
    <p className="text-xs text-muted-foreground">{tr("Empfehlung")}</p>
    <p className="mt-1 text-2xl font-semibold text-primary" data-testid="decision">{tr(d.winner.label)}</p>
    <p className="mt-1 text-sm text-muted-foreground">
      {d.winner.id === "A" ? (d.scenarios.length > 1 ? tr("Keine Aktion ist mehr als 2 % schneller als weiter farmen.") : tr("Ohne weitere Eingaben ist nur Farmen bewertbar.")) : tr("Schnellstes Szenario: {p0}.", { p0: naturalDuration(d.winner.secs) })}
      {d.second && tr(" Abstand zum Zweitbesten ({p0}): {p1}{p2}.", { p0: tr(d.second.label), p1: Number.isFinite(gap) ? fmtDuration(Math.abs(gap)) : tr("nicht erreichbar"), p2: gap < 0 ? tr(" (dieses ist minimal schneller, aber unter 2 %)") : "" })}
    </p>
    <ol className="mt-4 grid gap-2 sm:grid-cols-2">{d.scenarios.map((s, i) => (
      <li key={s.id} className={`min-w-0 border-l-2 pl-3 ${s === d.winner ? "border-success" : "border-border"}`}>
        <p className="text-xs text-muted-foreground">#{i + 1} · {s.id} · {tr(s.label)}</p>
        <p className="font-mono text-sm font-semibold">{naturalDuration(s.secs)}</p>
        <p className="font-mono text-xs text-muted-foreground">{now === null ? "–" : fmtFinish(s.secs, now)}</p>
      </li>))}</ol>
    {d.missing.length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted-foreground" data-testid="missing">{d.missing.map((m) => <li key={m}>{tr(m)}</li>)}</ul>}
    <p className="mt-3 text-xs text-muted-foreground">{tr("Szenarien basieren nur auf deinen eingegebenen Gains und Kosten.")}</p>
  </div>;
}

function PathEditor({ p, set }: { p: Prog; set: <K extends keyof Prog>(k: K, v: Prog[K]) => void }) {
  const { t: tr } = useI18n();

  const upd = (id: number, patch: Partial<PathItem>) => set("path", p.path.map((r) => r.id === id ? { ...r, ...patch } : r));
  const move = (i: number, d: number) => { const a = [...p.path]; const [r] = a.splice(i, 1); if (!r) return; a.splice(i + d, 0, r); set("path", a); };
  return <div className="space-y-3">{p.path.map((r, i) => (
    <div key={r.id} className="grid min-w-0 gap-2 border-l-2 border-border pl-3 md:grid-cols-[8rem_4rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <input aria-label={tr("Upgrade {p0} Name", { p0: i + 1 })} value={r.name} onChange={(e) => upd(r.id, { name: e.target.value })} className="field min-w-0 px-2 py-2 text-sm outline-none" />
      <input aria-label={tr("Upgrade {p0} Level", { p0: i + 1 })} placeholder="Lv." value={r.level} onChange={(e) => upd(r.id, { level: e.target.value })} className="field min-w-0 px-2 py-2 font-mono text-sm outline-none" />
      <UnitField id={`pc-${r.id}`} label={tr("Upgrade {p0} Kosten", { p0: i + 1 })} value={r.cost} onChange={(v) => upd(r.id, { cost: v })} suffix={tr("Kosten")} />
      <UnitField id={`pg-${r.id}`} label={tr("Upgrade {p0} Gain danach", { p0: i + 1 })} value={r.gain} onChange={(v) => upd(r.id, { gain: v })} suffix="/ s" />
      <div className="flex">
        <Button variant="ghost" size="icon" aria-label={tr("Nach oben")} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
        <Button variant="ghost" size="icon" aria-label={tr("Nach unten")} disabled={i === p.path.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
        <Button variant="ghost" size="icon" aria-label={tr("Upgrade {p0} entfernen", { p0: i + 1 })} onClick={() => set("path", p.path.filter((x) => x.id !== r.id))}><X /></Button>
      </div>
    </div>))}</div>;
}

function PathResult({ c, g, t, steps, names }: { c: number; g: number; t: number; steps: { cost: number; gain: number }[]; names: string[] }) {
  const { t: tr, fmtSuffix, fmtDuration, naturalDuration } = useI18n();

  const diff = (saved: number) => !Number.isFinite(saved) ? tr(saved > 0 ? "Ziel wird erst so erreichbar" : "Ziel wird unerreichbar") : `${saved < 0 ? "−" : "+"}${fmtDuration(Math.abs(saved))}`;
  const sim = simulatePath(c, g, t, steps), base = eta(c, t, g), bp = bestPrefix(c, g, t, steps);
  const saved = base === sim.total ? 0 : base - sim.total;
  return <div className="mt-5" data-testid="path-result">
    <div className="overflow-x-auto"><table className="w-full min-w-[32rem] text-sm">
      <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 pr-3 font-medium">Upgrade</th><th className="pr-3 font-medium">{tr("Kauf nach")}</th><th className="pr-3 font-medium">{tr("Rest danach")}</th><th className="pr-3 font-medium">{tr("Neuer Gain")}</th><th className="font-medium">{tr("Ziel bei Stopp")}</th></tr></thead>
      <tbody>{sim.rows.map((r, i) => <tr key={i} className="border-t font-mono text-xs">
        <td className="py-2 pr-3 font-sans">{names[i]}</td><td className="pr-3">{r.reachable ? naturalDuration(r.eta) : tr("Nicht erreichbar")}</td>
        <td className="pr-3">{r.reachable ? fmtSuffix(r.balance) : "–"}</td><td className="pr-3">{fmtSuffix(r.gain)}/s</td><td>{naturalDuration(bp.totals[i + 1] ?? Infinity)}</td></tr>)}</tbody>
    </table></div>
    <Rows rows={[[tr("Ganzer Pfad bis Ziel"), naturalDuration(sim.total)], [tr("Ohne Kauf"), naturalDuration(base)], [tr("Zeit gespart / verloren"), diff(saved)]]} />
    <p className="mt-3 border-l-2 border-primary pl-3 text-sm font-medium" data-testid="path-advice">{tr(pathAdvice(bp.best, steps.length))}</p>
  </div>;
}

function MilestoneTable({ ms, c, g, steps, now }: { ms: Milestone[]; c: number; g: number; steps: { cost: number; gain: number }[] | null; now: number | null }) {
  const { t: tr, fmtSuffix, fmtFinish, naturalDuration } = useI18n();

  const rows = ms.map((m) => ({ m, v: val(m) })).filter((r): r is { m: Milestone; v: number } => r.v !== null).sort((a, b) => a.v - b.v);
  if (!rows.length) return <Hint>{tr("Beträge eintragen.")}</Hint>;
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 pr-3 font-medium">Milestone</th><th className="pr-3 font-medium">{tr("Nur aktueller Gain")}</th><th className="font-medium">{tr("Geplanter Pfad")}</th></tr></thead>
    <tbody>{rows.map(({ m, v }) => { const s = eta(c, v, g); return <tr key={m.id} className="border-t">
      <td className="py-2 pr-3"><span className="block">{m.name || "–"}</span><span className="font-mono text-xs text-muted-foreground">{fmtSuffix(v)}</span></td>
      <td className="pr-3 font-mono text-xs">{v <= c ? tr("Erreicht ✓") : naturalDuration(s)}<span className="block text-muted-foreground">{now === null || v <= c ? "" : fmtFinish(s, now)}</span></td>
      <td className="font-mono text-xs">{steps ? naturalDuration(simulatePath(c, g, v, steps).total) : tr("Kein Pfad")}</td></tr>; })}</tbody>
  </table><p className="mt-2 text-xs text-muted-foreground">{tr("„Geplanter Pfad“ = alle Pfad-Upgrades kaufen, dann bis zum Milestone farmen.")}</p></div>;
}

function Explain({ v, rec, facts, assumption, testid }: { v: Verdict; rec: string; facts: string; assumption: string; testid: string }) {
  const { t: tr } = useI18n();

  return <dl className="mt-4 space-y-1.5 text-xs">
    <div><dt className="inline font-semibold text-primary">{tr("Fakten:")} </dt><dd className="inline text-muted-foreground">{facts}</dd></div>
    <div><dt className="inline font-semibold text-foreground">{tr("Annahme:")} </dt><dd className="inline text-muted-foreground">{assumption}</dd></div>
    <div className={`border-l-2 pl-2 text-sm ${TONE[v]}`}><dt className="inline font-semibold">{tr("Empfehlung (")}{tr(STATUS[v])}): </dt><dd className="inline font-semibold" data-testid={testid}>{tr(rec)}</dd></div>
  </dl>;
}

function Rows({ rows }: { rows: [string, string][] }) {
  return <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words font-mono text-sm">{v}</dd></div>)}</dl>;
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return <section className="panel min-w-0 p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{title}</h2>{right}</div>{children}</section>;
}

function Field({ id, label, value, onChange, suffix, help }: { id: string; label: string; value: NU; onChange: (v: NU) => void; suffix?: string | undefined; help?: string | undefined }) {
  const { t: tr } = useI18n();

  const bad = value.v.trim() !== "" && val(value) === null;
  return <div className="min-w-0"><label htmlFor={id} className="mb-1 block text-xs font-medium">{label}</label>
    <UnitField id={id} label={label} value={value} onChange={onChange} suffix={suffix} invalid={bad} hideLabel />
    {(bad || help) && <p className={`mt-1 text-xs ${bad ? "text-destructive" : "text-muted-foreground"}`}>{bad ? tr("Ungültige Zahl") : help}</p>}</div>;
}

function TextField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return <div className="min-w-0"><label htmlFor={id} className="mb-1 block text-xs font-medium">{label}</label>
    <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field w-full px-3 py-2.5 font-mono outline-none" /></div>;
}