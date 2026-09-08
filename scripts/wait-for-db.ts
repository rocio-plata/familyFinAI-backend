// scripts/wait-for-db.ts
//
// Espera a que Postgres acepte conexiones antes de continuar (ej. antes de
// correr migraciones). Sin dependencias nuevas: usa `pg`, que ya es
// dependencia del proyecto.
//
// Uso:
//   node --env-file=.env --import tsx scripts/wait-for-db.ts

import { Client } from "pg";

const MAX_ATTEMPTS = 20;
const DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL no está definida.");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`Postgres listo (intento ${attempt}/${MAX_ATTEMPTS}).`);
      return;
    } catch {
      await client.end().catch(() => {});
      console.log(`Postgres no responde todavía (intento ${attempt}/${MAX_ATTEMPTS})...`);
      await sleep(DELAY_MS);
    }
  }

  console.error(`Postgres no respondió después de ${MAX_ATTEMPTS} intentos.`);
  process.exit(1);
}

waitForDb();
