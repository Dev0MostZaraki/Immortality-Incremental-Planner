import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageProvider";
import { SamsaraWorld10 } from "./SamsaraWorld10";

const mount = () =>
  render(
    <LanguageProvider>
      <SamsaraWorld10 />
    </LanguageProvider>,
  );

describe("Samsara World 10 module", () => {
  beforeEach(() => localStorage.clear());

  it("shows verified data and explicitly marks unknown milestone costs", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Samsara" })).toBeInTheDocument();
    expect(screen.getByText("Karmic Milestones")).toBeInTheDocument();
    expect(screen.getAllByText("Unbekannt").length).toBeGreaterThan(0);
    expect(screen.getByText("More Threads")).toBeInTheDocument();
  });

  it("compares upgrades and creates a purchase route from player inputs", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Aktuelle Karmic Ashes"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Ashes pro Sekunde"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Ashes pro Sekunde Einheit"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^M1 ·/ }));
    expect(screen.getByTestId("samsara-route")).toBeInTheDocument();
    expect(screen.getAllByText("Für dieses Ziel kaufen").length).toBeGreaterThan(0);
  });
});
