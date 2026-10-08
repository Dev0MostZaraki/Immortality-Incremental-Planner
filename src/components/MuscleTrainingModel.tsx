import { useI18n } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { UnitField, val, type NU } from "./planner-fields";
import type { Prog } from "@/lib/progression-state";
import { parseNum } from "@/lib/endurance";
import { baseCostDiffPct, derivedBaseCost, clampPreview, deriveCostMultiplier, effectiveCostMultiplier, effectiveCurrentCost, gainPreview, generatePath, parseMultiplier, projectedCosts } from "@/lib/muscle-training";

type Props = { p: Prog; setP: (v: Prog | ((p: Prog) => Prog)) => void; g: number | null };

export function MuscleTrainingModel({ p, setP, g }: Props) {
  const { t: tr, fmtSuffix, fmtPlain } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Prog>(k: K, v: Prog[K]) => setP((x) => ({ ...x, [k]: v }));
  const gm = parseMultiplier(p.mtGainMultiplier);
  const cm = effectiveCostMultiplier(p);
  const derived = deriveCostMultiplier(val(p.mtObservedCostA), val(p.mtObservedCostB));
  const cost = effectiveCurrentCost(p);
  const lvl = parseNum(p.mtLevel);
  const base = derivedBaseCost(val(p.upCost), cm.value, lvl.ok === true ? lvl.value : null);
  const baseDiff = baseCostDiffPct(val(p.mtBaseCost), base);
  const count = clampPreview(p.mtPreviewCount);
  const gains = g !== null && gm !== null ? gainPreview(g, gm, count) : [];
  const costs = projectedCosts(cost, cm.value, count);
  const canGenerate = g !== null && gm !== null && costs.length > 0;
  const apply = () => setP((x) => ({ ...x, path: generatePath(x, g).slice(0, 6) }));
  const nu = (k: "mtBaseCost" | "mtObservedCostA" | "mtObservedCostB", label: string) => (
    <div className="min-w-0"><label htmlFor={`mt-${k}`} className="mb-1 block text-xs font-medium">{label}</label>
      <UnitField id={`mt-${k}`} label={label} value={p[k]} onChange={(v: NU) => set(k, v)} hideLabel invalid={p[k].v.trim() !== "" && val(p[k]) === null} /></div>
  );
  const text = (id: string, label: string, value: string, onChange: (v: string) => void, invalid: boolean, placeholder?: string) => (
    <div className="min-w-0"><label htmlFor={id} className="mb-1 block text-xs font-medium">{label}</label>
      <div className={`field flex items-stretch overflow-hidden ${invalid ? "border-destructive" : ""}`}>
        <input id={id} inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono outline-none" />
        <span className="flex items-center bg-secondary px-2 text-xs text-muted-foreground">×</span>
      </div></div>
  );

  return (
    <details className="rounded-xl border bg-card/60 p-4 sm:p-5" data-testid="mt-model">
      <summary className="cursor-pointer text-lg font-semibold">{tr("Muscle Training Modell")}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{gm !== null ? `×${fmtPlain(gm, 4)} ${tr("pro Kauf")}` : ""}</span></summary>
      <p className="mt-3 rounded-md border-l-2 border-primary bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">{tr("Beobachteter Wert: Kosten ×2,1 pro Kauf · Gain ×1,4 pro Kauf. Nicht offiziell bestätigt; bei Patches erneut prüfen.")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 min-[1100px]:grid-cols-4">
        <div className="min-w-0"><label htmlFor="mt-level" className="mb-1 block text-xs font-medium">{tr("Aktuelles Muscle-Training-Level (optional)")}</label>
          <input id="mt-level" inputMode="numeric" value={p.mtLevel} onChange={(e) => set("mtLevel", e.target.value)} className="field w-full px-3 py-2.5 font-mono outline-none" /></div>
        {text("mt-gm", tr("Gain-Multiplikator pro Kauf"), p.mtGainMultiplier, (v) => set("mtGainMultiplier", v), gm === null)}
        {text("mt-cm", tr("Kosten-Multiplikator pro Kauf (optional)"), p.mtCostMultiplier, (v) => set("mtCostMultiplier", v), p.mtCostMultiplier.trim() !== "" && parseMultiplier(p.mtCostMultiplier) === null)}
        {nu("mtBaseCost", tr("Beobachtete Basiskosten (optional, nur Gegenprobe)"))}
        <div className="min-w-0"><label htmlFor="mt-count" className="mb-1 block text-xs font-medium">{tr("Vorschau-Level (1–10)")}</label>
          <input id="mt-count" type="number" min={1} max={10} value={p.mtPreviewCount} onChange={(e) => set("mtPreviewCount", clampPreview(Number(e.target.value)))} className="field w-full px-3 py-2.5 font-mono outline-none" /></div>
        <label className="flex items-center gap-3 self-end py-2 text-sm"><Switch checked={p.mtAutoGain} onCheckedChange={(v) => set("mtAutoGain", v)} aria-label={tr("Gain automatisch berechnen")} />{tr("Gain automatisch berechnen")}</label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tr("Community-/Messwert, editierbar. Zwei beobachtete Kosten unten haben Vorrang.")} {tr("Aktuelle Upgrade-Kosten kommen aus „Aktueller Stand“.")} {tr("Beispielrechnung: 2 Sx/s × 1,4 = 2,8 Sx/s")}</p>

      <div className="mt-4 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">{tr("Aus zwei Kosten ableiten")}</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">{nu("mtObservedCostA", tr("Beobachtete Kosten A"))}{nu("mtObservedCostB", tr("Beobachtete Kosten B (nächster Kauf)"))}</div>
        {derived !== null && <p className="mt-2 text-xs" data-testid="mt-derived">{tr("Abgeleiteter Kosten-Multiplikator: ×{p0} (aus deinen Beobachtungen, nicht offiziell)", { p0: fmtPlain(derived, 4) })}</p>}
      </div>

      {base !== null && <p className="mt-3 text-sm" data-testid="mt-base">{tr("Abgeleitete Basiskosten")}: <span className="font-mono">{fmtSuffix(base)}</span>
        <span className="ml-2 text-xs text-muted-foreground">= {fmtSuffix(val(p.upCost) ?? 0)} ÷ {fmtPlain(cm.value ?? 0, 4)}^{lvl.ok === true ? lvl.value : ""}</span>
        {baseDiff !== null && <span className="ml-2 text-xs text-muted-foreground" data-testid="mt-base-diff">{tr("Abweichung zur beobachteten Basis: {p0} % (Rundung im Spiel möglich)", { p0: `${baseDiff >= 0 ? "+" : "−"}${fmtPlain(Math.abs(baseDiff), 2)}` })}</span>}</p>}
      <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">{tr("Formel")}</summary>
        <p className="mt-2">{tr("Bei Level n gilt als beobachtetes Modell: Kosten des nächsten Kaufs = Basiskosten × 2,1^n. Basiskosten = aktueller angezeigter Preis ÷ 2,1^n. Gain nach k Käufen = aktueller Gain × 1,4^k.")} {tr("Angezeigte Spielwerte können gerundet sein.")}</p></details>

      {cm.value === null && <p className="mt-3 text-sm text-muted-foreground" data-testid="mt-cost-unknown">{tr("Kosten-Skalierung unbekannt – nur der nächste Gain wird automatisch berechnet.")}</p>}

      {gains.length > 0 ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm" data-testid="mt-preview">
        <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3">{tr("Käufe")}</th><th className="py-1 pr-3">{tr("Gain danach")}</th>{costs.length > 0 && <th className="py-1">{tr("Kosten dieses Kaufs")}</th>}</tr></thead>
        <tbody className="font-mono">{gains.map((x, i) => <tr key={i} className="border-t border-border/60"><td className="py-1 pr-3">+{i + 1}</td><td className="py-1 pr-3">{fmtSuffix(x)}/s</td>{costs.length > 0 && <td className="py-1">{fmtSuffix(costs[i] ?? 0)}{i === 0 ? ` (${tr("nächster Kauf")})` : ""}</td>}</tr>)}</tbody>
      </table></div> : <p className="mt-3 text-sm text-muted-foreground">{tr("Aktuellen Gain und gültigen Multiplikator eingeben, um die Vorschau zu sehen.")}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={!canGenerate} onClick={() => p.path.length > 0 ? setConfirm(true) : apply()}>{tr("Pfad erzeugen")}</Button>
        {!canGenerate && <span className="text-xs text-muted-foreground">{tr("Benötigt Gain, aktuelle Kosten, Kosten- und Gain-Multiplikator.")}</span>}
        {count > 6 && canGenerate && <span className="text-xs text-muted-foreground">{tr("Der Upgrade-Pfad übernimmt höchstens 6 Käufe.")}</span>}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>{tr("Upgrade-Pfad ersetzen?")}</AlertDialogTitle><AlertDialogDescription>{tr("Der vorhandene Upgrade-Pfad wird durch den erzeugten Muscle-Training-Pfad ersetzt.")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{tr("Abbrechen")}</AlertDialogCancel><AlertDialogAction onClick={apply}>{tr("Ersetzen")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </details>
  );
}