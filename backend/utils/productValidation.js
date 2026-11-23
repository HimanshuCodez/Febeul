import { validateProduct } from '../../shared/productValidation.js';

export function validateProductRequest(req, res, { existingImages = false } = {}) {
    let variations;
    try { variations = typeof req.body.variations === 'string' ? JSON.parse(req.body.variations) : null; }
    catch { res.status(400).json({ success: false, message: 'Product variations must be valid JSON.' }); return null; }
    const imageCounts = Array.isArray(variations) ? variations.map((variation, index) =>
        (existingImages && Array.isArray(variation?.images) ? variation.images.filter(image => typeof image === 'string' && image.trim()).length : 0)
        + (req.files || []).filter(file => file.fieldname === `variations[${index}][images]`).length) : [];
    const errors = validateProduct({ ...req.body, variations }, { imageCounts });
    // These database columns are numbers. Check castability before uploading
    // images, without imposing editor formats, ranges or decimal-place rules.
    if (!errors.length) variations.forEach((variation, index) => variation.sizes.forEach((size, sizeIndex) => {
        for (const field of ['price', 'mrp', 'stock']) {
            if (!['string', 'number'].includes(typeof size[field]) || !Number.isFinite(Number(size[field]))) {
                errors.push({ field: `variations.${index}.sizes.${sizeIndex}.${field}`, message: `${field === 'mrp' ? 'MRP' : field === 'price' ? 'Price' : 'Stock'} must be a number to save this product.` });
            }
        }
    }));
    if (errors.length) { res.status(400).json({ success: false, message: errors[0].message, errors }); return null; }
    return variations;
}
