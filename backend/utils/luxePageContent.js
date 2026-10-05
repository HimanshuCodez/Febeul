export const DEFAULT_LUXE_PAGE_CONTENT = {
    hero: { title: 'Luxe Membership', subtitle: 'Experience The Elite' },
    promo: { enabled: true, title: 'Join Febeul Luxe Today', description: 'Unlock exclusive sales and premium benefits instantly.' },
    features: [
        { id: 'delivery', img: '/bus.png', title: 'PRIORITY DELIVERY', desc: 'Fast-track shipping on every order' },
        { id: 'gift-wraps', img: '/gifs.png', title: '15 GIFT WRAPS', desc: 'Premium packaging for your loved ones' },
        { id: 'prive', img: '/bags.png', title: 'LUXE PRIVE SALES', desc: 'Exclusive access to boutique collections' },
        { id: 'coupons', img: '/discount.png', title: 'EXCLUSIVE COUPONS', desc: 'Vouchers included with every purchase' },
        { id: 'support', img: '/customer.png', title: 'VIP SUPPORT', desc: 'Dedicated concierge for all your needs' },
        { id: 'shipping', img: '/free_delivery.png', title: 'FREE SHIPPING', desc: 'Zero delivery charges, nationwide' },
    ],
    offer: {
        label: 'Limited Time Offer', period: 'Per Month', joinLabel: 'Become a Member',
        loginLabel: 'Login to Join', processingLabel: 'Processing...',
        securityLabel: 'Secure SSL', paymentLabel: 'Safe Payment', perksLabel: 'VIP Perks',
        terms: 'Membership benefits active for 30 days from purchase. Auto-renewal not active.',
    },
    coupon: { placeholder: 'Have a coupon?', applyLabel: 'Apply', loadingLabel: '...', removeLabel: 'Remove', label: 'Coupon', appliedLabel: 'applied' },
    member: {
        eyebrow: 'Member Exclusive', title: 'LUXE PRIVE SALE',
        emptyTitle: 'New Arrivals Coming Soon',
        emptyDescription: 'Check back later for your exclusive Luxe Prive collection.',
    },
};

export const isLuxeImageSource = (value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const source = value.trim();
    if (source.startsWith('/') && !source.startsWith('//') && !source.includes('\\')) return true;
    try { return ['https:', 'http:'].includes(new URL(source).protocol); }
    catch { return false; }
};

export const validateLuxePageContent = (content) => {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
        throw new Error('Luxe page content must be an object.');
    }
    const result = {};
    for (const section of ['hero', 'promo', 'offer', 'coupon', 'member']) {
        const supplied = content[section] ?? {};
        if (typeof supplied !== 'object' || Array.isArray(supplied)) {
            throw new Error(`Invalid ${section} settings.`);
        }
        result[section] = {};
        for (const [key, fallback] of Object.entries(DEFAULT_LUXE_PAGE_CONTENT[section])) {
            const value = supplied[key] ?? fallback;
            if (typeof value !== typeof fallback) {
                throw new Error(`Invalid value for ${section}.${key}.`);
            }
            result[section][key] = typeof value === 'string' ? value.trim() : value;
        }
    }
    if (!result.hero.title || !result.member.title || !result.offer.joinLabel || !result.offer.loginLabel) {
        throw new Error('Page headings and membership button labels cannot be empty.');
    }
    const features = content.features ?? DEFAULT_LUXE_PAGE_CONTENT.features;
    if (!Array.isArray(features)) throw new Error('Luxe benefits must be a list.');
    const ids = new Set();
    result.features = features.map((feature, index) => {
        if (!feature || typeof feature.id !== 'string' || !feature.id.trim() || ids.has(feature.id)) {
            throw new Error(`Benefit ${index + 1} needs a unique ID.`);
        }
        ids.add(feature.id);
        if (typeof feature.title !== 'string' || !feature.title.trim() || typeof feature.desc !== 'string') {
            throw new Error(`Benefit ${index + 1} needs a title and text description.`);
        }
        if (!isLuxeImageSource(feature.img)) {
            throw new Error(`Use an http:// or https:// image URL, or a storefront path such as /bus.png, for benefit ${index + 1}.`);
        }
        return { id: feature.id, img: feature.img.trim(), title: feature.title.trim(), desc: feature.desc.trim() };
    });
    return result;
};
