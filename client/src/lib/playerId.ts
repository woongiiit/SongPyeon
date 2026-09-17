const STORAGE_KEY = "songpyeon_player_id";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser identity for ranking "(나)" highlights. */
export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing) return existing.slice(0, 64);
    const id = createId();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private mode / blocked storage — ephemeral id for this session only
    return createId();
  }
}
