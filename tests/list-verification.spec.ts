import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'https://pokecampfire.com/';

/**
 * Enlaces del menú principal marcados con target="_blank": al pulsarlos el sitio
 * abre una pestaña nueva (popup) y la home permanece intacta.
 */
const EXTERNAL_MENU_LINKS = [
  {
    label: 'Banner de pase gratis',
    name: /New & checked in on Campfire\?/i,
    href: /store\.pokemongo\.com\/offer-redemption/,
    popupUrl: /store\.pokemongo\.com/,
  },
  {
    label: 'Join Campfire',
    name: /^Join Campfire/i,
    href: /campfire\.onelink\.me/,
    // onelink.me es un redirector de deep link: según el user agent termina en
    // la App Store, en Google Play o en el esquema campfire://.
    popupUrl: /onelink\.me|campfire|apple\.com|play\.google\.com/i,
  },
  {
    label: 'Join GroupMe',
    name: /^Join GroupMe/i,
    href: /groupme\.com\/join_group/,
    popupUrl: /groupme\.com/,
  },
  {
    label: 'Ridgewood Library Meeting Spot',
    name: /^Ridgewood Library Meeting Spot/i,
    href: /maps\.google\.com/,
    popupUrl: /google\.[a-z.]+\/maps|maps\.google\./,
  },
  {
    label: 'Redeem Free Pass / Offer Code',
    name: /Redeem Free Pass \/ Offer Code/i,
    href: /store\.pokemongo\.com\/offer-redemption/,
    popupUrl: /store\.pokemongo\.com/,
  },
] as const;

/**
 * Secciones que navegan dentro del sitio y que exponen el enlace de vuelta
 * "Back to Ridgewood Raiders Links".
 *
 * Los encabezados se declaran con el texto real del DOM. En pantalla se ven en
 * mayúsculas por CSS, pero el nombre accesible conserva este capitalizado.
 */
const INTERNAL_SECTIONS = [
  {
    name: /^GBL & Event Raffle \(Season 28\)/i,
    path: '/contests',
    heading: 'Ridgewood Raiders GBL & Event Raffle',
    subheadings: [
      'The Prizes',
      'How to Enter (Main Draw)',
      'Elite PvP Side-Draw (Ace & Above)',
      'Verification & How to Claim',
      'Deadline & Schedule',
    ],
    resources: [],
  },
  {
    name: /^Raids & Max Battles \(D\/G-Max\)/i,
    path: '/raids',
    heading: 'Raids & Max Battles (D/G-Max)',
    subheadings: ['Raid Simulators & Counter Infographics', 'Dynamax & Gigantamax (D/G-Max) Guides'],
    resources: [
      { name: /^Dialgadex Infographics/i, href: /dialgadex\.com/ },
      { name: /^Pokebattler Raid Simulator/i, href: /pokebattler\.com/ },
    ],
  },
  {
    name: /^PvP & GO Battle League Hub/i,
    path: '/pvp',
    heading: 'PvP & GO Battle League Hub',
    subheadings: ['Rankings & Team Building Tools', 'Featured PvP YouTube Creators'],
    resources: [
      { name: /^PvPoke Rankings & Team Builder/i, href: /pvpoke\.com/ },
      { name: /^PvPIVs IV Ranker/i, href: /pvpivs\.com/ },
    ],
  },
  {
    name: /^Events, News & Trading Tools/i,
    path: '/tools',
    heading: 'Events, News & Trading Tools',
    subheadings: ['Live News & Event Calendars', 'Trading & Community Utilities'],
    resources: [
      { name: /^Pokémon GO Live News/i, href: /pokemongo\.com\/news/ },
      { name: /^Leek Duck Live Events Hub/i, href: /leekduck\.com/ },
    ],
  },
  {
    name: /^Community Rules & Etiquette/i,
    path: '/rules',
    heading: 'Community Rules & Etiquette',
    subheadings: [
      'Respect Ridgewood Public Library',
      'Welcoming & Family-Friendly',
      'Fair Play & Good Sportsmanship',
      'Raid Lobby Courtesy',
      'Safe Pedestrian Habits',
      'Honest & Safe Trading',
    ],
    resources: [{ name: 'https://explore.scopely.com/terms', href: /explore\.scopely\.com\/terms/ }],
  },
] as const;

