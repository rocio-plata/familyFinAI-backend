// contexts/financial-tracking/domain/value-objects/tag-status.ts
enum TagStatus {
  Active = "ACTIVE",
  Deprecated = "DEPRECATED", // preparado para el futuro
  // Deleted no existiría como tal — una categoría con items nunca se borra físicamente
}

export { TagStatus };
