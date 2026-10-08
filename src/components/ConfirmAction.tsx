import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { useI18n } from "./LanguageProvider";

export function ConfirmAction({ label, description, onConfirm }: { label: string; description: string; onConfirm: () => void }) {
  const { t } = useI18n();
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-auto min-h-9 whitespace-normal text-destructive">{label}</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
      <AlertDialogHeader><AlertDialogTitle>{label}?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{t("Bestätigen")}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}