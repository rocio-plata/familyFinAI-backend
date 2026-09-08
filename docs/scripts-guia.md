# Scripts del proyecto — guía de referencia

Explicación de cada script definido en `package.json` y en qué orden usarlos según el escenario (primera vez en el proyecto, día a día, antes de subir cambios, producción).

## Índice de scripts

| Script | Comando | Categoría |
|---|---|---|
| `dev` | `LOG_LEVEL=debug tsx watch src/platform/server.ts` | Desarrollo |
| `token` | `tsx scripts/generate-token.ts` | Desarrollo / utilidades |
| `lint` | `biome check src tests` | Calidad |
| `lint:fix` | `biome check --write src tests` | Calidad |
| `build` | `tsc` | Build |
| `start` | `node dist/platform/server.js` | Producción |
| `test` | `node --import tsx/esm --test 'tests/**/*.test.ts'` | Testing |
| `db:generate` | `drizzle-kit generate` | Base de datos |
| `db:migrate` | `drizzle-kit migrate` | Base de datos |
| `db:studio` | `drizzle-kit studio` | Base de datos |
| `db:up` | `docker-compose up -d db` | Base de datos |
| `db:down` | `docker-compose down` | Base de datos |
| `db:wait` | `node --env-file=.env --import tsx scripts/wait-for-db.ts` | Base de datos |
| `db:init` | `db:up` → `db:wait` → `db:migrate` | Base de datos (compuesto) |
| `db:reset` | `docker-compose down -v` → `db:up` → `db:wait` → `db:migrate` | Base de datos (compuesto) |
| `db:setup` | `node --env-file=.env --import tsx scripts/setup-db.ts` | Base de datos (compuesto) |

---

## Detalle de cada script

### `dev`
Levanta el servidor Fastify en modo desarrollo con recarga automática (`tsx watch`), y con logs en nivel `debug` (más verboso que el nivel por defecto — útil para ver cada request, query, evento publicado, etc. mientras desarrollas). Requiere que la base de datos ya esté arriba y migrada (ver `db:init`/`db:setup` más abajo) y el `.env` configurado.

### `token`
Genera un JWT manualmente, sin pasar por `/auth/register` ni `/auth/login`. Fue útil **antes** de que existiera el contexto `Identity` — hoy que ya tienes esos endpoints reales, este script queda más como utilidad de respaldo (por ejemplo, para generar un segundo usuario de prueba rápido sin llenar un formulario de registro) que como el flujo principal para obtener tokens.

> ⚠️ Verifica que `scripts/generate-token.ts` exista con ese nombre exacto — en una sesión anterior armamos un script equivalente como `scripts/generate-test-tokens.ts` (con "test" y en plural); si no coinciden, el comando falla con "no such file". Confirma cuál de los dos nombres es el real en tu proyecto y ajusta uno de los dos lados (el script o esta línea del `package.json`) para que coincidan.

### `lint` / `lint:fix`
`lint` solo reporta problemas de estilo/calidad detectados por Biome, sin modificar nada. `lint:fix` aplica automáticamente las correcciones que Biome pueda resolver por sí solo (el resto hay que corregirlo a mano).

### `build`
Compila todo el proyecto TypeScript a JavaScript plano en `dist/`, según lo configurado en `tsconfig.json`. Es el paso previo obligatorio a `start` — nunca se ejecuta `start` sin haber hecho `build` primero (a menos que `dist/` ya exista de una build anterior).

### `start`
Corre el servidor ya compilado (`dist/platform/server.js`) con Node puro, sin `tsx`. Es el comando de **producción** — más rápido de arrancar que `dev`, sin overhead de transpilación en caliente.

### `test`
Corre toda la suite de tests con el test runner nativo de Node (`node:test`), usando `tsx/esm` para poder ejecutar los archivos `.ts` directamente. Los tests usan repositorios en memoria — **no** requieren que la base de datos esté levantada.

### `db:generate`
Compara el estado actual de los `schema.ts` (de todos los contextos, re-exportados en `src/platform/db/schema.ts`) contra el histórico de migraciones ya generadas, y crea un nuevo archivo `.sql` en `src/platform/db/migrations/` con las diferencias. Se corre **cada vez que modificas un schema** (agregas una tabla, una columna, cambias un tipo, etc.) — nunca migra nada por sí solo, solo genera el archivo.

### `db:migrate`
Aplica contra la base de datos real todas las migraciones generadas que todavía no se hayan aplicado. Requiere que la base de datos esté accesible (contenedor levantado, `DATABASE_URL` correcto).

