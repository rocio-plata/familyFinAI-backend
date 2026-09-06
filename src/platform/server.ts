// /src/platform/server.ts
import { IdentityUserDirectoryAdapter } from "../contexts/family-access/infrastructure/adapters/identity-user-directory.adapter.js";
import { InMemoryFamilyRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.js";
import { GetUserIdByEmailQuery } from "../contexts/identity/application/queries/get-user-id-by-email.query.js";
import { InMemoryUserRepository } from "../contexts/identity/infrastructure/persistence/in-memory-user.repository.js";
import { buildApp } from "./app.js";
import { JwtService } from "./auth/jwt.js";
import { InProcessEventBus } from "./events/in-process-event-bus.js";

// (a medida que conectemos Drizzle/Postgres, el InMemoryFamilyRepository se reemplaza por el adaptador real)

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
// default "info"; en local exporta LOG_LEVEL=debug para ver, por ej., el token que llega en authenticate
const logLevel = process.env.LOG_LEVEL ?? "info";

const userRepository = new InMemoryUserRepository();
const getUserIdByEmailQuery = new GetUserIdByEmailQuery(userRepository);

const app = buildApp({
  jwtService: new JwtService(new TextEncoder().encode(jwtSecret)),
  logLevel,
  familyAccess: {
    familyRepository: new InMemoryFamilyRepository(),
    invitationRepository: new InMemoryInvitationRepository(),
    userDirectory: new IdentityUserDirectoryAdapter(getUserIdByEmailQuery),
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
