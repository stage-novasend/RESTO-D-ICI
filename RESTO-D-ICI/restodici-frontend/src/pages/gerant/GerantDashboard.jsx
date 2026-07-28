/* ═══════════════════════════════════════════════════════════════
   GerantDashboard.jsx — Tableau de bord du gérant de restaurant
   7 onglets : vue d'ensemble, menu, commandes, stocks, finance,
               promotions, paramètres, historique
   Fonctionnalités : WebSocket temps réel, QR Code, carte Leaflet
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import OnboardingWizard from "../../components/wizard/OnboardingWizard";
import MenuTab from "./tabs/MenuTab";
import OrdersTab from "./tabs/OrdersTab";
import StocksTab from "./tabs/StocksTab";
import FinanceTab from "./tabs/FinanceTab";
import PromosTab from "./tabs/PromosTab";
import SettingsTab from "./tabs/SettingsTab";
import HistoryTab from "./tabs/HistoryTab";
import OverviewTab from "./tabs/OverviewTab";

/* Orchestrateur — délègue à chaque onglet (voir ./tabs/) */
export default function GerantDashboard({ restaurantId, token }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";
  const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = cachedUser?.user || cachedUser;
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const tabContentRef = useRef(null);
  useEffect(() => {
    const syncDarkMode = () => setDarkMode(localStorage.getItem("darkMode") === "true");
    window.addEventListener("storage", syncDarkMode);
    window.addEventListener("gerant-dark-mode-changed", syncDarkMode);
    return () => {
      window.removeEventListener("storage", syncDarkMode);
      window.removeEventListener("gerant-dark-mode-changed", syncDarkMode);
    };
  }, []);

  useEffect(() => {
    const el = tabContentRef.current;
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // force reflow
    el.style.animation = 'fadeUp 0.22s ease both';
  }, [activeTab]);


  const renderTabContent = () => {
    switch (activeTab) {
      case "menu":
        return <MenuTab restaurantId={restaurantId} token={token} />;
      case "orders":
        return <OrdersTab restaurantId={restaurantId} />;
      case "stocks":
        return <StocksTab restaurantId={restaurantId} />;
      case "finance":
        return <FinanceTab restaurantId={restaurantId} />;
      case "promos":
        return <PromosTab restaurantId={restaurantId} />;
      case "settings":
        return <SettingsTab restaurantId={restaurantId} user={user} />;
      case "history":
        return <HistoryTab restaurantId={restaurantId} />;
      case "overview":
      default:
        return <OverviewTab restaurantId={restaurantId} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto" style={{ position: 'relative' }}>
      <OnboardingWizard />
      <div
        className={`rounded-3xl p-6 shadow-sm ${
          darkMode
            ? "border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
            : "bg-white border border-[rgba(0,0,0,0.05)]"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            ref={tabContentRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}