// tests/platform/workflows/register-user-with-personal-family.workflow.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { CreateFamilyUseCase } from "../../../src/contexts/family-access/application/commands/create-family.usecase.js";
import { RegisterUserUseCase } from "../../../src/contexts/identity/application/commands/register-user.usecase.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { RegisterUserWithPersonalFamilyWorkflow } from "../../../src/platform/workflows/register-user-with-personal-family.workflow.js";
import { InMemoryFamilyRepository } from "../../contexts/family-access/doubles/in-memory-family.repository.js";
import { InMemoryUserRepository } from "../../contexts/identity/doubles/in-memory-user.repository.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { FakeJwtService } from "../auth/doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "../auth/doubles/in-memory-refresh-token.repository.js";

const fakeHash = (plainText: string) => `hashed:${plainText}`;

describe("RegisterUserWithPersonalFamilyWorkflow", () => {
  let userRepository: InMemoryUserRepository;
  let familyRepository: InMemoryFamilyRepository;
  let workflow: RegisterUserWithPersonalFamilyWorkflow;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    familyRepository = new InMemoryFamilyRepository();

    const tokenService = new TokenService(
      new FakeJwtService(),
      new InMemoryRefreshTokenRepository(),
    );
    const eventBus = new FakeEventBus();

    const registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      tokenService,
      eventBus,
      fakeHash,
    );
    const createFamilyUseCase = new CreateFamilyUseCase(familyRepository, eventBus);

    workflow = new RegisterUserWithPersonalFamilyWorkflow(registerUserUseCase, createFamilyUseCase);
  });

  test("registra al usuario y le crea su familia personal", async () => {
    const result = await workflow.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    assert.equal(result.user.email.toString(), "rocio@test.com");
    assert.ok(result.tokens.accessToken.length > 0);
    assert.ok(await familyRepository.findById(result.defaultFamilyId));
  });

  test("la familia personal se llama 'Mis finanzas personales'", async () => {
    const result = await workflow.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    const family = await familyRepository.findById(result.defaultFamilyId);
    assert.equal(family?.name.toString(), "Mis finanzas personales");
  });

  test("el usuario registrado queda como Owner de su familia personal", async () => {
    const result = await workflow.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    const family = await familyRepository.findById(result.defaultFamilyId);
    assert.ok(family?.findMembership(result.user.id)?.role.isOwner());
  });

  test("persiste tanto el usuario como la familia", async () => {
    const result = await workflow.execute({
      email: "rocio@test.com",
      password: "supersecreta",
      displayName: "Rocío",
    });

    assert.ok(await userRepository.findById(result.user.id));
    assert.ok(await familyRepository.findById(result.defaultFamilyId));
  });
});
