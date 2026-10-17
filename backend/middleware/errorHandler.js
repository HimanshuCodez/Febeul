import multer from 'multer';
export default function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);
    const tooLarge = err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE';
    const badInput = err instanceof multer.MulterError || err.type === 'entity.parse.failed' || err.message === 'Invalid file type.' || err.name === 'ValidationError' || err.name === 'CastError';
    const message = ((tooLarge || badInput) && err.uploadMessage) || (tooLarge ? 'Upload or request is too large.' : badInput ? 'Invalid request or file.' : 'Unable to complete request.');
    return res.status(tooLarge ? 413 : badInput ? 400 : 500).json({ success: false, message });
}
