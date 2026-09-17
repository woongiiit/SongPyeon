import { Navigate, useNavigate } from "react-router-dom";
import { DrawingBoard } from "../components/DrawingBoard";
import { INGREDIENT_META } from "../types";
import { useApp } from "../state";

export function DrawPage() {
  const { ingredient, setResult } = useApp();
  const navigate = useNavigate();

  if (!ingredient) {
    return <Navigate to="/ingredient" replace />;
  }

  const meta = INGREDIENT_META[ingredient];

  return (
    <section className="page draw">
      <header className="page-head compact">
        <h2>{meta.short} 송편</h2>
      </header>
      <DrawingBoard
        ingredient={ingredient}
        onComplete={(payload) => {
          setResult({ ingredient, ...payload });
          navigate("/result");
        }}
      />
    </section>
  );
}
