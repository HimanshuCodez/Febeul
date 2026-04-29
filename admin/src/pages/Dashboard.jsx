import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  FiUsers,
  FiShoppingBag,
  FiTrendingUp,
  FiClock,
  FiActivity,
  FiArrowUp,
  FiArrowDown,
  FiDownload,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { backendUrl, currency } from "../App"; // Import backendUrl and currency
import { useNavigate } from "react-router-dom";

const FebeulDashboard = ({ token }) => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  useEffect(() => {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    if (role !== "admin" && !permissions.includes('/')) {
      navigate("/list");
    }
  }, [role, navigate]);

  const [timeRange, setTimeRange] = useState("30days");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // States for dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: { value: "0", change: "0%", type: "up" },
    totalOrders: { value: "0", change: "0%", type: "up" },
    revenue: { value: currency + "0", change: "0%", type: "up" },
    avgOrderValue: { value: currency + "0", change: "0%", type: "up" },
  });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [skuSales, setSkuSales] = useState([]);
  const [skuStocks, setSkuStocks] = useState([]);
  const [recentOrdersList, setRecentOrdersList] = useState([]);

  // Define category colors for consistency (can be fetched from backend or defined centrally)
  const categoryColors = {
    BABYDOLL: "#f9aeaf",
    LINGERIE: "#e88b8d",
    NIGHTY: "#d66a6c",
    PAJAMAS: "#c44a4d",
    "NEW & NOW": "#b33a3d",
    "GIFT WRAP": "#8B008B", // A distinct color for Gift Wrap
    // Add more categories and colors as needed
  };

  // Helper to format numbers for display
  const formatValue = (value, isCurrency = false) => {
    if (value === undefined || value === null) return "N/A";
    if (isCurrency) return currency + value.toLocaleString();
    return value.toLocaleString();
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = `range=${timeRange}${timeRange === "custom" ? `&startDate=${startDate}&endDate=${endDate}` : ""}`;

      // Fetch Dashboard Stats
      const statsResponse = await axios.get(
        `${backendUrl}/api/admin/dashboard-stats?${queryParams}`,
        { headers: { token } },
      );
      const usersResponse = await axios.get(`${backendUrl}/api/user/allusers`, {
        headers: { token },
      });

      if (statsResponse.data.success && usersResponse.data.success) {
        const stats = statsResponse.data.stats;
        const totalUsersCount = usersResponse.data.users.length;

        setDashboardStats({
          totalUsers: {
            value: formatValue(totalUsersCount),
            change: stats.userChange,
            type: stats.userChangeType,
          },
          totalOrders: {
            value: formatValue(stats.totalOrders),
            change: stats.orderChange,
            type: stats.orderChangeType,
          },
          revenue: {
            value: formatValue(stats.revenue, true),
            change: stats.revenueChange,
            type: stats.revenueChangeType,
          },
          avgOrderValue: {
            value: formatValue(stats.avgOrderValue, true),
            change: stats.avgOrderValueChange,
            type: stats.avgOrderValueChangeType,
          },
        });
      } else if (statsResponse.data.success) {
        // Fallback if only stats are successful but users are not
        const stats = statsResponse.data.stats;
        setDashboardStats({
          totalUsers: {
            value: formatValue(stats.totalUsers),
            change: stats.userChange,
            type: stats.userChangeType,
          },
          totalOrders: {
            value: formatValue(stats.totalOrders),
            change: stats.orderChange,
            type: stats.orderChangeType,
          },
          revenue: {
            value: formatValue(stats.revenue, true),
            change: stats.revenueChange,
            type: stats.revenueChangeType,
          },
          avgOrderValue: {
            value: formatValue(stats.avgOrderValue, true),
            change: stats.avgOrderValueChange,
            type: stats.avgOrderValueChangeType,
          },
        });
        setError("Failed to fetch user count.");
      } else {
        setError("Failed to fetch dashboard data.");
      }

      // Fetch Monthly Trends
      const trendsResponse = await axios.get(
        `${backendUrl}/api/admin/monthly-trends?${queryParams}`,
        { headers: { token } },
      );
      if (trendsResponse.data.success) {
        setMonthlyTrends(trendsResponse.data.trends);
      }

      // Fetch Daily Trends
      const dailyTrendsResponse = await axios.get(
        `${backendUrl}/api/admin/daily-trends?${queryParams}`,
        { headers: { token } },
      );
      if (dailyTrendsResponse.data.success) {
        setDailyTrends(dailyTrendsResponse.data.trends);
      }

      // Fetch Category Sales
      const categoryResponse = await axios.get(
        `${backendUrl}/api/admin/category-sales?${queryParams}`,
        { headers: { token } },
      );
      if (categoryResponse.data.success) {
        setCategorySales(
          categoryResponse.data.sales.map((item) => ({
            ...item,
            color: categoryColors[item.name] || "#9E9E9E", // Assign colors dynamically or from a map
          })),
        );
      }

      // Fetch Recent Orders
      const ordersResponse = await axios.get(
        `${backendUrl}/api/admin/recent-orders`,
        { headers: { token } },
      );
      if (ordersResponse.data.success) {
        setRecentOrdersList(ordersResponse.data.orders);
      }

      // Fetch SKU Sales
      const skuSalesResponse = await axios.get(
        `${backendUrl}/api/admin/sku-sales?${queryParams}`,
        { headers: { token } },
      );
      if (skuSalesResponse.data.success) {
        setSkuSales(skuSalesResponse.data.skuSales);
      }

      // Fetch SKU Stocks
      const skuStocksResponse = await axios.get(
        `${backendUrl}/api/admin/sku-stocks`,
        { headers: { token } },
      );
      if (skuStocksResponse.data.success) {
        const sortedStocks = [...skuStocksResponse.data.skuStocks].sort((a, b) => a.stock - b.stock);
        setSkuStocks(sortedStocks);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        "Failed to fetch dashboard data. Please check your backend endpoints.",
      );
      // Fallback to sample data on error
      setDashboardStats({
        totalUsers: { value: "1,245", change: "+12.5%", type: "up" },
        totalOrders: { value: "346", change: "+8.2%", type: "up" },
        revenue: { value: "$103,900", change: "+15.3%", type: "up" },
        avgOrderValue: { value: "$300.29", change: "-2.1%", type: "down" },
      });
      setMonthlyTrends([
        { month: "Oct", orders: 45, revenue: 12500, users: 120 },
        { month: "Nov", orders: 52, revenue: 15800, users: 145 },
        { month: "Dec", orders: 48, revenue: 14200, users: 138 },
        { month: "Jan", orders: 61, revenue: 18900, users: 167 },
        { month: "Feb", orders: 72, revenue: 22400, users: 189 },
        { month: "Mar", orders: 68, revenue: 20100, users: 201 },
      ]);
      setDailyTrends([
        { date: "2026-03-01", orders: 5, revenue: 1200, users: 10 },
        { date: "2026-03-02", orders: 8, revenue: 1500, users: 12 },
        { date: "2026-03-03", orders: 4, revenue: 1100, users: 8 },
        { date: "2026-03-04", orders: 12, revenue: 2800, users: 15 },
        { date: "2026-03-05", orders: 9, revenue: 2100, users: 11 },
        { date: "2026-03-06", orders: 15, revenue: 3500, users: 20 },
        { date: "2026-03-07", orders: 11, revenue: 2400, users: 14 },
      ]);
      setCategorySales([
        { name: "Electronics", value: 35, color: "#f9aeaf" },
        { name: "Fashion", value: 28, color: "#e88b8d" },
        { name: "Home & Living", value: 22, color: "#d66a6c" },
        { name: "Beauty", value: 15, color: "#c44a4d" },
      ]);
      setRecentOrdersList([
        {
          id: "#60d5ecb8b3b1c8e1e8e8e8e8",
          skus: "SKU-123, SKU-456",
          amount: 245,
          status: "Completed",
          date: new Date(Date.now() - 2 * 3600000).toLocaleDateString(),
          time: "2 hours ago",
        },
        {
          id: "#60d5ecb8b3b1c8e1e8e8e8e9",
          skus: "SKU-789",
          amount: 189,
          status: "Processing",
          date: new Date(Date.now() - 4 * 3600000).toLocaleDateString(),
          time: "4 hours ago",
        },
        {
          id: "#60d5ecb8b3b1c8e1e8e8e8f0",
          skus: "SKU-111",
          amount: 432,
          status: "Shipped",
          date: new Date(Date.now() - 6 * 3600000).toLocaleDateString(),
          time: "6 hours ago",
        },
        {
          id: "#60d5ecb8b3b1c8e1e8e8e8f1",
          skus: "SKU-222",
          amount: 156,
          status: "Pending",
          date: new Date(Date.now() - 8 * 3600000).toLocaleDateString(),
          time: "8 hours ago",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, timeRange, startDate, endDate]);

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const queryParams = `range=${timeRange}${timeRange === "custom" ? `&startDate=${startDate}&endDate=${endDate}` : ""}`;
      const response = await axios.get(
        `${backendUrl}/api/admin/export-report?${queryParams}`,
        {
          headers: { token },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const downloadName =
        timeRange === "custom"
          ? `Febeul_Report_${startDate}_to_${endDate}.pdf`
          : `Febeul_Report_${timeRange}.pdf`;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert(
        "Failed to export report. Please check if the server is connected to the database.",
      );
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    change,
    changeType,
    gradient,
  }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${gradient}`}
        >
          <Icon className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {value}
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${changeType === "up" ? "text-green-600" : "text-red-600"}`}
          >
            {changeType === "up" ? (
              <FiArrowUp size={14} />
            ) : (
              <FiArrowDown size={14} />
            )}
            <span>{change}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const OrderRow = ({ order }) => {
    const getStatusColor = (status) => {
      const colors = {
        Completed: "text-green-600",
        Processing: "text-yellow-600",
        Shipped: "text-blue-600",
        Pending: "text-gray-600",
      };
      return colors[status] || "text-gray-600";
    };

    const getStatusDotColor = (status) => {
      const colors = {
        Completed: "bg-green-600",
        Processing: "bg-yellow-600",
        Shipped: "bg-blue-600",
        Pending: "bg-gray-600",
      };
      return colors[status] || "bg-gray-600";
    };

    return (
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl items-center text-sm hover:bg-gray-100 transition-all duration-200 hover:translate-x-1">
        <div className="font-semibold text-gray-900 truncate pr-2" title={order.id}>{order.id}</div>
        <div className="text-gray-700 font-mono text-xs truncate" title={order.skus}>{order.skus}</div>
        <div className="font-bold text-gray-900">
          {currency}
          {order.amount?.toFixed(2)}
        </div>
        <div
          className={`flex items-center gap-2 font-semibold ${getStatusColor(order.status)}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${getStatusDotColor(order.status)}`}
          ></span>
          {order.status}
        </div>
        <div className="flex flex-col text-gray-500">
          <span className="text-xs font-medium">
            {(() => {
              try {
                const d = new Date(order.date);
                return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
              } catch (e) {
                return "N/A";
              }
            })()}
          </span>
          <span className="text-[10px] opacity-75">{order.time}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 pb-6 border-b-2 border-gray-200 gap-6">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#f9aeaf] to-[#e88b8d] bg-clip-text text-transparent tracking-tight mb-1">
            Febeul
          </h1>
          <p className="text-gray-600 font-medium">Admin Dashboard</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto">
          {timeRange === "custom" && (
            <div className="flex items-center gap-2 bg-white p-2 border-2 border-gray-200 rounded-xl shadow-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border-none text-sm font-medium text-gray-700 focus:outline-none"
              />
              <span className="text-gray-400 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border-none text-sm font-medium text-gray-700 focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all duration-300 hover:border-[#f9aeaf] hover:text-[#f9aeaf] shadow-sm ${exporting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FaRupeeSign size={18} />
              {exporting ? "Exporting..." : "Export Report"}
            </button>
            <select
              className="px-6 py-3 border-2 border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 cursor-pointer transition-all duration-300 hover:border-[#f9aeaf] focus:outline-none focus:border-[#f9aeaf] focus:ring-4 focus:ring-[#f9aeaf]/20"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
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
          icon={FaRupeeSign}
          title="Revenue"
          value={dashboardStats.revenue.value}
          change={dashboardStats.revenue.change}
          changeType={dashboardStats.revenue.type}
          gradient="bg-gradient-to-br from-[#d66a6c] to-[#c44a4d]"
        />
        <StatCard
          icon={FaRupeeSign}
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
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FiTrendingUp size={120} className="text-[#f9aeaf]" />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-pink-50 rounded-lg">
                  <FaRupeeSign className="text-[#f9aeaf]" size={16} />
                </span>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  Revenue Intelligence
                </h3>
              </div>
              <p className="text-sm text-gray-400 font-semibold tracking-wide uppercase">
                Daily Financial Performance
              </p>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#f9aeaf] to-[#e88b8d] shadow-sm"></div>
                <span className="text-xs font-bold text-gray-500 uppercase">Gross Revenue</span>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 mr-2 uppercase">Today</span>
                <span className="text-lg font-black text-gray-900">
                  {currency}
                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const lastTrend = dailyTrends[dailyTrends.length - 1];
                    return (lastTrend && lastTrend.date === todayStr ? lastTrend.revenue : 0).toLocaleString();
                  })()}
                </span>
              </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f9aeaf" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f9aeaf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                dy={15}
                tickFormatter={(str) => {
                  try {
                    const date = new Date(str);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  } catch (e) { return str; }
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(val) => `${currency}${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip
                cursor={{ stroke: '#f9aeaf', strokeWidth: 2, strokeDasharray: '5 5' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-pink-50 ring-4 ring-pink-50/20">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                          {new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f9aeaf] to-[#e88b8d] flex items-center justify-center shadow-lg shadow-pink-200">
                            <FaRupeeSign className="text-white" size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase leading-none">Revenue</p>
                            <p className="text-xl font-black text-gray-900">
                              {currency}{payload[0].value.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f9aeaf"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Order Trends
            </h3>
            <p className="text-sm text-gray-500 font-medium">Monthly orders</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                stroke="#888"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#888" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="orders" fill="#e88b8d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SKU Sales Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Top Selling SKUs
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Distribution by SKU
            </p>
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
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      [
                        "#f9aeaf",
                        "#e88b8d",
                        "#d66a6c",
                        "#c44a4d",
                        "#b33a3d",
                        "#ffcdd2",
                        "#f8bbd0",
                        "#e1bee7",
                        "#d1c4e9",
                        "#c5cae9",
                      ][index % 10]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value, name) => [value + " Units", `SKU: ${name}`]}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* SKU Stocks List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Stock Levels by SKU
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                Current inventory per variation
              </p>
            </div>
            <div className="bg-pink-50 text-[#f9aeaf] text-[10px] font-black px-3 py-1 rounded-full border border-pink-100 uppercase tracking-widest">
              Live Stock
            </div>
          </div>
          
          <div className="overflow-hidden border border-gray-100 rounded-xl">
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product & Color</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {skuStocks.map((item, index) => (
                    <tr key={index} className="hover:bg-pink-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs group-hover:bg-white border border-transparent group-hover:border-gray-200">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 truncate max-w-[200px]">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-lg font-black text-xs min-w-[45px] text-center ${
                          item.stock <= 5 
                            ? "bg-red-100 text-red-600 animate-pulse" 
                            : item.stock <= 15 
                              ? "bg-yellow-100 text-yellow-600" 
                              : "bg-green-100 text-green-600"
                        }`}>
                          {item.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Recent Orders
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Latest customer transactions
            </p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-[#f9aeaf] to-[#e88b8d] text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            View All Orders
          </button>
        </div>

        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 px-4 pb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div>Order ID</div>
            <div>SKU</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date & Time</div>
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
