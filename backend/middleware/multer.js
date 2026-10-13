import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { rejectUnsafeInput } from './security.js';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const storage = multer.diskStorage({ filename: (_req, _file, callback) => callback(null, randomUUID()) });
const parser = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024, files: 12, fields: 100, fieldSize: 100 * 1024, parts: 112 },
    fileFilter: (_req, file, cb) => cb(allowed.has(file.mimetype) || file.mimetype === 'image/jpg' ? null : new Error('Invalid file type.'), allowed.has(file.mimetype) || file.mimetype === 'image/jpg'),
});
function checked(middleware) {
    return (req, res, next) => middleware(req, res, async error => {
        const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
        const cleanup = () => { for (const file of files) unlink(file.path).catch(() => {}); };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        if (error) { cleanup(); return next(error); }
        try {
            for (const file of files) {
                const detected = await fileTypeFromFile(file.path);
                const declared = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
                if (!detected || !allowed.has(detected.mime) || detected.mime !== declared || (detected.mime.startsWith('image/') && file.size > 5 * 1024 * 1024)) throw new Error('Invalid file type.');
            }
            rejectUnsafeInput(req, res, next);
        } catch {
            cleanup(); next(new Error('Invalid file type.'));
        }
    });
}
export default {
    single: name => checked(parser.single(name)),
    array: (name, count) => checked(parser.array(name, count)),
    any: () => checked(parser.any()),
};
