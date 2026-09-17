import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state";
import { BakePage } from "./pages/BakePage";
import { DrawPage } from "./pages/DrawPage";
import { HomePage } from "./pages/HomePage";
import { IngredientPage } from "./pages/IngredientPage";
import { RankingPage } from "./pages/RankingPage";
import { ResultPage } from "./pages/ResultPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bake" element={<BakePage />} />
            <Route path="/ingredient" element={<IngredientPage />} />
            <Route path="/draw" element={<DrawPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
