import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFCFA,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDeliveryMode,
  truncate,
  timeAgo,
} from './formatters.js';

// ─── formatFCFA ───────────────────────────────────────────────────────────────

test('formatFCFA formate un entier positif avec CFA et les chiffres', () => {
  const result = formatFCFA(3500);
  assert.ok(result.includes('3'), 'doit contenir le chiffre 3');
  assert.ok(result.includes('500'), 'doit contenir 500');
  // Selon la locale de l'environnement, Intl peut produire "FCFA" ou "F CFA"
  assert.ok(result.includes('CFA'), 'doit contenir "CFA"');
});

test('formatFCFA formate zéro avec CFA', () => {
  const result = formatFCFA(0);
  assert.ok(result.includes('CFA'), 'zéro doit aussi afficher "CFA"');
});

test('formatFCFA retourne "-" pour null', () => {
  assert.equal(formatFCFA(null), '-');
});

test('formatFCFA retourne "-" pour undefined', () => {
  assert.equal(formatFCFA(undefined), '-');
});

test('formatFCFA ne contient pas "XOF" brut', () => {
  const result = formatFCFA(1000);
  assert.ok(!result.includes('XOF'), 'XOF doit être remplacé par FCFA ou F CFA');
});

test('formatFCFA formate un grand montant avec séparateurs', () => {
  const result = formatFCFA(1000000);
  // Le montant 1 000 000 doit contenir plusieurs tokens numériques
  assert.ok(result.replace(/[^\d]/g, '').includes('1000000'), 'les chiffres doivent être présents');
});

// ─── formatDate ───────────────────────────────────────────────────────────────

test('formatDate retourne "-" pour une valeur falsy', () => {
  assert.equal(formatDate(null), '-');
  assert.equal(formatDate(''), '-');
  assert.equal(formatDate(undefined), '-');
});

test('formatDate formate une date ISO en français', () => {
  const result = formatDate('2026-05-05T14:30:00.000Z');
  // La date doit contenir une année à 4 chiffres
  assert.ok(/\d{4}/.test(result), 'doit contenir une année');
  // Doit contenir l'heure (format HH:MM)
  assert.ok(/\d{2}:\d{2}/.test(result), 'doit contenir l\'heure');
});

test('formatDate accepte un objet Date', () => {
  const d = new Date('2026-01-15T10:00:00.000Z');
  const result = formatDate(d);
  assert.ok(typeof result === 'string' && result.length > 0, 'doit retourner une chaîne non vide');
  assert.ok(/\d{4}/.test(result), 'doit contenir une année');
});

// ─── STATUS_LABELS ────────────────────────────────────────────────────────────

const EXPECTED_STATUSES = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'];

test('STATUS_LABELS contient tous les statuts attendus', () => {
  for (const status of EXPECTED_STATUSES) {
    assert.ok(
      status in STATUS_LABELS,
      `STATUS_LABELS doit avoir la clé "${status}"`
    );
  }
});

test('STATUS_LABELS a des labels non vides pour chaque statut', () => {
  for (const status of EXPECTED_STATUSES) {
    const label = STATUS_LABELS[status];
    assert.ok(
      typeof label === 'string' && label.length > 0,
      `label pour "${status}" doit être une chaîne non vide`
    );
  }
});

test('STATUS_LABELS valeurs correspondent aux libellés métier', () => {
  assert.equal(STATUS_LABELS.RECUE, 'Reçue');
  assert.equal(STATUS_LABELS.CONFIRMEE, 'Confirmée');
  assert.equal(STATUS_LABELS.EN_PREP, 'En préparation');
  assert.equal(STATUS_LABELS.PRETE, 'Prête');
  assert.equal(STATUS_LABELS.EN_LIVRAISON, 'En livraison');
  assert.equal(STATUS_LABELS.LIVREE, 'Livrée');
  assert.equal(STATUS_LABELS.ANNULEE, 'Annulée');
});

// ─── STATUS_COLORS ────────────────────────────────────────────────────────────

