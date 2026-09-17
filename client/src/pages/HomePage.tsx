import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DonateCta } from "../components/DonateCta";
import { useApp } from "../state";

export function HomePage() {
  const { nickname, setNickname, resetGame } = useApp();
  const navigate = useNavigate();
  const [localName, setLocalName] = useState(nickname);

  function enter(e: FormEvent) {
    e.preventDefault();
    setNickname(localName);
    resetGame();
    navigate("/bake");
  }

  return (
    <section className="page home">
      <div className="sky" aria-hidden>
        <div className="moon" />
        <div className="star s1" />
        <div className="star s2" />
        <div className="star s3" />
      </div>

      <header className="brand-hero">
        <p className="brand-eyebrow">한가위 손맛</p>
        <h1 className="brand">송편</h1>
        <p className="lede">아웃라인을 따라 송편을 빚고, 가족과 점수를 겨뤄 보세요.</p>
      </header>

      <form className="home-form" onSubmit={enter}>
        <label className="field">
          <span>닉네임 (선택)</span>
          <input
            type="text"
            maxLength={20}
            placeholder="비워두면 익명송편"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            autoComplete="nickname"
          />
        </label>

        <button type="submit" className="btn primary wide">
          입장
        </button>
        <Link to="/ranking" className="btn ghost wide">
          랭킹 확인
        </Link>
        <DonateCta />
      </form>
    </section>
  );
}
