import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGroceryDbPayload, mapGroceryFromDb, mapGroceryToDb } from './grocerySlice.js';

test('maps grocery rows to app shape using the real Supabase schema', () => {
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Milk',
    quantity: '2',
    category: 'Dairy',
    bucket_label: 'This Week',
    list_type: 'weekly',
    completed: true,
    created_at: '2026-10-01T00:00:00Z',
  };

  const mapped = mapGroceryFromDb(row);

  assert.equal(mapped.id, row.id);
  assert.equal(mapped.name, 'Milk');
  assert.equal(mapped.quantity, '2');
  assert.equal(mapped.bucketLabel, 'This Week');
  assert.equal(mapped.listType, 'weekly');
  assert.equal(mapped.completed, true);
});

test('maps app items to Supabase grocery columns when category exists', () => {
  const item = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Eggs',
    quantity: '12',
    category: 'Dairy',
    bucketLabel: 'This Week',
    listType: 'weekly',
    completed: false,
    status: 'todo',
  };

  const dbRow = mapGroceryToDb(item);

  assert.deepEqual(dbRow, {
    name: 'Eggs',
    quantity: '12',
    category: 'Dairy',
    bucket_label: 'This Week',
    list_type: 'weekly',
    completed: false,
  });
});

test('omits category when the DB schema does not include it', () => {
  const item = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Eggs',
    quantity: '12',
    category: 'Dairy',
    bucketLabel: 'This Week',
    listType: 'weekly',
    completed: false,
    status: 'todo',
  };

  const dbRow = buildGroceryDbPayload(item, { includeCategory: false });

  assert.deepEqual(dbRow, {
    name: 'Eggs',
    quantity: '12',
    bucket_label: 'This Week',
    list_type: 'weekly',
    completed: false,
  });
});
