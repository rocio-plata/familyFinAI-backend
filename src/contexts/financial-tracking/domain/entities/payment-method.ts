// src/contexts/financial-tracking/domain/entities/payment-method.ts
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { CategoryStatus } from "../value-objects/category-status.js";
import { PaymentMethodId } from "../value-objects/payment-method-id.js";
import { PaymentMethodName } from "../value-objects/payment-method-name.js";

type ReconstitutePaymentMethodProps = {
  id: string;
  familyId: string;
  name: string;
  status: "ACTIVE" | "DEPRECATED";
};

class PaymentMethod {
  private constructor(
    private readonly _id: PaymentMethodId,
    private readonly _familyId: FamilyId,
    private _name: PaymentMethodName,
    private _status: CategoryStatus,
  ) {}

  get id(): PaymentMethodId {
    return this._id;
  }

  get familyId(): FamilyId {
    return this._familyId;
  }

  get name(): PaymentMethodName {
    return this._name;
  }

  get status(): CategoryStatus {
    return this._status;
  }

  static create(familyId: FamilyId, name: PaymentMethodName): PaymentMethod {
    return new PaymentMethod(PaymentMethodId.generate(), familyId, name, CategoryStatus.Active);
  }

  static reconstitute(props: ReconstitutePaymentMethodProps): PaymentMethod {
    return new PaymentMethod(
      PaymentMethodId.of(props.id),
      FamilyId.of(props.familyId),
      PaymentMethodName.of(props.name),
      props.status === "ACTIVE" ? CategoryStatus.Active : CategoryStatus.Deprecated,
    );
  }

  rename(newName: PaymentMethodName): void {
    this._name = newName;
  }

  deprecate(): void {
    this._status = CategoryStatus.Deprecated;
  }

  reactivate(): void {
    this._status = CategoryStatus.Active;
  }
}

export type { ReconstitutePaymentMethodProps };
export { PaymentMethod };
