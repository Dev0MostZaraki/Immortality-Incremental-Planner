import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useI18n } from "./LanguageProvider";
import { alternateDuration } from "@/lib/presentation";
import { YEAR_SECONDS, type calculatePlan } from "@/lib/planner";

type Props = {
  result: ReturnType<typeof calculatePlan> | null;
  gain: number | null; current: number | null; target: number | null;
  now: number | null; copied: boolean; copyError: boolean; onCopy: () => void;
};

export function EnduranceResult({ result: r, gain: g, current: c, target: t, now, copied, copyError, onCopy }: Props) {
  const { t: tr, language, fmtPlain, fmtSuffix, fmtFinish, naturalDuration } = useI18n();
  const ready = r !== null && g !== null && c !== null && t !== null;
  return <section className="result-panel min-w-0 p-5 sm:p-7 min-[1440px]:p-8" aria-labelledby="res-h" data-testid="endurance-result">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 id="res-h" className="min-w-0 text-sm font-medium text-muted-foreground">{tr("Ziel:")} <span className="font-mono text-foreground">{t === null ? "–" : fmtSuffix(t)}</span></h2>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={onCopy} disabled={!ready} title={copied ? tr("Kopiert") : tr("Ergebnis kopieren")} aria-label={copied ? tr("Kopiert") : tr("Ergebnis kopieren")}>{copied ? <Check /> : <Copy />}</Button>
    </div>
    {!ready ? <p className="my-8 max-w-prose text-muted-foreground">{tr("Bitte gültige Werte für Gain und Ziel eingeben.")}</p> : <>
      <div className="mb-6 mt-4" aria-live="polite">
        <p className="mb-2 text-xs text-muted-foreground">{tr(r.reached ? "Alles geschafft" : "Verbleibende Zeit")}</p>
        <p className={`eta-value font-mono text-3xl font-semibold leading-tight sm:text-4xl min-[1440px]:text-5xl ${r.reached ? "text-success" : "text-primary"}`} data-testid="main-eta">{r.reached ? tr("Ziel erreicht") : naturalDuration(r.secs)}</p>
        {Number.isFinite(r.secs) && <p className="mt-3 text-sm text-foreground" data-testid="main-finish">{tr("Fertig am")} <span className="font-mono">{now === null ? "–" : fmtFinish(r.secs, now)}</span></p>}
        {!r.reached && Number.isFinite(r.secs) && <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="alternate-duration">{alternateDuration(r.secs, language)}</p>}
        {!r.reached && g === 0 && <p className="mt-2 text-sm text-muted-foreground">{tr("Mit 0 Gain wächst deine Endurance nicht.")}</p>}
      </div>
      <div className="border-y py-4">
        <p className="mb-2 text-xs text-muted-foreground">{tr("Fortschritt")}</p>
        <p className="mb-3 break-words font-mono text-sm" data-testid="progress-amount">{fmtSuffix(c)} / {fmtSuffix(t)} · {fmtPlain(r.pct, 2)}%</p>
        <Progress value={r.pct} aria-label={tr("Fortschritt zum Ziel")} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
        {[[tr("Noch benötigt"), fmtSuffix(r.remaining)], [tr("Aktueller Gain / s"), fmtSuffix(g)], [tr("Pro Minute"), fmtSuffix(g * 60)], [tr("Pro Stunde"), fmtSuffix(g * 3600)], [tr("Pro Tag"), fmtSuffix(g * 86400)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-sm font-medium">{value}</dd></div>)}
      </dl>
      {Number.isFinite(r.secs) && r.secs > 7 * 86400 && <div className="mt-5 max-w-prose border-l-2 border-primary pl-3">
        <p className="text-xs font-medium text-primary">{tr("Langfristiges Ziel")}</p>
        {r.secs > YEAR_SECONDS && <p className="mt-1 font-mono text-sm">≈ {fmtPlain(r.secs / YEAR_SECONDS, 2)} {tr("Jahre · ≈")} {fmtPlain(r.secs / 86400, 0)} {tr("Tage")}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{tr("Die Restzeit ergibt sich aus Zielabstand und deinem Gain.")}</p>
      </div>}
    </>}
    {now !== null && <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">{tr("Jetzt:")} <span className="font-mono">{fmtFinish(0, now)}</span></p>}
    {copyError && <p role="status" className="mt-2 text-xs text-destructive">{tr("Kopieren nicht möglich. Bitte Browser-Berechtigung prüfen.")}</p>}
  </section>;
}