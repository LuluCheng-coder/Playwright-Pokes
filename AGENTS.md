# Playwright-Pokes

Suite E2E con `@playwright/test` contra https://pokecampfire.com/ (sitio "Ridgewood Raiders",
comunidad de Pokémon GO). Repo aislado del proyecto Cypress; aquí solo vive Playwright.

## Comandos

- `npm test` — toda la suite (chromium, firefox, webkit).
- `npx playwright test tests/<archivo>.spec.ts --project=chromium` — un spec, rápido. Usar esto al iterar.
- `npx playwright test --list tests/<archivo>.spec.ts` — valida que el spec compila y lista sus tests sin ejecutarlos.
- `npm run report` — abre el último reporte HTML.
- `npm run codegen` — grabador de Playwright contra la home.

Si al ejecutar aparece `browserType.launch: Executable doesn't exist at .../cursor-sandbox-cache/...`,
el shell del agente tiene `PLAYWRIGHT_BROWSERS_PATH` apuntando a una caché vacía. No reinstalar navegadores;
anteponer la ruta real: `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright npx playwright test ...`.

## Estructura

- `tests/*.spec.ts` — un archivo por área funcional.
  - Specs de una página del sitio se nombran por su ruta: `/rules` → `tests/rules.spec.ts`, `/raids` → `tests/raids.spec.ts`.
  - Specs transversales (home, menú, pie) usan un nombre descriptivo en kebab-case (`list-verification`, no `test1`).
- `playwright.config.ts` — sin `baseURL`; cada spec declara `const BASE_URL = 'https://pokecampfire.com/'`.
- `.cursor/mcp.json` — servidor MCP de Playwright (chromium). El agente lo usa para explorar la página real antes de escribir tests.
- `.cursor/skills/` — skills invocables con `/nombre`. `.cursor/hooks/` — validaciones automáticas.
- Ignorados: `test-results/`, `playwright-report/`, `.playwright-mcp/`, `*.png` en la raíz.

## Convenciones de tests

Nombres y comentarios en **español**; identificadores de código en inglés.

Selectores, en este orden de preferencia:
1. `getByRole` con `name` (regex `/^Texto/i` o string con `exact: true` para evitar coincidencias parciales).
2. `getByLabel`, `getByPlaceholder`, `getByText`.
3. `getByTestId` si existe.
4. `locator('css')` solo para conteos estructurales (ej. `a[href^="/"]`), nunca para clases generadas o posiciones (`nth`, `>>`).

Esperas y aserciones:
- Solo auto-waiting de `expect(...)`: `toBeVisible`, `toHaveURL`, `toHaveAttribute`, `toHaveCount`, `toHaveTitle`.
- Prohibido `page.waitForTimeout`, `setTimeout`, o `waitForSelector` con timeouts inventados.
- Enlaces externos: verificar `href` + `target="_blank"` y, si se hace click, capturar con `page.waitForEvent('popup')` **antes** del click, comprobar `toHaveURL` del popup, que la pestaña original no se movió, y cerrar el popup.
- Añadir mensaje al `expect` cuando se itera sobre datos: `expect(link, \`sección ${section.path}\`)`.
- Incluir una aserción de conteo cuando se verifica una lista, para detectar elementos añadidos o eliminados.

Estructura de cada test:
- Independiente: cada test navega desde cero (`gotoHome(page)` o `page.goto(...)`). Nada de estado compartido entre tests.
- Datos en constantes `as const` al inicio del archivo; generar tests con `for (const item of DATA) test(...)` en vez de duplicar.
- Helpers pequeños tipados con `Page` (`async function gotoHome(page: Page)`).
- Agrupar con `test.describe('<área en español>')`.
- Nunca dejar `test.only` ni `test.skip` sin comentario que explique por qué.

Texto accesible vs texto visible: el sitio pone encabezados en mayúsculas por CSS; el `name` accesible
conserva el capitalizado original del DOM. Usar siempre el texto del DOM (ver `INTERNAL_SECTIONS`).

## Flujo esperado al crear o modificar tests

1. Explorar la página real con el MCP de Playwright (`browser_navigate` + `browser_snapshot`) para obtener roles y nombres accesibles exactos. No inventar selectores.
2. Escribir el spec siguiendo las convenciones de arriba.
3. Ejecutar `npx playwright test <spec> --project=chromium` y corregir hasta que pase. No dar por terminado un test que no se ejecutó.
4. Si falla algo en firefox/webkit y no en chromium, indicarlo explícitamente en lugar de ocultarlo.
