import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'https://pokecampfire.com/';
const RULES_URL = `${BASE_URL}rules`;

const PAGE_HEADING = 'Community Rules & Etiquette';

/**
 * Reglas numeradas de la página. Cada bloque tiene un badge ("01".."06"), un h2
 * y una lista de viñetas. `anchorBullet` es una viñeta cualquiera de la lista
 * (no necesariamente la primera) que la identifica sin depender de su posición
 * en el DOM; `bulletCount` detecta viñetas añadidas o eliminadas.
 */
const RULES = [
  {
    number: '01',
    heading: 'Respect Ridgewood Public Library',
    anchorBullet: 'Keep walkways, ramps, and main library entrances completely clear at all times.',
    bulletCount: 4,
  },
  {
    number: '02',
    heading: 'Welcoming & Family-Friendly',
    anchorBullet: 'Members must be at least 13+ years of age',
    bulletCount: 5,
  },
  {
    number: '03',
    heading: 'Fair Play & Good Sportsmanship',
    anchorBullet: 'Participate legitimately in person. Respect all players and venue boundaries.',
    bulletCount: 5,
  },
  {
    number: '04',
    heading: 'Raid Lobby Courtesy',
    anchorBullet: 'Announce lobby codes clearly when private lobbies are needed for high-volume crowds.',
    bulletCount: 3,
  },
  {
    number: '05',
    heading: 'Safe Pedestrian Habits',
    anchorBullet: 'NEVER play Pokémon GO while driving or operating a vehicle.',
    bulletCount: 2,
  },
  {
    number: '06',
    heading: 'Honest & Safe Trading',
    anchorBullet: 'Never pressure anyone into a trade or special trade they are hesitant about.',
    bulletCount: 3,
  },
] as const;

/** Etiquetas en negrita del bloque "Meeting Spots & Library Etiquette". */
const MEETING_SPOT_LABELS = ['Nice weather:', 'Rain or cold weather:', 'Respect the venue:'] as const;

/** Enlaces externos de la página: todos abren en pestaña nueva. */
const EXTERNAL_LINKS = [
  {
    label: 'Términos de Scopely',
    name: 'https://explore.scopely.com/terms',
    href: /explore\.scopely\.com\/terms/,
    popupUrl: /explore\.scopely\.com/,
  },
  {
    label: 'GroupMe',
    name: 'GroupMe',
    href: /groupme\.com\/join_group/,
    popupUrl: /groupme\.com/,
  },
  {
    label: 'Campfire',
    name: 'Campfire',
    href: /campfire\.onelink\.me/,
    // onelink.me es un redirector de deep link: según el user agent termina en
    // la App Store, en Google Play o en el esquema campfire://.
    popupUrl: /onelink\.me|campfire|apple\.com|play\.google\.com/i,
  },
] as const;

async function gotoRules(page: Page) {
  await page.goto(RULES_URL);
  await expect(page.getByRole('heading', { level: 1, name: PAGE_HEADING, exact: true })).toBeVisible();
}

test.describe('Normas de la comunidad (/rules)', () => {
  test('muestra el título, la cabecera y el bloque de puntos de encuentro', async ({ page }) => {
    await gotoRules(page);

    await expect(page).toHaveTitle(/^Community Rules & Etiquette \| Ridgewood Raiders/);
    await expect(page.getByText('Trainer Guidelines', { exact: true })).toBeVisible();
    // Fragmento corto y único: "family-friendly environment" también aparece en una viñeta de la regla 02.
    await expect(page.getByText(/committed to a safe/)).toBeVisible();

    await expect(page.getByText('Meeting Spots & Library Etiquette', { exact: true })).toBeVisible();
    for (const label of MEETING_SPOT_LABELS) {
      await expect(page.getByText(label, { exact: true }), `etiqueta "${label}"`).toBeVisible();
    }
  });

  test('lista las 6 reglas numeradas con sus viñetas', async ({ page }) => {
    await gotoRules(page);

    for (const rule of RULES) {
      await expect(page.getByText(rule.number, { exact: true }), `badge ${rule.number}`).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 2, name: rule.heading, exact: true }),
        `regla ${rule.number}`
      ).toBeVisible();

      const list = page.getByRole('list').filter({ hasText: rule.anchorBullet });
      await expect(list, `lista de la regla ${rule.number}`).toHaveCount(1);
      await expect(list.getByRole('listitem'), `viñetas de la regla ${rule.number}`).toHaveCount(rule.bulletCount);
    }

    // Ninguna regla ni lista de más o de menos.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(RULES.length);
    await expect(page.getByRole('list')).toHaveCount(RULES.length);
  });

  test('los enlaces externos apuntan fuera del sitio y abren en pestaña nueva', async ({ page }) => {
    await gotoRules(page);

    await expect(page.getByRole('heading', { level: 3, name: 'Ready to raid with us?', exact: true })).toBeVisible();

    for (const external of EXTERNAL_LINKS) {
      const link = page.getByRole('link', { name: external.name, exact: true });
      await expect(link, external.label).toBeVisible();
      await expect(link).toHaveAttribute('href', external.href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }

    // Solo el enlace de vuelta es interno; el resto son externos.
    await expect(page.getByRole('link')).toHaveCount(EXTERNAL_LINKS.length + 1);
  });

  for (const external of EXTERNAL_LINKS) {
    test(`"${external.label}" abre en una pestaña nueva y la página no cambia`, async ({ page }) => {
      await gotoRules(page);

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: external.name, exact: true }).click();
      const popup = await popupPromise;

      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(external.popupUrl);
      await expect(popup).not.toHaveURL(/pokecampfire\.com/);

      // La pestaña original sigue en /rules.
      await expect(page).toHaveURL(RULES_URL);
      await expect(page.getByRole('heading', { level: 1, name: PAGE_HEADING, exact: true })).toBeVisible();

      await popup.close();
    });
  }

  test('el enlace de vuelta lleva a la home', async ({ page }) => {
    await gotoRules(page);

    const back = page.getByRole('link', { name: 'Back to Ridgewood Raiders Links', exact: true });
    await expect(back).toHaveAttribute('href', '/');
    await expect(back).not.toHaveAttribute('target', '_blank');
    await back.click();

    await expect(page).toHaveURL(BASE_URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Ridgewood Raiders', exact: true })).toBeVisible();
  });
});
