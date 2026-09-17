import pg from "pg";

const { Pool } = pg;

export type Ingredient = "sesame" | "bean" | "chestnut";

export type ScoreRow = {
  id: number;
  nickname: string;
  ingredient: Ingredient;
  accuracy: number;
  time_ms: number;
  total: number;
  created_at: string;
};

type MemoryScore = Omit<ScoreRow, "id" | "created_at"> & {
  id: number;
  created_at: Date;
};

let pool: pg.Pool | null = null;
let memoryScores: MemoryScore[] = [];
let memoryId = 1;
let useMemory = false;

export async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    useMemory = true;
    console.warn("DATABASE_URL not set — using in-memory rankings store");
    return;
  }

  pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL DEFAULT '익명송편',
      ingredient TEXT NOT NULL CHECK (ingredient IN ('sesame', 'bean', 'chestnut')),
      accuracy REAL NOT NULL,
      time_ms INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS scores_ingredient_total_idx ON scores (ingredient, total DESC);
    CREATE INDEX IF NOT EXISTS scores_ingredient_accuracy_idx ON scores (ingredient, accuracy DESC);
    CREATE INDEX IF NOT EXISTS scores_ingredient_time_idx ON scores (ingredient, time_ms ASC);
  `);
}

export async function insertScore(input: {
  nickname: string;
  ingredient: Ingredient;
  accuracy: number;
  timeMs: number;
  total: number;
}): Promise<ScoreRow> {
  if (useMemory || !pool) {
    const row: MemoryScore = {
      id: memoryId++,
      nickname: input.nickname,
      ingredient: input.ingredient,
      accuracy: input.accuracy,
      time_ms: input.timeMs,
      total: input.total,
      created_at: new Date(),
    };
    memoryScores.push(row);
    return {
      ...row,
      created_at: row.created_at.toISOString(),
    };
  }

  const result = await pool.query<ScoreRow>(
    `INSERT INTO scores (nickname, ingredient, accuracy, time_ms, total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nickname, ingredient, accuracy, time_ms, total, created_at`,
    [input.nickname, input.ingredient, input.accuracy, input.timeMs, input.total]
  );
  return result.rows[0];
}

export async function getRankings(ingredient: Ingredient, limit = 20) {
  if (useMemory || !pool) {
    const filtered = memoryScores.filter((s) => s.ingredient === ingredient);
    const map = (rows: MemoryScore[]) =>
      rows.map((r) => ({
        id: r.id,
        nickname: r.nickname,
        ingredient: r.ingredient,
        accuracy: r.accuracy,
        time_ms: r.time_ms,
        total: r.total,
        created_at: r.created_at.toISOString(),
      }));

    return {
      byScore: map(
        [...filtered].sort((a, b) => b.accuracy - a.accuracy || a.time_ms - b.time_ms).slice(0, limit)
      ),
      bySpeed: map(
        [...filtered].sort((a, b) => a.time_ms - b.time_ms || b.accuracy - a.accuracy).slice(0, limit)
      ),
      byTotal: map(
        [...filtered].sort((a, b) => b.total - a.total || a.time_ms - b.time_ms).slice(0, limit)
      ),
    };
  }

  const [byScore, bySpeed, byTotal] = await Promise.all([
    pool.query<ScoreRow>(
      `SELECT id, nickname, ingredient, accuracy, time_ms, total, created_at
       FROM scores WHERE ingredient = $1
       ORDER BY accuracy DESC, time_ms ASC LIMIT $2`,
      [ingredient, limit]
    ),
    pool.query<ScoreRow>(
      `SELECT id, nickname, ingredient, accuracy, time_ms, total, created_at
       FROM scores WHERE ingredient = $1
       ORDER BY time_ms ASC, accuracy DESC LIMIT $2`,
      [ingredient, limit]
    ),
    pool.query<ScoreRow>(
      `SELECT id, nickname, ingredient, accuracy, time_ms, total, created_at
       FROM scores WHERE ingredient = $1
       ORDER BY total DESC, time_ms ASC LIMIT $2`,
      [ingredient, limit]
    ),
  ]);

  return {
    byScore: byScore.rows,
    bySpeed: bySpeed.rows,
    byTotal: byTotal.rows,
  };
}
