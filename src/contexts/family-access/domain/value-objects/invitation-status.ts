// contexts/family-access/domain/value-objects/invitation-status.ts
enum InvitationStatus {
  // (Pending | Accepted | Expired | Revoked)
  Pending = "PENDING",
  Accepted = "ACCEPTED",
  Expired = "EXPIRED",
  Revoked = "REVOKED"
}

export { InvitationStatus };