'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld, expectApiError, uuid, FIXED_NOW } = require('../harness/fakes');

const AUDIT_NOW = FIXED_NOW.replace('Z', '+00:00');
const LATER = '2026-02-03T04:05:06.789Z';

test('create stores a root category with server-owned audit fields', () => {
  const world = createWorld();
  const created = world.createCategory('  Laptops ');
  assert.equal(created.id, uuid(1));
  assert.equal(created.name, 'Laptops');
  assert.equal(created.parent_id, '');
  assert.equal(created.created_at, AUDIT_NOW);
  assert.equal(created.modified_at, AUDIT_NOW);
  assert.equal(created.created_by, '');
  assert.equal(created.last_modified_by, '');
  assert.equal(world.repositories.category.rows.length, 1);
});

test('create under an existing parent works; unknown parent is NOT_FOUND', () => {
  const world = createWorld();
  const root = world.createCategory('Root');
  assert.equal(world.createCategory('Child', root.id).parent_id, root.id);
  assert.throws(() => world.createCategory('Orphan', uuid(99)), expectApiError('NOT_FOUND'));
});

test('create rejects a duplicate sibling name case-insensitively', () => {
  const world = createWorld();
  world.createCategory('Laptops');
  assert.throws(() => world.createCategory('laptops'), expectApiError('VALIDATION', 'category_name_duplicate'));
  assert.equal(world.repositories.category.rows.length, 1);
});

test('update applies a patch, touches modified_at and keeps created_at', () => {
  const world = createWorld();
  const created = world.createCategory('Laptops');
  world.clock.set(LATER);
  const updated = world.app.UpdateCategory.execute(world.deps.category, { id: created.id, patch: { name: 'Notebooks' } });
  assert.equal(updated.name, 'Notebooks');
  assert.equal(updated.created_at, AUDIT_NOW);
  assert.equal(updated.modified_at, LATER.replace('Z', '+00:00'));
});

test('update can move a category and null parent_id makes it a root again', () => {
  const world = createWorld();
  const root = world.createCategory('Root');
  const child = world.createCategory('Child', root.id);
  const moved = world.app.UpdateCategory.execute(world.deps.category, { id: child.id, patch: { parent_id: null } });
  assert.equal(moved.parent_id, '');
});

test('update rejects cycles, unknown ids and non-object patches', () => {
  const world = createWorld();
  const root = world.createCategory('Root');
  const child = world.createCategory('Child', root.id);
  const update = (input) => world.app.UpdateCategory.execute(world.deps.category, input);
  assert.throws(() => update({ id: root.id, patch: { parent_id: child.id } }), expectApiError('VALIDATION', 'category_cycle'));
  assert.throws(() => update({ id: uuid(99), patch: {} }), expectApiError('NOT_FOUND'));
  assert.throws(() => update({ id: root.id, patch: 'x' }), expectApiError('VALIDATION', 'patch must be an object'));
});

test('remove is blocked while children exist, then while equipment uses the category', () => {
  const world = createWorld();
  const root = world.createCategory('Root');
  const child = world.createCategory('Child', root.id);
  const remove = (id) => world.app.RemoveCategory.execute(world.deps.category, { id });
  assert.throws(() => remove(root.id), expectApiError('VALIDATION', 'category_has_children'));
  world.createEquipment({ categoryId: child.id });
  assert.throws(() => remove(child.id), expectApiError('VALIDATION', 'category_in_use'));
});

test('remove deletes an unused leaf; unknown id is NOT_FOUND', () => {
  const world = createWorld();
  const leaf = world.createCategory('Leaf');
  assert.equal(world.app.RemoveCategory.execute(world.deps.category, { id: leaf.id }), null);
  assert.equal(world.repositories.category.rows.length, 0);
  assert.throws(() => world.app.RemoveCategory.execute(world.deps.category, { id: leaf.id }), expectApiError('NOT_FOUND'));
});

test('get returns the row or null; list is sorted by name', () => {
  const world = createWorld();
  const b = world.createCategory('beta');
  world.createCategory('Alpha');
  assert.equal(world.app.GetCategory.execute(world.deps.category, { id: b.id.toUpperCase() }).name, 'beta');
  assert.equal(world.app.GetCategory.execute(world.deps.category, { id: uuid(99) }), null);
  assert.deepEqual(world.app.ListCategories.execute(world.deps.category).map((c) => c.name), ['Alpha', 'beta']);
});
