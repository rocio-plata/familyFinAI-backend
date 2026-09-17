// src/contexts/financial-tracking/domain/entities/user-payment-method-preference.ts
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { PaymentMethodId } from "../value-objects/payment-method-id.js";

type ReconstituteUserPaymentMethodPreferenceProps = {
  userId: string;
  familyId: string;
  defaultPaymentMethodId: string;
};

class UserPaymentMethodPreference {
  private constructor(
    private readonly _userId: UserId,
    private readonly _familyId: FamilyId,
    private _defaultPaymentMethodId: PaymentMethodId,
  ) {}

  get userId(): UserId {
    return this._userId;
  }

  get familyId(): FamilyId {
    return this._familyId;
  }

  get defaultPaymentMethodId(): PaymentMethodId {
    return this._defaultPaymentMethodId;
  }

  static create(
    userId: UserId,
    familyId: FamilyId,
    defaultPaymentMethodId: PaymentMethodId,
  ): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(userId, familyId, defaultPaymentMethodId);
  }

  static reconstitute(
    props: ReconstituteUserPaymentMethodPreferenceProps,
  ): UserPaymentMethodPreference {
    return new UserPaymentMethodPreference(
      UserId.of(props.userId),
      FamilyId.of(props.familyId),
      PaymentMethodId.of(props.defaultPaymentMethodId),
    );
  }

  changeDefault(newDefaultPaymentMethodId: PaymentMethodId): void {
    this._defaultPaymentMethodId = newDefaultPaymentMethodId;
  }
}

export type { ReconstituteUserPaymentMethodPreferenceProps };
export { UserPaymentMethodPreference };
