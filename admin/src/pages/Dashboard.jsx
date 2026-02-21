import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiUsers, FiShoppingBag, FiTrendingUp, FiDollarSign, FiPackage, FiClock, FiActivity, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { backendUrl, currency } from '../App'; // Import backendUrl and currency

const FebeulDashboard = ({ token }) => {
  const [timeRange, setTimeRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: { value: '0', change: '0%', type: 'up' },
    totalOrders: { value: '0', change: '0%', type: 'up' },
    revenue: { value: currency + '0', change: '0%', type: 'up' },
    avgOrderValue: { value: currency + '0', change: '0%', type: 'up' },
  });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [skuSales, setSkuSales] = useState([]);
  const [recentOrdersList, setRecentOrdersList] = useState([]);

  // Define category colors for consistency (can be fetched from backend or defined centrally)
  const categoryColors = {
    'BABYDOLL': '#f9aeaf',
    'LINGERIE': '#e88b8d',
    'NIGHTY': '#d66a6c',
    'PAJAMAS': '#c44a4d',
    'NEW & NOW': '#b33a3d',
    'GIFT WRAP': '#8B008B', // A distinct color for Gift Wrap
    // Add more categories and colors as needed
  };

  // Helper to format numbers for display
  const formatValue = (value, isCurrency = false) => {
    if (value === undefined || value === null) return 'N/A';
    if (isCurrency) return currency + value.toLocaleString();
    return value.toLocaleString();
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Dashboard Stats
      const statsResponse = await axios.get(`${backendUrl}/api/admin/dashboard-stats?range=${timeRange}`, { headers: { token } });
      const usersResponse = await axios.get(`${backendUrl}/api/user/allusers`, { headers: { token } });

      if (statsResponse.data.success && usersResponse.data.success) {
        const stats = statsResponse.data.stats;
                const totalUsersCount = usersResponse.data.users.length;
        
                        setDashboardStats({
                          totalUsers: { value: formatValue(totalUsersCount), change: stats.userChange, type: stats.userChangeType },
                          totalOrders: { value: formatValue(stats.totalOrders), change: stats.orderChange, type: stats.orderChangeType },
                          revenue: { value: formatValue(stats.revenue, true), change: stats.revenueChange, type: stats.revenueChangeType },
                          avgOrderValue: { value: formatValue(stats.avgOrderValue, true), change: stats.avgOrderValueChange, type: stats.avgOrderValueChangeType },
                        });      } else if (statsResponse.data.success) {
        // Fallback if only stats are successful but users are not
        const stats = statsResponse.data.stats;
        setDashboardStats({
          totalUsers: { value: formatValue(stats.totalUsers), change: stats.userChange, type: stats.userChangeType },
          totalOrders: { value: formatValue(stats.totalOrders), change: stats.orderChange, type: stats.orderChangeType },
          revenue: { value: formatValue(stats.revenue, true), change: stats.revenueChange, type: stats.revenueChangeType },
          avgOrderValue: { value: formatValue(stats.avgOrderValue, true), change: stats.avgOrderValueChange, type: stats.avgOrderValueChangeType },
        });
        setError('Failed to fetch user count.');
      } else {
        setError('Failed to fetch dashboard data.');
      }

      // Fetch Monthly Trends
      const trendsResponse = await axios.get(`${backendUrl}/api/admin/monthly-trends?range=${timeRange}`, { headers: { token } });
      if (trendsResponse.data.success) {
        setMonthlyTrends(trendsResponse.data.trends);
      }

      // Fetch Category Sales
      const categoryResponse = await axios.get(`${backendUrl}/api/admin/category-sales?range=${timeRange}`, { headers: { token } });
      if (categoryResponse.data.success) {
        setCategorySales(categoryResponse.data.sales.map(item => ({
            ...item,
            color: categoryColors[item.name] || '#9E9E9E' // Assign colors dynamically or from a map
        })));
      }

      // Fetch Recent Orders
      const ordersResponse = await axios.get(`${backendUrl}/api/admin/recent-orders`, { headers: { token } });
      if (ordersResponse.data.success) {
        setRecentOrdersList(ordersResponse.data.orders);
      }

      // Fetch SKU Sales
      const skuSalesResponse = await axios.get(`${backendUrl}/api/admin/sku-sales?range=${timeRange}`, { headers: { token } });
      if (skuSalesResponse.data.success) {
        setSkuSales(skuSalesResponse.data.skuSales);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data. Please check your backend endpoints.');
      // Fallback to sample data on error
      setDashboardStats({
        totalUsers: { value: '1,245', change: '+12.5%', type: 'up' },
        totalOrders: { value: '346', change: '+8.2%', type: 'up' },
        revenue: { value: '$103,900', change: '+15.3%', type: 'up' },
        avgOrderValue: { value: '$300.29', change: '-2.1%', type: 'down' },
      });
      setMonthlyTrends([
        { month: 'Jan', orders: 45, revenue: 12500, users: 120 },
        { month: 'Feb', orders: 52, revenue: 15800, users: 145 },
        { month: 'Mar', orders: 48, revenue: 14200, users: 138 },
        { month: 'Apr', orders: 61, revenue: 18900, users: 167 },
        { month: 'May', orders: 72, revenue: 22400, users: 189 },
        { month: 'Jun', orders: 68, revenue: 20100, users: 201 }
      ]);
      setCategorySales([
        { name: 'Electronics', value: 35, color: '#f9aeaf' },
        { name: 'Fashion', value: 28, color: '#e88b8d' },
        { name: 'Home & Living', value: 22, color: '#d66a6c' },
        { name: 'Beauty', value: 15, color: '#c44a4d' }
      ]);
      setRecentOrdersList([
        { id: '#12845', customer: 'Sarah Johnson', amount: 245, status: 'Completed', time: '2 hours ago' },
        { id: '#12844', customer: 'Mike Davis', amount: 189, status: 'Processing', time: '4 hours ago' },
        { id: '#12843', customer: 'Emma Wilson', amount: 432, status: 'Shipped', time: '6 hours ago' },
        { id: '#12842', customer: 'James Brown', amount: 156, status: 'Pending', time: '8 hours ago' }
      ]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, timeRange]);

  const StatCard = ({ icon: Icon, title, value, change, changeType, gradient }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {value}
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'up' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
            <span>{change}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const OrderRow = ({ order }) => {
    const getStatusColor = (status) => {
      const colors = {
        'Completed': 'text-green-600',
        'Processing': 'text-yellow-600',
        'Shipped': 'text-blue-600',
        'Pending': 'text-gray-600'
      };
      return colors[status] || 'text-gray-600';
    };

    const getStatusDotColor = (status) => {
      const colors = {
        'Completed': 'bg-green-600',
        'Processing': 'bg-yellow-600',
        'Shipped': 'bg-blue-600',
        'Pending': 'bg-gray-600'
      };
      return colors[status] || 'bg-gray-600';
    };

    return (
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl items-center text-sm hover:bg-gray-100 transition-all duration-200 hover:translate-x-1">
        <div className="font-semibold text-gray-900">{order.id}</div>
        <div className="text-gray-700">{order.customer}</div>
        <div className="font-bold text-gray-900">{currency}{order.amount?.toFixed(2)}</div>
        <div className={`flex items-center gap-2 font-semibold ${getStatusColor(order.status)}`}>
          <span className={`w-2 h-2 rounded-full ${getStatusDotColor(order.status)}`}></span>
          {order.status}
        </div>
        <div className="text-gray-500 text-xs">{order.time}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pb-6 border-b-2 border-gray-200">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#f9aeaf] to-[#e88b8d] bg-clip-text text-transparent tracking-tight mb-1">
            Febeul
          </h1>
          <p className="text-gray-600 font-medium">Admin Dashboard</p>
        </div>
        <div>
          <select 
            className="px-6 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 cursor-pointer transition-all duration-300 hover:border-[#f9aeaf] focus:outline-none focus:border-[#f9aeaf] focus:ring-4 focus:ring-[#f9aeaf]/20"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          icon={FiUsers}
          title="Total Users"
          value={dashboardStats.totalUsers.value}
          change={dashboardStats.totalUsers.change}
          changeType={dashboardStats.totalUsers.type}
          gradient="bg-gradient-to-br from-[#f9aeaf] to-[#e88b8d]"
        />
        <StatCard 
          icon={FiShoppingBag}
          title="Total Orders"
          value={dashboardStats.totalOrders.value}
          change={dashboardStats.totalOrders.change}
          changeType={dashboardStats.totalOrders.type}
          gradient="bg-gradient-to-br from-[#e88b8d] to-[#d66a6c]"
        />
        <StatCard 
          icon={FiDollarSign}
          title="Revenue"
          value={dashboardStats.revenue.value}
          change={dashboardStats.revenue.change}
          changeType={dashboardStats.revenue.type}
          gradient="bg-gradient-to-br from-[#d66a6c] to-[#c44a4d]"
        />
        <StatCard 
          icon={FiPackage}
          title="Avg Order Value"
          value={dashboardStats.avgOrderValue.value}
          change={dashboardStats.avgOrderValue.change}
          changeType={dashboardStats.avgOrderValue.type}
          gradient="bg-gradient-to-br from-[#c44a4d] to-[#b33a3d]"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Revenue Overview</h3>
              <p className="text-sm text-gray-500 font-medium">Monthly performance tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f9aeaf]"></span>
              <span className="text-sm text-gray-600 font-medium">Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f9aeaf" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f9aeaf" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: '12px' }} />
              <YAxis stroke="#888" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #e5e5e5', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f9aeaf" 
                strokeWidth={3}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Order Trends</h3>
            <p className="text-sm text-gray-500 font-medium">Monthly orders</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: '12px' }} />
              <YAxis stroke="#888" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #e5e5e5', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }} 
              />
              <Bar dataKey="orders" fill="#e88b8d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SKU Sales Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Top Selling SKUs</h3>
            <p className="text-sm text-gray-500 font-medium">Distribution by SKU</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={skuSales}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="totalSold"
                nameKey="sku"
              >
                {skuSales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={[
                    '#f9aeaf', '#e88b8d', '#d66a6c', '#c44a4d', '#b33a3d',
                    '#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9'
                  ][index % 10]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #e5e5e5', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
                formatter={(value, name) => [value + ' Units', `SKU: ${name}`]}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

     
      </div>

    

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Recent Orders</h3>
            <p className="text-sm text-gray-500 font-medium">Latest customer transactions</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-[#f9aeaf] to-[#e88b8d] text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            View All Orders
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 px-4 pb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div>Order ID</div>
            <div>Customer</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Time</div>
          </div>
          
          {/* Orders */}
          {recentOrdersList.map((order, index) => (
            <OrderRow key={index} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FebeulDashboard;
