// src/shared-kernel/domain/period-resolver.ts
import { Period } from "./period.js";

const DEFAULT_REPORTING_TIMEZONE = "America/Santiago";

class PeriodResolver {
  constructor(
    private readonly timeZone = process.env.REPORTING_TIMEZONE ?? DEFAULT_REPORTING_TIMEZONE,
  ) {}

  periodOf(instant: Date): Period {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(instant);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    return Period.of(year, month);
  }
}

export { DEFAULT_REPORTING_TIMEZONE, PeriodResolver };
