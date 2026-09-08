// scripts/setup-db.ts
//
// Deja la base de datos lista para usar desde cero:
//   1. Levanta el contenedor de Postgres (docker-compose).
//   2. Espera a que acepte conexiones.
//   3. Genera migraciones si no existe ninguna todavía (primera vez del proyecto).
//   4. Aplica todas las migraciones pendientes.
//   5. Lista las tablas resultantes, para confirmar visualmente que quedó todo listo.
//
// Uso:
//   npm run db:setup

import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { Client } from "pg";

const MIGRATIONS_DIR = "./src/platform/db/migrations";
const MAX_ATTEMPTS = 20;
const DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command: string): void {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function waitForDb(connectionString: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`✔ Postgres listo (intento ${attempt}/${MAX_ATTEMPTS}).`);
      return;
    } catch {
      await client.end().catch(() => {});
      console.log(`… Postgres no responde todavía (intento ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(DELAY_MS);
    }
  }
  throw new Error(`Postgres no respondió después de ${MAX_ATTEMPTS} intentos.`);
}

function hasExistingMigrations(): boolean {
  if (!existsSync(MIGRATIONS_DIR)) return false;
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  return files.length > 0;
}

async function listTables(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();

  const result = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name;`,
  );

  await client.end();

  console.log("\n📋 Tablas actuales en la base de datos:");
  if (result.rows.length === 0) {
    console.log("  (ninguna — revisa si ya definiste algún schema.ts por contexto)");
  } else {
    for (const row of result.rows) {
      console.log(`  - ${row.table_name}`);
    }
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Falta la variable de entorno DATABASE_URL.");
    process.exit(1);
  }

  console.log("🐳 Levantando el contenedor de Postgres...");
  run("docker-compose up -d db");

  console.log("\n⏳ Esperando a que Postgres acepte conexiones...");
  await waitForDb(connectionString);

  if (!hasExistingMigrations()) {
    console.log("\n📝 No hay migraciones todavía — generando la primera a partir del schema actual...");
    run("npm run db:generate");
  } else {
    console.log("\n📝 Ya existen migraciones generadas, se omite el paso de generación.");
  }

  console.log("\n🚀 Aplicando migraciones...");
  run("npm run db:migrate");

  await listTables(connectionString);

  console.log("\n✅ Base de datos lista para usar.");
}

main().catch((err) => {
  console.error("\n❌ Falló la inicialización de la base de datos:");
  console.error(err);
  process.exit(1);
});
