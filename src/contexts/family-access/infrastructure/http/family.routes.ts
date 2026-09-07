// /src/contexts/family-access/infrastructure/http/family.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { AcceptInvitationUseCase } from "../../application/commands/accept-invitation.usecase.js";
import type { ChangeDefaultCurrencyUseCase } from "../../application/commands/change-default-currency.usecase.js";
import type { ChangeMemberRoleUseCase } from "../../application/commands/change-member-role.usecase.js";
import type { CreateFamilyUseCase } from "../../application/commands/create-family.usecase.js";
import type { InviteMemberUseCase } from "../../application/commands/invite-member.usecase.js";
import type { RemoveMemberUseCase } from "../../application/commands/remove-member.usecase.js";
import type { ReorderMyFamiliesUseCase } from "../../application/commands/reorder-my-families.usecase.js";
import type { RevokeInvitationUseCase } from "../../application/commands/revoke-invitation.usecase.js";
import type { GetFamiliesForUserQuery } from "../../application/queries/get-families-for-user.query.js";
import type { GetFamilyMembersQuery } from "../../application/queries/get-family-members.query.js";
import type { GetFamilyMembershipQuery } from "../../application/queries/get-family-membership.query.js";
import { EmailAddress } from "../../domain/value-objects/email-address.js";
import { FamilyId } from "../../domain/value-objects/family-id.js";
import { InvitationId } from "../../domain/value-objects/invitation-id.js";
import { Role } from "../../domain/value-objects/role.js";
import { UserId } from "../../domain/value-objects/user-id.js";

interface FamilyRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  createFamilyUseCase: CreateFamilyUseCase;
  inviteMemberUseCase: InviteMemberUseCase;
  acceptInvitationUseCase: AcceptInvitationUseCase;
  revokeInvitationUseCase: RevokeInvitationUseCase;
  removeMemberUseCase: RemoveMemberUseCase;
  changeMemberRoleUseCase: ChangeMemberRoleUseCase;
  changeDefaultCurrencyUseCase: ChangeDefaultCurrencyUseCase;
  reorderMyFamiliesUseCase: ReorderMyFamiliesUseCase;
  getFamiliesForUserQuery: GetFamiliesForUserQuery;
  getFamilyMembersQuery: GetFamilyMembersQuery;
  getFamilyMembershipQuery: GetFamilyMembershipQuery;
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

  app.get("/me/families", { preHandler: [deps.authenticate] }, async (request, reply) => {
    const families = await deps.getFamiliesForUserQuery.execute({ userId: request.userId });

    return reply.code(200).send(
      families.map((family) => ({
        familyId: family.familyId.toString(),
        name: family.name,
        role: family.role.isOwner() ? "OWNER" : "MEMBER",
      })),
    );
  });

  app.put(
    "/me/families/order",
    {
      preHandler: [deps.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["orderedFamilyIds"],
          properties: {
            orderedFamilyIds: {
              type: "array",
              items: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { orderedFamilyIds } = request.body as { orderedFamilyIds: string[] };

      await deps.reorderMyFamiliesUseCase.execute({
        userId: request.userId,
        orderedFamilyIds: orderedFamilyIds.map((familyId) => FamilyId.of(familyId)),
      });

      return reply.code(204).send();
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

  app.get(
    "/families/:familyId/members/me",
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

      const membership = await deps.getFamilyMembershipQuery.execute({
        familyId: FamilyId.of(familyId),
        userId: request.userId,
      });
      // requireFamilyMembership ya garantizó que la membresía existe
      if (!membership) throw new Error("Unreachable: membership already verified by preHandler");

      return reply.code(200).send({
        familyId: membership.familyId.toString(),
        userId: membership.userId.toString(),
        role: membership.role.isOwner() ? "OWNER" : "MEMBER",
        joinedAt: membership.joinedAt.toISOString(),
      });
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

  app.delete(
    "/families/:familyId/members/:memberId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "memberId"],
          properties: {
            familyId: { type: "string" },
            memberId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, memberId } = request.params as { familyId: string; memberId: string };

      await deps.removeMemberUseCase.execute({
        familyId: FamilyId.of(familyId),
        memberId: UserId.of(memberId),
        removedBy: request.userId,
      });

      return reply.code(204).send();
    },
  );

  app.patch(
    "/families/:familyId/members/:memberId/role",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "memberId"],
          properties: {
            familyId: { type: "string" },
            memberId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["newRole"],
          properties: { newRole: { type: "string", enum: ["OWNER", "MEMBER"] } },
        },
      },
    },
    async (request, reply) => {
      const { familyId, memberId } = request.params as { familyId: string; memberId: string };
      const { newRole } = request.body as { newRole: "OWNER" | "MEMBER" };

      await deps.changeMemberRoleUseCase.execute({
        familyId: FamilyId.of(familyId),
        memberId: UserId.of(memberId),
        newRole: newRole === "OWNER" ? Role.owner() : Role.member(),
        changedBy: request.userId,
      });

      return reply.code(204).send();
    },
  );

  app.patch(
    "/families/:familyId/settings/currency",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["newCurrency"],
          properties: { newCurrency: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { newCurrency } = request.body as { newCurrency: string };

      await deps.changeDefaultCurrencyUseCase.execute({
        familyId: FamilyId.of(familyId),
        newCurrency,
        changedBy: request.userId,
      });

      return reply.code(204).send();
    },
  );

  app.post(
    "/families/:familyId/invitations",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["email", "role"],
          properties: {
            email: { type: "string", minLength: 1 },
            role: { type: "string", enum: ["OWNER", "MEMBER"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { email, role } = request.body as { email: string; role: "OWNER" | "MEMBER" };

      const invitation = await deps.inviteMemberUseCase.execute({
        familyId: FamilyId.of(familyId),
        email: EmailAddress.of(email),
        role: role === "OWNER" ? Role.owner() : Role.member(),
        invitedBy: request.userId,
      });

      return reply.code(201).send({
        id: invitation.id.toString(),
        familyId: invitation.familyId.toString(),
        invitedEmail: invitation.invitedEmail.toString(),
        role: invitation.role.isOwner() ? "OWNER" : "MEMBER",
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      });
    },
  );
}

export type { FamilyRoutesDependencies };
export { registerFamilyRoutes };
