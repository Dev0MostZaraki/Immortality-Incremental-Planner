import { ChevronDown } from "lucide-react";
import { useI18n } from "./LanguageProvider";
import { derivedRequirement, parseProf, profDerived, type ProfInput } from "@/lib/proficiency";

type Props = { value: ProfInput; onChange: (key: keyof ProfInput, v: string) => void; gain: number | null };

const FIELDS: { key: keyof ProfInput; label: string; placeholder: string }[] = [
  { key: "profBaseLevel", label: "Proficiency-Level", placeholder: "0" },
  { key: "profBonusLevel", label: "Bonus-Level (optional)", placeholder: "+0" },
  { key: "profXP", label: "Aktuelle XP", placeholder: "0" },
  { key: "profRequirement", label: "Benötigte XP (falls angezeigt)", placeholder: "1" },
];

export function ProficiencyFields({ value, onChange, gain }: Props) {
  const { t, fmtSuffix, naturalDuration } = useI18n();
  const prof = parseProf(value);
  const touched = Object.values(value).some((v) => v.trim() !== "");
  const d = prof ? profDerived(prof, gain) : null;
  return <details className="group border-y py-3" open={touched || undefined} data-testid="prof-section">
    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
      <span>Proficiency <span className="font-normal text-muted-foreground">{t("(optional)")}</span></span>
      <span className="flex items-center gap-2">{prof && <span className="text-xs text-success" data-testid="prof-status">{t("Proficiency einbezogen")}</span>}<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" /></span>
    </summary>
    <div className="mt-3 grid grid-cols-2 gap-3">
      {FIELDS.map((f) => <div key={f.key} className="min-w-0">
        <label htmlFor={f.key} className="mb-1 block text-xs font-medium">{t(f.label)}</label>
        <input id={f.key} inputMode="numeric" autoComplete="off" placeholder={f.key === "profRequirement" ? String(derivedRequirement(Number(value.profBaseLevel)) ?? f.placeholder) : f.placeholder} value={value[f.key]} onChange={(e) => onChange(f.key, e.target.value.replace(/^\+/, ""))} className="field w-full min-w-0 px-3 py-2 font-mono outline-none" />
      </div>)}
    </div>
    {touched && !prof && <p className="mt-2 text-xs text-muted-foreground">{t("Level, aktuelle XP und benötigte XP als ganze Zahlen eintragen.")}</p>}
    {prof && d && <dl className="mt-3 grid grid-cols-2 gap-3 text-sm" data-testid="prof-derived">
      <div className="min-w-0"><dt className="text-xs text-muted-foreground">{t("Zeit bis zum nächsten Level")}</dt><dd className="mt-1 font-mono">{t("Lv {p0} in {p1}", { p0: d.nextBaseLevel, p1: naturalDuration(d.secondsToNext) })}</dd></div>
      {d.gainAfterNext !== null && <div className="min-w-0"><dt className="text-xs text-muted-foreground">{t("Erwarteter Gain")}</dt><dd className="mt-1 break-words font-mono">{fmtSuffix(d.gainAfterNext)}/s</dd></div>}
    </dl>}
  </details>;
}