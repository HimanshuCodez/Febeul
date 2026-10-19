const activityLabels = {
  page_view: 'Page viewed', product_view: 'Product viewed', search: 'Search submitted',
  add_to_cart: 'Added to cart', remove_from_cart: 'Removed from cart',
  checkout_started: 'Started checkout', purchase: 'Purchased',
};

const csvCell = value => {
  let text = value == null ? '' : String(value);
  // Account/product names and search terms must stay text when opened in a spreadsheet.
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
const csvLine = values => values.map(csvCell).join(',') + '\r\n';

export async function* journeyCsv(rows) {
  // Start the query before emitting a header so query failures can return a JSON error.
  const iterator = rows[Symbol.asyncIterator]();
  try {
    let next = await iterator.next();
    yield '\uFEFF' + csvLine(['Timestamp (UTC)', 'Activity', 'Activity type', 'Session ID', 'Browser ID', 'Account ID', 'Account name', 'Account email', 'Page', 'Product ID', 'Product name', 'Quantity', 'Search term', 'Order ID', 'Currency', 'Amount', 'Amount source', 'Purchased items']);
    while (!next.done) {
      const event = next.value;
      yield csvLine([
        new Date(event.timestamp).toISOString(), activityLabels[event.name] || event.name, event.name,
        event.sessionId, event.visitorId, event.userId,
        !event.userId ? 'Guest / unidentified' : event.account ? event.account.name : 'Unavailable account',
        event.userId ? event.account?.email : '', event.path, event.productId, event.productName,
        event.quantity, event.searchTerm, event.orderId, event.currency, event.amount,
        event.amount == null ? '' : event.name === 'purchase' ? 'Verified payment' : 'Reported amount',
        event.items?.length ? JSON.stringify(event.items) : '',
      ]);
      next = await iterator.next();
    }
  } finally {
    if (iterator.return) await iterator.return();
  }
}