test('STATUS_COLORS contient tous les statuts attendus', () => {
  for (const status of EXPECTED_STATUSES) {
    assert.ok(
      status in STATUS_COLORS,
      `STATUS_COLORS doit avoir la clé "${status}"`
    );
  }
});

test('STATUS_COLORS a des classes CSS non vides pour chaque statut', () => {
  for (const status of EXPECTED_STATUSES) {
    const cls = STATUS_COLORS[status];
    assert.ok(
      typeof cls === 'string' && cls.length > 0,
      `classe CSS pour "${status}" doit être une chaîne non vide`
    );
  }
});

test('STATUS_COLORS contient à la fois une classe bg et une classe text', () => {
  for (const status of EXPECTED_STATUSES) {
    const cls = STATUS_COLORS[status];
    assert.ok(cls.includes('bg-'), `"${status}" doit avoir une classe bg-`);
    assert.ok(cls.includes('text-'), `"${status}" doit avoir une classe text-`);
  }
});

// ─── formatDeliveryMode ───────────────────────────────────────────────────────

test('formatDeliveryMode retourne "Sur place" pour SUR_PLACE', () => {
  assert.equal(formatDeliveryMode('SUR_PLACE'), 'Sur place');
});

test('formatDeliveryMode retourne "À emporter" pour EMPORTER', () => {
  assert.equal(formatDeliveryMode('EMPORTER'), 'À emporter');
});

test('formatDeliveryMode retourne "Livraison" pour LIVRAISON', () => {
  assert.equal(formatDeliveryMode('LIVRAISON'), 'Livraison');
});

test('formatDeliveryMode retourne le mode brut pour une valeur inconnue', () => {
  assert.equal(formatDeliveryMode('INCONNU'), 'INCONNU');
});

test('formatDeliveryMode retourne undefined pour undefined', () => {
  assert.equal(formatDeliveryMode(undefined), undefined);
});

// ─── truncate ─────────────────────────────────────────────────────────────────

test('truncate retourne le texte intact si inférieur à maxLength', () => {
  assert.equal(truncate('Bonjour', 20), 'Bonjour');
});

test('truncate tronque et ajoute "..." si le texte dépasse maxLength', () => {
  const result = truncate('Un texte très long qui dépasse la limite', 10);
  assert.equal(result, 'Un texte t...');
  assert.ok(result.endsWith('...'), 'doit se terminer par ...');
});

test('truncate retourne le texte exact si égal à maxLength', () => {
  const text = '12345';
  assert.equal(truncate(text, 5), '12345');
});

test('truncate retourne "" pour null', () => {
  assert.equal(truncate(null), '');
});

test('truncate retourne "" pour undefined', () => {
  assert.equal(truncate(undefined), '');
});

test('truncate utilise maxLength=50 par défaut', () => {
  const long = 'a'.repeat(51);
  const result = truncate(long);
  assert.equal(result.length, 53); // 50 + 3 pour "..."
});

// ─── timeAgo ─────────────────────────────────────────────────────────────────

test('timeAgo retourne "À l\'instant" pour une date très récente', () => {
  const now = new Date().toISOString();
  assert.equal(timeAgo(now), "À l'instant");
});

test('timeAgo retourne "Il y a X min" pour une date de quelques minutes', () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const result = timeAgo(fiveMinutesAgo);
  assert.ok(result.toLowerCase().includes('min'), `"${result}" doit contenir "min"`);
  assert.ok(result.includes('5'), 'doit contenir le nombre de minutes');
});

test('timeAgo retourne "Il y a X h" pour une date de plusieurs heures', () => {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const result = timeAgo(threeHoursAgo);
  assert.ok(result.includes('3'), 'doit contenir 3');
  assert.ok(result.includes(' h'), 'doit contenir " h"');
});

test('timeAgo retourne une date formatée pour une date ancienne (> 24h)', () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const result = timeAgo(twoDaysAgo);
  // Pour une date ancienne, retourne une date formatée (pas "Il y a X min/h")
  assert.ok(!result.includes('Il y a'), 'ne doit pas retourner "Il y a X min/h" pour une vieille date');
  assert.ok(/\d{4}/.test(result), 'doit contenir une année');
});
