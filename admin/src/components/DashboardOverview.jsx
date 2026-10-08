/* eslint-disable react/prop-types */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, Filter, Layers3, Package, Plus, RefreshCw, Search, ShoppingBag, Ticket, TriangleAlert, Users, Wallet, X } from 'lucide-react';
import { backendUrl, currency } from '../App';
import UniversalSearch from './UniversalSearch';
import './DashboardOverview.css';

const chartColors = ['#be617d', '#d991a6', '#e9b9c7', '#967caa', '#b7a5c7', '#667d83', '#99aeb1', '#c89c73', '#dbbb9d', '#8d8e9e'];
const rangeLabels = { '7days': 'Last 7 days', '30days': 'Last 30 days', '90days': 'Last 90 days', year: 'This year', custom: 'Custom range' };
const chartTooltip = { border: '1px solid #e8e5e8', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px #241d2810' };
const axisStyle = { fill: '#85818a', fontSize: 11 };
const compactMoney = value => `${currency}${Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`;
const money = value => `${currency}${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const shortDate = value => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const statusTone = status => {
  if (['Delivered', 'Completed'].includes(status)) return 'green';
  if (['Cancelled', 'Failed', 'Returned', 'Refunded'].includes(status)) return 'rose';
  if (['Shipped', 'Out for delivery'].includes(status)) return 'blue';
  if (['Processing', 'Confirmed', 'Refund Initiated'].includes(status)) return 'amber';
  return 'gray';
};

function EmptyState({ title, description, compact = false }) {
  return <div className={`overview-empty ${compact ? 'overview-empty-compact' : ''}`}>
    <span className="overview-empty-icon"><Layers3 size={21} aria-hidden="true" /></span>
    <strong>{title}</strong><p>{description}</p>
  </div>;
}

function SectionHeading({ eyebrow, title, description, children }) {
  return <div className="overview-section-heading">
    <div>{eyebrow && <span className="overview-eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </div>;
}

function MetricCard({ icon: Icon, title, value, note, featured }) {
  return <article className={`overview-metric ${featured ? 'overview-metric-featured' : ''}`} aria-label={title}>
    <div className="overview-metric-top"><span>{title}</span><span className="overview-metric-icon"><Icon size={18} aria-hidden="true" /></span></div>
    <strong className="overview-metric-value">{value}</strong>
    <p><span className="overview-small-dot" />{note}</p>
  </article>;
}

function Distribution({ data, valueKey, nameKey, emptyTitle, description, percentage = false }) {
  const total = data.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0);
  if (!data.length || !total) return <EmptyState title={emptyTitle} description="Sales will appear here for the selected period." />;
  return <>
    <div className="overview-donut" role="img" aria-label={description}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="65%" outerRadius="90%" paddingAngle={3} stroke="none" isAnimationActive={false}>
            {data.map((item, index) => <Cell key={`${item[nameKey]}-${index}`} fill={item.color || chartColors[index % chartColors.length]} />)}
          </Pie>
          <Tooltip contentStyle={chartTooltip} formatter={(value, name) => [`${Number(value).toLocaleString('en-IN')}${percentage ? '%' : ''}`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="overview-donut-center"><strong>{percentage ? data.length : total.toLocaleString('en-IN')}</strong><span>{percentage ? 'categories' : 'units sold'}</span></div>
    </div>
    <ul className="overview-legend" aria-label={description}>
      {data.map((item, index) => <li key={`${item[nameKey]}-${index}`}>
        <span className="overview-legend-dot" style={{ background: item.color || chartColors[index % chartColors.length] }} />
        <span className="overview-legend-name" title={item[nameKey]}>{item[nameKey] || 'Unspecified'}</span>
        <strong>{Number(item[valueKey]).toLocaleString('en-IN')}{percentage ? '%' : ''}</strong>
        {!percentage && <span>{Math.round(Number(item[valueKey]) / total * 100)}%</span>}
      </li>)}
    </ul>
  </>;
}

export default function DashboardOverview({
  token, role, permissions, timeRange, setTimeRange, startDate, setStartDate, endDate, setEndDate,
  loading, initialLoading, exporting, error, dismissError, lastUpdated, userCountScope,
  dashboardStats, monthlyTrends, dailyTrends, categorySales, skuSales, skuStocks, filteredStocks, stockAvailable,
  recentOrdersList, filteredOrders, orderSearch, setOrderSearch, lowStockOnly, setLowStockOnly,
  refresh, exportReport,
}) {
  const stockRef = useRef(null);
  const canVisit = path => role === 'admin' || permissions.includes(path);
  const lowStockCount = skuStocks.filter(item => item.stock > 0 && item.stock <= 15).length;
  const outOfStockCount = skuStocks.filter(item => item.stock <= 0).length;
  const attentionCount = lowStockCount + outOfStockCount;
  const quickLinks = [
    { to: '/add', icon: Plus, title: 'Add a product', note: 'Grow your collection' },
    { to: '/orders', icon: ShoppingBag, title: 'Manage orders', note: 'Review and fulfil orders' },
    { to: '/coupons', icon: Ticket, title: 'Manage coupons', note: 'Offers for your customers' },
    { to: '/user-tracking', icon: Activity, title: 'Buyer analytics', note: 'Explore consented activity' },
  ].filter(item => canVisit(item.to));
  const rangeText = timeRange === 'custom' ? `${shortDate(startDate)} – ${shortDate(endDate)}` : rangeLabels[timeRange];
  const dataUnavailable = dashboardStats.totalOrders.value === '—';
  // Daily trend buckets use UTC on the existing reporting endpoint.
  const todayKey = new Date().toISOString().slice(0, 10);
  const includesToday = timeRange !== 'custom' || (startDate <= todayKey && endDate >= todayKey);
  const todayRevenue = dailyTrends.find(item => item.date === todayKey)?.revenue || 0;
  const reviewStock = () => {
    setLowStockOnly(true);
    stockRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  };

  return <div className="store-overview">
    <header className="overview-header">
      <div><p className="overview-eyebrow"><span className="overview-brand-mark" />FEBEUL / WORKSPACE</p><h1>Store overview<span>.</span></h1><p className="overview-header-note">A clear view of your business, all in one place.</p></div>
      <div className="overview-header-actions">
        <span className="overview-update" aria-live="polite"><Clock3 size={13} aria-hidden="true" />{loading ? 'Updating data…' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Not updated yet'}</span>
        <div className="overview-action-pair">
          <button type="button" className="overview-button overview-icon-button" onClick={refresh} disabled={loading} title="Refresh data" aria-label="Refresh dashboard data"><RefreshCw size={17} className={loading ? 'overview-spin' : ''} /></button>
          <button type="button" className="overview-button overview-button-dark" onClick={exportReport} disabled={exporting}><ArrowDownToLine size={16} aria-hidden="true" />{exporting ? 'Exporting...' : 'Export Report'}</button>
        </div>
      </div>
    </header>

    <div className="overview-search"><UniversalSearch token={token} backendUrl={backendUrl} role={role} permissions={permissions} /></div>

    {error && <div className="overview-error" role="alert"><TriangleAlert size={18} aria-hidden="true" /><p>{error}</p><button type="button" onClick={refresh} disabled={loading}>Retry</button><button type="button" aria-label="Dismiss dashboard message" onClick={dismissError}><X size={17} /></button></div>}

    <div className="overview-toolbar">
      <div><h2>Business performance</h2><p>Sales activity for your selected period</p></div>
      <div className="overview-date-controls">
        <label className="overview-range-select"><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">Reporting period</span><select value={timeRange} onChange={event => setTimeRange(event.target.value)}>{Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {timeRange === 'custom' && <div className="overview-custom-dates"><label>From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label></div>}
      </div>
    </div>

    {initialLoading ? <div className="overview-loading" aria-label="Loading dashboard" aria-busy="true"><div className="overview-metrics">{[0, 1, 2, 3].map(index => <div key={index} className="overview-skeleton overview-skeleton-metric" />)}</div><div className="overview-skeleton overview-skeleton-chart" /><div className="overview-skeleton overview-skeleton-chart" /></div> : <>
      <div className="overview-metrics">
        <MetricCard featured icon={Wallet} title="Order revenue" value={dashboardStats.revenue.value} note="Recorded order value · INR" />
        <MetricCard icon={ShoppingBag} title="Total orders" value={dashboardStats.totalOrders.value} note="Within selected period" />
        <MetricCard icon={Users} title={userCountScope === 'all' ? 'Total users' : 'New signups'} value={dashboardStats.totalUsers.value} note={userCountScope === 'all' ? 'All registered users · all time' : 'Within selected period'} />
        <MetricCard icon={Layers3} title="Average order value" value={dashboardStats.avgOrderValue.value} note="Order revenue ÷ total orders" />
      </div>
      <p className="overview-metric-note">Order revenue includes all order statuses. Refunds are not deducted.</p>

      <div className="overview-main-grid">
        <section className="overview-panel overview-revenue" aria-label="Daily revenue">
          <SectionHeading eyebrow="SALES OVER TIME" title="Revenue overview" description="Daily recorded order value"><span className="overview-period-pill">{rangeText}</span></SectionHeading>
          {dailyTrends.length ? <div className="overview-revenue-chart" role="img" aria-label="Daily order revenue for the selected period">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={dailyTrends} margin={{ top: 16, right: 8, bottom: 0, left: -14 }}>
                <defs><linearGradient id="overview-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#be617d" stopOpacity={0.24} /><stop offset="95%" stopColor="#be617d" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#eeecef" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} axisLine={false} tickLine={false} minTickGap={30} tickMargin={12} />
                <YAxis tickFormatter={compactMoney} tick={axisStyle} axisLine={false} tickLine={false} width={68} />
                <Tooltip contentStyle={chartTooltip} labelFormatter={shortDate} formatter={value => [money(value), 'Order revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#b85c78" strokeWidth={2.5} fill="url(#overview-revenue-fill)" isAnimationActive={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div> : <EmptyState title={dataUnavailable ? 'Revenue data unavailable' : 'No revenue to display'} description="Choose another period or refresh your dashboard." />}
          <div className="overview-chart-caption"><span><i className="overview-legend-dot" />Order revenue</span><span>Today (UTC): <strong>{dataUnavailable ? '—' : includesToday ? money(todayRevenue) : 'Outside selected period'}</strong></span><span>Currency: INR ({currency})</span></div>
        </section>

        <aside className="overview-side-stack">
          <section className="overview-panel overview-attention">
            <SectionHeading eyebrow="INVENTORY WATCH" title="Stock attention" />
            <div className="overview-attention-total"><strong>{stockAvailable ? attentionCount : '—'}</strong><span>SKU variations<br />at 15 units or fewer</span><span className="overview-attention-icon"><Package size={25} aria-hidden="true" /></span></div>
            <div className="overview-stock-summary"><span><i className="overview-small-dot overview-dot-rose" />Out of stock<strong>{stockAvailable ? outOfStockCount : '—'}</strong></span><span><i className="overview-small-dot overview-dot-amber" />Low stock (1–15)<strong>{stockAvailable ? lowStockCount : '—'}</strong></span></div>
            <button type="button" className="overview-text-button" onClick={reviewStock}>Review stock levels <ArrowRight size={15} /></button>
          </section>
          {quickLinks.length > 0 && <section className="overview-panel overview-shortcuts"><h2>Quick actions</h2><div>{quickLinks.map(({ to, icon: Icon, title, note }) => <Link key={to} to={to} className="overview-shortcut"><span className="overview-shortcut-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{note}</small></span><ArrowUpRight size={15} /></Link>)}</div></section>}
        </aside>
      </div>

      <div className="overview-breakdown-grid">
        <section className="overview-panel"><SectionHeading title="Order trends" description="Monthly orders in the selected period" />
          {monthlyTrends.length ? <div className="overview-orders-chart" role="img" aria-label="Monthly order counts"><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={monthlyTrends} margin={{ left: -25, right: 6, top: 12 }}><CartesianGrid stroke="#eeecef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} /><YAxis axisLine={false} tickLine={false} tick={axisStyle} allowDecimals={false} /><Tooltip contentStyle={chartTooltip} cursor={{ fill: '#faf5f7' }} /><Bar dataKey="orders" name="Orders" fill="#c67b92" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No order trends yet" description="Orders will appear here for this period." />}
        </section>
        <section className="overview-panel"><SectionHeading title="Top selling SKUs" description="Share of units among the top 10 SKUs" /><Distribution data={skuSales} valueKey="totalSold" nameKey="sku" emptyTitle="No SKU sales yet" description="Units sold by SKU" /></section>
        <section className="overview-panel"><SectionHeading title="Category sales" description="Share of product sales value" /><Distribution percentage data={categorySales} valueKey="value" nameKey="name" emptyTitle="No category sales yet" description="Percentage of product sales by category" /></section>
      </div>

      <section className="overview-panel overview-orders-panel" aria-label="Recent orders">
        <SectionHeading title="Recent orders" description={`Latest ${recentOrdersList.length || ''} customer orders · across all dates`}>
          {canVisit('/orders') && <Link to="/orders" className="overview-text-button">View all orders <ArrowUpRight size={15} /></Link>}
        </SectionHeading>
        <div className="overview-table-toolbar"><label className="overview-table-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search recent orders</span><input type="search" value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Search order ID, SKU, status..." />{orderSearch && <button type="button" onClick={() => setOrderSearch('')} aria-label="Clear order search"><X size={15} /></button>}</label><span className="overview-result-count">{filteredOrders.length} of {recentOrdersList.length} orders</span></div>
        {filteredOrders.length ? <div className="overview-table-scroll"><table className="overview-table overview-orders-table"><caption className="sr-only">Recent customer orders</caption><thead><tr><th>Order ID</th><th>SKU</th><th>Amount</th><th>Status</th><th>Date & time</th></tr></thead><tbody>{filteredOrders.map((order, index) => <tr key={order.id || index}>
          <td data-label="Order ID" className="overview-order-id">{canVisit('/orders') ? <Link to={`/orders?search=${encodeURIComponent(order.id?.replace(/^#/, '') || '')}`} title={order.id}>{order.id}<ArrowUpRight size={12} /></Link> : <span title={order.id}>{order.id}</span>}</td>
          <td data-label="SKU"><span className="overview-table-sku" title={order.skus}>{order.skus || 'N/A'}</span></td>
          <td data-label="Amount" className="overview-amount">{money(order.amount)}</td>
          <td data-label="Status"><span className={`overview-status overview-status-${statusTone(order.status)}`}><i />{order.status}</span></td>
          <td data-label="Date & time"><span className="overview-order-date">{order.date || 'N/A'}<small>{order.time}</small></span></td>
        </tr>)}</tbody></table></div> : <EmptyState compact title={orderSearch ? 'No matching orders' : dataUnavailable ? 'Orders unavailable' : 'No orders yet'} description={orderSearch ? 'Try a different order ID, SKU, or status.' : 'Your latest customer orders will appear here.'} />}
      </section>

      <section ref={stockRef} className="overview-panel overview-stock-panel" aria-label="Stock levels by SKU">
        <SectionHeading title="Stock levels by SKU" description="Current inventory per variation · across all dates">
          {canVisit('/list') && <Link to="/list" className="overview-text-button">Manage inventory <ArrowUpRight size={15} /></Link>}
        </SectionHeading>
        <div className="overview-table-toolbar"><button type="button" className={`overview-filter ${lowStockOnly ? 'overview-filter-active' : ''}`} aria-pressed={lowStockOnly} onClick={() => setLowStockOnly(previous => !previous)}>{lowStockOnly ? <Check size={14} /> : <Filter size={14} />}Low Stock Only</button><span className="overview-result-count">{filteredStocks.length} of {skuStocks.length} variations</span></div>
        {filteredStocks.length ? <div className="overview-table-scroll overview-stock-scroll"><table className="overview-table overview-stock-table"><caption className="sr-only">Current stock by product variation</caption><thead><tr><th>SKU</th><th>Product & color</th><th>Stock status</th><th className="overview-align-right">Qty</th></tr></thead><tbody>{filteredStocks.map((item, index) => <tr key={`${item.sku}-${index}`}>
          <td>{canVisit('/list') ? <Link className="overview-stock-sku" to={`/list?search=${encodeURIComponent(item.sku)}`}>{item.sku}</Link> : <span className="overview-stock-sku">{item.sku}</span>}</td><td className="overview-stock-name">{item.name}</td><td><span className={`overview-status overview-status-${item.stock <= 0 ? 'rose' : item.stock <= 15 ? 'amber' : 'green'}`}><i />{item.stock <= 0 ? 'Out of stock' : item.stock <= 15 ? 'Low stock' : 'In stock'}</span></td><td className="overview-align-right overview-stock-quantity">{item.stock}</td>
        </tr>)}</tbody></table></div> : <EmptyState compact title={!stockAvailable ? 'Inventory unavailable' : lowStockOnly ? 'No low-stock variations' : 'No inventory to display'} description={!stockAvailable ? 'Refresh to try loading inventory again.' : lowStockOnly ? 'No variations match the 15-units-or-fewer filter.' : 'Your product variations will appear here.'} />}
      </section>
      <footer className="overview-footer"><span>FEBEUL <span>Admin workspace</span></span><span>Use Refresh to load the latest figures.</span></footer>
    </>}
  </div>;
}
