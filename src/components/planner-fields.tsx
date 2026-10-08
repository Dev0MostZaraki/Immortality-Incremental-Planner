import { useI18n } from "@/components/LanguageProvider";
import type { ReactNode } from "react";
import { SUFFIXES, toValue } from "@/lib/endurance";

export type NU = { v: string; u: string };

/** Parsed value of an optional field; null when empty or invalid. */
export const val = (x: NU): number | null => { const p = toValue(x.v, x.u); return p.ok === true ? p.value : null; };

export function UnitField({ id, label, value, onChange, suffix, invalid, describedBy, hideLabel }: {
  id: string; label: string; value: NU; onChange: (v: NU) => void; suffix?: string | undefined; invalid?: boolean; describedBy?: string; hideLabel?: boolean;
}) {
  const { t: tr } = useI18n();

  return (
    <div className={`field flex min-w-0 flex-1 items-stretch overflow-hidden ${invalid ? "border-destructive" : ""}`}>
      {!hideLabel && <label htmlFor={id} className="sr-only">{label}</label>}
      <input id={id} inputMode="decimal" autoComplete="off" value={value.v} placeholder="0" aria-invalid={invalid} aria-describedby={describedBy}
        onChange={(e) => onChange({ ...value, v: e.target.value })}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-base outline-none" />
      <select aria-label={tr("{p0} Einheit", { p0: label })} value={value.u} onChange={(e) => onChange({ ...value, u: e.target.value })}
        className="border-l bg-secondary px-2 font-mono text-sm text-secondary-foreground outline-none">
        {SUFFIXES.map((u) => <option key={u} value={u}>{u || "–"}</option>)}
      </select>
      {suffix && <span className="flex items-center bg-secondary px-2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export function Hint({ children, error }: { children: ReactNode; error?: boolean }) {
  return <p className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{children}</p>;
}