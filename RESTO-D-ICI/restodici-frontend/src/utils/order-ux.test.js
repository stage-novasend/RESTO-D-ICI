import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getClientOrdersPath,
  getDeliveryFeedbackStorageKey,
  readDeliveryFeedback,
  writeDeliveryFeedback,
} from './order-ux.js';

test('getClientOrdersPath points to the explicit client orders entry', () => {
  assert.equal(getClientOrdersPath(), '/client/orders?tab=orders');
  assert.equal(getClientOrdersPath('payments'), '/client/orders?tab=payments');
});

test('delivery feedback helpers persist a structured response', () => {
  const storage = new MapStorage();
  const saved = writeDeliveryFeedback('abc-123', 'OUI', storage);

  assert.equal(getDeliveryFeedbackStorageKey('abc-123'), 'restodici:delivery-feedback:abc-123');
  assert.equal(saved.value, 'OUI');
  assert.ok(typeof saved.updatedAt === 'string');
  assert.deepEqual(readDeliveryFeedback('abc-123', storage), saved);
});

test('readDeliveryFeedback returns null when nothing has been stored', () => {
  const storage = new MapStorage();
  assert.equal(readDeliveryFeedback('missing', storage), null);
});

class MapStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, value);
  }
}
