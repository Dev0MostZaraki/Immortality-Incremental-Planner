import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { LanguageProvider, LanguageSwitcher, useI18n } from "./LanguageProvider";
import { LANGUAGE_KEY } from "@/lib/i18n";

function Harness() {
  const { language, t } = useI18n();
  const [gain, setGain] = useState("454");
  return <><LanguageSwitcher /><output data-testid="language">{language}</output><input aria-label="gain" value={gain} onChange={(e) => setGain(e.target.value)} /><output data-testid="recommendation">{t("Increase jetzt sinnvoll")}</output></>;
}
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("shared language state", () => {
  it("defaults DE, switches EN and back without changing input", async () => {
    render(<LanguageProvider><Harness /></LanguageProvider>);
    expect(screen.getByTestId("language")).toHaveTextContent("de");
    fireEvent.change(screen.getByLabelText("gain"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByLabelText("gain")).toHaveValue("600");
    expect(document.documentElement.lang).toBe("en");
    await waitFor(() => expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en"));
    fireEvent.click(screen.getByRole("button", { name: "Deutsch" }));
    expect(screen.getByTestId("language")).toHaveTextContent("de");
    expect(screen.getByLabelText("gain")).toHaveValue("600");
  });
  it("restores the last selected language on remount", async () => {
    const view = render(<LanguageProvider><Harness /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en"));
    view.unmount();
    render(<LanguageProvider><Harness /></LanguageProvider>);
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });
});