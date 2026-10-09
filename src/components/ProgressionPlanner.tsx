import { useI18n } from "@/components/LanguageProvider";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUFFIXES, eta, parseNum } from "@/lib/endurance";
import { bestPrefix, compareGain, pathAdvice, resetCompare, simulatePath, upgradeROI, whatIf } from "@/lib/planner";
import { Hint, UnitField, val, type NU } from "./planner-fields";

import { PROG_DEFAULTS, type Prog, type PathItem, type Milestone } from "@/lib/progression-state";

const num = (s: string) => { const p = parseNum(s); return p.ok === true ? p.value : null; };

export function ProgressionPlanner({ g, c, t, n, p, setP, now, onCopy, copied, onEditCalculator }: {
  g: number | null; c: number | null; t: number | null; n: number | null; p: Prog;
  setP: (v: Prog | ((p: Prog) => Prog)) => void; now: number | null; onCopy: () => void; copied: boolean; onEditCalculator: () => void;
}) {
  const { t: tr, fmtSuffix, fmtFinish, naturalDuration } = useI18n();
  const set = <K extends keyof Prog>(k: K, v: Prog[K]) => setP((state) => ({ ...state, [k]: v }));
  const ready = g !== null && c !== null && t !== null;
  const genericCost = val(p.upCost), genericGain = val(p.upGain);
  const steps = p.path.flatMap((row) => { const cost = val(row.cost), gain = val(row.gain); return cost !== null && gain !== null ? [{ cost, gain }] : []; });
  const pathValid = steps.length === p.path.length;
  const field = (key: keyof Prog & string, label: string, suffix?: string, help?: string) => <Field id={`p-${key}`} label={label} value={p[key] as NU} onChange={(value) => set(key, value as never)} suffix={suffix} help={help} />;
  const difference = (saved: number) => !Number.isFinite(saved) ? tr(saved > 0 ? "Ziel wird erst so erreichbar" : "Ziel wird unerreichbar") : `${saved < 0 ? "−" : "+"}${naturalDuration(Math.abs(saved))}`;

  return <div className="space-y-4" data-testid="more-tools">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><h2 className="text-xl font-semibold">{tr("Weitere Tools")}</h2><p className="mt-1 text-sm text-muted-foreground">{tr("Optionale Vergleiche für Increase, Upgrades, Milestones, Resets und Was-wäre-wenn-Szenarien.")}</p></div><div className="flex max-w-full flex-wrap gap-1"><Button variant="ghost" size="sm" onClick={onEditCalculator}>{tr("Rechnerwerte bearbeiten")}</Button><Button variant="ghost" size="sm" onClick={onCopy} disabled={!ready}>{copied ? <Check /> : <Copy />}{tr("Tool-Zusammenfassung kopieren")}</Button><Button variant="ghost" size="sm" onClick={() => setP(PROG_DEFAULTS)}><RotateCcw />{tr("Tools zurücksetzen")}</Button></div></div>
    {!ready && <Hint>{tr("Zuerst aktuellen Gain, aktuelle Endurance und Ziel im Rechner eintragen.")}</Hint>}

    <Card title="Increase" collapsed testid="tool-increase">
      {!ready ? <Hint>{tr("Basiswerte fehlen.")}</Hint> : n === null ? <Hint>{tr("Nächsten Gain eintragen, um Increase zu bewerten.")}</Hint> : (() => { const result = compareGain(c, t, g, n); return <Rows rows={[[tr("Ohne Increase"), naturalDuration(result.a)], [tr("Increase jetzt"), naturalDuration(result.b)], [tr("Differenz"), difference(result.saved)]]} />; })()}
      <p className="mt-3 text-xs text-muted-foreground">{tr("Increase setzt Strength zurück. Die Endurance-ETA berücksichtigt nur die eingegebenen Endurance-Gains; die Erholungszeit für Strength ist nicht eingerechnet.")}</p>
    </Card>

    <Card title={tr("Allgemeines Upgrade")} collapsed testid="generic-upgrade">
      <div className="grid gap-3 sm:grid-cols-2"><TextField id="p-name" label={tr("Upgrade-Name")} value={p.upName} onChange={(value) => set("upName", value)} />{field("upCost", tr("Upgrade-Kosten"))}{field("upGain", tr("Gain nach Upgrade (Annahme)"), "/ s")}</div>
      {!ready ? <Hint>{tr("Basiswerte fehlen.")}</Hint> : genericCost === null || genericGain === null ? <Hint>{tr("Upgrade-Kosten und Gain nach Upgrade eintragen – ohne diese Werte gibt es keine Empfehlung.")}</Hint> : (() => { const result = upgradeROI(c, g, t, genericCost, genericGain); return <Rows rows={[[tr("Bezahlbar in"), result.wait === 0 ? tr("Jetzt bezahlbar") : naturalDuration(result.wait)], [tr("Ohne Kauf"), naturalDuration(result.a)], [tr("Mit Upgrade"), naturalDuration(result.b)], [tr("Zeit gespart / verloren"), difference(result.saved)]]} />; })()}
      <details className="mt-5 border-t pt-4" data-testid="generic-path"><summary className="cursor-pointer text-sm font-semibold">{tr("Erweiterter allgemeiner Pfad")}</summary><div className="mt-4"><Button variant="outline" size="sm" disabled={p.path.length >= 6} onClick={() => set("path", [...p.path, { id: Date.now(), name: `Upgrade ${p.path.length + 1}`, level: "", cost: { v: "", u: "Qa" }, gain: { v: "", u: "T" } }])}>{tr("+ Upgrade (")}{p.path.length}/6)</Button>{p.path.length === 0 ? <Hint>{tr("Füge Upgrades in Kaufreihenfolge hinzu: Kosten und Gain danach.")}</Hint> : <PathEditor p={p} set={set} />}{ready && p.path.length > 0 && (pathValid ? <PathResult c={c} g={g} t={t} steps={steps} names={p.path.map((row) => row.name)} /> : <Hint>{tr("Bitte Kosten und Gain für jedes Upgrade eintragen.")}</Hint>)}</div></details>
    </Card>

    <Card title="Milestones" collapsed testid="tool-milestones" right={<Button variant="outline" size="sm" disabled={p.milestones.length >= 8} onClick={() => set("milestones", [...p.milestones, { id: Date.now(), name: "", v: "", u: "Qa" }])}>+ ({p.milestones.length}/8)</Button>}>
      {p.milestones.length === 0 ? <Hint>{tr("Bis zu 8 Ziele oder Kosten mit Namen.")}</Hint> : <><div className="mb-4 grid gap-2 md:grid-cols-2">{p.milestones.map((milestone, index) => <div key={milestone.id} className="flex min-w-0 gap-2"><input aria-label={tr("Milestone {p0} Name", { p0: index + 1 })} value={milestone.name} placeholder={tr("Name")} onChange={(event) => set("milestones", p.milestones.map((item) => item.id === milestone.id ? { ...item, name: event.target.value } : item))} className="field w-28 min-w-0 px-2 text-sm outline-none" /><UnitField id={`ms-${milestone.id}`} label={`Milestone ${index + 1}`} value={milestone} onChange={(value) => set("milestones", p.milestones.map((item) => item.id === milestone.id ? { ...item, ...value } : item))} /><Button variant="ghost" size="icon" aria-label={tr("Milestone {p0} entfernen", { p0: index + 1 })} onClick={() => set("milestones", p.milestones.filter((item) => item.id !== milestone.id))}><X /></Button></div>)}</div>{ready && <MilestoneTable ms={p.milestones} c={c} g={g} steps={null} now={now} />}</>}
    </Card>

    <div className="grid gap-4 lg:grid-cols-2"><Card title={tr("Reset / Perseverance Vergleich")} collapsed testid="tool-reset"><div className="grid gap-3 sm:grid-cols-2">{field("resetBefore", tr("Gain vor Reset"), "/ s", tr("Leer = aktueller Gain"))}{field("resetAfter", tr("Erwarteter Gain nach Reset (Annahme)"), "/ s")}{field("resetLoss", tr("Verlorene Endurance / Kosten"))}</div>{(() => { const before = val(p.resetBefore) ?? g, after = val(p.resetAfter), loss = val(p.resetLoss) ?? 0; if (!ready || before === null || after === null) return <Hint>{tr("Erwarteten Gain nach Reset eintragen.")}</Hint>; const result = resetCompare(c, before, t, after, loss); return <Rows rows={[[tr("Ohne Reset"), naturalDuration(result.a)], [tr("Nach Reset"), naturalDuration(result.b)], [tr("Differenz"), difference(result.saved)]]} />; })()}</Card>
    <Card title={tr("Was wäre wenn")} collapsed testid="tool-what-if"><div className="grid gap-3 sm:grid-cols-3"><TextField id="wi-mult" label="Gain ×" value={p.wiMult} onChange={(value) => set("wiMult", value)} />{field("wiFlat", tr("+ Gain flach"), "/ s")}<TextField id="wi-target" label={tr("Ziel ×")} value={p.wiTarget} onChange={(value) => set("wiTarget", value)} /></div>{(() => { const multiplier = num(p.wiMult), targetMultiplier = num(p.wiTarget), flat = val(p.wiFlat) ?? 0; if (!ready || multiplier === null || targetMultiplier === null) return <Hint>{tr("Basiswerte fehlen.")}</Hint>; const result = whatIf(c, g, t, multiplier, flat, targetMultiplier); return <Rows rows={[[tr("Neuer Gain"), `${fmtSuffix(result.gain)}/s`], [tr("Neues Ziel"), fmtSuffix(result.target)], ["ETA", naturalDuration(result.secs)], [tr("Fertig am"), now === null ? "–" : fmtFinish(result.secs, now)]]} />; })()}</Card></div>
  </div>;
}

