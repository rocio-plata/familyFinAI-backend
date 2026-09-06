// /src/contexts/identity/application/queries/get-user-profile.query.ts
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserNotFoundError } from "../../domain/errors/user-not-found.error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";

interface GetUserProfileInput {
  userId: UserId;
}

interface UserProfileDTO {
  email: string;
  displayName: string;
  createdAt: Date;
}

class GetUserProfileQuery {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetUserProfileInput): Promise<UserProfileDTO> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId.toString());
    }

    return {
      email: user.email.toString(),
      displayName: user.displayName.toString(),
      createdAt: user.createdAt,
    };
  }
}

export type { UserProfileDTO };
export { GetUserProfileQuery };
