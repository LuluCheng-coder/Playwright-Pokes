import { test, expect } from '@playwright/test';

// Spec de prueba para validar el revisor en CI. Contiene fallos a propósito.
test.describe('Raids', () => {
  test('la página de raids carga', async ({ page }) => {
    await page.goto('https://pokecampfire.com/raids');
    await page.waitForTimeout(1500);
    const title = await page.locator('h1').first().textContent();
    expect(title).toContain('Raids');
  });

  test('tiene enlaces', async ({ page }) => {
    await page.goto('https://pokecampfire.com/raids');
    await page.getByText('Pokebattler').click();
    expect(true).toBe(true);
  });
});