function PathEditor({ p, set }: { p: Prog; set: <K extends keyof Prog>(k: K, v: Prog[K]) => void }) {
  const { t: tr } = useI18n();

  const upd = (id: number, patch: Partial<PathItem>) => set("path", p.path.map((r) => r.id === id ? { ...r, ...patch } : r));
  const move = (i: number, d: number) => { const a = [...p.path]; const [r] = a.splice(i, 1); if (!r) return; a.splice(i + d, 0, r); set("path", a); };
  return <div className="space-y-3">{p.path.map((r, i) => (
    <div key={r.id} className="grid min-w-0 gap-2 border-l-2 border-border pl-3 min-[1100px]:grid-cols-[8rem_4rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
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

function Rows({ rows }: { rows: [string, string][] }) {
  return <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words font-mono text-sm">{v}</dd></div>)}</dl>;
}

function Card({ title, right, children, collapsed = false, testid }: { title: string; right?: ReactNode; children: ReactNode; collapsed?: boolean; testid?: string }) {
  if (collapsed) return <details className="min-w-0 border-y py-4" data-testid={testid}><summary className="cursor-pointer text-base font-semibold">{title}</summary><div className="mt-4 min-w-0">{right && <div className="mb-3 flex flex-wrap gap-2">{right}</div>}{children}</div></details>;
  return <section className="panel min-w-0 p-4 sm:p-5"><div className="mb-3 grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between"><h2 className="min-w-0 text-base font-semibold">{title}</h2>{right}</div>{children}</section>;
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