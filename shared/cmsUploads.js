// CMS banners have a larger GIF allowance than product/customer images.
const MB = 1024 * 1024;
export const CMS_GIF_MAX_BYTES = 50 * MB;
export const CMS_IMAGE_MAX_BYTES = 5 * MB;
export const CMS_VIDEO_MAX_BYTES = 20 * MB;
export const CMS_BANNER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const CMS_MEDIA_TYPES = [...CMS_BANNER_TYPES, 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
export const CMS_BANNER_UPLOAD_HINT = 'Animated GIF: up to 50 MB per file. JPG, PNG and WebP: up to 5 MB per file.';

export const cmsUploadLimit = type => type === 'image/gif' ? CMS_GIF_MAX_BYTES : type.startsWith('video/') ? CMS_VIDEO_MAX_BYTES : CMS_IMAGE_MAX_BYTES;
export const cmsUploadSizeMessage = type => `${type === 'image/gif' ? 'GIFs' : type.startsWith('video/') ? 'Videos' : 'Images'} must be ${cmsUploadLimit(type) / MB} MB or smaller.`;
export function validateCmsUpload(file) {
    if (!CMS_MEDIA_TYPES.includes(file.type)) return 'Choose a JPG, PNG, WebP, GIF, MP4, WebM, Ogg or MOV file.';
    return file.size > cmsUploadLimit(file.type) ? cmsUploadSizeMessage(file.type) : '';
}
