// Search destinations mirror the existing routes and their permission keys.
// Only labels/keywords are indexed here; configuration values and secrets are never searched.
export const searchPages = [
  ['Dashboard', '/', '/', 'Overview', 'revenue sales charts reports'],
  ['All Users', '/allusers', '/allusers', 'People', 'customers accounts staff permissions block'],
  ['Add Items', '/add', '/add', 'Catalog', 'new product inventory'],
  ['List Items', '/list', '/list', 'Catalog', 'products inventory stock sku'],
  ['Luxe Items', '/luxelist', '/luxelist', 'Catalog', 'premium products prive'],
  ['Orders', '/orders', '/orders', 'Sales', 'order id purchases invoices buyers'],
  ['Refunds', '/refund-requests', '/refund-requests', 'Sales', 'refund requests payments'],
  ['Returns', '/return-requests', '/return-requests', 'Sales', 'return requests pickup courier'],
  ['Exchanges', '/exchanges', '/exchanges', 'Sales', 'exchange requests replacement'],
  ['Gift Wraps', '/gift-wraps', '/gift-wraps', 'Sales', 'gift wrapping packaging'],
  ['Coupons', '/coupons', '/coupons', 'Sales', 'discount promotion codes offers'],
  ['Email Marketing', '/send-mail', '/send-mail', 'Marketing & Content', 'send mail campaigns newsletters'],
  ['Order Email Template', '/email-templates', '/email-templates', 'Marketing & Content', 'email settings notifications'],
  ['Content (CMS)', '/cms', '/cms', 'Marketing & Content', 'settings website text swiping messages promo banner info bar shipping scan shop staff details'],
  ['Luxe Page', '/luxe-page', '/cms', 'Marketing & Content', 'settings membership benefits images text'],
  ['Hero Images', '/images', '/images', 'Marketing & Content', 'settings home banner carousel photos'],
  ['Policies', '/policy-update', '/policy-update', 'Marketing & Content', 'settings privacy terms conditions refund shipping policy'],
  ['Tickets', '/tickets', '/tickets', 'Support', 'customer support help messages'],
  ['Reviews', '/reviews', '/reviews', 'Support', 'ratings feedback moderation'],
  ['Staff Tracking', '/staff-tracking', '/staff-tracking', 'Tracking', 'staff activity coming soon'],
  ['User Tracking', '/user-tracking', '/user-tracking', 'Tracking', 'analytics visitors sessions conversion consent cookies'],
  ['Maintenance', '/maintenance', '/maintenance', 'Settings', 'maintenance mode website offline'],
  ['Configurations', '/configurations', '/configurations', 'Settings', 'config luxe membership price shipping threshold charge delivery days cod cash return journey critical lost refund'],
  ['Social Links', '/socials-settings', '/cms', 'Settings', 'socials instagram facebook whatsapp youtube footer'],
  ['Delivery Zones', '/delivery-control', '/delivery-control', 'Settings', 'shipping pincode postal state courier delivery control'],
  ['Image Optimization', '/image-optimize', '/image-optimize', 'Settings', 'images quality compression performance'],
  ['Typography', '/typography', '/typography', 'Settings', 'font fonts text size style'],
  ['Product Taxonomy', '/product-taxonomy', '/product-taxonomy', 'Settings', 'categories sizes colors attributes'],
  ['Reset Data', '/reset-data', '/reset-data', 'Settings', 'reset clear database'],
].map(([title, href, permission, section, keywords]) => ({
  id: `page:${href}`, type: 'Pages & settings', title, href, permission, subtitle: section, keywords,
}));

export function findSearchPages(query, role, permissions = []) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return searchPages.filter(page => (role === 'admin' || permissions.includes(page.permission)) &&
    words.every(word => `${page.title} ${page.subtitle} ${page.keywords}`.toLowerCase().includes(word)));
}
