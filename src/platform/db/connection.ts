import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

// SSL solo cuando corresponde (Neon lo requiere; el Postgres local de
// docker-compose no lo soporta) — se infiere del propio connection string
// en vez de dejarlo fijo, para que el mismo código sirva en ambos entornos.
const useSsl = connectionString?.includes("neon.tech") ?? false;

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool, { schema });

export { db, pool };
