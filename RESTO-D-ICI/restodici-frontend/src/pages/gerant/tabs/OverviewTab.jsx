/* OverviewTab — extrait de GerantDashboard */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { Activity, AlertTriangle, ChefHat, ClipboardList, CreditCard, Download, History, Package, PieChart, RefreshCcw, Tag, TrendingUp, Users, Wallet } from "lucide-react";
import NotificationBell from "../../../components/notifications/NotificationBell";
import { b2bAPI, commandesService, restaurantAPI, staffAPI, stocksAPI, tresorerieAPI } from "../../../services/api";
import { createCommandesSocket } from "../../../services/commandes.service";
import { STATUS_COLORS, STATUS_LABELS, formatDate, formatFCFA } from "../../../utils/formatters";
import { computeWeeklyPerformance, downloadAndOpenBlob } from "../_helpers";
import SetupBanner from "./SetupBanner";

export default function OverviewTab({ restaurantId }) {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [restaurantProfile, setRestaurantProfile] = useState(() => {
    const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return cachedUser?.restaurant || {};
  });
  const restaurantName = restaurantProfile?.nom || "votre restaurant";
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    lowStockItems: 0,
    uniqueCustomers: 0,
    staffCount: 0,
    b2bOrders: 0,
  });
  const [financialHighlights, setFinancialHighlights] = useState({
    ticketMoyen: 0,
    nbCommandes: 0,
    margesBrutes: 0,
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState({
    labels: [],
    orders: [],
    revenue: [],
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [clockTs, setClockTs] = useState(0);

  const loadOverviewData = useCallback(
    async ({ silent = false } = {}) => {
      if (!restaurantId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [ordersRes, alertsRes, financeRes, staffRes, b2bRes] =
        await Promise.allSettled([
          commandesService.getAll({ restaurantId, limit: 50 }),
          stocksAPI.getAlerts({ restaurantId }),
          tresorerieAPI.getStats("day"),
          staffAPI.getStaffAccounts(restaurantId),
          b2bAPI.getManagerOrders(),
        ]);

      const clientOrders =
        ordersRes.status === "fulfilled"
          ? (ordersRes.value.data || []).map((order) => ({
              ...order,
              source: "Client",
              amount: Number(order.montantTotal ?? order.total ?? 0),
            }))
          : [];

      const b2bOrders =
        b2bRes.status === "fulfilled"
          ? (b2bRes.value.data || []).map((order) => ({
              ...order,
              source: order.source || "Entreprise",
              amount: Number(order.total ?? order.montantTotal ?? 0),
            }))
          : [];

      const mergedOrders = [...clientOrders, ...b2bOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = mergedOrders.filter(
        (order) => new Date(order.createdAt).getTime() >= startOfToday.getTime(),
      );

      const todayRevenueDerived = todayOrders.reduce(
        (sum, order) => sum + (Number.isFinite(order.amount) ? order.amount : 0),
        0,
      );

      const activeOrders = mergedOrders.filter(
        (order) => !["LIVREE", "ANNULEE"].includes(order.statut),
      ).length;

      const financeData =
        financeRes.status === "fulfilled" ? financeRes.value.data || {} : {};
      const alerts = alertsRes.status === "fulfilled" ? alertsRes.value.data || [] : [];
      const staffAccounts =
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [];

      setRecentOrders(mergedOrders.slice(0, 6));
      setWeeklyPerformance(computeWeeklyPerformance(mergedOrders));
      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: Number(financeData.caJour ?? todayRevenueDerived),
        activeOrders,
        lowStockItems: alerts.length,
        uniqueCustomers: new Set(
          clientOrders.map((order) => order.client?.id).filter(Boolean),
        ).size,
        staffCount: staffAccounts.length,
        b2bOrders: b2bOrders.length,
      });
      setFinancialHighlights({
        ticketMoyen: Number(
          financeData.ticketMoyen ??
            (todayOrders.length > 0 ? todayRevenueDerived / todayOrders.length : 0),
        ),
        nbCommandes: Number(financeData.nbCommandes ?? todayOrders.length),
        margesBrutes: Number(financeData.margesBrutes ?? 0),
      });
      setLastRefresh(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      if (
        ordersRes.status !== "fulfilled" &&
        b2bRes.status !== "fulfilled" &&
        financeRes.status !== "fulfilled"
      ) {
        setError("Impossible de synchroniser les données du dashboard gérant.");
      }

      setLoading(false);
      setRefreshing(false);
    },
    [restaurantId],
  );

  useEffect(() => {
    const syncRestaurantProfile = async () => {
      try {
        const profileRes = await restaurantAPI.getMine();
        const profile = profileRes.data || {};
        setRestaurantProfile(profile);
        const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cachedUser,
            restaurant: {
              ...(cachedUser.restaurant || {}),
              ...profile,
            },
          }),
        );
      } catch (error) {
        console.error("Erreur chargement profil overview:", error);
      }
    };

    void syncRestaurantProfile();
    void loadOverviewData();
    const interval = setInterval(() => {
      void loadOverviewData({ silent: true });
    }, 30000);

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = createCommandesSocket(currentUser);

    const handleDashboardUpdate = () => {
      void loadOverviewData({ silent: true });
    };

    socket.on('commande.nouvelle', handleDashboardUpdate);
    socket.on('commande.statut', handleDashboardUpdate);
    socket.on('commande.paiement', handleDashboardUpdate);
    socket.on('commande.b2b.nouvelle', handleDashboardUpdate);
    socket.on('commande.b2b.statut', handleDashboardUpdate);
    socket.on('restaurant.profile.updated', handleDashboardUpdate);

    const handleRestaurantUpdate = (event) => {
      setRestaurantProfile(event.detail || {});
    };
    window.addEventListener('gerant-restaurant-updated', handleRestaurantUpdate);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('gerant-restaurant-updated', handleRestaurantUpdate);
    };
  }, [loadOverviewData]);

  useEffect(() => {
    setClockTs(new Date().getTime());
    const interval = setInterval(() => {
      setClockTs(new Date().getTime());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: weeklyPerformance.labels,
        datasets: [
          {
            label: "Commandes",
            data: weeklyPerformance.orders,
            backgroundColor: weeklyPerformance.orders.map((_, i) =>
              i === weeklyPerformance.orders.indexOf(Math.max(...weeklyPerformance.orders))
                ? "#EA580C"
                : "rgba(224,78,26,0.18)"
            ),
            borderRadius: 8,
            borderSkipped: false,
            yAxisID: "y",
          },
          {
            label: "Revenus (FCFA)",
            data: weeklyPerformance.revenue,
            type: "line",
            borderColor: "#EA580C",
            backgroundColor: "rgba(197,138,85,0.08)",
            fill: true,
            tension: 0.42,
            pointRadius: 5,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#EA580C",
            pointBorderWidth: 2,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#A89070", font: { size: 11, weight: '600' } },
            border: { display: false },
          },
          y: {
            position: "left",
            ticks: { color: "#A89070", font: { size: 11 }, stepSize: 1 },
            grid: { color: "rgba(148,163,184,0.1)" },
            border: { display: false },
          },
          y1: {
            position: "right",
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: {
              color: "#EA580C",
              font: { size: 10 },
              callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v),
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: "#475569",
              font: { size: 11, weight: '600' },
              boxWidth: 12,
              boxHeight: 12,
              borderRadius: 4,
              usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: "#1A0C00",
            titleColor: "#FDF5EF",
            bodyColor: "#CBD5E1",
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) =>
                ctx.dataset.label === "Revenus (FCFA)"
                  ? `  ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()} F`
                  : `  ${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
          },
        },
      },
    });

    return () => chartInstanceRef.current?.destroy();
  }, [weeklyPerformance]);

  const handleExportPDF = async () => {
    try {
      if (!recentOrders[0]?.id) {
        throw new Error("Aucune commande disponible pour l'export PDF.");
      }

      const order = recentOrders[0];
      const response = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      downloadAndOpenBlob(blob, `recu-commande-${order?.numero || "today"}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
      alert("Erreur lors de la génération du reçu PDF. Veuillez réessayer.");
    }
  };

  const handleExportSyscohada = async () => {
    try {
      // Télécharge le CSV SYSCOHADA natif (format comptable Sage/Ciel/DGI-CI)
      const response = await tresorerieAPI.exportSyscohada("monthly");
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      downloadAndOpenBlob(blob, `SYSCOHADA-monthly-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error("Erreur export SYSCOHADA:", error);
      alert("Erreur lors de l'export SYSCOHADA. Veuillez réessayer.");
    }
  };

  const weekOrdersTotal = weeklyPerformance.orders.reduce(
    (sum, value) => sum + value,
    0,
  );
  const weekRevenueTotal = weeklyPerformance.revenue.reduce(
    (sum, value) => sum + value,
    0,
  );

  const getOrderAgeTone = (order) => {
    const ageMinutes = Math.floor(
      (clockTs - new Date(order.createdAt).getTime()) / 60000,
    );

    if (ageMinutes >= 20) {
      return {
        badge: "bg-red-100 text-red-700",
        label: `${ageMinutes} min`,
      };
    }

    if (ageMinutes >= 10) {
      return {
        badge: "bg-amber-100 text-amber-700",
        label: `${ageMinutes} min`,
      };
    }

    return {
      badge: "bg-[#FFF0DF] text-[#1A1A1A]",
      label: `${Math.max(ageMinutes, 0)} min`,
    };
  };

  const getOrderStatusClasses = (status) =>
    STATUS_COLORS[status] || "bg-[#FFF0DF] text-slate-700";

  const getOrderStatusLabel = (status) =>
    STATUS_LABELS[status] || status?.replace(/_/g, " ") || "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-10 w-10 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A0C00]">{restaurantName}</h2>
          <p className="mt-0.5 text-sm text-[#8B6E50]">Pilotez votre restaurant en temps réel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#FFF0DF] bg-white p-1">
            <NotificationBell accentColor="#EA580C" />
          </div>
          <button
            onClick={() => void loadOverviewData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FFF0DF] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#EA580C]/40 hover:text-[#EA580C]"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Sync…" : "Actualiser"}
          </button>
          <button
            onClick={() => navigate("/gerant?tab=orders")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FFF0DF] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#EA580C]/40 hover:text-[#EA580C]"
          >
            <ClipboardList className="h-4 w-4" /> Commandes
          </button>
          <button
            onClick={() => navigate("/gerant/kds")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#EA580C]/25 transition hover:bg-[#C2410C]"
          >
            <ChefHat className="h-4 w-4" /> KDS live
          </button>
        </div>
      </div>

      {/* ── Setup completion banner ── */}
      <SetupBanner restaurant={restaurantProfile} navigate={navigate} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 — primary dark (CA du jour) */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: '#EA580C' }}>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20" style={{ background: '#EA580C', filter: 'blur(28px)' }} />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">CA du jour</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(224,78,26,0.25)' }}>
                <TrendingUp className="h-4 w-4 text-[#EA580C]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white leading-none">{formatFCFA(stats.todayRevenue)}</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                ↑ {stats.todayOrders}
              </span>
              <span className="text-xs text-white/40">commandes aujourd'hui</span>
            </div>
          </div>
        </div>

        {/* Card 2 — commandes actives */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6E50]">En cuisine</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
              <ClipboardList className="h-4 w-4 text-[#EA580C]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#1A0C00] leading-none">{stats.activeOrders}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#EA580C]">
              {stats.b2bOrders} B2B
            </span>
            <span className="text-xs text-[#8B6E50]">commandes actives</span>
          </div>
        </div>

        {/* Card 3 — alertes stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6E50]">Alertes stock</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${stats.lowStockItems > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <AlertTriangle className={`h-4 w-4 ${stats.lowStockItems > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#1A0C00] leading-none">{stats.lowStockItems}</p>
          <div className="mt-3">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stats.lowStockItems > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {stats.lowStockItems === 0 ? '✓ Tout est OK' : `${stats.lowStockItems} seuil${stats.lowStockItems > 1 ? 's' : ''} critique${stats.lowStockItems > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Card 4 — équipe */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6E50]">Équipe</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-4 w-4 text-[#EA580C]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#1A0C00] leading-none">{stats.staffCount}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-[#EA580C]">
              {stats.uniqueCustomers} clients
            </span>
            <span className="text-xs text-[#8B6E50]">uniques</span>
          </div>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

        {/* Chart — BIG */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#1A0C00]">Analyse des performances</h3>
              <p className="mt-0.5 text-xs text-[#8B6E50]">Commandes & revenus sur 7 jours</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#8B6E50] uppercase tracking-wider">Commandes</p>
                <p className="mt-0.5 text-xl font-bold text-[#EA580C]">{weekOrdersTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#8B6E50] uppercase tracking-wider">Revenus</p>
                <p className="mt-0.5 text-xl font-bold text-[#EA580C]">{formatFCFA(weekRevenueTotal)}</p>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <canvas ref={chartRef} style={{ height: '260px', width: '100%' }} />
          </div>
        </section>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Indicateurs clés */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-[#1A0C00]">Indicateurs clés</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50 to-white px-4 py-3 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                    <CreditCard className="h-4 w-4 text-[#EA580C]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Ticket moyen</span>
                </div>
                <span className="text-base font-bold text-[#1A0C00]">{formatFCFA(financialHighlights.ticketMoyen)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-white px-4 py-3 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <PieChart className="h-4 w-4 text-[#EA580C]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Marge brute</span>
                </div>
                <span className="text-base font-bold text-[#1A0C00]">{financialHighlights.margesBrutes}%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Clients uniques</span>
                </div>
                <span className="text-base font-bold text-[#1A0C00]">{stats.uniqueCustomers}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 border border-sky-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
                    <Activity className="h-4 w-4 text-sky-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Commandes semaine</span>
                </div>
                <span className="text-base font-bold text-[#1A0C00]">{weekOrdersTotal}</span>
              </div>
            </div>
          </section>

          {/* Accès rapides */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-[#1A0C00]">Accès rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Package, label: "Menu", path: "/gerant?tab=menu", color: '#EA580C' },
                { icon: ClipboardList, label: "Commandes", path: "/gerant?tab=orders", color: '#EA580C' },
                { icon: AlertTriangle, label: "Stocks", path: "/gerant?tab=stocks", color: '#EA580C' },
                { icon: Wallet, label: "Trésorerie", path: "/gerant?tab=finance", color: '#EA580C' },
                { icon: Tag, label: "Promos", path: "/gerant?tab=promos", color: '#EA580C' },
                { icon: Users, label: "Équipe", path: "/gerant?tab=settings", color: '#8B6E50' },
                { icon: ChefHat, label: "KDS live", path: "/gerant/kds", color: '#EA580C' },
                { icon: History, label: "Historique", path: "/gerant?tab=history", color: '#6366F1' },
              ].map(({ icon: Icon, label, path, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Recent orders ── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#1A0C00]">Commandes récentes</h3>
            <p className="mt-0.5 text-xs text-[#8B6E50]">Client + entreprise · {recentOrders.length} dernières</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={recentOrders.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFF0DF] bg-white px-3 py-2 text-xs font-medium text-[#8B6E50] transition hover:bg-[#FFF0DF] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={handleExportSyscohada}
              disabled={!restaurantId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA580C] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> SYSCOHADA
            </button>
          </div>
        </div>

        {recentOrders.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {recentOrders.map((order) => {
              const ageTone = getOrderAgeTone(order);
              return (
                <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0DF] text-[11px] font-bold text-[#EA580C]">
                      #{(order.numero ?? '').toString().slice(-3)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusClasses(order.statut)}`}>
                          {getOrderStatusLabel(order.statut)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ageTone.badge}`}>
                          {ageTone.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#8B6E50]">{order.source} · {formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#1A0C00]">{formatFCFA(order.amount)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#FFF0DF] bg-white py-10 text-center text-sm text-[#8B6E50]">
            Aucune commande récente
          </div>
        )}
      </section>
    </div>
  );
}



/* ═══ GerantDashboard — Composant principal ═══ */
