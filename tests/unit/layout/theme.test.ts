import { describe, expect, it } from "vitest";
import {
  readThemePreference,
  resolveTheme,
  setThemePreference,
  THEME_STORAGE_KEY,
  themeInitScript,
} from "@/lib/theme";
import { colorScheme } from "../setup";

const runInitScript = () => new Function(themeInitScript)();

describe("resolveTheme", () => {
  it("follows the OS for System and keeps explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("sepia", true)).toBe("sepia");
  });
});

describe("theme init script", () => {
  it("applies the saved theme before the app loads", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runInitScript();

    expect(document.documentElement.dataset.theme).toBe("sepia");
    expect(document.documentElement.dataset.themePreference).toBe("sepia");
  });

  it("uses System (light OS) when nothing valid is saved", () => {
    colorScheme.prefersDark = false;
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    runInitScript();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("system");
  });
});

describe("setThemePreference", () => {
  it("saves and applies the choice", () => {
    setThemePreference("light");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(readThemePreference()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
