import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { submitScore } from "../lib/api";
import { shareResult } from "../lib/kakao";
import { formatScore, formatTimer } from "../lib/scoring";
import { INGREDIENT_META } from "../types";
import { useApp } from "../state";

export function ResultPage() {
  const { result, displayName, resetGame } = useApp();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!result || saved) return;
    let cancelled = false;
    (async () => {
      try {
        await submitScore({
          nickname: displayName,
          ingredient: result.ingredient,
          accuracy: result.accuracy,
          timeMs: result.timeMs,
          total: result.total,
        });
        if (!cancelled) setSaved(true);
      } catch {
        if (!cancelled) setError("랭킹 저장에 실패했지만 결과는 확인할 수 있어요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, displayName, saved]);

  if (!result) {
    return <Navigate to="/" replace />;
  }

  const meta = INGREDIENT_META[result.ingredient];

  return (
    <section className="page result">
      <header className="page-head">
        <p className="eyebrow">완성!</p>
        <h2>{meta.label} 송편 결과</h2>
      </header>

      <div className="score-hero">
        <div className="score-total">
          <span>종합 / 1000</span>
          <strong>{formatScore(result.total)}</strong>
        </div>
        <ul className="score-grid">
          <li>
            <span>정확도</span>
            <strong>{formatScore(result.accuracy)}</strong>
          </li>
          <li>
            <span>속도</span>
            <strong>{formatScore(result.speed)}</strong>
          </li>
          <li>
            <span>시간</span>
            <strong>{formatTimer(result.timeMs)}</strong>
          </li>
        </ul>
      </div>

      {error && <p className="form-error">{error}</p>}
      {saved && <p className="form-ok">랭킹에 기록됐어요</p>}

      <button
        type="button"
        className="btn kakao wide"
        onClick={() => shareResult(result, displayName)}
      >
        카카오톡으로 공유하기
      </button>
      <button
        type="button"
        className="btn primary wide"
        onClick={() => {
          resetGame();
          navigate("/");
        }}
      >
        다시빚기
      </button>
      <button type="button" className="btn ghost wide" onClick={() => navigate("/ranking")}>
        랭킹 보기
      </button>
    </section>
  );
}
