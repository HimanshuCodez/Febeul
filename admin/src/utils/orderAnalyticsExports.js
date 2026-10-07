// react-csv encloses cells in quotes but does not escape quotes inside values.
// Keep customer-entered text literal when the downloaded file opens in a spreadsheet.
const csvCell = value => {
  if (typeof value !== 'string') return value ?? '';
  const text = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return text.replace(/"/g, '""');
};

const csvDate = value => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const itemsText = items => items.map(item => `${item.name} (SKU: ${item.sku}, Qty: ${item.quantity})`).join(' | ');

export const prepareOrderCsvRows = rows => rows.map(row => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key, csvCell(value)]),
));

const report = (name, label, columns, rows) => ({
  name,
  label,
  headers: columns.map(([label, key]) => ({ label, key })),
  data: prepareOrderCsvRows(rows),
});

const requestColumns = [
  ['Date', 'date'], ['Order ID', 'orderId'], ['Buyer Name', 'userName'],
  ['Buyer Email', 'email'], ['State', 'state'], ['Pincode', 'pincode'],
  ['Items & SKUs', 'items'], ['Coupon Used', 'couponUsed'], ['Refund Amount', 'amount'],
];

const requestRows = (rows, includeStatus = false) => rows.map(row => ({
  date: csvDate(row.date), orderId: row.orderId, userName: row.userName, email: row.email,
  state: row.state, pincode: row.pincode, items: itemsText(row.items),
  couponUsed: row.couponUsed, amount: row.amount,
  ...(includeStatus ? { status: row.status } : {}),
}));

// Inputs are the same filtered/sorted arrays rendered by each existing tab.
export function buildOrderAnalyticsExports(tab, { states, pincodes, buyers, returns, refunds }) {
  switch (tab) {
    case 'pincodes':
      return [
        report('States', 'Export States', [
          ['State', 'state'], ['Pincodes', 'pincodesCount'], ['Orders', 'orderCount'], ['Revenue', 'totalSales'],
        ], states.map(row => ({ state: row.state, pincodesCount: row.pincodesCount, orderCount: row.orderCount, totalSales: row.totalSales }))),
        report('Pincodes', 'Export Pincodes', [
          ['Pincode', 'pincode'], ['City', 'city'], ['State', 'state'], ['Buyers', 'customersCount'],
          ['Orders', 'orderCount'], ['Revenue', 'totalSales'],
        ], pincodes.map(row => ({ pincode: row.pincode, city: row.city, state: row.state, customersCount: row.customersCount, orderCount: row.orderCount, totalSales: row.totalSales }))),
      ];
    case 'buyers':
      return [report('Buyer_Analytics', 'Export', [
        ['Buyer Name', 'name'], ['Buyer Email', 'email'], ['Luxe Member', 'isLuxe'],
        ['Order Count', 'orderCount'], ['Total Spend', 'totalSpent'], ['Products & SKUs', 'products'],
      ], buyers.map(row => ({ name: row.name, email: row.email, isLuxe: row.isLuxe ? 'Yes' : 'No', orderCount: row.orderCount, totalSpent: row.totalSpent, products: itemsText(Object.values(row.products)) })))];
    case 'returns':
      return [report('Returns_Log', 'Export', requestColumns, requestRows(returns))];
    case 'refunds':
      return [report('Refund_Requests', 'Export', [...requestColumns, ['Status', 'status']], requestRows(refunds, true))];
    default:
      return [];
  }
}
