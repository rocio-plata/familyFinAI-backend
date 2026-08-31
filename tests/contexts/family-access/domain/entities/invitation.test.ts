import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Invitation } from '../../../../../src/contexts/family-access/domain/entities/invitation.js';
import { FamilyId } from '../../../../../src/contexts/family-access/domain/value-objects/family-id.js';
import { EmailAddress } from '../../../../../src/contexts/family-access/domain/value-objects/email-address.js';
import { Role } from '../../../../../src/contexts/family-access/domain/value-objects/role.js';
import { UserId } from '../../../../../src/contexts/family-access/domain/value-objects/user-id.js';
import { InvitationStatus } from '../../../../../src/contexts/family-access/domain/value-objects/invitation-status.js';

describe('Invitation', () => {
  const familyId = FamilyId.generate();
  const email = EmailAddress.of('invitado@example.com');
  const role = Role.member();
  const userId = UserId.generate();

  describe('create()', () => {
    it('crea una invitación en estado Pending', () => {
      assert.equal(Invitation.create(familyId, email, role).status, InvitationStatus.Pending);
    });

    it('expira en el futuro (aproximadamente 7 días)', () => {
      const now = new Date();
      const inv = Invitation.create(familyId, email, role);
      assert.ok(inv.expiresAt > now);
    });

    it('almacena el familyId', () => {
      assert.ok(Invitation.create(familyId, email, role).familyId.equals(familyId));
    });

    it('lanza InvitationNotAcceptedError al acceder a invitedUserId antes de aceptar', () => {
      const inv = Invitation.create(familyId, email, role);
      assert.throws(() => inv.invitedUserId, { name: 'InvitationNotAcceptedError' });
    });
  });

  describe('accept()', () => {
    it('cambia el estado a Accepted', () => {
      const inv = Invitation.create(familyId, email, role);
      inv.accept(userId);
      assert.equal(inv.status, InvitationStatus.Accepted);
    });

    it('asigna el invitedUserId', () => {
      const inv = Invitation.create(familyId, email, role);
      inv.accept(userId);
      assert.ok(inv.invitedUserId.equals(userId));
    });

    it('lanza InvitationNotPendingError si ya fue aceptada', () => {
      const inv = Invitation.create(familyId, email, role);
      inv.accept(userId);
      assert.throws(() => inv.accept(UserId.generate()), { name: 'InvitationNotPendingError' });
    });

    it('lanza InvitationNotPendingError si fue revocada', () => {
      const inv = Invitation.create(familyId, email, role);
      inv.revoke();
      assert.throws(() => inv.accept(userId), { name: 'InvitationNotPendingError' });
    });

    it('lanza InvitationExpiredError si la invitación venció', (t) => {
      t.mock.timers.enable({ apis: ['Date'] });
      const inv = Invitation.create(familyId, email, role);
      t.mock.timers.tick(8 * 24 * 60 * 60 * 1000);
      assert.throws(() => inv.accept(userId), { name: 'InvitationExpiredError' });
    });
  });

  describe('revoke()', () => {
    it('cambia el estado a Revoked', () => {
      const inv = Invitation.create(familyId, email, role);
      inv.revoke();
      assert.equal(inv.status, InvitationStatus.Revoked);
    });
  });
});
