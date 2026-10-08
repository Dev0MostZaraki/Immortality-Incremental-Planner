import { messages, type TranslationKey } from "./i18n-messages";

export type Language = "de" | "en";
export const LANGUAGE_KEY = "ii-planner-language-v1";
export const localeFor = (language: Language) => language === "en" ? "en-US" : "de-DE";
export const restoreLanguage = (raw: unknown): Language => raw === "en" ? "en" : "de";
export function translate(language: Language, key: TranslationKey | string, params: Record<string, string | number> = {}): string {
  if (language === "en" && !Object.hasOwn(messages, key)) {
    // Legacy pure-math advice stays deterministic; match its parameterized source message centrally.
    for (const [source, english] of Object.entries(messages)) {
      if (!source.includes("{p")) continue;
      const names: string[] = [];
      const pattern = source.split(/(\{\w+\})/).map((part) => {
        if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return "(.+?)"; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("");
      const match = new RegExp(`^${pattern}$`).exec(key);
      if (match) {
        const values = Object.fromEntries(names.map((name, i) => [name, translate(language, match[i + 1] ?? "")]));
        return english.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
      }
    }
  }
  const template = language === "en" && Object.hasOwn(messages, key) ? messages[key as TranslationKey] : key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}