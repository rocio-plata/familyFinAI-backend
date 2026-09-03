// platform/http/domain-error-http-status.ts
import type { DomainError } from "../../shared-kernel/errors/domain-error.js";

const SUFFIX_RULES: Array<{ suffix: string; status: number }> = [
  { suffix: "_NOT_FOUND", status: 404 },
  { suffix: "ALREADY_MEMBER", status: 409 },
  { suffix: "HAS_ASSOCIATED_ITEMS", status: 409 },
  { suffix: "DUPLICATE_", status: 409 },
  { suffix: "INSUFFICIENT_ROLE", status: 403 },
];

const PREFIX_RULES: Array<{ prefix: string; status: number }> = [
  { prefix: "AUTH.INVALID_REFRESH_TOKEN", status: 401 },
  { prefix: "AUTH.POSSIBLE_TOKEN_THEFT", status: 401 },
];

const DEFAULT_STATUS = 400;

function resolveHttpStatus(error: Pick<DomainError, "code">): number {
  for (const rule of PREFIX_RULES) {
    if (error.code.startsWith(rule.prefix)) return rule.status;
  }

  for (const rule of SUFFIX_RULES) {
    if (error.code.includes(rule.suffix)) return rule.status;
  }

  return DEFAULT_STATUS;
}

export { resolveHttpStatus };
