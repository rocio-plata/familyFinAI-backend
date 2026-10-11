// src/contexts/ai-assistance/domain/entities/merchant-category-history.ts
import { randomUUID } from "node:crypto";
import { MerchantName } from "../value-objects/merchant-name.js";

type CreateMerchantCategoryHistoryProps = {
  familyId: string;
  merchantName: MerchantName;
  categoryId: string;
  tagId: string | null;
};

type ReconstituteMerchantCategoryHistoryProps = {
  id: string;
  familyId: string;
  merchantName: string;
  categoryId: string;
  tagId: string | null;
  timesUsed: number;
};

class MerchantCategoryHistory {
  private constructor(
    private readonly _id: string,
    private readonly _familyId: string,
    private readonly _merchantName: MerchantName,
    private _categoryId: string,
    private _tagId: string | null,
    private _timesUsed: number,
  ) {}

  get id(): string {
    return this._id;
  }
  get familyId(): string {
    return this._familyId;
  }
  get merchantName(): MerchantName {
    return this._merchantName;
  }
  get categoryId(): string {
    return this._categoryId;
  }
  get tagId(): string | null {
    return this._tagId;
  }
  get timesUsed(): number {
    return this._timesUsed;
  }

  static create(props: CreateMerchantCategoryHistoryProps): MerchantCategoryHistory {
    return new MerchantCategoryHistory(
      randomUUID(),
      props.familyId,
      props.merchantName,
      props.categoryId,
      props.tagId,
      1,
    );
  }

  static reconstitute(props: ReconstituteMerchantCategoryHistoryProps): MerchantCategoryHistory {
    return new MerchantCategoryHistory(
      props.id,
      props.familyId,
      MerchantName.create(props.merchantName),
      props.categoryId,
      props.tagId,
      props.timesUsed,
    );
  }

  reinforce(categoryId = this.categoryId, tagId = this.tagId): void {
    this._categoryId = categoryId;
    this._tagId = tagId;
    this._timesUsed += 1;
  }
}

export type { CreateMerchantCategoryHistoryProps, ReconstituteMerchantCategoryHistoryProps };
export { MerchantCategoryHistory };
