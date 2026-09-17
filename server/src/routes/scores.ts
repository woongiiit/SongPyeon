import { Router } from "express";
import { insertScore, type Ingredient } from "../db.js";

const INGREDIENTS = new Set<Ingredient>(["sesame", "bean", "chestnut"]);

export const scoresRouter = Router();

scoresRouter.post("/", async (req, res) => {
  try {
    const { nickname, ingredient, accuracy, timeMs, total } = req.body ?? {};

    if (!INGREDIENTS.has(ingredient)) {
      res.status(400).json({ error: "invalid ingredient" });
      return;
    }

    const acc = Number(accuracy);
    const ms = Number(timeMs);
    const tot = Number(total);

    if (![acc, ms, tot].every((n) => Number.isFinite(n))) {
      res.status(400).json({ error: "invalid score fields" });
      return;
    }

    if (acc < 0 || acc > 1000 || tot < 0 || tot > 1000 || ms < 0 || ms > 3_600_000) {
      res.status(400).json({ error: "score out of range" });
      return;
    }

    const name =
      typeof nickname === "string" && nickname.trim()
        ? nickname.trim().slice(0, 20)
        : "익명송편";

    const row = await insertScore({
      nickname: name,
      ingredient,
      accuracy: Math.round(acc * 100) / 100,
      timeMs: Math.round(ms),
      total: Math.round(tot * 100) / 100,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to save score" });
  }
});
