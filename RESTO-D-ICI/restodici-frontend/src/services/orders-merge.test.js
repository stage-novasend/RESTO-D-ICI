import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeManagerOrdersResults } from './orders-merge.js';

test('mergeManagerOrdersResults merges and sorts client + b2b orders', () => {
  const clientResult = {
    status: 'fulfilled',
    value: {
      data: [{ id: 'c1', createdAt: '2026-05-18T10:00:00.000Z', montantTotal: 1200 }],
    },
  };
  const b2bResult = {
    status: 'fulfilled',
    value: {
      data: [{ id: 'b1', createdAt: '2026-05-19T10:00:00.000Z', total: 5000 }],
    },
  };

  const result = mergeManagerOrdersResults(clientResult, b2bResult);

  assert.equal(result.hasAnySuccess, true);
  assert.equal(result.hasClientError, false);
  assert.equal(result.hasB2bError, false);
  assert.deepEqual(result.orders.map((order) => order.id), ['b1', 'c1']);
  assert.equal(result.orders[0].type, 'B2B');
  assert.equal(result.orders[1].type, 'CLIENT');
  assert.equal(result.orders[0].amount, 5000);
  assert.equal(result.orders[1].amount, 1200);
});

test('mergeManagerOrdersResults keeps successful source when one source fails', () => {
  const clientResult = {
    status: 'rejected',
    reason: new Error('client down'),
  };
  const b2bResult = {
    status: 'fulfilled',
    value: {
      data: [{ id: 'b1', createdAt: '2026-05-19T10:00:00.000Z', total: 5000 }],
    },
  };

  const result = mergeManagerOrdersResults(clientResult, b2bResult);

  assert.equal(result.hasAnySuccess, true);
  assert.equal(result.hasClientError, true);
  assert.equal(result.hasB2bError, false);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, 'b1');
});

test('mergeManagerOrdersResults reports no data when both sources fail', () => {
  const clientResult = {
    status: 'rejected',
    reason: new Error('client down'),
  };
  const b2bResult = {
    status: 'rejected',
    reason: new Error('b2b down'),
  };

  const result = mergeManagerOrdersResults(clientResult, b2bResult);

  assert.equal(result.hasAnySuccess, false);
  assert.equal(result.hasClientError, true);
  assert.equal(result.hasB2bError, true);
  assert.deepEqual(result.orders, []);
});
