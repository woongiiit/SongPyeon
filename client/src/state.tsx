import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPlayerId } from "./lib/playerId";
import type { GameResult, Ingredient } from "./types";

type AppState = {
  nickname: string;
  setNickname: (v: string) => void;
  displayName: string;
  playerId: string;
  ingredient: Ingredient | null;
  setIngredient: (v: Ingredient | null) => void;
  result: GameResult | null;
  setResult: (v: GameResult | null) => void;
  resetGame: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [nickname, setNickname] = useState("");
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [playerId] = useState(() => getPlayerId());

  const displayName = nickname.trim() || "익명송편";

  const value = useMemo(
    () => ({
      nickname,
      setNickname,
      displayName,
      playerId,
      ingredient,
      setIngredient,
      result,
      setResult,
      resetGame: () => {
        setIngredient(null);
        setResult(null);
      },
    }),
    [nickname, displayName, playerId, ingredient, result]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
