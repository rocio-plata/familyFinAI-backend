// src/platform/http/money.dto.ts
import type { Money } from "../../shared-kernel/domain/money.js";

type MoneyDto = {
  amount: number;
  currency: string;
};

function toMoneyDto(money: Money): MoneyDto {
  return money.toDto();
}

export type { MoneyDto };
export { toMoneyDto };
