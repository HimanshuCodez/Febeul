import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { rejectUnsafeInput } from './security.js';
import { PRODUCT_UPLOAD_MAX_FILES, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from '../../shared/productUploads.js';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const storage = multer.diskStorage({ filename: (_req, _file, callback) => callback(null, randomUUID()) });
const parser = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024, files: 12, fields: 100, fieldSize: 100 * 1024, parts: 112 },
    fileFilter: (_req, file, cb) => cb(allowed.has(file.mimetype) || file.mimetype === 'image/jpg' ? null : new Error('Invalid file type.'), allowed.has(file.mimetype) || file.mimetype === 'image/jpg'),
});
// Larger galleries are permitted only on authenticated product routes. Other
// uploads retain the existing 12-file limit and image/video policy.
const productParser = multer({
    storage,
    limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: PRODUCT_UPLOAD_MAX_FILES, fields: 100, fieldSize: 100 * 1024, parts: 100 + PRODUCT_UPLOAD_MAX_FILES },
    fileFilter: (_req, file, cb) => {
        if (!/^variations\[\d+\]\[images\]$/.test(file.fieldname)) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        const valid = PRODUCT_IMAGE_TYPES.includes(file.mimetype);
        cb(valid ? null : new Error('Invalid file type.'), valid);
    },
});
function checked(middleware, product = false) {
    return (req, res, next) => middleware(req, res, async error => {
        const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
        const cleanup = () => { for (const file of files) unlink(file.path).catch(() => {}); };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        const fail = error => {
            if (product) {
                error.uploadMessage = error.code === 'LIMIT_FILE_COUNT' ? `Upload up to ${PRODUCT_UPLOAD_MAX_FILES} new images across all variations at a time.`
                    : error.code === 'LIMIT_FILE_SIZE' ? 'Each product image must be 5 MB or smaller.'
                    : error.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload product images under their variation.'
                    : error.message === 'Invalid file type.' ? 'Use valid JPG, PNG, WebP or GIF images.' : undefined;
            }
            cleanup(); return next(error);
        };
        if (error) return fail(error);
        try {
            for (const file of files) {
                const detected = await fileTypeFromFile(file.path);
                const declared = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
                if (!detected || !allowed.has(detected.mime) || detected.mime !== declared || (detected.mime.startsWith('image/') && file.size > 5 * 1024 * 1024)) throw new Error('Invalid file type.');
            }
            rejectUnsafeInput(req, res, next);
        } catch {
            fail(new Error('Invalid file type.'));
        }
    });
}
export const productUpload = { any: () => checked(productParser.any(), true) };
export default {
    single: name => checked(parser.single(name)),
    array: (name, count) => checked(parser.array(name, count)),
    any: () => checked(parser.any()),
};
