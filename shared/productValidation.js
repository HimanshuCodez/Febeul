export const PRODUCT_REQUIRED_FIELDS = {
    name: 'Product name', description: 'Product description', category: 'Category',
    fabric: 'Fabric', type: 'Type', pattern: 'Pattern', sleeveStyle: 'Sleeve style', sleeveLength: 'Sleeve length',
    neck: 'Neck', materialComposition: 'Material composition', closureType: 'Closure type', materialType: 'Material type',
    careInstructions: 'Care instructions', genericName: 'Generic name', countryOfOrigin: 'Country of origin',
    manufacturer: 'Manufacturer', packer: 'Packer', includedComponents: 'Included components', hsn: 'HSN code',
    itemWeight: 'Item weight', itemDimensionsLxWxH: 'Item dimensions', netQuantity: 'Net quantity', keywords: 'Search keywords',
};
const blank = value => typeof value !== 'string' || !value.replace(/[\s\u200b-\u200d\ufeff]/g, '');
const descriptionText = value => String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '').replace(/&(nbsp|ensp|emsp|thinsp|hairsp|NewLine|Tab|ZeroWidthSpace);/gi, ' ')
    .replace(/&#(x[\da-f]+|\d+);?/gi, (entity, code) => {
        const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
        return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    });

export function validateProduct(values, { imageCounts } = {}) {
    const errors = [];
    const add = (field, message) => errors.push({ field, message });
    for (const [field, label] of Object.entries(PRODUCT_REQUIRED_FIELDS)) {
        const value = field === 'description' ? (typeof values[field] === 'string' ? descriptionText(values[field]) : '') : values[field];
        if (blank(value)) add(field, `${label} is required.`);
    }
    if (!blank(values.keywords) && !values.keywords.split(',').some(keyword => !blank(keyword))) add('keywords', 'Enter at least one search keyword.');
    if (!Array.isArray(values.variations) || !values.variations.length) {
        add('variations', 'Add at least one product variation.');
        return errors;
    }
    const skus = new Set();
    values.variations.forEach((variation, index) => {
        const path = `variations.${index}`, label = `Variation ${index + 1}`;
        if (!variation || typeof variation !== 'object' || Array.isArray(variation)) { add(path, `${label} is invalid.`); return; }
        if (blank(variation.color)) add(`${path}.color`, `${label}: color is required.`);
        if (blank(variation.sku)) add(`${path}.sku`, `${label}: SKU is required.`);
        else {
            const sku = variation.sku.trim().toLowerCase();
            if (skus.has(sku)) add(`${path}.sku`, `${label}: each variation needs a unique SKU.`);
            skus.add(sku);
        }
        if (variation.images !== undefined && !Array.isArray(variation.images)) add(`${path}.images`, `${label}: product images must be a gallery.`);
        else if (!(imageCounts ? imageCounts[index] > 0 : Array.isArray(variation.images) && variation.images.length > 0)) add(`${path}.images`, `${label}: add at least one product image.`);
        if (!Array.isArray(variation.sizes) || !variation.sizes.length) { add(`${path}.sizes`, `${label}: add at least one size.`); return; }
        const sizes = new Set();
        variation.sizes.forEach((size, sizeIndex) => {
            const sizePath = `${path}.sizes.${sizeIndex}`;
            if (!size || typeof size !== 'object' || Array.isArray(size)) { add(sizePath, `${label}: size ${sizeIndex + 1} is invalid.`); return; }
            if (blank(size.size)) add(`${sizePath}.size`, `${label}: size is required.`);
            else {
                const name = size.size.trim().toLowerCase();
                if (sizes.has(name)) add(`${sizePath}.size`, `${label}: size '${size.size}' is duplicated.`);
                sizes.add(name);
            }
            for (const field of ['price', 'mrp', 'stock']) {
                if (size[field] == null || blank(String(size[field]))) add(`${sizePath}.${field}`, `${label}, size '${size.size || sizeIndex + 1}': ${field === 'mrp' ? 'MRP' : field} is required.`);
            }
        });
    });
    return errors;
}
