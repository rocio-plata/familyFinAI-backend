FinancialItem.create() → dispara ItemRecorded
        │
        ▼
DrizzleFinancialItemRepository.save() → persiste → publica evento
        │
        ▼
InProcessEventBus.publish(ItemRecorded)
        │
        ├──▶ Reporting: handler actualiza read model de agregados por categoría/período
        │
        ├──▶ Budgeting: handler recalcula "Spent" del presupuesto del mes y chequea overspend
        │
        └──▶ AI Assistance: handler actualiza MerchantCategoryHistory (el "Jumbo → Groceries → Supermarket")






Dependency Events

Family & Access ──▶ (FamilyCreated) ──▶ Financial Tracking, Budgeting

Financial Tracking ──▶ (ItemRecorded, ItemAmountChanged,        ──▶ Budgeting
                         ItemReclassified, ItemDeleted)          ──▶ Reporting
                                                                  ──▶ AI Assistance

Financial Tracking ──▶ (CategoryDeprecated, TagDeprecated) ──▶ AI Assistance

Budgeting ──▶ (BudgetOverspent, BudgetPeriodClosed) ──▶ Reporting        