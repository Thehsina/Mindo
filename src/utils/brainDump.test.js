import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrainDump } from './brainDump.js';

test('detects grocery-only list', () => {
  const result = parseBrainDump('potato, milk, eggs');
  assert.equal(result.length, 3);
  assert.ok(result.every((item) => item.type === 'grocery'));
  assert.deepEqual(result.map((item) => item.title.toLowerCase()), ['potato', 'milk', 'eggs']);
});

test('keeps grocery and task items separate', () => {
  const result = parseBrainDump('Buy milk and call the doctor tomorrow');
  const groceryItems = result.filter((item) => item.type === 'grocery');
  const taskItems = result.filter((item) => item.type === 'task');

  assert.equal(groceryItems.length, 1);
  assert.equal(taskItems.length, 1);
  assert.equal(groceryItems[0].title.toLowerCase(), 'milk');
  assert.match(taskItems[0].title.toLowerCase(), /doctor/);
});

test('captures quantity and weekly bucket for grocery items', () => {
  const result = parseBrainDump('buy 12 eggs for week 2');
  const groceryItem = result.find((item) => item.type === 'grocery');

  assert.ok(groceryItem);
  assert.equal(groceryItem.title.toLowerCase(), 'eggs');
  assert.equal(groceryItem.quantity, '12');
  assert.equal(groceryItem.bucketLabel, 'Week 2');
  assert.equal(groceryItem.listType, 'weekly');
});
