// Keep the product editor and authenticated product upload routes in sync.
export const PRODUCT_UPLOAD_MAX_FILES = 60;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_TYPES.join(',');
export const PRODUCT_UPLOAD_HINT = 'JPG, PNG, WebP or GIF. Up to 60 new images across all variations per save; 5 MB per image.';

export function validateProductImageUploads(files) {
    if (files.length > PRODUCT_UPLOAD_MAX_FILES) return `Upload up to ${PRODUCT_UPLOAD_MAX_FILES} new images across all variations at a time.`;
    for (const file of files) {
        if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return 'Use JPG, PNG, WebP or GIF images.';
        if (file.size > PRODUCT_IMAGE_MAX_BYTES) return `Image "${file.name}" is too large. Each image must be 5 MB or smaller.`;
    }
    return '';
}
