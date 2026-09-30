---
name: review-tests
description: Revisa specs de Playwright (archivos nuevos o modificados en tests/) contra las convenciones de calidad del repo y devuelve hallazgos con severidad. Usar cuando el usuario pida revisar tests, hacer code review de specs, o antes de abrir un PR con cambios en tests/.
disable-model-invocation: true
---

# Revisar tests de Playwright

Objetivo: detectar fragilidad y falsas seguridades en specs antes de que lleguen a `main`.

## Alcance

Por defecto, los specs con cambios: `git diff --name-only main -- tests/` más los untracked (`git status --short tests/`). Si el usuario nombra un archivo, revisar solo ese. Si no hay cambios, revisar todo `tests/`.

Lee `AGENTS.md` primero; es la fuente de verdad de las convenciones.

## Checklist

Recorre cada punto por archivo. Marca solo lo que aplica.

**Selectores**
- [ ] Usa `getByRole`/`getByLabel`/`getByText` antes que CSS.
- [ ] Sin `nth()`, `first()`, `last()` salvo justificación en comentario.
- [ ] Sin clases generadas (`.css-1a2b3c`), XPath, ni selectores por posición.
- [ ] `name` con `exact: true` o regex anclada (`/^.../`) donde haya riesgo de coincidencia parcial.

**Esperas**
- [ ] Sin `waitForTimeout`, `setTimeout`, `sleep`.
- [ ] Sin `waitForSelector`/`waitForLoadState('networkidle')` usados como parche.
- [ ] Popups capturados con `waitForEvent('popup')` **antes** del click.

**Aserciones**
- [ ] Cada test tiene al menos un `expect` con auto-wait sobre el resultado del comportamiento (no solo "no lanzó error").
- [ ] Listas verificadas con `toHaveCount` además de los elementos individuales.
- [ ] Sin `expect(true).toBe(true)` ni aserciones sobre valores capturados con `textContent()` cuando existe un matcher de locator equivalente.
- [ ] Popups: se comprueba la URL del popup **y** que la pestaña original no se movió.

**Independencia y estructura**
- [ ] Cada test navega desde cero; sin estado compartido mutable entre tests.
- [ ] Datos en constantes `as const`; tests repetitivos generados con `for`.
- [ ] Sin `test.only`; `test.skip`/`fixme` solo con comentario explicativo.
- [ ] Nombres de test en español, describen comportamiento, no implementación.
- [ ] Archivo en kebab-case bajo `tests/`.

**Ejecución**
- [ ] `npx playwright test --list <spec>` compila sin errores.
- [ ] Si el spec es nuevo o cambió lógica: ejecutar `npx playwright test <spec> --project=chromium` y anotar el resultado. No aprobar un spec que no pasa.

## Formato del reporte

```
## Revisión: tests/<archivo>.spec.ts

🔴 Crítico (bloquea merge)
- L42: `waitForTimeout(2000)` — reemplazar por `expect(locator).toBeVisible()`.

🟡 Mejora
- L10: `getByText('Join')` puede coincidir con "Join Campfire" y "Join GroupMe"; usar `getByRole('link', { name: /^Join Campfire/ })`.

🟢 Opcional
- Añadir `toHaveCount` a la lista de recursos.

Ejecución: chromium ✅ 6/6 (o ❌ con el fallo resumido)
Veredicto: Aprobado / Aprobado con cambios / Rechazado
```

Cita línea y fragmento exacto. Propón el reemplazo concreto, no solo "mejorar el selector". Si el archivo está limpio, dilo en una línea; no inventes hallazgos.
