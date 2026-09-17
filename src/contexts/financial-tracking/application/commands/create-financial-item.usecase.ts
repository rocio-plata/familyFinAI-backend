// /src/contexts/financial-tracking/application/commands/create-financial-item.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { Money } from "../../../../shared-kernel/domain/money.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import {
  type CreateFinancialItemProps,
  FinancialItem,
} from "../../domain/entities/financial-item.js";
import { CategoryNotActiveError } from "../../domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { NoDefaultPaymentMethodSetError } from "../../domain/errors/no-default-payment-method-set.error.js";
import { PaymentMethodNotActiveError } from "../../domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../domain/errors/payment-method-not-found.error.js";
import { TagDoesNotBelongToCategoryError } from "../../domain/errors/tag-does-not-belong-to-category.error.js";
import { TagNotActiveError } from "../../domain/errors/tag-not-active.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { Note } from "../../domain/value-objects/note.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import { TagStatus } from "../../domain/value-objects/tag-status.js";
import type { Title } from "../../domain/value-objects/title.js";
import type { TransactionDate } from "../../domain/value-objects/transaction-date.js";

interface CreateFinancialItemInput {
  familyId: FamilyId;
  recordedBy: UserId;
  paymentMethodId?: PaymentMethodId;
  amount: Money;
  categoryId: CategoryId;
  tagId: TagId | null;
  title: Title;
  note?: Note;
  occurredOn: TransactionDate;
}

class CreateFinancialItemUseCase {
  constructor(
    private readonly itemRepository: FinancialItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus: EventBus,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly preferenceRepository: UserPaymentMethodPreferenceRepository,
  ) {}

  async execute(input: CreateFinancialItemInput): Promise<FinancialItem> {
    const paymentMethodId = await this.resolvePaymentMethodId(input);
    const paymentMethod = await this.paymentMethodRepository.findById(paymentMethodId);
    if (!paymentMethod?.familyId.equals(input.familyId)) {
      throw new PaymentMethodNotFoundError(paymentMethodId.toString());
    }
    if (paymentMethod.status !== CategoryStatus.Active) {
      throw new PaymentMethodNotActiveError(paymentMethodId.toString());
    }

    // 1. Buscar la categoría
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }

    // 2. Validar que la categoría esté activa
    if (category.status !== CategoryStatus.Active) {
      throw new CategoryNotActiveError(input.categoryId.toString());
    }

    // 3. Si hay tag, validar que existe, pertenece a la categoría, y está activo
    if (input.tagId !== null) {
      const tagId = input.tagId;
      const tag = category.tags.find((t) => t.id.equals(tagId));
      if (!tag) {
        throw new TagDoesNotBelongToCategoryError(tagId.toString(), input.categoryId.toString());
      }

      if (tag.status !== TagStatus.Active) {
        throw new TagNotActiveError(input.tagId.toString());
      }
    }

    // 4. Construir CategoryAssignment
    const categoryAssignment = CategoryAssignment.of(input.categoryId, input.tagId);

    // 5. Crear el FinancialItem
    const props: CreateFinancialItemProps = {
      familyId: input.familyId,
      recordedBy: input.recordedBy,
      paymentMethodId,
      amount: input.amount,
      category: categoryAssignment,
      title: input.title,
      occurredOn: input.occurredOn,
      ...(input.note && { note: input.note }),
    };
    const item = FinancialItem.create(props, category.type);

    // 6. Persistir
    await this.itemRepository.save(item);

    // 7. Publicar eventos
    for (const event of item.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    return item;
  }

  private async resolvePaymentMethodId(input: CreateFinancialItemInput): Promise<PaymentMethodId> {
    if (input.paymentMethodId) return input.paymentMethodId;

    const preference = await this.preferenceRepository.findByUserAndFamily(
      input.recordedBy,
      input.familyId,
    );
    if (!preference) throw new NoDefaultPaymentMethodSetError();

    return preference.defaultPaymentMethodId;
  }
}

export { CreateFinancialItemUseCase };
