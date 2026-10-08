import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'https://pokecampfire.com/';
const RAIDS_URL = `${BASE_URL}raids`;

const PAGE_HEADING = 'Raids & Max Battles (D/G-Max)';

/**
 * Tarjetas de recursos de la página. Cada tarjeta es un enlace externo cuyo
 * nombre accesible empieza por el h3 interno (ej. "Pokebattler Raid Simulator…"),
 * por eso se usa regex anclada al inicio. `popupUrl` se verifica solo en los
 * recursos marcados con `clickable` para no depender de sitios lentos o con login
 * (Facebook) en CI.
 */
const SECTIONS = [
  {
    heading: 'Raid Simulators & Counter Infographics',
    resources: [
      { name: /^Dialgadex Infographics/, href: /dialgadex\.com/, popupUrl: /dialgadex\.com/, clickable: true },
      { name: /^Palkiadex Damage Rankings/, href: /palkiadex\.com/, popupUrl: /palkiadex\.com/, clickable: false },
      { name: /^Pokebattler Raid Simulator/, href: /pokebattler\.com/, popupUrl: /pokebattler\.com/, clickable: true },
      { name: /^G47IX Infographics Visual Guides/, href: /facebook\.com\/g47ix/, popupUrl: /facebook\.com/, clickable: false },
      { name: /^Solo Raid Archive Challenge Raids/, href: /soloraidarchive\.github\.io/, popupUrl: /soloraidarchive\.github\.io/, clickable: false },
      { name: /^Dittobase Database & Meta/, href: /dittobase\.com\/pokemon-go/, popupUrl: /dittobase\.com/, clickable: false },
    ],
  },
  {
    heading: 'Dynamax & Gigantamax (D/G-Max) Guides',
    resources: [
      { name: /^PokeChespin Dynamax Guide Max Mechanics/, href: /pokechespin\.net\/dynamax/, popupUrl: /pokechespin\.net/, clickable: true },
      { name: /^Pokémon GO Hub Max Battles Database Max Counters/, href: /db\.pokemongohub\.net/, popupUrl: /pokemongohub\.net/, clickable: false },
    ],
  },
] as const;

const ALL_RESOURCES = SECTIONS.flatMap((section) => section.resources);
const CLICKABLE_RESOURCES = ALL_RESOURCES.filter((resource) => resource.clickable);

/** Enlaces comunes del pie, presentes en todas las secciones del sitio. */
const FOOTER_LINKS = [
  { name: 'GroupMe', href: /groupme\.com\/join_group/ },
  { name: 'Campfire', href: /campfire\.onelink\.me/ },
] as const;

async function gotoRaids(page: Page) {
  await page.goto(RAIDS_URL);
  await expect(page.getByRole('heading', { level: 1, name: PAGE_HEADING, exact: true })).toBeVisible();
}

test.describe('Raids y Max Battles (/raids)', () => {
  test('muestra el título, la cabecera y las dos secciones de recursos', async ({ page }) => {
    await gotoRaids(page);

    await expect(page).toHaveTitle(/^Raids & Max Battles \(D\/G-Max\) \| Ridgewood Raiders/);
    await expect(page.getByText('Battle & Raid Resources', { exact: true })).toBeVisible();

    for (const section of SECTIONS) {
      await expect(
        page.getByRole('heading', { level: 2, name: section.heading, exact: true }),
        `sección "${section.heading}"`
      ).toBeVisible();
    }
    // Ninguna sección de más ni de menos.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(SECTIONS.length);
  });

  test('lista las 8 tarjetas de recursos como enlaces externos seguros', async ({ page }) => {
    await gotoRaids(page);

    for (const resource of ALL_RESOURCES) {
      const link = page.getByRole('link', { name: resource.name });
      await expect(link, `recurso ${resource.name.source}`).toBeVisible();
      await expect(link).toHaveAttribute('href', resource.href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }

    // Cada tarjeta tiene un h3 con el nombre del recurso; el h3 restante es el del pie.
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(ALL_RESOURCES.length + 1);
    // Recursos + GroupMe + Campfire + enlace de vuelta.
    await expect(page.getByRole('link')).toHaveCount(ALL_RESOURCES.length + FOOTER_LINKS.length + 1);
  });

  for (const resource of CLICKABLE_RESOURCES) {
    test(`"${resource.name.source.replace(/^\^/, '')}" abre en una pestaña nueva y la página no cambia`, async ({ page }) => {
      await gotoRaids(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: resource.name }).click();
      const popup = await popupPromise;

      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(resource.popupUrl);
      await expect(popup).not.toHaveURL(/pokecampfire\.com/);

      // La pestaña original sigue en /raids.
      await expect(page).toHaveURL(RAIDS_URL);
      await expect(page.getByRole('heading', { level: 1, name: PAGE_HEADING, exact: true })).toBeVisible();

      await popup.close();
    });
  }

  test('el pie enlaza a la comunidad y a la convocatoria semanal', async ({ page }) => {
    await gotoRaids(page);

    await expect(
      page.getByRole('heading', { level: 3, name: 'Ready to raid with Ridgewood Raiders?', exact: true })
    ).toBeVisible();
    await expect(page.getByText('Wednesdays at 6:00 PM at Ridgewood Public Library.', { exact: true })).toBeVisible();

    for (const footer of FOOTER_LINKS) {
      const link = page.getByRole('link', { name: footer.name, exact: true });
      await expect(link, `pie ${footer.name}`).toHaveAttribute('href', footer.href);
      await expect(link).toHaveAttribute('target', '_blank');
    }
  });

  test('el enlace de vuelta lleva a la home', async ({ page }) => {
    await gotoRaids(page);

    const back = page.getByRole('link', { name: 'Back to Ridgewood Raiders Links', exact: true });
    await expect(back).toHaveAttribute('href', '/');
    await expect(back).not.toHaveAttribute('target', '_blank');
    await back.click();

    await expect(page).toHaveURL(BASE_URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Ridgewood Raiders', exact: true })).toBeVisible();
  });
});
