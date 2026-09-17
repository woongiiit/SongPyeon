import pg from "pg";

const { Pool } = pg;

export type Ingredient = "sesame" | "bean" | "chestnut";

export type ScoreRow = {
  id: number;
  nickname: string;
  player_id: string | null;
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

function mapRow(r: MemoryScore): ScoreRow {
  return {
    id: r.id,
    nickname: r.nickname,
    player_id: r.player_id,
    ingredient: r.ingredient,
    accuracy: r.accuracy,
    time_ms: r.time_ms,
    total: r.total,
    created_at: r.created_at.toISOString(),
  };
}

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
      player_id TEXT,
      ingredient TEXT NOT NULL CHECK (ingredient IN ('sesame', 'bean', 'chestnut')),
      accuracy REAL NOT NULL,
      time_ms INTEGER NOT NULL,
      total REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS scores_ingredient_total_idx ON scores (ingredient, total DESC);
    CREATE INDEX IF NOT EXISTS scores_ingredient_accuracy_idx ON scores (ingredient, accuracy DESC);
    CREATE INDEX IF NOT EXISTS scores_ingredient_time_idx ON scores (ingredient, time_ms ASC);
  `);

  // Existing DBs may predate player_id — add column before any index on it.
  try {
    await pool.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS player_id TEXT`);
  } catch (err) {
    console.warn("player_id column migrate skipped:", err);
  }

  try {
    await pool.query(`ALTER TABLE scores ALTER COLUMN total TYPE REAL USING total::real`);
    await pool.query(`ALTER TABLE scores ALTER COLUMN accuracy TYPE REAL USING accuracy::real`);
  } catch (err) {
    console.warn("score column type migrate skipped:", err);
  }

  try {
    await pool.query(
      `CREATE INDEX IF NOT EXISTS scores_player_ingredient_idx ON scores (player_id, ingredient)`
    );
  } catch (err) {
    console.warn("player_id index migrate skipped:", err);
  }
}

export async function insertScore(input: {
  nickname: string;
  playerId: string;
  ingredient: Ingredient;
  accuracy: number;
  timeMs: number;
  total: number;
}): Promise<ScoreRow> {
  if (useMemory || !pool) {
    const row: MemoryScore = {
      id: memoryId++,
      nickname: input.nickname,
      player_id: input.playerId,
      ingredient: input.ingredient,
      accuracy: input.accuracy,
      time_ms: input.timeMs,
      total: input.total,
      created_at: new Date(),
    };
    memoryScores.push(row);
    return mapRow(row);
  }

  const result = await pool.query<ScoreRow>(
    `INSERT INTO scores (nickname, player_id, ingredient, accuracy, time_ms, total)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nickname, player_id, ingredient, accuracy, time_ms, total, created_at`,
    [
      input.nickname,
      input.playerId,
      input.ingredient,
      input.accuracy,
      input.timeMs,
      input.total,
    ]
  );
  return result.rows[0];
}

