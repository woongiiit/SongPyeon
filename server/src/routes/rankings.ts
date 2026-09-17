import { Router } from "express";
import { getRankings, type Ingredient } from "../db.js";

const INGREDIENTS = new Set<Ingredient>(["sesame", "bean", "chestnut"]);

export const rankingsRouter = Router();

rankingsRouter.get("/", async (req, res) => {
  try {
    const ingredient = String(req.query.ingredient || "sesame") as Ingredient;
    if (!INGREDIENTS.has(ingredient)) {
      res.status(400).json({ error: "invalid ingredient" });
      return;
    }

    const data = await getRankings(ingredient, 20);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load rankings" });
  }
});
