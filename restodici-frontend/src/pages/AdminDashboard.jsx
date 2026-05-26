// src/pages/AdminDashboard.jsx — Dashboard Gérant Complet (US-09, US-10, US-21, US-26 à US-30, US-37)
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { menuService } from '../services/menu.service';
import { commandesService } from '../services/commandes.service';
import { useAuth } from '../hooks/useAuth';
import {
  LogOut, UtensilsCrossed, AlertTriangle, CheckCircle, FolderTree, Loader2,
  TrendingUp, DollarSign, Package, Clock, Settings, Bell, Users, BarChart3,
  Plus, Edit2, Trash2, Eye, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  MapPin, Calendar, Download, Filter, Search, RefreshCw
} from 'lucide-react';

// Palette "Savane Moderne" — Conforme CDC §10
const COLORS = {
  bg: 'bg-white',
  text: 'text-[#0F172A]',
  textMuted: 'text-[#737373]',
  primary: 'text-[#C05015]',
  primaryBg: 'bg-[#C05015]',
  primaryHover: 'hover:bg-[#9A3E10]',
  success: 'text-[#2ECC71]',
  successBg: 'bg-[#2ECC71]',
  card: 'bg-white',
  border: 'border-[#E2E8F0]',
};

// Statuts de commande (RG-10)
const ORDER_STATUS = {
  RECUE: { label: 'Reçue', color: 'bg-blue-100 text-blue-700' },
  CONFIRMEE: { label: 'Confirmée', color: 'bg-indigo-100 text-indigo-700' },
  EN_PREP: { label: 'En préparation', color: 'bg-orange-100 text-orange-700' },
  PRETE: { label: 'Prête', color: 'bg-yellow-100 text-yellow-700' },
  EN_LIVRAISON: { label: 'En livraison', color: 'bg-purple-100 text-purple-700' },
  LIVREE: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  ANNULEE: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

// Onglets du dashboard
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'menu', label: '🍽️ Menu', icon: UtensilsCrossed },
  { id: 'orders', label: '📋 Commandes', icon: Package },
  { id: 'stocks', label: '📦 Stocks', icon: AlertTriangle },
  { id: 'finance', label: '💰 Trésorerie', icon: DollarSign },
  { id: 'settings', label: '⚙️ Paramètres', icon: Settings },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Données dashboard
  const [stats, setStats] = useState({
    caJour: 0, caSemaine: 0, caMois: 0,
    commandesJour: 0, ticketMoyen: 0, margeBrute: 0,
    articlesTotal: 0, articlesDispo: 0, articlesRupture: 0,
    alertesStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [articles, setArticles] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [restaurantConfig, setRestaurantConfig] = useState({
    nom: '', horaires: {}, zonesLivraison: [], actif: true,
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Sync tab avec l'URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/menu')) setActiveTab('menu');
    else if (path.includes('/admin/commandes')) setActiveTab('orders');
    else if (path.includes('/admin/stocks')) setActiveTab('stocks');
    else if (path.includes('/admin/finance')) setActiveTab('finance');
    else if (path.includes('/admin/parametres')) setActiveTab('settings');
    else setActiveTab('overview');
  }, [location.pathname]);

  // Chargement initial des données (US-26, US-09, US-21)
  useEffect(() => {
    if (!user?.restaurant?.id) return;
    
    const fetchData = async () => {
      try {
        // KPIs Trésorerie (US-26)
        const [menuRes, ordersRes] = await Promise.all([
          menuService.getMenu(null, 'TOUS', user.restaurant.id),
          commandesService.getRecentOrders(user.restaurant.id),
        ]);
        
        const articlesData = menuRes;
        const ordersData = ordersRes;
        
        // Calcul stats
        const today = new Date().toDateString();
        const todayOrders = ordersData.filter(o => new Date(o.createdAt).toDateString() === today);
        const caJour = todayOrders.reduce((sum, o) => sum + Number(o.montantTotal), 0);
        const ticketMoyen = todayOrders.length > 0 ? caJour / todayOrders.length : 0;
        
        setStats({
          caJour,
          caSemaine: ordersData.filter(o => {
            const d = new Date(o.createdAt);
            const now = new Date();
            const diffDays = (now - d) / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
          }).reduce((sum, o) => sum + Number(o.montantTotal), 0),
          caMois: ordersData.reduce((sum, o) => sum + Number(o.montantTotal), 0),
          commandesJour: todayOrders.length,
          ticketMoyen: Math.round(ticketMoyen),
          margeBrute: 65, // Mock — à calculer via US-29
          articlesTotal: articlesData.length,
          articlesDispo: articlesData.filter(a => a.disponible).length,
          articlesRupture: articlesData.filter(a => !a.disponible).length,
          alertesStock: articlesData.filter(a => a.stock <= (a.seuilMin || 5)).length,
        });
        
        setArticles(articlesData);
        setRecentOrders(ordersData.slice(0, 5));
        setStockAlerts(articlesData.filter(a => a.stock <= (a.seuilMin || 5)).slice(0, 5));
        
        // Config restaurant (US-37)
        setRestaurantConfig({
          nom: user.restaurant.nom,
          horaires: { lun: '08:00-22:00', mar: '08:00-22:00', mer: '08:00-22:00', jeu: '08:00-22:00', ven: '08:00-23:00', sam: '09:00-23:00', dim: '10:00-21:00' },
          zonesLivraison: ['Cocody', 'Plateau', 'Yopougon', 'Marcory'],
          actif: true,
        });
        
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Toggle disponibilité article (US-09, RG-02)
  const handleToggleArticle = async (id, currentStatus, articleName) => {
    try {
      await menuService.toggleArticle(id, !currentStatus, user.restaurant.id);
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, disponible: !currentStatus } : a
      ));
      // Feedback visuel
      showNotification(`"${articleName}" ${!currentStatus ? 'activé' : 'masqué'}`, 'success');
    } catch (err) {
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  // Mise à jour statut commande (RG-10)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await commandesService.updateStatus(orderId, newStatus);
      setRecentOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, statut: newStatus } : o
      ));
      showNotification('Statut mis à jour', 'success');
    } catch (err) {
      showNotification('Erreur: ' + err.response?.data?.message, 'error');
    }
  };

  // Notification toast simple
  const showNotification = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 text-sm font-medium animate-fade-in ${
      type === 'success' ? 'bg-[#2ECC71] text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-[#0F172A] text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Logout
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-[#C05015] animate-spin" />
      </div>
    );
  }

  // ========== RENDER PRINCIPAL ==========
  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text}`}>
      
      {/* ===== HEADER ===== */}
      <header className={`${COLORS.card} shadow-sm ${COLORS.border} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${COLORS.primaryBg} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
              R
            </div>
            <div>
              <h1 className="text-xl font-bold">Resto d'ici — Espace Gérant</h1>
              <p className={`text-xs ${COLORS.textMuted}`}>{restaurantConfig.nom} • {user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-white rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {stats.alertesStock > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.alertesStock}
                </span>
              )}
            </button>
            
            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#E2E8F0] rounded-full flex items-center justify-center text-sm font-medium">
                {user?.nom?.charAt(0) || 'G'}
              </div>
              <button onClick={handleLogout} className={`p-2 hover:bg-white rounded-lg transition-colors ${COLORS.textMuted} hover:${COLORS.primary}`}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== NAVIGATION TABS ===== */}
      <nav className={`${COLORS.card} ${COLORS.border} border-b sticky top-16 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive 
                      ? `${COLORS.primaryBg} text-white shadow-sm` 
                      : `${COLORS.textMuted} hover:${COLORS.text} hover:bg-white`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* ===== ONGLET: VUE D'ENSEMBLE ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards (US-26) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                icon={<DollarSign className={`w-5 h-5 ${COLORS.primary}`} />}
                label="CA Aujourd'hui"
                value={`${stats.caJour.toLocaleString()} FCFA`}
                trend="+12%"
                color="bg-[#FBE8DC]"
              />
              <KPICard 
                icon={<Package className="w-5 h-5 text-blue-600" />}
                label="Commandes Jour"
                value={stats.commandesJour}
                trend="+3"
                color="bg-blue-50"
              />
              <KPICard 
                icon={<TrendingUp className="w-5 h-5 text-[#2ECC71]" />}
                label="Marge Brute"
                value={`${stats.margeBrute}%`}
                trend="Stable"
                color="bg-[#E6F7ED]"
              />
              <KPICard 
                icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                label="Alertes Stock"
                value={stats.alertesStock}
                trend={stats.alertesStock > 0 ? 'Action requise' : 'OK'}
                color="bg-orange-50"
                alert={stats.alertesStock > 0}
              />
            </div>

            {/* Graphique CA simplifié */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Évolution du CA (7 derniers jours)</h3>
                <select className={`text-sm ${COLORS.textMuted} bg-transparent border-none focus:ring-0`}>
                  <option>Cette semaine</option>
                  <option>Ce mois</option>
                  <option>Ce trimestre</option>
                </select>
              </div>
              <div className="h-48 flex items-end gap-2">
                {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className={`w-full ${COLORS.primaryBg} rounded-t-lg transition-all hover:opacity-90`}
                      style={{ height: `${h}%` }}
                    />
                    <span className={`text-xs ${COLORS.textMuted}`}>
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commandes récentes + Alertes stock */}
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Commandes récentes */}
              <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h3 className="font-bold">Commandes récentes</h3>
                  <Link to="/admin/commandes" className={`text-sm ${COLORS.primary} font-medium hover:underline`}>
                    Voir tout →
                  </Link>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {recentOrders.map(order => (
                    <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-white">
                      <div>
                        <p className="font-medium">#{order.numero}</p>
                        <p className={`text-sm ${COLORS.textMuted}`}>
                          {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' • '}{order.modeLivraison?.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#C05015]">{Number(order.montantTotal).toLocaleString()} FCFA</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS[order.statut]?.color}`}>
                          {ORDER_STATUS[order.statut]?.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertes stock (US-21) */}
              <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border overflow-hidden`}>
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Alertes stock (RG-22)
                  </h3>
                  <Link to="/admin/stocks" className={`text-sm ${COLORS.primary} font-medium hover:underline`}>
                    Gérer →
                  </Link>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {stockAlerts.length > 0 ? stockAlerts.map(article => (
                    <div key={article.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FBE8DC] overflow-hidden">
                          {article.photoUrl ? (
                            <img src={article.photoUrl} alt={article.nom} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{article.nom}</p>
                          <p className={`text-sm ${COLORS.textMuted}`}>
                            Stock: <span className="font-bold text-orange-500">{article.stock}</span> / Seuil: {article.seuilMin || 5}
                          </p>
                        </div>
                      </div>
                      <button className={`px-3 py-1 text-xs font-medium rounded-lg ${COLORS.primaryBg} text-white hover:opacity-90`}>
                        Réapprovisionner
                      </button>
                    </div>
                  )) : (
                    <div className="px-6 py-8 text-center text-[#737373]">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#2ECC71]" />
                      <p>Tous les stocks sont au-dessus des seuils</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ===== ONGLET: MENU (US-09, US-10) ===== */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            
            {/* Header actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Gestion du Menu</h2>
                <p className={`text-sm ${COLORS.textMuted}`}>Activez/désactivez des articles, gérez les catégories</p>
              </div>
              <div className="flex gap-2">
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${COLORS.border} hover:bg-white transition-colors`}>
                  <Filter className="w-4 h-4" /> Filtres
                </button>
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${COLORS.primaryBg} text-white hover:opacity-90 transition-colors`}>
                  <Plus className="w-4 h-4" /> Nouvel article
                </button>
              </div>
            </div>

            {/* Liste articles */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border overflow-hidden`}>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-white text-xs font-medium uppercase tracking-wider text-[#737373]">
                <div className="col-span-5">Article</div>
                <div className="col-span-2">Catégorie</div>
                <div className="col-span-2">Prix</div>
                <div className="col-span-2">Stock</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              
              {/* Articles */}
              <div className="divide-y divide-[#E2E8F0]">
                {articles.map(article => (
                  <div key={article.id} className="px-6 py-4 hover:bg-white transition-colors">
                    <div className="flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center">
                      
                      {/* Article info */}
                      <div className="col-span-5 flex items-center gap-4 mb-3 md:mb-0">
                        <div className="w-14 h-14 rounded-xl bg-[#FBE8DC] overflow-hidden flex-shrink-0 border border-[#E2E8F0]">
                          {article.photoUrl ? (
                            <img src={article.photoUrl} alt={article.nom} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{article.nom}</h3>
                          <p className={`text-sm ${COLORS.textMuted} truncate`}>{article.description}</p>
                        </div>
                      </div>
                      
                      {/* Category */}
                      <div className="col-span-2 text-sm">
                        <span className="px-2 py-1 rounded-full bg-[#F3E8FF] text-[#7C3AED] text-xs font-medium">
                          {article.categorie?.icone} {article.categorie?.nom}
                        </span>
                      </div>
                      
                      {/* Price */}
                      <div className="col-span-2 font-bold text-[#C05015]">
                        {Number(article.prix).toLocaleString()} FCFA
                      </div>
                      
                      {/* Stock */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            article.stock <= (article.seuilMin || 5) ? 'text-orange-500' : 'text-[#2ECC71]'
                          }`}>
                            {article.stock}
                          </span>
                          {article.stock <= (article.seuilMin || 5) && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Toggle + Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        {/* Toggle disponibilité (US-09, RG-02) */}
                        <button
                          onClick={() => handleToggleArticle(article.id, article.disponible, article.nom)}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2ECC71] ${
                            article.disponible ? 'bg-[#2ECC71]' : 'bg-gray-300'
                          }`}
                          aria-label={`Basculer disponibilité ${article.nom}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center ${
                            article.disponible ? 'translate-x-5' : 'translate-x-0'
                          }`}>
                            {article.disponible ? (
                              <ToggleRight className="w-3 h-3 text-[#2ECC71]" />
                            ) : (
                              <ToggleLeft className="w-3 h-3 text-[#9A7060]" />
                            )}
                          </span>
                        </button>
                        
                        {/* Menu actions */}
                        <div className="relative group">
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-white flex items-center gap-2">
                              <Eye className="w-4 h-4" /> Voir
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-white flex items-center gap-2">
                              <Edit2 className="w-4 h-4" /> Modifier
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" /> Désactiver
                            </button>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ONGLET: COMMANDES ===== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Suivi des Commandes</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A7060]" />
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    className="pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#C05015]"
                  />
                </div>
                <button className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-white">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Liste commandes */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white text-xs font-medium uppercase tracking-wider text-[#737373]">
                    <tr>
                      <th className="px-6 py-3 text-left">Commande</th>
                      <th className="px-6 py-3 text-left">Client</th>
                      <th className="px-6 py-3 text-left">Mode</th>
                      <th className="px-6 py-3 text-left">Montant</th>
                      <th className="px-6 py-3 text-left">Statut</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-white">
                        <td className="px-6 py-4">
                          <p className="font-medium">#{order.numero}</p>
                          <p className={`text-xs ${COLORS.textMuted}`}>
                            {new Date(order.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm">{order.client?.nom || 'Client'}</p>
                          <p className={`text-xs ${COLORS.textMuted}`}>{order.client?.telephone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{order.modeLivraison?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#C05015]">
                          {Number(order.montantTotal).toLocaleString()} FCFA
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={order.statut}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-none font-medium cursor-pointer ${ORDER_STATUS[order.statut]?.color}`}
                          >
                            {Object.entries(ORDER_STATUS).map(([key, val]) => (
                              <option key={key} value={key}>{val.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className={`text-sm ${COLORS.primary} font-medium hover:underline`}>
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== ONGLET: STOCKS (US-19 à US-25) ===== */}
        {activeTab === 'stocks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Gestion des Stocks</h2>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${COLORS.primaryBg} text-white hover:opacity-90`}>
                <Plus className="w-4 h-4" /> Nouvelle entrée
              </button>
            </div>

            {/* Alertes seuil (RG-22, US-21) */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Alertes de seuil minimum (RG-23)
              </h3>
              <div className="space-y-3">
                {stockAlerts.map(article => (
                  <div key={article.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#FBE8DC] overflow-hidden">
                        {article.photoUrl ? (
                          <img src={article.photoUrl} alt={article.nom} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{article.nom}</p>
                        <p className="text-sm text-orange-700">
                          Stock actuel: <span className="font-bold">{article.stock}</span> • Seuil: {article.seuilMin || 5}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-sm bg-white border border-orange-300 rounded-lg hover:bg-orange-50">
                        Voir détails
                      </button>
                      <button className="px-3 py-1.5 text-sm bg-[#C05015] text-white rounded-lg hover:opacity-90">
                        Commander
                      </button>
                    </div>
                  </div>
                ))}
                {stockAlerts.length === 0 && (
                  <p className="text-center text-[#737373] py-4">Aucune alerte — tous les stocks sont OK ✅</p>
                )}
              </div>
            </div>

            {/* Tableau stocks */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border overflow-hidden`}>
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h3 className="font-bold">Inventaire en temps réel (US-20)</h3>
              </div>
              <table className="w-full">
                <thead className="bg-white text-xs font-medium uppercase tracking-wider text-[#737373]">
                  <tr>
                    <th className="px-6 py-3 text-left">Article</th>
                    <th className="px-6 py-3 text-left">Stock Actuel</th>
                    <th className="px-6 py-3 text-left">Seuil Min</th>
                    <th className="px-6 py-3 text-left">Coût Unitaire</th>
                    <th className="px-6 py-3 text-left">Valeur Stock</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {articles.map(article => (
                    <tr key={article.id} className="hover:bg-white">
                      <td className="px-6 py-4">
                        <p className="font-medium">{article.nom}</p>
                        <p className={`text-xs ${COLORS.textMuted}`}>{article.categorie?.nom}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${
                          article.stock <= (article.seuilMin || 5) ? 'text-orange-500' : 'text-[#2ECC71]'
                        }`}>
                          {article.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{article.seuilMin || 5}</td>
                      <td className="px-6 py-4 text-sm">
                        {article.coutUnitaire?.toLocaleString() || '-'} FCFA
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {((article.coutUnitaire || 0) * article.stock).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className={`text-sm ${COLORS.primary} font-medium hover:underline`}>
                          Ajuster
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ONGLET: TRÉSORERIE (US-26 à US-32) ===== */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            
            {/* KPIs financiers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                icon={<DollarSign className="w-5 h-5 text-[#2ECC71]" />}
                label="CA Ce Mois"
                value={`${stats.caMois.toLocaleString()} FCFA`}
                trend="+18% vs N-1"
                color="bg-[#E6F7ED]"
              />
              <KPICard 
                icon={<TrendingUp className="w-5 h-5 text-[#C05015]" />}
                label="Marge Brute"
                value={`${stats.margeBrute}%`}
                trend="Objectif: 70%"
                color="bg-[#FBE8DC]"
              />
              <KPICard 
                icon={<Package className="w-5 h-5 text-blue-600" />}
                label="Ticket Moyen"
                value={`${stats.ticketMoyen.toLocaleString()} FCFA`}
                trend="+250 FCFA"
                color="bg-blue-50"
              />
              <KPICard 
                icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                label="Dépenses Mois"
                value="1.2M FCFA"
                trend="80% du budget"
                color="bg-purple-50"
              />
            </div>

            {/* Graphique répartition paiements */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <h3 className="font-bold mb-4">Répartition des recettes par mode de paiement (US-27)</h3>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  {[
                    { label: 'Orange Money', value: 45, color: 'bg-orange-500' },
                    { label: 'MTN MoMo', value: 30, color: 'bg-yellow-500' },
                    { label: 'Wave', value: 15, color: 'bg-blue-500' },
                    { label: 'Espèces', value: 10, color: 'bg-white0' },
                  ].map(mode => (
                    <div key={mode.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{mode.label}</span>
                        <span className="font-medium">{mode.value}%</span>
                      </div>
                      <div className="h-2 bg-[#FBE8DC] rounded-full overflow-hidden">
                        <div className={`h-full ${mode.color} rounded-full`} style={{ width: `${mode.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-8 border-[#C05015] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">45%</p>
                      <p className={`text-xs ${COLORS.textMuted}`}>Orange Money</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions financières */}
            <div className="grid md:grid-cols-2 gap-4">
              <button className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6 text-left hover:shadow-md transition-all`}>
                <div className="flex items-center gap-3 mb-3">
                  <Download className={`w-5 h-5 ${COLORS.primary}`} />
                  <h4 className="font-bold">Export Comptable (US-32)</h4>
                </div>
                <p className={`text-sm ${COLORS.textMuted} mb-4`}>
                  Export CSV/Excel format SYSCOHADA pour votre expert-comptable
                </p>
                <span className={`text-sm ${COLORS.primary} font-medium`}>Générer l'export →</span>
              </button>
              
              <button className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6 text-left hover:shadow-md transition-all`}>
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className={`w-5 h-5 ${COLORS.primary}`} />
                  <h4 className="font-bold">Rapport Mensuel (US-30)</h4>
                </div>
                <p className={`text-sm ${COLORS.textMuted} mb-4`}>
                  P&L complet : recettes, dépenses, bénéfice net, TVA
                </p>
                <span className={`text-sm ${COLORS.primary} font-medium`}>Voir le rapport →</span>
              </button>
            </div>

          </div>
        )}

        {/* ===== ONGLET: PARAMÈTRES (US-37) ===== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            
            {/* Horaires d'ouverture */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horaires d'ouverture (US-37)
              </h3>
              <div className="space-y-3">
                {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(day => (
                  <div key={day} className="flex items-center justify-between py-2">
                    <span className="font-medium capitalize">{day === 'dim' ? 'Dimanche' : day === 'sam' ? 'Samedi' : day}</span>
                    <input 
                      type="text" 
                      value={restaurantConfig.horaires[day]}
                      onChange={(e) => setRestaurantConfig(prev => ({
                        ...prev,
                        horaires: { ...prev.horaires, [day]: e.target.value }
                      }))}
                      className="w-32 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#C05015]"
                      placeholder="08:00-22:00"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Zones de livraison */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Zones de livraison (US-37, RG-09)
              </h3>
              <div className="space-y-3">
                {restaurantConfig.zonesLivraison.map((zone, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input 
                      type="text" 
                      value={zone}
                      onChange={(e) => {
                        const newZones = [...restaurantConfig.zonesLivraison];
                        newZones[idx] = e.target.value;
                        setRestaurantConfig(prev => ({ ...prev, zonesLivraison: newZones }));
                      }}
                      className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#C05015]"
                    />
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button className={`text-sm ${COLORS.primary} font-medium flex items-center gap-2 hover:underline`}>
                  <Plus className="w-4 h-4" /> Ajouter une zone
                </button>
              </div>
            </div>

            {/* Statut restaurant */}
            <div className={`${COLORS.card} rounded-2xl ${COLORS.border} border p-6`}>
              <h3 className="font-bold mb-4">Statut du restaurant</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Restaurant actif</p>
                  <p className={`text-sm ${COLORS.textMuted}`}>
                    Les clients peuvent passer commande
                  </p>
                </div>
                <button
                  onClick={() => setRestaurantConfig(prev => ({ ...prev, actif: !prev.actif }))}
                  className={`relative w-12 h-7 rounded-full transition-all ${
                    restaurantConfig.actif ? 'bg-[#2ECC71]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    restaurantConfig.actif ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Bouton sauvegarde */}
            <div className="flex justify-end">
              <button className={`px-6 py-3 ${COLORS.primaryBg} text-white font-semibold rounded-xl hover:opacity-90 transition-colors`}>
                Enregistrer les modifications
              </button>
            </div>

          </div>
        )}

      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Confirmer la déconnexion ?</h3>
            <p className="mb-6 text-sm text-[#737373]">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-medium text-[#0F172A] transition hover:bg-white"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Composant réutilisable : KPI Card =====
function KPICard({ icon, label, value, trend, color, alert = false }) {
  return (
    <div className={`${color} rounded-2xl p-5 border border-white/50 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-white rounded-xl shadow-sm">{icon}</div>
        {alert && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
            Action
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-[#737373] font-medium mt-1">{label}</p>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${
            trend.includes('+') || trend === 'OK' || trend === 'Stable' ? 'text-[#2ECC71]' : 'text-orange-500'
          }`}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}