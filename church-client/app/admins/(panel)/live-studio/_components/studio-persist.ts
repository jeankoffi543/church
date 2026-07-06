/**
 * Tiny localStorage helpers to persist the Live Studio session-view state (the
 * current scene, the on-air snapshot) so a page refresh restores where the
 * operator was, instead of resetting to the first scene / an empty program.
 * Scene DEFINITIONS live in the backend (`live_scenes`); this is only the
 * ephemeral view state.
 */

export const SS_CURRENT_SCENE = "studio_current_scene";
export const SS_PROGRAM_SCENE = "studio_program_scene";
export const SS_PROGRAM_LAYERS = "studio_program_layers";
export const SS_PREVIEW_VERSE = "studio_preview_verse";

export function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage disabled / private mode */
  }
}

export function lsGetJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsSetJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage disabled / private mode */
  }
}
