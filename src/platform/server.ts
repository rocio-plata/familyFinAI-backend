// platform/server.ts
import { buildApp } from "./app.js";

// (a medida que conectemos Drizzle/Postgres, aquí se construyen las dependencias reales)

const app = buildApp({});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
