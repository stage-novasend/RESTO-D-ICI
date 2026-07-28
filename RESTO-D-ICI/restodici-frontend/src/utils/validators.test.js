import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidCIPhone,
  isValidPassword,
  isValidUrl,
  isPositiveNumber,
  normalizePhone,
  formatCIPhone,
  validateField,
  MSG,
} from './validators.js';

test('isValidEmail', () => {
  assert.equal(isValidEmail('nom@domaine.com'), true);
  assert.equal(isValidEmail('a.b-c@sous.domaine.ci'), true);
  assert.equal(isValidEmail('nom@domaine'), false);
  assert.equal(isValidEmail('nom domaine.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('  nom@domaine.com  '), true);
});

test('isValidCIPhone — accepte les formats CI', () => {
  assert.equal(isValidCIPhone('0712345678'), true);
  assert.equal(isValidCIPhone('07 12 34 56 78'), true);
  assert.equal(isValidCIPhone('+225 07 12 34 56 78'), true);
  assert.equal(isValidCIPhone('22507 12 34 56 78'), true);
  assert.equal(isValidCIPhone('+225-07-12-34-56-78'), true);
});

test('isValidCIPhone — rejette les mauvais formats', () => {
  assert.equal(isValidCIPhone('712345678'), false);   // ne commence pas par 0
  assert.equal(isValidCIPhone('071234567'), false);    // 9 chiffres
  assert.equal(isValidCIPhone('07123456789'), false);  // 11 chiffres
  assert.equal(isValidCIPhone(''), false);
});

test('normalizePhone & formatCIPhone', () => {
  assert.equal(normalizePhone('+225 07 12 34 56 78'), '+2250712345678');
  assert.equal(formatCIPhone('0712345678'), '+225 07 12 34 56 78');
  assert.equal(formatCIPhone('+225 07 12 34 56 78'), '+225 07 12 34 56 78');
  assert.equal(formatCIPhone(''), '');
});

test('isValidPassword', () => {
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword('1234567'), false);
});

test('isValidUrl', () => {
  assert.equal(isValidUrl('https://api.exemple.com/v1'), true);
  assert.equal(isValidUrl('http://x.io'), true);
  assert.equal(isValidUrl('ftp://x.io'), false);
  assert.equal(isValidUrl('api.exemple.com'), false);
});

test('isPositiveNumber', () => {
  assert.equal(isPositiveNumber('1500'), true);
  assert.equal(isPositiveNumber(0), true);
  assert.equal(isPositiveNumber('-5'), false);
  assert.equal(isPositiveNumber('abc'), false);
});

test('validateField — champ requis vide', () => {
  assert.equal(validateField('email', '', { required: true }), MSG.required);
  assert.equal(validateField('email', '', { required: false }), '');
});

test('validateField — format', () => {
  assert.equal(validateField('email', 'bad', { required: true }), MSG.email);
  assert.equal(validateField('email', 'ok@ok.com', { required: true }), '');
  assert.equal(validateField('phone', '123', { required: true }), MSG.phone);
  assert.equal(validateField('phone', '+225 07 12 34 56 78', { required: true }), '');
  assert.equal(validateField('password', 'short', { required: true }), MSG.password);
});
