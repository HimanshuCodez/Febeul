import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductLink, getProductVariationIndex } from '../src/utils/productLinks.js';

const variations = [
  { sku: 'STYLE-ROSE', color: 'Rose' },
  { sku: 'STYLE-BLACK', color: 'Black' },
  { sku: 'STYLE-BLACK-LACE', color: 'Black' },
];

test('product links round-trip the selected SKU and colour, including special characters', () => {
  const selected = { sku: 'STYLE/BLACK & LACE', color: 'Black & White' };
  const url = new URL(getProductLink('product-id', selected), 'https://shop.example');
  assert.equal(url.pathname, '/product/product-id');
  assert.equal(url.searchParams.get('sku'), selected.sku);
  assert.equal(url.searchParams.get('color'), selected.color);
});

test('SKU identifies the exact variation even when colours are repeated or disagree', () => {
  assert.equal(getProductVariationIndex(variations, { sku: 'STYLE-BLACK-LACE', color: 'Black' }), 2);
  assert.equal(getProductVariationIndex(variations, { sku: 'style-black', color: 'Rose' }), 1);
});

test('existing colour-only links and stale SKU links can still resolve by colour', () => {
  assert.equal(getProductVariationIndex(variations, { color: ' black ' }), 1);
  assert.equal(getProductVariationIndex(variations, { sku: 'REMOVED', color: 'Black' }), 1);
});

test('parent-only or invalid links safely use the first variation', () => {
  assert.equal(getProductLink('product-id'), '/product/product-id');
  assert.equal(getProductVariationIndex(variations), 0);
  assert.equal(getProductVariationIndex(variations, { sku: 'REMOVED', color: 'Missing' }), 0);
  assert.equal(getProductVariationIndex([], { sku: 'STYLE-BLACK' }), 0);
});

test('cart and order selections produce links to their recorded variation', () => {
  const item = { _id: 'product-id', sku: 'STYLE-BLACK', color: 'Black', size: 'M', quantity: 2 };
  const url = new URL(getProductLink(item._id, item), 'https://shop.example');
  assert.equal(getProductVariationIndex(variations, Object.fromEntries(url.searchParams)), 1);
});
