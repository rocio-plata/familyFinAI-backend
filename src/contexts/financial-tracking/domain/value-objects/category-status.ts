// contexts/financial-tracking/domain/value-objects/category-status.ts
enum CategoryStatus {
  Active = "ACTIVE",
  Deprecated = "DEPRECATED", // preparado para el futuro
  // Deleted no existiría como tal — una categoría con items nunca se borra físicamente
}

export { CategoryStatus };
