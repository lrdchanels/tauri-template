// End-to-end tests in a plain browser (the platform falls back to localStorage, see
// src/platform/browser.ts). Run `npm run e2e`; `npx playwright test --ui` to debug.

import { expect, test } from '@playwright/test';
import { APP } from '../src/app.config';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens on the home view in Spanish', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Inicio' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('adds an item, persists it and hides amounts in private mode', async ({ page }) => {
  const form = page.getByTestId('add-item');
  await form.getByLabel('Nombre').fill('Primero');
  await form.getByLabel('Importe').fill('1234.5');
  await form.getByRole('button', { name: 'Añadir' }).click();

  const row = page.getByRole('row', { name: /Primero/ });
  await expect(row).toContainText('1.234,50');

  await page.reload();
  await expect(page.getByRole('row', { name: /Primero/ })).toBeVisible();

  await page.getByRole('button', { name: 'Ocultar importes' }).click();
  await expect(page.getByRole('row', { name: /Primero/ })).toContainText('••••');
  await expect(page.getByRole('button', { name: 'Mostrar importes' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('settings: theme and language apply to the whole app', async ({ page }) => {
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page).toHaveURL(/#settings/);

  await page.getByRole('radio', { name: 'Tema oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
});

test('settings sections are routes', async ({ page }) => {
  await page.goto('/#settings/about');
  await expect(page.getByTestId('version')).toHaveText('Versión dev');
  await page.getByRole('link', { name: 'Datos' }).click();
  await expect(page).toHaveURL(/#settings\/data/);
  await expect(page.getByRole('button', { name: 'Guardar copia' })).toBeVisible();
});

test('backup downloads a JSON file with the data', async ({ page }) => {
  const form = page.getByTestId('add-item');
  await form.getByLabel('Nombre').fill('Copia');
  await form.getByLabel('Importe').fill('10');
  await form.getByRole('button', { name: 'Añadir' }).click();

  await page.goto('/#settings/data');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar copia' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(new RegExp(`^${APP.id}-backup-\\d{4}-\\d{2}-\\d{2}\\.json$`));
  const text = await (await file.createReadStream()).toArray();
  const backup = JSON.parse(Buffer.concat(text).toString('utf8'));
  expect(backup.docs.data.value.items[0].name).toBe('Copia');
});

test('no uncaught errors while navigating', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of ['#home', '#settings/general', '#settings/data', '#settings/about', '#nope']) {
    await page.goto(`/${route}`);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
  await expect(page.locator('.crash')).toHaveCount(0);
});
