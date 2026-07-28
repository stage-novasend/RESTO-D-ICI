import { test, expect } from '@playwright/test';

// ─── Page /login — structure du formulaire ────────────────────────────────────

test('page /login : le formulaire contient un champ email', async ({ page }) => {
  await page.goto('/login');
  const emailInput = page.locator('#login-email');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toHaveAttribute('type', 'email');
});

test('page /login : le formulaire contient un champ password', async ({ page }) => {
  await page.goto('/login');
  const passwordInput = page.locator('#login-password');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

test('page /login : le formulaire contient un bouton de soumission', async ({ page }) => {
  await page.goto('/login');
  const submitBtn = page.locator('form button[type="submit"]');
  await expect(submitBtn).toBeVisible();
});

// ─── Page /login — validation à vide ─────────────────────────────────────────

test('page /login : soumission avec champs vides affiche des erreurs de validation', async ({ page }) => {
  await page.goto('/login');
  // Soumettre le formulaire sans rien remplir
  await page.locator('form button[type="submit"]').click();
  // Au moins un message d'erreur doit apparaître (email ou password requis)
  const emailError = page.locator('#email-error');
  const passwordError = page.locator('#password-error');
  // L'un ou l'autre doit être visible
  const emailVisible   = await emailError.isVisible().catch(() => false);
  const passwordVisible = await passwordError.isVisible().catch(() => false);
  expect(emailVisible || passwordVisible).toBe(true);
});

test('page /login : soumission avec email invalide affiche une erreur email', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill('pasunemail');
  await page.locator('#login-password').fill('motdepasse');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('#email-error')).toBeVisible();
});

// ─── Page /login — credentials invalides ────────────────────────────────────

test('page /login : credentials invalides affichent un message d\'erreur global', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill('inexistant@test.com');
  await page.locator('#login-password').fill('motdepassefaux');
  await page.locator('form button[type="submit"]').click();
  // On attend soit un message d'erreur global visible, soit un texte d'erreur connu
  const errorAlert = page.locator('[role="alert"]');
  await expect(errorAlert).toBeVisible({ timeout: 8000 });
});

// ─── Page /register — formulaire client ──────────────────────────────────────

test('page /register : le formulaire d\'inscription client est visible', async ({ page }) => {
  await page.goto('/register');
  // Le formulaire principal doit exister
  await expect(page.locator('form')).toBeVisible();
  // Un champ email doit être présent
  await expect(page.locator('input[type="email"]')).toBeVisible();
  // Un champ password doit être présent
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('page /register : affiche un bouton de soumission', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('form button[type="submit"]')).toBeVisible();
});

// ─── Page /register?type=restaurant — champ nom du restaurant ────────────────

test('page /register?type=restaurant : affiche le champ "Nom du restaurant"', async ({ page }) => {
  await page.goto('/register?type=restaurant');
  // Cherche un label contenant "Nom du restaurant" ou un input avec placeholder correspondant
  const restaurantField = page.locator('text=Nom du restaurant').or(
    page.locator('input[placeholder*="restaurant"]').or(
      page.locator('input[placeholder*="établissement"]')
    )
  );
  await expect(restaurantField.first()).toBeVisible();
});

// ─── Page /register?type=business — champ nom de l'entreprise ────────────────

test('page /register?type=business : affiche le champ "Nom de l\'entreprise"', async ({ page }) => {
  await page.goto('/register?type=business');
  // Cherche un label ou input lié au nom de l'entreprise
  const enterpriseField = page.locator('text=entreprise').or(
    page.locator('input[placeholder*="société"]').or(
      page.locator('input[placeholder*="entreprise"]')
    )
  );
  await expect(enterpriseField.first()).toBeVisible();
});

// ─── Routes protégées — redirection vers /login ───────────────────────────────

test('page /gerant sans token redirige vers /login', async ({ page }) => {
  // S'assurer qu'aucun token n'est présent
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));

  await page.goto('/gerant');
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

test('page /admin sans token redirige vers /login', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

test('page /b2b sans token redirige vers /login', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));

  await page.goto('/b2b');
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

test('page /staff sans token redirige vers /login', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('token'));

  await page.goto('/staff');
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});
