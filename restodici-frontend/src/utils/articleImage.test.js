import test from 'node:test';
import assert from 'node:assert/strict';
import { getArticleImage } from './articleImage.js';

const UNSPLASH_BASE = 'https://images.unsplash.com/photo-';

// ─── photoUrl directe ────────────────────────────────────────────────────────

test('retourne photoUrl si l\'article en possède une', () => {
  const article = { id: '1', nom: 'Burger', photoUrl: 'https://cdn.example.com/burger.jpg' };
  assert.equal(getArticleImage(article), 'https://cdn.example.com/burger.jpg');
});

test('ignore la photoUrl vide et utilise le mapping catégorie', () => {
  const article = { id: '2', nom: 'pizza margherita', photoUrl: '' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
});

// ─── Cuisine africaine ────────────────────────────────────────────────────────

test('retourne une URL Unsplash pour "attiéké poisson braisé"', () => {
  const article = { id: '10', nom: 'attiéké poisson braisé' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  // "poisson braisé" matche avant "attiéké" dans le CATEGORY_MAP → image poisson
  assert.ok(result.includes('1555396273-367ea4eb4db5'), '"attiéké poisson braisé" doit correspondre à l\'image poisson grillé');
});

test('retourne une URL Unsplash pour "attiéké" seul (sans poisson)', () => {
  const article = { id: '10b', nom: 'attiéké' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1606851091851-e8c8c0fca5ba'), 'attiéké seul doit correspondre à l\'image riz/féculent');
});

test('retourne une URL Unsplash pour "kedjenou poulet" (plat ivoirien)', () => {
  const article = { id: '11', nom: 'kedjenou poulet' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1562967914-608f82629710'), 'kedjenou doit correspondre à l\'image sauce africaine');
});

test('retourne une URL Unsplash pour "alloco" (banane plantain frite)', () => {
  const article = { id: '12', nom: 'alloco' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1544025162-d76694265947'), 'alloco doit correspondre à l\'image plat doré');
});

// ─── Catégories génériques ────────────────────────────────────────────────────

test('retourne une URL Unsplash pour "pizza"', () => {
  const article = { id: '20', nom: 'pizza margherita' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1565299624946-b28f40a0ae38'), 'pizza doit correspondre à l\'image dédiée');
});

test('retourne une URL Unsplash pour "burger"', () => {
  const article = { id: '21', nom: 'burger classic' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1568901346375-23c9450c58cd'), 'burger doit correspondre à l\'image dédiée');
});

test('retourne une URL Unsplash pour "poulet grillé" (matche "grill" → viande)', () => {
  const article = { id: '22', nom: 'poulet grillé' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  // "grillé" contient "grill" qui matche la catégorie viande avant poulet dans le CATEGORY_MAP
  assert.ok(result.includes('1544025162-d76694265947'), '"poulet grillé" matche la catégorie grill/viande');
});

test('retourne une URL Unsplash pour "poulet" seul (matche la catégorie volaille)', () => {
  const article = { id: '22b', nom: 'poulet' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1529193591184-b1d58069ecdd'), '"poulet" seul doit correspondre à l\'image volaille');
});

test('retourne une URL Unsplash pour "café latte"', () => {
  const article = { id: '23', nom: 'café latte' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
  assert.ok(result.includes('1514432324607-a09d9b4aefdd'), 'café doit correspondre à l\'image dédiée');
});

// ─── Hash déterministe ────────────────────────────────────────────────────────

test('deux appels avec le même article sans catégorie connue retournent la même URL', () => {
  const article = { id: 'xyz-42', nom: 'plat mystère zyxwvutsrqp' };
  const result1 = getArticleImage(article);
  const result2 = getArticleImage(article);
  assert.equal(result1, result2, 'le hash déterministe doit produire la même URL pour le même article');
});

test('deux articles différents sans catégorie connue peuvent avoir des URLs différentes', () => {
  const article1 = { id: 'aaa-1', nom: 'plat alpha zéta' };
  const article2 = { id: 'bbb-2', nom: 'plat beta oméga' };
  // On ne garantit pas qu'ils soient différents, mais on vérifie que les deux sont des URLs Unsplash valides
  const r1 = getArticleImage(article1);
  const r2 = getArticleImage(article2);
  assert.ok(r1.startsWith(UNSPLASH_BASE), 'article1 doit retourner une URL Unsplash');
  assert.ok(r2.startsWith(UNSPLASH_BASE), 'article2 doit retourner une URL Unsplash');
});

// ─── Paramètres width et quality ─────────────────────────────────────────────

test('accepte des options width et quality personnalisées', () => {
  const article = { id: '30', nom: 'pizza' };
  const result = getArticleImage(article, { width: 800, quality: 90 });
  assert.ok(result.includes('w=800'), 'doit utiliser la largeur personnalisée');
  assert.ok(result.includes('q=90'), 'doit utiliser la qualité personnalisée');
});

test('utilise width=400 et quality=75 par défaut', () => {
  const article = { id: '31', nom: 'pizza' };
  const result = getArticleImage(article);
  assert.ok(result.includes('w=400'), 'doit utiliser width=400 par défaut');
  assert.ok(result.includes('q=75'), 'doit utiliser quality=75 par défaut');
});

// ─── Cas edge : article null/undefined ───────────────────────────────────────

test('article null retourne une URL Unsplash par défaut', () => {
  const result = getArticleImage(null);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'null doit retourner une URL Unsplash');
});

test('article undefined retourne une URL Unsplash par défaut', () => {
  const result = getArticleImage(undefined);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'undefined doit retourner une URL Unsplash');
});

test('article avec nom et id vides retourne une URL Unsplash par défaut (hash sur "food")', () => {
  const article = { id: '', nom: '' };
  const result = getArticleImage(article);
  assert.ok(result.startsWith(UNSPLASH_BASE), 'doit retourner une URL Unsplash');
});

// ─── Matching via catégorie ───────────────────────────────────────────────────

test('utilise la catégorie de l\'article pour le matching si le nom ne correspond pas', () => {
  const article = {
    id: '40',
    nom: 'spécial du jour',
    categorie: { nom: 'Pizza' },
  };
  const result = getArticleImage(article);
  assert.ok(result.includes('1565299624946-b28f40a0ae38'), 'la catégorie "Pizza" doit matcher l\'image pizza');
});

test('utilise categorieNom comme fallback si categorie.nom n\'existe pas', () => {
  const article = {
    id: '41',
    nom: 'plat de la semaine',
    categorieNom: 'burger',
  };
  const result = getArticleImage(article);
  assert.ok(result.includes('1568901346375-23c9450c58cd'), 'categorieNom "burger" doit matcher l\'image burger');
});
