// src/platform/http/local-swagger.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";

const swaggerUiHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>FamilyFin AI API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/docs/openapi.yaml",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: "StandaloneLayout"
        });
      };
    </script>
  </body>
</html>`;

function registerLocalSwaggerRoutes(app: FastifyInstance): void {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_LOCAL_SWAGGER !== "true") {
    return;
  }

  app.get("/docs", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(swaggerUiHtml);
  });

  app.get("/docs/openapi.yaml", async (_request, reply) => {
    const openapi = await readFile(resolve(process.cwd(), "docs/openapi.yaml"), "utf8");
    return reply.type("application/yaml; charset=utf-8").send(openapi);
  });
}

export { registerLocalSwaggerRoutes };
