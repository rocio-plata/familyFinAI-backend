// /src/contexts/family-access/family-access.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import { AcceptInvitationUseCase } from "./application/commands/accept-invitation.usecase.js";
import { ChangeDefaultCurrencyUseCase } from "./application/commands/change-default-currency.usecase.js";
import { ChangeMemberRoleUseCase } from "./application/commands/change-member-role.usecase.js";
import { CreateFamilyUseCase } from "./application/commands/create-family.usecase.js";
import { InviteMemberUseCase } from "./application/commands/invite-member.usecase.js";
import { RemoveMemberUseCase } from "./application/commands/remove-member.usecase.js";
import { RevokeInvitationUseCase } from "./application/commands/revoke-invitation.usecase.js";
import { GetFamilyMembersQuery } from "./application/queries/get-family-members.query.js";
import { GetFamilyMembershipQuery } from "./application/queries/get-family-membership.query.js";
import type { UserDirectoryPort } from "./domain/ports/user-directory.port.js";
import type { FamilyRepository } from "./domain/repositories/family.repository.js";
import type { InvitationRepository } from "./domain/repositories/invitation.repository.js";
import { registerFamilyRoutes } from "./infrastructure/http/family.routes.js";

interface FamilyAccessModuleDependencies {
  familyRepository: FamilyRepository;
  invitationRepository: InvitationRepository;
  userDirectory: UserDirectoryPort;
  eventBus: EventBus;
}

interface FamilyAccessModule {
  useCases: {
    createFamily: CreateFamilyUseCase;
    inviteMember: InviteMemberUseCase;
    acceptInvitation: AcceptInvitationUseCase;
    revokeInvitation: RevokeInvitationUseCase;
    removeMember: RemoveMemberUseCase;
    changeMemberRole: ChangeMemberRoleUseCase;
    changeDefaultCurrency: ChangeDefaultCurrencyUseCase;
    getFamilyMembership: GetFamilyMembershipQuery;
    getFamilyMembers: GetFamilyMembersQuery;
  };
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

function buildFamilyAccessModule(deps: FamilyAccessModuleDependencies): FamilyAccessModule {
  const useCases = {
    createFamily: new CreateFamilyUseCase(deps.familyRepository, deps.eventBus),
    inviteMember: new InviteMemberUseCase(
      deps.familyRepository,
      deps.invitationRepository,
      deps.userDirectory,
      deps.eventBus,
    ),
    acceptInvitation: new AcceptInvitationUseCase(
      deps.familyRepository,
      deps.invitationRepository,
      deps.eventBus,
    ),
    revokeInvitation: new RevokeInvitationUseCase(deps.familyRepository, deps.invitationRepository),
    removeMember: new RemoveMemberUseCase(deps.familyRepository, deps.eventBus),
    changeMemberRole: new ChangeMemberRoleUseCase(deps.familyRepository, deps.eventBus),
    changeDefaultCurrency: new ChangeDefaultCurrencyUseCase(deps.familyRepository),
    getFamilyMembership: new GetFamilyMembershipQuery(deps.familyRepository),
    getFamilyMembers: new GetFamilyMembersQuery(deps.familyRepository),
  };

  return {
    useCases,
    registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void {
      registerFamilyRoutes(app, {
        authenticate,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(useCases.getFamilyMembership, minRole),
        createFamilyUseCase: useCases.createFamily,
        acceptInvitationUseCase: useCases.acceptInvitation,
        revokeInvitationUseCase: useCases.revokeInvitation,
        removeMemberUseCase: useCases.removeMember,
        changeMemberRoleUseCase: useCases.changeMemberRole,
        changeDefaultCurrencyUseCase: useCases.changeDefaultCurrency,
        getFamilyMembersQuery: useCases.getFamilyMembers,
      });
    },
  };
}

export type { FamilyAccessModule, FamilyAccessModuleDependencies };
export { buildFamilyAccessModule };
