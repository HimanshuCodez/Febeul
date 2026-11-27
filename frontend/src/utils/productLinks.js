const selectionValue = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function getProductLink(productId, variation = {}) {
  const params = new URLSearchParams();
  if (variation.sku) params.set('sku', variation.sku);
  if (variation.color) params.set('color', variation.color);
  return `/product/${encodeURIComponent(productId)}${params.size ? `?${params}` : ''}`;
}

export function getProductVariationIndex(variations = [], { sku, color } = {}) {
  if (selectionValue(sku)) {
    const index = variations.findIndex(variation => selectionValue(variation.sku) === selectionValue(sku));
    if (index !== -1) return index;
  }
  if (selectionValue(color)) {
    const index = variations.findIndex(variation => selectionValue(variation.color) === selectionValue(color));
    if (index !== -1) return index;
  }
  return 0;
}
