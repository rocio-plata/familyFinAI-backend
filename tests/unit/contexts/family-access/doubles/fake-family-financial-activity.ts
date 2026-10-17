// tests/unit/contexts/family-access/doubles/fake-family-financial-activity.ts
import type { FamilyFinancialActivityPort } from "../../../../../src/contexts/family-access/domain/ports/family-financial-activity.port.js";
import type { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";

class FakeFamilyFinancialActivity implements FamilyFinancialActivityPort {
  private items = false;
  private activeBudgets = false;
  calls = 0;

  setItemsExist(value: boolean): void {
    this.items = value;
  }

  setActiveBudgetsExist(value: boolean): void {
    this.activeBudgets = value;
  }

  async hasItems(_familyId: FamilyId): Promise<boolean> {
    this.calls++;
    return this.items;
  }

  async hasActiveBudgets(_familyId: FamilyId): Promise<boolean> {
    this.calls++;
    return this.activeBudgets;
  }
}

export { FakeFamilyFinancialActivity };
