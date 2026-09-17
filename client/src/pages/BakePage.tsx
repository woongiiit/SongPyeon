import { useNavigate } from "react-router-dom";
import { useApp } from "../state";

export function BakePage() {
  const navigate = useNavigate();
  const { displayName } = useApp();

  return (
    <section className="page bake">
      <header className="page-head">
        <p className="welcome">{displayName}님, 송편을 빚어볼까요</p>
        <h2>송편 빚기</h2>
        <p className="lede tight">재료를 고르고 점선을 따라 반달을 그려 주세요.</p>
      </header>

      <div className="bake-visual" aria-hidden>
        <div className="dough dough-a" />
        <div className="dough dough-b" />
        <div className="dough dough-c" />
      </div>

      <button type="button" className="btn primary wide" onClick={() => navigate("/ingredient")}>
        재료 선택하기
      </button>
      <button type="button" className="btn ghost wide" onClick={() => navigate("/")}>
        처음으로
      </button>
    </section>
  );
}
