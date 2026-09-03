// platform/server.ts
import { InMemoryFamilyRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-family.repository.js";
import { buildApp } from "./app.js";
import { JwtService } from "./auth/jwt.js";
import { InProcessEventBus } from "./events/in-process-event-bus.js";

// (a medida que conectemos Drizzle/Postgres, el InMemoryFamilyRepository se reemplaza por el adaptador real)

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
const app = buildApp({
  jwtService: new JwtService(new TextEncoder().encode(jwtSecret)),
  familyAccess: {
    familyRepository: new InMemoryFamilyRepository(),
    eventBus: new InProcessEventBus(),
  },
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
