import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db.js";
import { rankingsRouter } from "./routes/rankings.js";
import { scoresRouter } from "./routes/scores.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

async function main() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/scores", scoresRouter);
  app.use("/api/rankings", rankingsRouter);

  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next();
    });
  });

  app.listen(PORT, () => {
    console.log(`SongPyeon server listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
