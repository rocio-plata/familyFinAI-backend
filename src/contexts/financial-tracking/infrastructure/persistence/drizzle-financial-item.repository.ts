// contexts/financial-tracking/infrastructure/persistence/drizzle-financial-item.repository.ts
import { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import { FinancialItem } from "../../domain/entities/financial-item.js";
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { financialItems } from "./drizzle-schema.js";

class DrizzleFinancialItemRepository implements FinancialItemRepository {
  async save(item: FinancialItem): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(financialItems).values(/* ... */);
    });

    const events = item.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);   // recién aquí salen del contexto
    }
  }
}