export const DEFAULT_SOCIAL_SETTINGS = {
    links: [
        { id: 'facebook', platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/febeul', showInTopBar: true, showInFooter: true },
        { id: 'instagram', platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/febeul.official', showInTopBar: true, showInFooter: true },
        { id: 'threads', platform: 'threads', label: 'Threads', url: 'https://www.threads.com/@febeul.official', showInTopBar: true, showInFooter: true },
    ],
};

export const validateSocialSettings = (content) => {
    if (!content || !Array.isArray(content.links)) {
        throw new Error('Social settings must contain a list of links.');
    }

    const ids = new Set();
    return {
        links: content.links.map((link, index) => {
            if (!link || typeof link.id !== 'string' || !link.id.trim() || ids.has(link.id)) {
                throw new Error(`Social link ${index + 1} needs a unique ID.`);
            }
            ids.add(link.id);
            if (typeof link.platform !== 'string' || !link.platform.trim() ||
                typeof link.label !== 'string' || !link.label.trim()) {
                throw new Error(`Social link ${index + 1} needs a platform and display name.`);
            }

            let url;
            try {
                url = new URL(typeof link.url === 'string' ? link.url.trim() : '');
            } catch {
                throw new Error(`Enter a valid http:// or https:// URL for ${link.label}.`);
            }
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error(`Only http:// and https:// URLs are allowed for ${link.label}.`);
            }
            for (const field of ['showInTopBar', 'showInFooter']) {
                if (link[field] !== undefined && typeof link[field] !== 'boolean') {
                    throw new Error(`Choose a valid visibility setting for ${link.label}.`);
                }
            }

            return {
                id: link.id,
                platform: link.platform.trim(),
                label: link.label.trim(),
                url: url.href,
                showInTopBar: link.showInTopBar !== false,
                showInFooter: link.showInFooter !== false,
            };
        }),
    };
};