const backLink = (page: Page) => page.getByRole('link', { name: /Back to Ridgewood Raiders/i });

async function gotoHome(page: Page) {
  await page.goto(BASE_URL);
  await expect(page.getByRole('heading', { level: 1, name: 'Ridgewood Raiders', exact: true })).toBeVisible();
}

test.describe('Menú principal de Ridgewood Raiders', () => {
  test('la home lista las 5 secciones internas y los 5 enlaces externos', async ({ page }) => {
    await gotoHome(page);

    for (const section of INTERNAL_SECTIONS) {
      const link = page.getByRole('link', { name: section.name });
      await expect(link, `sección ${section.path}`).toBeVisible();
      await expect(link).toHaveAttribute('href', section.path);
      // Las secciones internas no deben abrir pestaña nueva.
      await expect(link).not.toHaveAttribute('target', '_blank');
    }

    for (const external of EXTERNAL_MENU_LINKS) {
      const link = page.getByRole('link', { name: external.name });
      await expect(link, `enlace externo ${external.label}`).toBeVisible();
      await expect(link).toHaveAttribute('href', external.href);
      await expect(link).toHaveAttribute('target', '_blank');
    }

    // Guarda contra secciones añadidas o eliminadas sin actualizar el test.
    await expect(page.locator('a[href^="/"]:not([href="/"])')).toHaveCount(INTERNAL_SECTIONS.length);
  });

  for (const external of EXTERNAL_MENU_LINKS) {
    test(`"${external.label}" abre en una pestaña nueva`, async ({ page }) => {
      await gotoHome(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: external.name }).click();
      const popup = await popupPromise;

      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(external.popupUrl);
      await expect(popup).not.toHaveURL(/pokecampfire\.com/);

      // La pestaña original no debe haberse movido de la home.
      await expect(page).toHaveURL(BASE_URL);
      await expect(page.getByRole('heading', { level: 1, name: 'Ridgewood Raiders', exact: true })).toBeVisible();

      await popup.close();
    });
  }

  for (const section of INTERNAL_SECTIONS) {
    test(`la sección ${section.path} navega internamente y vuelve a la home`, async ({ page }) => {
      await gotoHome(page);

      await page.getByRole('link', { name: section.name }).click();
      await expect(page).toHaveURL(new RegExp(`${section.path}$`));

      await expect(page.getByRole('heading', { level: 1, name: section.heading, exact: true })).toBeVisible();
      for (const subheading of section.subheadings) {
        await expect(
          page.getByRole('heading', { level: 2, name: subheading, exact: true }),
          `subtítulo de ${section.path}`
        ).toBeVisible();
      }
      // Ningún h2 de más ni de menos.
      await expect(page.getByRole('heading', { level: 2 })).toHaveCount(section.subheadings.length);

      for (const resource of section.resources) {
        const link = page.getByRole('link', { name: resource.name });
        await expect(link, `recurso de ${section.path}`).toBeVisible();
        await expect(link).toHaveAttribute('href', resource.href);
        await expect(link).toHaveAttribute('target', '_blank');
      }

      // Todas las secciones enlazan a la comunidad desde el pie.
      await expect(page.getByRole('link', { name: 'GroupMe', exact: true })).toHaveAttribute(
        'href',
        /groupme\.com/
      );
      await expect(page.getByRole('link', { name: 'Campfire', exact: true })).toHaveAttribute(
        'href',
        /campfire\.onelink\.me/
      );

      const back = backLink(page);
      await expect(back).toBeVisible();
      await expect(back).toHaveAttribute('href', '/');
      await back.click();
      await expect(page).toHaveURL(BASE_URL);
      await expect(page.getByRole('heading', { level: 1, name: 'Ridgewood Raiders', exact: true })).toBeVisible();
    });
  }

  test('el sorteo enlaza de forma cruzada con el hub de PvP', async ({ page }) => {
    await page.goto(`${BASE_URL}contests`);

    await page.getByRole('link', { name: /PvP & Battle League Hub/i }).click();
    await expect(page).toHaveURL(/\/pvp$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'PvP & GO Battle League Hub', exact: true })
    ).toBeVisible();
  });
});
