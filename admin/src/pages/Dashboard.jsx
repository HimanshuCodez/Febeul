import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { backendUrl, currency } from "../App"; // Import backendUrl and currency
import { useNavigate } from "react-router-dom";
import DashboardOverview from "../components/DashboardOverview";

const FebeulDashboard = ({ token }) => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  // Read once at component scope — the redirect guard below and
  // fetchDashboardData both need to know what this account can reach.
  const permissions = useMemo(() => JSON.parse(localStorage.getItem('permissions') || '[]'), []);
  const canListAllUsers = role === "admin" || permissions.includes('/allusers');

  useEffect(() => {
    if (role !== "admin" && !permissions.includes('/')) {
      navigate("/list");
    }
  }, [role, permissions, navigate]);

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userCountScope, setUserCountScope] = useState('period');
  const [stockAvailable, setStockAvailable] = useState(false);

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
    if (isCurrency) return currency + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return value.toLocaleString('en-IN');
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = `range=${timeRange}${timeRange === "custom" ? `&startDate=${startDate}&endDate=${endDate}` : ""}`;

      // These 7 all sit behind the same '/' (Dashboard) permission
      // (middleware/adminAuth.js), so anyone who can render this page at all
      // can reach every one of them — a single Promise.all is safe here.
      // '/api/user/allusers' is NOT in this batch: it needs the separate
      // '/allusers' permission, and a staff account scoped to Dashboard-only
      // doesn't have it. It used to be bundled into the same Promise.all,
      // so its 403 rejected the whole batch and silently replaced every
      // real number on this page — stats, charts, recent orders, all of it
      // — with hardcoded sample data (even the fallback below that already
      // knew how to cope with a missing user count could never be reached).
      const [
        statsResponse,
        trendsResponse,
        dailyTrendsResponse,
        categoryResponse,
        ordersResponse,
        skuSalesResponse,
        skuStocksResponse,
      ] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/dashboard-stats?${queryParams}`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/monthly-trends?${queryParams}`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/daily-trends?${queryParams}`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/category-sales?${queryParams}`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/recent-orders`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/sku-sales?${queryParams}`, { headers: { token } }),
        axios.get(`${backendUrl}/api/admin/sku-stocks`, { headers: { token } }),
      ]);

      if (statsResponse.data.success) {
        const stats = statsResponse.data.stats;

        // All-time registered user count needs '/allusers' — only ask for
        // it when this account actually has that permission, and never let
        // its failure take the rest of the page down with it. Without it,
        // fall back to the dashboard-stats endpoint's own totalUsers (new
        // signups within the selected date range) — a real number, just a
        // differently-scoped one, instead of fabricated data.
        let totalUsersValue = stats.totalUsers;
        let nextUserCountScope = 'period';
        if (canListAllUsers) {
          try {
            const usersResponse = await axios.get(`${backendUrl}/api/user/allusers`, { headers: { token } });
            if (usersResponse.data.success) {
              totalUsersValue = usersResponse.data.users.length;
              nextUserCountScope = 'all';
            }
          } catch (usersErr) {
            console.error("Error fetching all-users count:", usersErr);
            setError("Showing new signups for this period — couldn't load the all-time user count.");
          }
        }

        setUserCountScope(nextUserCountScope);
        setDashboardStats({
          totalUsers: {
            value: formatValue(totalUsersValue),
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
      } else {
        setError("Failed to fetch dashboard data.");
      }

      if (trendsResponse.data.success) {
        setMonthlyTrends(trendsResponse.data.trends);
      }

      if (dailyTrendsResponse.data.success) {
        setDailyTrends(dailyTrendsResponse.data.trends);
      }

      if (categoryResponse.data.success) {
        setCategorySales(
          categoryResponse.data.sales.map((item) => ({
            ...item,
            color: categoryColors[item.name] || "#9E9E9E", // Assign colors dynamically or from a map
          })),
        );
      }

      if (ordersResponse.data.success) {
        setRecentOrdersList(ordersResponse.data.orders);
      }

      if (skuSalesResponse.data.success) {
        setSkuSales(skuSalesResponse.data.skuSales);
      }

      setStockAvailable(Boolean(skuStocksResponse.data.success));
      if (skuStocksResponse.data.success) {
        const sortedStocks = [...skuStocksResponse.data.skuStocks].sort((a, b) => a.stock - b.stock);
        setSkuStocks(sortedStocks);
      } else {
        setSkuStocks([]);
      }
      if ([statsResponse, trendsResponse, dailyTrendsResponse, categoryResponse, ordersResponse, skuSalesResponse, skuStocksResponse].every(response => response.data.success)) {
        setLastUpdated(new Date());
      } else {
        setError('Some dashboard data could not be updated. Refresh to try again.');
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        "Dashboard data couldn't be loaded. Refresh to try again.",
      );
      // No fake numbers here: showing fabricated revenue/order figures when
      // the backend is genuinely unreachable is worse than showing nothing
      // — an admin could easily mistake sample data for a real, if bad, day.
      setDashboardStats({
        totalUsers: { value: "—", change: "0%", type: "up" },
        totalOrders: { value: "—", change: "0%", type: "up" },
        revenue: { value: "—", change: "0%", type: "up" },
        avgOrderValue: { value: "—", change: "0%", type: "up" },
      });
      setMonthlyTrends([]);
      setDailyTrends([]);
      setCategorySales([]);
      setRecentOrdersList([]);
      setSkuSales([]);
      setSkuStocks([]);
      setStockAvailable(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, timeRange, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return recentOrdersList;
    return recentOrdersList.filter(
      (order) =>
        order.id?.toLowerCase().includes(q) ||
        order.skus?.toLowerCase().includes(q) ||
        order.status?.toLowerCase().includes(q),
    );
  }, [recentOrdersList, orderSearch]);

  const filteredStocks = useMemo(() => {
    if (!lowStockOnly) return skuStocks;
    return skuStocks.filter((item) => item.stock <= 15);
  }, [skuStocks, lowStockOnly]);

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

  return (
    <DashboardOverview
      token={token} role={role} permissions={permissions}
      timeRange={timeRange} setTimeRange={setTimeRange}
      startDate={startDate} setStartDate={setStartDate}
      endDate={endDate} setEndDate={setEndDate}
      loading={loading} initialLoading={initialLoading} exporting={exporting}
      error={error} dismissError={() => setError(null)}
      lastUpdated={lastUpdated} userCountScope={userCountScope}
      dashboardStats={dashboardStats} monthlyTrends={monthlyTrends}
      dailyTrends={dailyTrends} categorySales={categorySales} skuSales={skuSales}
      skuStocks={skuStocks} filteredStocks={filteredStocks} stockAvailable={stockAvailable}
      recentOrdersList={recentOrdersList} filteredOrders={filteredOrders}
      orderSearch={orderSearch} setOrderSearch={setOrderSearch}
      lowStockOnly={lowStockOnly} setLowStockOnly={setLowStockOnly}
      refresh={fetchDashboardData} exportReport={handleExport}
    />
  );
};

export default FebeulDashboard;
