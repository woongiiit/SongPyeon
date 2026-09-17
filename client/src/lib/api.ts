import type { Ingredient, RankingsResponse, ScoreEntry } from "../types";

export async function submitScore(body: {
  nickname?: string;
  ingredient: Ingredient;
  accuracy: number;
  timeMs: number;
  total: number;
}): Promise<ScoreEntry> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("점수 저장에 실패했습니다");
  }
  return res.json();
}

export async function fetchRankings(ingredient: Ingredient): Promise<RankingsResponse> {
  const res = await fetch(`/api/rankings?ingredient=${ingredient}`);
  if (!res.ok) {
    throw new Error("랭킹을 불러오지 못했습니다");
  }
  return res.json();
}
