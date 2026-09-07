// /src/contexts/identity/application/queries/get-user-id-by-email.query.ts
import type { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";

interface GetUserIdByEmailInput {
  email: EmailAddress;
}

class GetUserIdByEmailQuery {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetUserIdByEmailInput): Promise<UserId | null> {
    const user = await this.userRepository.findByEmail(input.email);
    return user?.id ?? null;
  }
}

export { GetUserIdByEmailQuery };
