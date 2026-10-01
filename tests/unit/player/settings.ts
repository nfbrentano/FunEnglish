import type { PlayerSettings } from "@/lib/player/types";

/** Player settings for plugin tests: no shuffle, no timer, "Team N" names. */
export function testSettings(overrides: Partial<PlayerSettings> = {}): PlayerSettings {
  const teams = overrides.teams ?? 1;
  return {
    shuffle: false,
    teams,
    teamNames: Array.from({ length: teams }, (_, i) => `Team ${i + 1}`),
    timerSeconds: null,
    extra: {},
    ...overrides,
  };
}
