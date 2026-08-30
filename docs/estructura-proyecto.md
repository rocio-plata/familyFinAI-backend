# FamilyFin AI — Backend: estructura de carpetas (avance)

Detalle de dónde va cada archivo/clase que hemos definido hasta ahora en la conversación. Los archivos marcados con `📝` son los que ya discutimos con código de ejemplo; el resto son huecos previsibles de la estructura que aún no detallamos.

```
familyfin-backend/
├── src/
│   ├── contexts/
│   │   │
│   │   ├── family-access/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── family.ts                       📝 Family (Aggregate Root) — create, inviteMember, removeMember, changeRole
│   │   │   │   │   ├── member.ts                        📝 Member (entidad hija, sin agregado propio) — createOwner
│   │   │   │   │   └── invitation.ts                     📝 Invitation (Aggregate Root separado) — accept, revoke
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── role.ts                            📝 Role — owner(), member(), canRemoveMembers()
│   │   │   │   │   ├── family-name.ts                     📝 FamilyName — validación de longitud
│   │   │   │   │   ├── email-address.ts                   📝 EmailAddress — validación de formato
│   │   │   │   │   └── invitation-status.ts                  InvitationStatus (Pending | Accepted | Expired | Revoked)
│   │   │   │   ├── events/
│   │   │   │   │   ├── family-created.event.ts               FamilyCreated
│   │   │   │   │   ├── member-invited.event.ts                MemberInvited
│   │   │   │   │   ├── invitation-accepted.event.ts            InvitationAccepted
│   │   │   │   │   ├── member-removed.event.ts                 MemberRemoved
│   │   │   │   │   └── member-role-changed.event.ts             MemberRoleChanged
│   │   │   │   └── repositories/
│   │   │   │       ├── family.repository.ts                    FamilyRepository (interfaz/puerto)
│   │   │   │       └── invitation.repository.ts                 InvitationRepository (interfaz/puerto)
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── invite-member.command.ts
│   │   │   │   │   └── join-family.command.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get-family-membership.query.ts    📝 GetFamilyMembershipQuery — usada por requireFamilyMembership
│   │   │   │   │   └── get-family-members.query.ts
│   │   │   │   └── event-handlers/
│   │   │   │       └── on-invitation-accepted.handler.ts       agrega el Member a Family al aceptar
│   │   │   └── infrastructure/
│   │   │       ├── persistence/
│   │   │       │   ├── drizzle-family.repository.ts
│   │   │       │   └── drizzle-invitation.repository.ts
│   │   │       └── http/
│   │   │           └── family.routes.ts
│   │   │
│   │   ├── financial-tracking/                            ← core domain
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── financial-item.ts                📝 FinancialItem (Aggregate Root) — create, reclassify, updateAmount
│   │   │   │   │   ├── category.ts                       📝 Category (Aggregate Root) — addTag, rename, deprecate, reactivate
│   │   │   │   │   └── tag.ts                             📝 Tag (entidad hija) — rename, deprecate
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── money.ts                           📝 Money — of, add, isGreaterThan
│   │   │   │   │   ├── category-assignment.ts             📝 CategoryAssignment — categoryId + tagId opcional
│   │   │   │   │   ├── transaction-date.ts                📝 TransactionDate — valida fecha no futura
│   │   │   │   │   ├── title.ts                           📝 Title — longitud/no vacío
│   │   │   │   │   ├── note.ts                            📝 Note — opcional
│   │   │   │   │   ├── financial-item-type.ts             📝 FinancialItemType (Expense | Income)
│   │   │   │   │   ├── category-name.ts                       CategoryName
│   │   │   │   │   ├── tag-name.ts                            TagName
│   │   │   │   │   ├── category-status.ts                 📝 CategoryStatus (Active | Deprecated)
│   │   │   │   │   └── tag-status.ts                      📝 TagStatus (Active | Deprecated)
│   │   │   │   ├── events/
│   │   │   │   │   ├── item-recorded.event.ts             📝 ItemRecorded
│   │   │   │   │   ├── item-amount-changed.event.ts           ItemAmountChanged
│   │   │   │   │   ├── item-reclassified.event.ts             ItemReclassified
│   │   │   │   │   ├── item-deleted.event.ts                   ItemDeleted
│   │   │   │   │   ├── category-created.event.ts               CategoryCreated
│   │   │   │   │   ├── category-deprecated.event.ts             CategoryDeprecated
│   │   │   │   │   ├── tag-created.event.ts                     TagCreated
│   │   │   │   │   └── tag-deprecated.event.ts                   TagDeprecated
│   │   │   │   ├── services/
│   │   │   │   │   ├── category-deletion.service.ts       📝 CategoryDeletionService — delete/deprecate con chequeo de items
│   │   │   │   │   └── tag-deletion.service.ts             📝 TagDeletionService — delete/deprecate con chequeo de items
│   │   │   │   └── repositories/
│   │   │   │       ├── financial-item.repository.ts       📝 FinancialItemRepository (interfaz) — countByCategory, countByTag
│   │   │   │       └── category.repository.ts                  CategoryRepository (interfaz)
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create-financial-item.usecase.ts   📝 CreateFinancialItemUseCase — usado por AI Assistance
│   │   │   │   │   ├── update-item-amount.usecase.ts
│   │   │   │   │   ├── reclassify-item.usecase.ts
│   │   │   │   │   └── delete-item.usecase.ts
│   │   │   │   └── queries/
│   │   │   │       └── category-lookup.port.ts            📝 CategoryLookupPort — usado por ScanReceiptUseCase (AI Assistance)
│   │   │   └── infrastructure/
│   │   │       ├── persistence/
│   │   │       │   ├── drizzle-financial-item.repository.ts 📝 publica eventos tras persistir (pullDomainEvents)
│   │   │       │   └── drizzle-category.repository.ts
│   │   │       └── http/
│   │   │           └── financial-item.routes.ts           📝 ejemplo de ruta con authenticate + requireFamilyMembership
│   │   │
│   │   ├── budgeting/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── budget.ts                              Budget — registerSpending (protege invariante de overspend)
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── budget-period.ts                       BudgetPeriod
│   │   │   │   │   └── overspend.ts                           Overspend
│   │   │   │   ├── events/
│   │   │   │   │   ├── budget-created.event.ts                BudgetCreated
│   │   │   │   │   ├── budget-overspent.event.ts               BudgetOverspent
│   │   │   │   │   └── budget-period-closed.event.ts            BudgetPeriodClosed
│   │   │   │   └── repositories/
│   │   │   │       └── budget.repository.ts                   BudgetRepository — findActiveByCategory
│   │   │   ├── application/
│   │   │   │   └── event-handlers/
│   │   │   │       └── on-item-recorded.handler.ts        📝 OnItemRecordedHandler — recalcula spent al escuchar ItemRecorded
│   │   │   └── infrastructure/
│   │   │       ├── persistence/
│   │   │       │   └── drizzle-budget.repository.ts
│   │   │       └── http/
│   │   │           └── budget.routes.ts
│   │   │
│   │   ├── reporting/
│   │   │   ├── domain/
│   │   │   │   └── entities/
│   │   │   │       ├── report.ts                              Report
│   │   │   │       ├── breakdown.ts                            Breakdown
│   │   │   │       └── trend.ts                                 Trend
│   │   │   ├── application/
│   │   │   │   ├── queries/                                    read side (CQRS) — consultas de reportes
│   │   │   │   └── event-handlers/
│   │   │   │       └── on-item-recorded.handler.ts             actualiza agregados/read models de reporting
│   │   │   └── infrastructure/
│   │   │       ├── persistence/                                read models materializados
│   │   │       └── http/
│   │   │           └── report.routes.ts
│   │   │
│   │   └── ai-assistance/
│   │       ├── domain/
│   │       │   ├── entities/
│   │       │   │   ├── expense-suggestion.ts              📝 ExpenseSuggestion — confirm()
│   │       │   │   ├── receipt-suggestion.ts               📝 ReceiptSuggestion — fromScan() (1 recibo = 1 gasto), confirm, discard
│   │       │   │   └── confirmed-suggestion.ts              ConfirmedSuggestion
│   │       │   ├── value-objects/
│   │       │   │   ├── confidence-score.ts                 ConfidenceScore
│   │       │   │   ├── merchant-name.ts                    MerchantName
│   │       │   │   └── receipt-image-ref.ts                 ReceiptImageRef
│   │       │   ├── events/
│   │       │   │   ├── suggestion-generated.event.ts        SuggestionGenerated
│   │       │   │   ├── suggestion-confirmed.event.ts          SuggestionConfirmed
│   │       │   │   ├── suggestion-discarded.event.ts           SuggestionDiscarded
│   │       │   │   └── merchant-category-learned.event.ts       MerchantCategoryLearned
│   │       │   ├── ports/
│   │       │   │   ├── natural-language-parser.port.ts    📝 NaturalLanguageParserPort — parse(text, context)
│   │       │   │   ├── receipt-scanner.port.ts             📝 ReceiptScannerPort — scan(image, context) → ReceiptScanResult
│   │       │   │   └── natural-language-query.port.ts          NaturalLanguageQueryPort (pendiente de detallar)
│   │       │   └── repositories/
│   │       │       ├── suggestion.repository.ts                SuggestionRepository
│   │       │       └── merchant-category-history.repository.ts 📝 MerchantCategoryHistoryRepository — "Jumbo → Groceries"
│   │       ├── application/
│   │       │   ├── confirm-suggestion.usecase.ts          📝 ConfirmSuggestionUseCase — llama a CreateFinancialItemUseCase
│   │       │   ├── scan-receipt.usecase.ts                📝 ScanReceiptUseCase — chequea historial antes de llamar a IA
│   │       │   └── event-handlers/
│   │       │       └── on-item-recorded.handler.ts             actualiza MerchantCategoryHistory
│   │       └── infrastructure/
│   │           ├── providers/
│   │           │   ├── openai-parser.adapter.ts           📝 OpenAINaturalLanguageParser — implementa NaturalLanguageParserPort
│   │           │   └── vision-receipt-scanner.adapter.ts   📝 VisionReceiptScannerAdapter — implementa ReceiptScannerPort
│   │           ├── persistence/
│   │           │   ├── drizzle-suggestion.repository.ts
│   │           │   └── drizzle-merchant-category-history.repository.ts
│   │           └── http/
│   │               └── ai-assistance.routes.ts
│   │
│   ├── shared-kernel/
│   │   ├── domain/
│   │   │   └── domain-event.ts                            📝 DomainEvent (clase base abstracta) — eventId, occurredAt, eventName
│   │   └── errors/
│   │       └── domain-error.ts                                 clase base de errores de dominio
│   │
│   └── platform/
│       ├── server.ts                                           bootstrap de Fastify, registro de rutas por contexto
│       ├── db/
│       │   ├── connection.ts                                   conexión Drizzle → Neon (Postgres)
│       │   └── migrations/
│       ├── events/
│       │   └── in-process-event-bus.ts                    📝 InProcessEventBus — publish/subscribe, in-process para el MVP
│       └── auth/
│           ├── jwt.ts                                      📝 JwtService — sign/verify con jose (access token)
│           ├── tokens.ts                                   📝 TokenService — issueTokenPair, refresh (rotación), revokeAll
│           ├── refresh-token.ts                            📝 RefreshToken (entidad) — generate, isExpired, isRevoked, revoke
│           ├── refresh-token.repository.ts                     RefreshTokenRepository (interfaz)
│           ├── authenticate.middleware.ts                 📝 authenticate — solo verifica identidad (JWT)
│           ├── require-family-membership.middleware.ts    📝 requireFamilyMembership — delega en GetFamilyMembershipQuery
│           └── http/
│               └── auth.routes.ts                          📝 POST /auth/refresh, POST /auth/logout
│
├── tests/
│   └── contexts/                                                espejo de la estructura de contexts/ (pendiente de diseñar)
│
├── package.json
└── README.md                                              📝 ya generado
```

## Notas sobre lo pendiente

- **`tests/`**: aún no definimos la estrategia de testing para esta arquitectura hexagonal (unitarios sobre el dominio puro vs. de integración sobre adaptadores).
- **`platform/db/migrations/`**: pendiente una vez definamos el modelo de datos concreto en Postgres (lo dejamos explícitamente para más adelante, priorizando primero el diseño DDD).
- **`NaturalLanguageQueryPort`**: mencionado pero no detallado todavía (las consultas tipo *"¿cuánto gastamos en restaurantes?"*).
- Los archivos sin `📝` son huecos previsibles de la estructura (siguen el mismo patrón que ya vimos en otros contextos) pero no los hemos discutido con código de ejemplo todavía.
