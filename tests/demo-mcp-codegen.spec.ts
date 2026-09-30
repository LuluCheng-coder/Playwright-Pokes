import { test, expect } from '@playwright/test';

/**
 * Test generado en vivo con el MCP de Playwright.
 * Las dos primeras líneas del cuerpo salieron literalmente de los bloques
 * "Ran Playwright code" que devolvió el servidor; el resto son las aserciones
 * derivadas de lo que el MCP reportó (pestañas abiertas, URL y título).
 */
test('Pokebattler se abre en una pestaña nueva desde la sección de raids', async ({ page }) => {
  await page.goto('https://pokecampfire.com/raids');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Pokebattler Raid Simulator' }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/pokebattler\.com/);
  await expect(popup).toHaveTitle(/Pokemon Go Simulator/i);

  // La pestaña original no se mueve.
  await expect(page).toHaveURL(/\/raids$/);
  await popup.close();
});
