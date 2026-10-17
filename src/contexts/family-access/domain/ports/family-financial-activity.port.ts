// src/contexts/family-access/domain/ports/family-financial-activity.port.ts
import type { FamilyId } from "../value-objects/family-id.js";

interface FamilyFinancialActivityPort {
  hasItems(familyId: FamilyId): Promise<boolean>;
  hasActiveBudgets(familyId: FamilyId): Promise<boolean>;
}

export type { FamilyFinancialActivityPort };
