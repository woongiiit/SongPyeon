import { Router } from "express";
import { getMyRanks, getRankings, type Ingredient } from "../db.js";

const INGREDIENTS = new Set<Ingredient>(["sesame", "bean", "chestnut"]);

export const rankingsRouter = Router();

rankingsRouter.get("/", async (req, res) => {
  try {
    const ingredient = String(req.query.ingredient || "sesame") as Ingredient;
    if (!INGREDIENTS.has(ingredient)) {
      res.status(400).json({ error: "invalid ingredient" });
      return;
    }

    const playerId =
      typeof req.query.playerId === "string" && req.query.playerId.trim()
        ? req.query.playerId.trim().slice(0, 64)
        : "";

    const data = await getRankings(ingredient, 20);
    const me = playerId ? await getMyRanks(ingredient, playerId) : null;

    res.json({ ...data, me });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load rankings" });
  }
});
