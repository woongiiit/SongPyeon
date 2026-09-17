import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DonateCta } from "../components/DonateCta";
import { fetchRankings } from "../lib/api";
import { formatScore, formatTimer } from "../lib/scoring";
import { useApp } from "../state";
import {
  INGREDIENT_META,
  type Ingredient,
  type MyRank,
  type RankingsResponse,
  type ScoreEntry,
} from "../types";

type RankKind = "byScore" | "bySpeed" | "byTotal";

const INGREDIENTS: Ingredient[] = ["sesame", "bean", "chestnut"];
const KINDS: { id: RankKind; label: string }[] = [
  { id: "byTotal", label: "종합" },
  { id: "byScore", label: "점수" },
  { id: "bySpeed", label: "속도" },
];

function formatMyMeta(kind: RankKind, me: MyRank) {
  if (kind === "bySpeed") return formatTimer(me.time_ms);
  if (kind === "byScore") return `${formatScore(me.accuracy)}점`;
  return `${formatScore(me.total)}점`;
}

export function RankingPage() {
  const { displayName, playerId } = useApp();
  const [ingredient, setIngredient] = useState<Ingredient>("sesame");
  const [kind, setKind] = useState<RankKind>("byTotal");
  const [data, setData] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchRankings(ingredient, playerId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("랭킹을 불러오지 못했어요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ingredient, playerId]);

  const rows: ScoreEntry[] = data?.[kind] ?? [];
  const myCurrent = data?.me?.[kind] ?? null;

  return (
    <section className="page ranking">
      <header className="page-head">
        <h2>랭킹</h2>
        <p className="lede tight">재료별로 손맛을 겨뤄 보세요.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="재료">
        {INGREDIENTS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={ingredient === key}
            className={ingredient === key ? "active" : ""}
            onClick={() => setIngredient(key)}
          >
            {INGREDIENT_META[key].label}
          </button>
        ))}
      </div>

      <div className="tabs sub" role="tablist" aria-label="정렬">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            className={kind === k.id ? "active" : ""}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {!loading && !error && data?.me && (
        <div className="my-rank-card" aria-live="polite">
          <p className="my-rank-label">{displayName}님의 순위</p>
          <ul className="my-rank-stats">
            {KINDS.map((k) => {
              const mine = data.me?.[k.id];
              return (
                <li key={k.id} className={kind === k.id ? "active" : ""}>
                  <span>{k.label}</span>
                  <strong>{mine ? `${mine.rank}위` : "—"}</strong>
                </li>
              );
            })}
          </ul>
          {myCurrent && (
            <p className="my-rank-detail">
              현재 탭 기준 최고 기록 {formatMyMeta(kind, myCurrent)}
            </p>
          )}
          {!myCurrent && (
            <p className="my-rank-detail muted">이 재료로는 아직 기록이 없어요.</p>
          )}
        </div>
      )}

      {loading && <p className="muted">불러오는 중…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <ol className="rank-list">
          {rows.length === 0 && <li className="empty">아직 기록이 없어요. 첫 송편을 남겨 보세요!</li>}
          {rows.map((row, i) => {
            const isMe = Boolean(row.player_id && row.player_id === playerId);
            return (
              <li key={row.id} className={isMe ? "is-me" : undefined}>
                <span className="rank-pos">{i + 1}</span>
                <span className="rank-name">
                  {row.nickname}
                  {isMe ? " (나)" : ""}
                </span>
                <span className="rank-meta">
                  {kind === "bySpeed" ? (
                    <>{formatTimer(row.time_ms)}</>
                  ) : kind === "byScore" ? (
                    <>{formatScore(row.accuracy)}점</>
                  ) : (
                    <>{formatScore(row.total)}점</>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <Link to="/" className="btn ghost wide">
        홈으로
      </Link>

      <DonateCta />
    </section>
  );
}
