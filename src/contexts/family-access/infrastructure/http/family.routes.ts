// /src/contexts/family-access/infrastructure/http/family.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { AcceptInvitationUseCase } from "../../application/commands/accept-invitation.usecase.js";
import type { CreateFamilyUseCase } from "../../application/commands/create-family.usecase.js";
import type { RevokeInvitationUseCase } from "../../application/commands/revoke-invitation.usecase.js";
import type { GetFamilyMembersQuery } from "../../application/queries/get-family-members.query.js";
import { FamilyId } from "../../domain/value-objects/family-id.js";
import { InvitationId } from "../../domain/value-objects/invitation-id.js";

interface FamilyRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (
    minRole?: import("../../domain/value-objects/role.js").Role,
  ) => preHandlerHookHandler;
  createFamilyUseCase: CreateFamilyUseCase;
  acceptInvitationUseCase: AcceptInvitationUseCase;
  revokeInvitationUseCase: RevokeInvitationUseCase;
  getFamilyMembersQuery: GetFamilyMembersQuery;
}

function registerFamilyRoutes(app: FastifyInstance, deps: FamilyRoutesDependencies): void {
  app.post(
    "/families",
    {
      preHandler: [deps.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body as { name: string };

      const family = await deps.createFamilyUseCase.execute({ name, createdBy: request.userId });

      return reply.code(201).send({
        id: family.id.toString(),
        name: family.name.toString(),
        defaultCurrency: family.defaultCurrency.toString(),
      });
    },
  );

  app.get(
    "/families/:familyId/members",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };

      const members = await deps.getFamilyMembersQuery.execute({ familyId: FamilyId.of(familyId) });

      return reply.code(200).send(
        members.map((m) => ({
          userId: m.userId.toString(),
          role: m.role.isOwner() ? "OWNER" : "MEMBER",
          joinedAt: m.joinedAt.toISOString(),
        })),
      );
    },
  );

  app.post(
    "/invitations/:invitationId/accept",
    {
      preHandler: [deps.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["invitationId"],
          properties: { invitationId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { invitationId } = request.params as { invitationId: string };

      await deps.acceptInvitationUseCase.execute({
        invitationId: InvitationId.of(invitationId),
        acceptingUserId: request.userId,
      });

      return reply.code(204).send();
    },
  );

  app.delete(
    "/invitations/:invitationId",
    {
      preHandler: [deps.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["invitationId"],
          properties: { invitationId: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { invitationId } = request.params as { invitationId: string };

      await deps.revokeInvitationUseCase.execute({
        invitationId: InvitationId.of(invitationId),
        revokedBy: request.userId,
      });

      return reply.code(204).send();
    },
  );
}

export type { FamilyRoutesDependencies };
export { registerFamilyRoutes };
