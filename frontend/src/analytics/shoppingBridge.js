// Observe successful existing requests without awaiting analytics or changing responses.
export function installShoppingAnalytics(axios, analytics, route, backendUrl) {
  const requestId = axios.interceptors.request.use(config => {
    try {
      const url = new URL(config.url, backendUrl);
      if (url.origin !== new URL(backendUrl).origin) return config;
      const path = url.pathname, current = route();
      if (!['/api/order/verifyRazorpay', '/api/order/verifyStripe', '/api/cart/add', '/api/cart/update', '/api/cart/remove', '/api/product/single', '/api/cart/get', '/api/order/razorpay'].includes(path)) return config;
      const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
      if (/^\/api\/order\/verify(?:Razorpay|Stripe)$/.test(path)) {
        const context = analytics.context();
        delete config.headers['x-analytics-context'];
        if (context) config.headers['x-analytics-context'] = JSON.stringify(context);
      }
      if (config._analyticsPrepared !== undefined) return config;
      config._analyticsPrepared = null;
      if (path === '/api/cart/add') config._analyticsPrepared = analytics.prepare('add_to_cart', { productId: data.itemId, quantity: 1 });
      if (['/api/cart/update', '/api/cart/remove'].includes(path) && config.analyticsEvent) {
        const { name, quantity, amount, currency } = config.analyticsEvent;
        config._analyticsPrepared = analytics.prepare(name, { productId: data.itemId, quantity, amount, currency });
      }
      if (path === '/api/product/single' && current.pathname.toLowerCase() === `/product/${data.productId}`) config._analyticsPrepared = analytics.prepare('product_view', { productId: data.productId }, `product:${current.key}:${data.productId}`);
      if (path === '/api/cart/get' && current.pathname.toLowerCase() === '/checkout') config._analyticsPrepared = analytics.prepare('checkout_started', {}, `checkout:${current.key}`);
      if (path === '/api/order/razorpay' && current.pathname.toLowerCase() === '/luxe') config._analyticsPrepared = analytics.prepare('checkout_started', {}, `luxe-checkout:${current.key}`);
    } catch { /* Analytics cannot reject a shopping request. */ }
    return config;
  }, undefined, { synchronous: true });
  const responseId = axios.interceptors.response.use(response => {
    try {
      const prepared = response.config._analyticsPrepared;
      if (response.data?.success && prepared && (prepared.event.name !== 'checkout_started' || !response.config.url.endsWith('/cart/get') || response.data.cartItems?.length)) analytics.commit(prepared);
    } catch { /* Leave the original response untouched. */ }
    return response;
  });
  return () => { axios.interceptors.request.eject(requestId); axios.interceptors.response.eject(responseId); };
}
