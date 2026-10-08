import { useRef, useState } from "react";
import { Download, Upload, MoreHorizontal, RotateCcw, Github, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "./LanguageProvider";
import { ConfirmAction } from "./ConfirmAction";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "./ui/alert-dialog";
import { APP_VERSION, clearAppData, exportBackup, importBackup, parseBackup } from "@/lib/backup";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

const GITHUB = "https://github.com/Dev0MostZaraki/Immortality-Incremental-Planner";
export function PlannerUtilities({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const download = () => {
    try {
      const blob = new Blob([exportBackup(localStorage)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `immortality-planner-${APP_VERSION}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback("Daten exportiert.");
    } catch { setFeedback("Daten konnten nicht exportiert werden."); }
  };
  const reload = (message: string) => { setFeedback(message); setTimeout(() => window.location.reload(), 800); };
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="shrink-0" aria-label={t("Mehr Aktionen")} title={t("Mehr Aktionen")}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem className="min-h-10" onSelect={() => setDataOpen(true)}><Download />{t("Daten")}</DropdownMenuItem>
        <DropdownMenuItem className="min-h-10" onSelect={onReset}><RotateCcw />{t("Endurance-Eingaben zurücksetzen")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10"><a href={GITHUB} target="_blank" rel="noopener noreferrer"><Github />GitHub</a></DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10"><a href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer"><ExternalLink />{t("Fehler melden")}</a></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={dataOpen} onOpenChange={setDataOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
      <DialogTitle>{t("Daten")}</DialogTitle>
      <DialogDescription>{t("Berechnungen und Fortschritt werden lokal in deinem Browser gespeichert. Keine Anmeldung erforderlich.")}</DialogDescription>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={download}><Download />{t("JSON exportieren")}</Button>
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}><Upload />{t("JSON importieren")}</Button>
        <ConfirmAction label={t("Alle lokalen Daten löschen")} description={t("Alle gespeicherten Eingaben, Law-Daten und die Spracheinstellung werden gelöscht. Exportiere vorher ein Backup, wenn du sie behalten möchtest.")} onConfirm={() => {
          try { clearAppData(localStorage); reload("Lokale Daten gelöscht."); } catch { setFeedback("Lokale Daten konnten nicht gelöscht werden."); }
        }} />
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label={t("JSON importieren")} onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        try { if (file.size > 1_000_000) throw new Error("Too large"); const raw = await file.text(); parseBackup(raw); setPending(raw); }
        catch { setFeedback("Ungültiges Backup. Bitte eine gültige Planner-JSON-Datei auswählen."); }
      }} />
    {feedback && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{t(feedback)}</p>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogTitle>{t("Backup importieren?")}</AlertDialogTitle>
        <AlertDialogDescription>{t("Das Backup ersetzt deine gespeicherten Eingaben, Law-Daten und Spracheinstellung.")}</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction onClick={() => {
          if (pending === null) return;
          try { importBackup(pending, localStorage); reload("Backup importiert. Die Seite wird neu geladen."); }
          catch { setFeedback("Backup konnte nicht gespeichert werden."); }
        }}>{t("Importieren")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function PublicFooter() {
  const { t } = useI18n();
  return <footer className="mt-7 space-y-2 border-t pt-5 text-center text-xs text-muted-foreground">
    <p>{t("Berechnungen und Fortschritt werden lokal in deinem Browser gespeichert. Keine Anmeldung erforderlich.")}</p>
    <p>v{APP_VERSION} · {t("Law-Daten: Okt. 2026")} · {t("Inoffizielles Fan-Tool")}</p>
  </footer>;
}