export async function getRankings(ingredient: Ingredient, limit = 20) {
  if (useMemory || !pool) {
    const filtered = memoryScores.filter((s) => s.ingredient === ingredient);

    return {
      byScore: filtered
        .slice()
        .sort((a, b) => b.accuracy - a.accuracy || a.time_ms - b.time_ms)
        .slice(0, limit)
        .map(mapRow),
      bySpeed: filtered
        .slice()
        .sort((a, b) => a.time_ms - b.time_ms || b.accuracy - a.accuracy)
        .slice(0, limit)
        .map(mapRow),
      byTotal: filtered
        .slice()
        .sort((a, b) => b.total - a.total || a.time_ms - b.time_ms)
        .slice(0, limit)
        .map(mapRow),
    };
  }

  const [byScore, bySpeed, byTotal] = await Promise.all([
    pool.query<ScoreRow>(
      `SELECT id, nickname, player_id, ingredient, accuracy, time_ms, total, created_at
       FROM scores WHERE ingredient = $1
       ORDER BY accuracy DESC, time_ms ASC LIMIT $2`,
      [ingredient, limit]
    ),
    pool.query<ScoreRow>(
      `SELECT id, nickname, player_id, ingredient, accuracy, time_ms, total, created_at
       FROM scores WHERE ingredient = $1
       ORDER BY time_ms ASC, accuracy DESC LIMIT $2`,
      [ingredient, limit]
    ),
    pool.query<ScoreRow>(
      `SELECT id, nickname, player_id, ingredient, accuracy, time_ms, total, created_at
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

export type MyRank = {
  rank: number;
  accuracy: number;
  time_ms: number;
  total: number;
};

export type MyRanks = {
  byScore: MyRank | null;
  bySpeed: MyRank | null;
  byTotal: MyRank | null;
};

function rankAmong(
  all: MemoryScore[],
  mine: MemoryScore | undefined,
  betterThan: (other: MemoryScore, me: MemoryScore) => boolean
): MyRank | null {
  if (!mine) return null;
  const rank = all.filter((s) => betterThan(s, mine)).length + 1;
  return {
    rank,
    accuracy: mine.accuracy,
    time_ms: mine.time_ms,
    total: mine.total,
  };
}

export async function getMyRanks(ingredient: Ingredient, playerId: string): Promise<MyRanks> {
  const pid = playerId.trim();
  if (!pid) {
    return { byScore: null, bySpeed: null, byTotal: null };
  }

  if (useMemory || !pool) {
    const filtered = memoryScores.filter((s) => s.ingredient === ingredient);
    const mine = filtered.filter((s) => s.player_id === pid);
    if (mine.length === 0) {
      return { byScore: null, bySpeed: null, byTotal: null };
    }

    const bestScore = [...mine].sort((a, b) => b.accuracy - a.accuracy || a.time_ms - b.time_ms)[0];
    const bestSpeed = [...mine].sort((a, b) => a.time_ms - b.time_ms || b.accuracy - a.accuracy)[0];
    const bestTotal = [...mine].sort((a, b) => b.total - a.total || a.time_ms - b.time_ms)[0];

    return {
      byScore: rankAmong(
        filtered,
        bestScore,
        (o, me) => o.accuracy > me.accuracy || (o.accuracy === me.accuracy && o.time_ms < me.time_ms)
      ),
      bySpeed: rankAmong(
        filtered,
        bestSpeed,
        (o, me) => o.time_ms < me.time_ms || (o.time_ms === me.time_ms && o.accuracy > me.accuracy)
      ),
      byTotal: rankAmong(
        filtered,
        bestTotal,
        (o, me) => o.total > me.total || (o.total === me.total && o.time_ms < me.time_ms)
      ),
    };
  }

  const [byScore, bySpeed, byTotal] = await Promise.all([
    pool.query<{ rank: string; accuracy: number; time_ms: number; total: number }>(
      `WITH best AS (
         SELECT accuracy, time_ms, total
         FROM scores
         WHERE ingredient = $1 AND player_id = $2
         ORDER BY accuracy DESC, time_ms ASC
         LIMIT 1
       )
       SELECT
         (SELECT COUNT(*)::int + 1 FROM scores s, best b
           WHERE s.ingredient = $1
             AND (s.accuracy > b.accuracy OR (s.accuracy = b.accuracy AND s.time_ms < b.time_ms))
         ) AS rank,
         best.accuracy, best.time_ms, best.total
       FROM best`,
      [ingredient, pid]
    ),
    pool.query<{ rank: string; accuracy: number; time_ms: number; total: number }>(
      `WITH best AS (
         SELECT accuracy, time_ms, total
         FROM scores
         WHERE ingredient = $1 AND player_id = $2
         ORDER BY time_ms ASC, accuracy DESC
         LIMIT 1
       )
       SELECT
         (SELECT COUNT(*)::int + 1 FROM scores s, best b
           WHERE s.ingredient = $1
             AND (s.time_ms < b.time_ms OR (s.time_ms = b.time_ms AND s.accuracy > b.accuracy))
         ) AS rank,
         best.accuracy, best.time_ms, best.total
       FROM best`,
      [ingredient, pid]
    ),
    pool.query<{ rank: string; accuracy: number; time_ms: number; total: number }>(
      `WITH best AS (
         SELECT accuracy, time_ms, total
         FROM scores
         WHERE ingredient = $1 AND player_id = $2
         ORDER BY total DESC, time_ms ASC
         LIMIT 1
       )
       SELECT
         (SELECT COUNT(*)::int + 1 FROM scores s, best b
           WHERE s.ingredient = $1
             AND (s.total > b.total OR (s.total = b.total AND s.time_ms < b.time_ms))
         ) AS rank,
         best.accuracy, best.time_ms, best.total
       FROM best`,
      [ingredient, pid]
    ),
  ]);

  const toMyRank = (
    rows: { rank: string; accuracy: number; time_ms: number; total: number }[]
  ): MyRank | null => {
    const row = rows[0];
    if (!row) return null;
    return {
      rank: Number(row.rank),
      accuracy: row.accuracy,
      time_ms: row.time_ms,
      total: row.total,
    };
  };

  return {
    byScore: toMyRank(byScore.rows),
    bySpeed: toMyRank(bySpeed.rows),
    byTotal: toMyRank(byTotal.rows),
  };
}
