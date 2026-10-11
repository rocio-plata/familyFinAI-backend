// src/contexts/ai-assistance/domain/ports/category-lookup.port.ts
interface CategoryLookupPort {
  findByNameHint(familyId: string, nameHint: string): Promise<string | null>;
}

export type { CategoryLookupPort };
