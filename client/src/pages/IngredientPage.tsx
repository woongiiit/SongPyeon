import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { INGREDIENT_META, type Ingredient } from "../types";
import { useApp } from "../state";

const ORDER: Ingredient[] = ["sesame", "bean", "chestnut"];

export function IngredientPage() {
  const { ingredient, setIngredient } = useApp();
  const [picked, setPicked] = useState<Ingredient | null>(ingredient);
  const navigate = useNavigate();

  function confirm() {
    if (!picked) return;
    setIngredient(picked);
    navigate("/draw");
  }

  return (
    <section className="page ingredient">
      <header className="page-head">
        <h2>재료 선택</h2>
        <p className="lede tight">어떤 소로 빚을까요?</p>
      </header>

      <div className="ingredient-list" role="listbox" aria-label="재료">
        {ORDER.map((key) => {
          const meta = INGREDIENT_META[key];
          const active = picked === key;
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={active}
              className={`ingredient-item ${active ? "active" : ""}`}
              style={{ ["--accent" as string]: meta.accent }}
              onClick={() => setPicked(key)}
            >
              <span className="ingredient-swatch" style={{ background: meta.fill }} />
              <span className="ingredient-copy">
                <strong>{meta.label}</strong>
                <em>{meta.description}</em>
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="btn primary wide" disabled={!picked} onClick={confirm}>
        이 재료로 빚기
      </button>
      <button type="button" className="btn ghost wide" onClick={() => navigate("/bake")}>
        뒤로
      </button>
    </section>
  );
}
