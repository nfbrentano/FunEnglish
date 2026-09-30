export const THEME_PREFERENCES = ["system", "dark", "light", "sepia"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "fun-english-theme";
const THEME_CHANGE_EVENT = "fun-english-theme-change";

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  if (preference !== "system") return preference;
  return prefersDark ? "dark" : "light";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

const prefersDarkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preference, prefersDarkQuery().matches);
  root.dataset.themePreference = preference;
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this page view.
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Subscribes to preference changes (this tab, other tabs) and OS scheme changes. */
export function subscribeToTheme(onChange: () => void): () => void {
  const query = prefersDarkQuery();
  const onSystemChange = () => {
    if (readThemePreference() === "system") applyThemePreference("system");
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyThemePreference(readThemePreference());
    onChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  query.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    query.removeEventListener("change", onSystemChange);
  };
}

/**
 * Inline <head> script: applies the saved theme before the first paint so the page never flashes
 * the wrong theme. Mirrors readThemePreference + resolveTheme in plain ES5.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEME_PREFERENCES)}.indexOf(p)<0)p="system";var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var r=document.documentElement;r.dataset.theme=t;r.dataset.themePreference=p;}catch(e){}})();`;