### `db:studio`
Levanta una interfaz web local (normalmente en `https://local.drizzle.studio`) para inspeccionar y editar los datos de tus tablas a mano, sin necesitar un cliente de Postgres aparte (DBeaver, pgAdmin, etc.).

### `db:up` / `db:down`
Prenden/apagan el contenedor de Postgres definido en `docker-compose.yml`, sin tocar migraciones ni datos. `db:down` conserva el volumen (los datos persisten aunque el contenedor esté apagado).

> Nota: tu `package.json` usa `docker-compose` (con guion, el binario standalone de Docker Compose v1). Si tienes Docker Desktop o una instalación reciente, es más común tener disponible `docker compose` (sin guion, como subcomando de `docker`, Compose v2) en su lugar. Si `db:up` falla con "command not found", ese es el motivo más probable — cambia `docker-compose` por `docker compose` en los scripts correspondientes.

### `db:wait`
Reintenta conectarse a Postgres cada segundo (hasta 20 intentos) hasta que responda. No hace nada más por sí solo — existe para que otros scripts compuestos puedan esperar de forma confiable antes de migrar.

### `db:init`
Encadena `db:up` → `db:wait` → `db:migrate`. Es el comando de uso diario: levanta el contenedor si no estaba corriendo, espera a que esté listo, y aplica cualquier migración pendiente (por ejemplo, si hiciste `git pull` y alguien más generó una migración nueva).

### `db:reset`
Como `db:init`, pero primero **borra el contenedor y su volumen** (`docker-compose down -v`) — todos los datos se pierden. Útil cuando quieres empezar de cero durante desarrollo (por ejemplo, si tus datos de prueba quedaron en un estado inconsistente).

### `db:setup`
El más completo de los tres compuestos de base de datos: levanta el contenedor, espera, **detecta si es la primera vez** (si no hay ninguna migración generada todavía, corre `db:generate` automáticamente antes de migrar), aplica las migraciones, y al final lista las tablas resultantes en la terminal. Pensado para el primer `npm run db:setup` de todo el proyecto, o para verificar de un vistazo el estado completo de la base de datos en cualquier momento.

---

## Orden lógico según el escenario

### 1. Primera vez que clonas el proyecto

```bash
npm install
cp .env.example .env        # y completa las variables si hace falta
npm run db:setup             # levanta Postgres, genera y aplica migraciones, lista las tablas
npm run dev                  # levanta el servidor
```

### 2. Día a día (ya tienes todo instalado)

```bash
npm run db:init               # por si el contenedor estaba apagado o hay migraciones nuevas de un pull
npm run dev
```

En otra terminal, mientras desarrollas:

```bash
npm run test                  # o dejarlo corriendo en modo watch si agregas ese script más adelante
```

### 3. Modificaste un `schema.ts` (agregaste/cambiaste una tabla)

```bash
npm run db:generate           # genera el archivo .sql de la migración nueva
# revisa el SQL generado antes de aplicarlo
npm run db:migrate            # lo aplica contra tu base de datos local
```

### 4. Antes de hacer commit / abrir un PR

```bash
npm run lint:fix              # corrige automáticamente lo que Biome pueda
npm run lint                  # confirma que no quede nada pendiente
npm run test                  # toda la suite en verde
npm run build                 # confirma que compila sin errores de tipos
```

### 5. Quieres empezar de cero (datos de prueba corruptos, etc.)

```bash
npm run db:reset
```

### 6. Simular producción localmente

```bash
npm run build
npm start
```

### 7. Inspeccionar los datos a mano

```bash
npm run db:studio
```

(puede correr en paralelo a `npm run dev`, no son excluyentes)

---

## Diagrama de dependencias entre scripts compuestos

```
db:wait ──┐
          ├──► db:init ──► (usado en el día a día)
db:up ────┘

docker-compose down -v ──► db:up ──► db:wait ──► db:migrate ──► (todo esto es db:reset)

db:up ──► db:wait ──► [¿hay migraciones? no → db:generate] ──► db:migrate ──► listar tablas
                                                                              (todo esto es db:setup)
```

`db:generate` y `db:studio` son los únicos scripts de base de datos que **no** forman parte de ningún compuesto — se corren siempre de forma manual y consciente, nunca automatizados dentro de otro script, porque generar una migración o abrir una UI de edición de datos son acciones que conviene hacer con atención, no como paso automático de un flujo mayor.
