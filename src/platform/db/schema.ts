// Re-exporta el schema de cada contexto. A medida que se implemente la
// persistencia de más contextos (identity, financial-tracking, etc.),
// agregar su export aquí.

export * from "../../contexts/family-access/infrastructure/persistence/schema.js";
export * from "../../contexts/financial-tracking/infrastructure/persistence/schema.js";
export * from "../../contexts/identity/infrastructure/persistence/schema.js";
export * from "../../contexts/reporting/infrastructure/persistence/schema.js";
export * from "../auth/schema.js";
