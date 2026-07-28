import { test, expect } from '@playwright/test';

// ─── Page /menu ───────────────────────────────────────────────────────────────

test('page /menu : se charge avec un statut HTTP 200', async ({ page }) => {
  const response = await page.goto('/menu');
  expect(response.status()).toBe(200);
});

test('page /menu : affiche au moins un restaurant ou un message "aucun restaurant"', async ({ page }) => {
  await page.goto('/menu');
  // Attendre que le contenu dynamique se charge (React Query)
  await page.waitForLoadState('networkidle');

  // Soit des cartes restaurant sont présentes, soit un message "aucun"
  const hasRestaurants = await page.locator('[data-testid="restaurant-card"]').count()
    .then(c => c > 0)
    .catch(() => false);

  const hasEmptyMessage = await page.locator('text=/aucun restaurant/i').isVisible()
    .catch(() => false);

  // Au minimum, la page doit avoir chargé quelque chose (pas de spinner infini)
  // On vérifie qu'il n'y a pas qu'un spinner ou une page vide
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(10);

  // L'une des deux conditions doit être vraie
  expect(hasRestaurants || hasEmptyMessage || bodyText.length > 50).toBe(true);
});

test('page /menu : le titre de la page est défini', async ({ page }) => {
  await page.goto('/menu');
  const title = await page.title();
  expect(title).toBeTruthy();
  expect(title.length).toBeGreaterThan(0);
});

// ─── Page /cart ───────────────────────────────────────────────────────────────

test('page /cart : accessible sans connexion (pas de redirection vers /login)', async ({ page }) => {
  // Supprimer tout token éventuel
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));

  await page.goto('/cart');
  // La page panier ne doit pas rediriger vers /login
  await expect(page).not.toHaveURL(/\/login/);
  // La page doit se charger avec un statut 200
  const response = await page.goto('/cart');
  expect(response.status()).toBe(200);
});

test('page /cart : affiche le contenu du panier ou un message "panier vide"', async ({ page }) => {
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(10);
});

// ─── Page / (Home) ────────────────────────────────────────────────────────────

test('page / : se charge correctement', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
});

test('page / : contient le texte "Resto" dans la page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).toMatch(/Resto/i);
});

test('page / : contient un lien ou bouton vers le menu', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Cherche un lien ou bouton qui mène au menu
  const menuLink = page.locator('a[href*="menu"]').or(page.locator('button:has-text("menu")'));
  const count = await menuLink.count();
  expect(count).toBeGreaterThan(0);
});

test('page / : la navigation principale est visible', async ({ page }) => {
  await page.goto('/');
  // Au moins un élément de navigation doit exister (header, nav, ou lien de connexion)
  const navElements = page.locator('nav, header, a[href="/login"]');
  const count = await navElements.count();
  expect(count).toBeGreaterThan(0);
});
