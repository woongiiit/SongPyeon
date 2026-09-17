export type Ingredient = "sesame" | "bean" | "chestnut";

export const INGREDIENT_META: Record<
  Ingredient,
  { label: string; short: string; fill: string; accent: string; description: string }
> = {
  sesame: {
    label: "깨",
    short: "고소한 깨",
    fill: "#f3e6c8",
    accent: "#5c4030",
    description: "고소하게 갈아 넣은 깨 소",
  },
  bean: {
    label: "콩",
    short: "달콤한 콩",
    fill: "#efe4d0",
    accent: "#8a6a2f",
    description: "달콤한 콩고물 소",
  },
  chestnut: {
    label: "밤",
    short: "밤 송편",
    fill: "#f0dfc4",
    accent: "#7a4a28",
    description: "포슬포슬 밤 소",
  },
};

/** Half-moon songpyeon silhouette in viewBox 0 0 300 240 */
export const SONGPYEON_PATH =
  "M 40 150 C 40 70, 110 30, 150 30 C 190 30, 260 70, 260 150 C 260 175, 230 200, 150 200 C 70 200, 40 175, 40 150 Z";

export type GameResult = {
  ingredient: Ingredient;
  accuracy: number;
  speed: number;
  total: number;
  timeMs: number;
};

export type ScoreEntry = {
  id: number;
  nickname: string;
  ingredient: Ingredient;
  accuracy: number;
  time_ms: number;
  total: number;
  created_at: string;
};

export type MyRank = {
  rank: number;
  accuracy: number;
  time_ms: number;
  total: number;
};

export type MyRanks = {
  byScore: MyRank | null;
  bySpeed: MyRank | null;
  byTotal: MyRank | null;
};

export type RankingsResponse = {
  byScore: ScoreEntry[];
  bySpeed: ScoreEntry[];
  byTotal: ScoreEntry[];
  me: MyRanks | null;
};
