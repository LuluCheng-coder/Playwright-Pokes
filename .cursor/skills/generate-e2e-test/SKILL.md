---
name: generate-e2e-test
description: Genera un test E2E de Playwright para una página o flujo de pokecampfire.com explorando primero la página real con el MCP de Playwright, escribiendo el spec según las convenciones del repo y ejecutándolo hasta que pase. Usar cuando el usuario pida crear, generar o añadir un test E2E, un spec de Playwright, o cubrir una página/flujo con pruebas.
disable-model-invocation: true
---

# Generar test E2E

Objetivo: entregar un spec en `tests/` que **ya se ejecutó y pasó** en chromium. Un test no ejecutado no cuenta como entregado.

## Entrada esperada

El usuario indica una URL, sección o flujo (ej. "la página /rules", "el banner de pase gratis", "que los enlaces del pie funcionan"). Si no da nada, preguntar qué página o comportamiento quiere cubrir.

## Workflow

Copia y sigue esta lista:

```
- [ ] 1. Leer AGENTS.md y el spec existente más parecido en tests/
- [ ] 2. Explorar la página real con el MCP de Playwright
- [ ] 3. Decidir qué comportamientos verificar (lista explícita)
- [ ] 4. Escribir el spec
- [ ] 5. Validar: npx playwright test --list <spec>
- [ ] 6. Ejecutar: npx playwright test <spec> --project=chromium
- [ ] 7. Corregir y repetir 6 hasta verde
- [ ] 8. Reportar qué cubre el test y qué quedó fuera
```

### 1. Contexto

Lee `AGENTS.md` (convenciones) y `tests/list-verification.spec.ts` (patrón de referencia: datos `as const`, loops de tests, helper `gotoHome`, manejo de popups). Si ya existe un spec que cubre parcialmente la página, **extiéndelo** en lugar de crear otro.

### 2. Explorar con el MCP

Usa las herramientas del servidor `playwright` de `.cursor/mcp.json`:

1. `browser_navigate` a la URL objetivo.
2. `browser_snapshot` para obtener el árbol de accesibilidad: roles, nombres exactos, `href`, `target`.
3. Si hay interacción (click, navegación), hazla con `browser_click` y toma otro `browser_snapshot` para ver el resultado real.
4. Para enlaces con `target="_blank"`, anota la URL destino esperada; no asumas que coincide con el `href` (hay redirectores como `onelink.me`).

Del snapshot saca los `name` accesibles literales. No inventes ni "corrijas" el texto: el sitio usa mayúsculas por CSS, pero el nombre accesible conserva el capitalizado del DOM.

### 3. Qué verificar

Antes de escribir código, lista en 3–6 bullets los comportamientos concretos. Prioriza:

- Contenido estructural: h1 exacto, h2 esperados **y su conteo**.
- Navegación interna: `href`, `toHaveURL` tras el click, enlace de vuelta a la home.
- Enlaces externos: `href`, `target="_blank"`, popup con `toHaveURL`, pestaña original intacta.
- Elementos comunes del pie (GroupMe, Campfire).

Evita aserciones frágiles: textos largos de párrafos, estilos, orden exacto de elementos decorativos.

### 4. Escribir el spec

Plantilla mínima:

```ts
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'https://pokecampfire.com/';

const ITEMS = [
  { name: /^Nombre accesible/i, href: /destino/, popupUrl: /destino/ },
] as const;

async function gotoSection(page: Page) {
  await page.goto(`${BASE_URL}seccion`);
  await expect(page.getByRole('heading', { level: 1, name: 'Título exacto', exact: true })).toBeVisible();
}

test.describe('Nombre del área en español', () => {
  test('describe el comportamiento en español', async ({ page }) => {
    await gotoSection(page);
    // ...
  });

  for (const item of ITEMS) {
    test(`"${item.name.source}" abre en pestaña nueva`, async ({ page }) => {
      await gotoSection(page);
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: item.name }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(item.popupUrl);
      await popup.close();
    });
  }
});
```

Reglas duras (el hook `check-spec.sh` las bloquea):
- Sin `waitForTimeout`, sin `test.only`.
- Nombres de archivo en kebab-case: `tests/<area>.spec.ts`.

### 5–7. Validar y ejecutar

```bash
npx playwright test --list tests/<archivo>.spec.ts        # compila y lista
npx playwright test tests/<archivo>.spec.ts --project=chromium
```

Si falla:
- Lee el mensaje completo; Playwright muestra el locator y los candidatos cercanos.
- Vuelve al snapshot del MCP para confirmar el nombre accesible antes de cambiar el selector.
- Nunca "arregles" un fallo añadiendo timeouts o relajando el `expect` a algo trivial.
- Máximo 4 iteraciones; si sigue fallando, reporta el fallo con hipótesis en lugar de seguir probando a ciegas.

### 8. Reporte final

Formato:

```
Spec: tests/<archivo>.spec.ts (N tests, chromium ✅)
Cubre:
- ...
Fuera de alcance / notas:
- ...
```

Si detectaste un posible bug del sitio durante la exploración (enlace roto, h2 duplicado), repórtalo aparte; no escribas un test que lo "acepte".
