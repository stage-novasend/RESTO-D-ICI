/* ═══════════════════════════════════════════════════════════════
   ServeurPage.jsx — Interface de prise de commande en salle
   Premium dark cockpit — même langage visuel que StaffDashboard
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import {
  Search, Plus, Minus, Send, ChevronDown, Users,
  UtensilsCrossed, Clock, CheckCircle, X,
  ChefHat, ShoppingCart, Receipt, Zap, RefreshCw,
  LayoutGrid, MapPin, Timer, Utensils,
} from 'lucide-react';
import { menuAPI, commandesService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getArticleImage } from '../../utils/articleImage';

/* ── Design system — miroir StaffDashboard (couleurs : theme/colors.js) ── */
import {
  BG, BLACK_SOFT as SIDEBAR_BG, SURFACE, SURFACE_ELEVATED, BORDER, TEXT,
  MUTED_WARM as TEXT_MUTED, TEXT_MUTED as TEXT_LIGHT,
  ORANGE, ORANGE_DARK, BORDER_WARM as ORANGE_GLOW, ORANGE_CREAM_2 as ORANGE_LIGHT,
  GREEN_DARK as GREEN, GREEN_MINT as GREEN_BG, GREEN_BORDER,
  RED_STRONG as DANGER, BLUE_BRIGHT as BLUE,
} from '../../theme/colors';
const SHADOW           = '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)';
const SHADOW_MD        = '0 4px 16px rgba(0,0,0,0.10)';
const ORANGE_GRADIENT  = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';

// Tables initialisées depuis localStorage, extensibles sans limite

const STATUS_META = {
  RECUE:        { bg: '#dbeafe', color: '#1d4ed8', label: 'Reçue'       },
  CONFIRMEE:    { bg: '#ede9fe', color: '#6d28d9', label: 'Confirmée'   },
  EN_PREP:      { bg: '#fef3c7', color: '#b45309', label: 'En prép.'    },
  PRETE:        { bg: '#d1fae5', color: '#065f46', label: 'Prête'       },
  EN_LIVRAISON: { bg: '#fce7f3', color: '#9d174d', label: 'Livraison'   },
};

function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }

/* ── Live clock hook ── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ── Carte article ─────────────────────────────────────────────── */
function ArticleCard({ art, qty, onAdd, onRemove }) {
  const dispo = art.disponible !== false;

  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 16,
        overflow: 'hidden',
        border: !dispo ? `2px solid #FCA5A5` : qty > 0 ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
        boxShadow: !dispo
          ? `0 0 0 3px rgba(220,38,38,0.08), ${SHADOW}`
          : qty > 0
            ? `0 4px 20px ${ORANGE_GLOW}, 0 0 0 1px rgba(255,140,0,0.08)`
            : SHADOW,
        opacity: dispo ? 1 : 0.75,
        position: 'relative',
        transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.15s',
        cursor: dispo ? 'default' : 'not-allowed',
      }}
      onMouseEnter={e => {
        if (dispo) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = qty > 0
            ? `0 8px 28px rgba(255,140,0,0.22), 0 0 0 1px rgba(255,140,0,0.12)`
            : SHADOW_MD;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = qty > 0
          ? `0 4px 20px ${ORANGE_GLOW}, 0 0 0 1px rgba(255,140,0,0.08)`
          : SHADOW;
      }}
    >
      {/* Image zone */}
      <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', background: '#F1F5F9', flexShrink: 0 }}>
        <img
          src={getArticleImage(art, { width: 320, quality: 75 })}
          alt={art.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
        />

        {/* Overlay rupture — signal fort pour le gérant */}
        {!dispo && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, backdropFilter: 'blur(3px)' }}>
            <span style={{ fontSize: 22 }}>⛔</span>
            <span style={{ background: '#fff', color: DANGER, fontSize: 11, fontWeight: 900, padding: '4px 14px', borderRadius: 99, letterSpacing: '0.08em', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>RUPTURE</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>À réapprovisionner</span>
          </div>
        )}

        {/* Badge quantité */}
        {qty > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: ORANGE, color: '#fff', fontSize: 11, fontWeight: 900, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: '2px solid #fff' }}>
            {qty}
          </div>
        )}

        {/* Catégorie badge */}
        {(art.categorie?.nom || art.categorieNom) && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, backdropFilter: 'blur(4px)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {art.categorie?.nom || art.categorieNom}
          </div>
        )}
      </div>

      {/* Info + contrôles */}
      <div style={{ padding: '11px 12px 12px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {art.nom}
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 900, color: ORANGE, letterSpacing: '-0.01em' }}>
          {fmt(art.prix)} <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_LIGHT }}>FCFA</span>
        </p>

        {dispo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: qty > 0 ? 'space-between' : 'flex-end' }}>
            {qty > 0 && (
              <>
                <button
                  onClick={() => onRemove(art)}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${BORDER}`, background: SURFACE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURFACE_ELEVATED)}
                  onMouseLeave={e => (e.currentTarget.style.background = SURFACE)}
                >
                  <Minus size={12} color={TEXT} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 900, color: TEXT, minWidth: 18, textAlign: 'center' }}>{qty}</span>
              </>
            )}
            <button
              onClick={() => onAdd(art)}
              style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: ORANGE_GRADIENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px rgba(255,140,0,0.28)`, transition: 'transform 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Plus size={13} color="#fff" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ServeurPage — Page principale
   ══════════════════════════════════════════════════════════════════ */
export default function ServeurPage() {
  const { user } = useAuth();
  const restaurantId = [user?.restaurant?.id, user?.restaurantId].find(id => id && id.length > 10) || '';

  const [articles,   setArticles]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('Tous');
  const [cart,       setCart]       = useState({});
  const [table,      setTable]      = useState(1);
  const [couverts,   setCouverts]   = useState(2);
  const [sending,    setSending]    = useState(false);
  const [myOrders,   setMyOrders]   = useState([]);
  const [toast,      setToast]      = useState(null);
  const [tableCount, setTableCount] = useState(() => {
    try { return Math.max(1, parseInt(localStorage.getItem('resto_table_count') || '20', 10) || 20); }
    catch { return 20; }
  });

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
  const updateTableCount = (n) => {
    const count = Math.max(1, n);
    setTableCount(count);
    try { localStorage.setItem('resto_table_count', String(count)); } catch {}
  };

  const now = useClock();

  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const params = { cible: 'TOUS', ...(restaurantId ? { restaurantId } : {}) };
        const [mr, cr] = await Promise.all([
          menuAPI.get(params),
          menuAPI.getCategories({ restaurantId }).catch(() => ({ data: [] })),
        ]);
        setArticles(mr.data || []);
        setCategories(cr.data || []);
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [restaurantId]);

  const refreshOrders = () => {
    commandesService.getKDS()
      .then(r => setMyOrders((r.data || []).filter(o => !['LIVREE', 'ANNULEE'].includes(o.statut)).slice(0, 8)))
      .catch(() => {});
  };
  useEffect(() => { refreshOrders(); }, []);

  const allCats = ['Tous', ...categories.map(c => c.nom)];

  const shown = articles.filter(a => {
    const matchSearch = !search || a.nom.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'Tous' || a.categorie?.nom === catFilter || a.categorieNom === catFilter;
    return matchSearch && matchCat;
  });

  const addToCart    = art => setCart(p => ({ ...p, [art.id]: { art, qty: (p[art.id]?.qty || 0) + 1 } }));
  const removeFromCart = art => setCart(p => {
    const qty = (p[art.id]?.qty || 0) - 1;
    if (qty <= 0) { const n = { ...p }; delete n[art.id]; return n; }
    return { ...p, [art.id]: { ...p[art.id], qty } };
  });

  const entries    = Object.values(cart);
  const subtotal   = entries.reduce((s, e) => s + Number(e.art.prix || 0) * e.qty, 0);
  const tva        = Math.round(subtotal - subtotal / 1.18);
  const totalItems = entries.reduce((s, e) => s + e.qty, 0);

  const handleSend = async () => {
    if (entries.length === 0) return;
    setSending(true);
    try {
      await commandesService.create({
        restaurantId,
        lignes: entries.map(e => ({ articleId: e.art.id, quantite: e.qty })),
        modeLivraison: 'SUR_PLACE',
        tableNumber: String(table),
      });
      setCart({});
      showToast(true, `Commande envoyée en cuisine ! Table ${String(table).padStart(2, '0')}`);
      refreshOrders();
    } catch (e) {
      showToast(false, e?.response?.data?.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  /* Calcul occupation tables depuis myOrders */
  const occupiedTables = new Set(
    myOrders.map(o => o.tableNumero).filter(Boolean).map(Number)
  );

  /* Initiales staff */
  const initials = user
    ? `${(user.prenom || user.firstName || '')[0] || ''}${(user.nom || user.lastName || '')[0] || ''}`.toUpperCase() || 'S'
    : 'S';

  /* Formatage date/heure */
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const tablesLibres   = tables.filter(t => !occupiedTables.has(t)).length;
  const tablesOccupees = tables.length - tablesLibres;
  const ruptureItems   = articles.filter(a => a.disponible === false);

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"Inter", system-ui, -apple-system, sans-serif', position: 'relative' }}>
      <style>{`
        @keyframes slide-in  { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fade-in   { from { opacity:0; } to { opacity:1; } }
        @keyframes spin      { to   { transform:rotate(360deg); } }
        @keyframes rupture-pulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          animation: 'slide-in 0.25s ease',
          background: SURFACE,
          border: `1px solid ${toast.ok ? GREEN_BORDER : '#FCA5A5'}`,
          borderRadius: 14,
          padding: '13px 18px',
          fontSize: 13, fontWeight: 700,
          color: toast.ok ? '#065F46' : '#991B1B',
          boxShadow: SHADOW_MD,
          display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340,
        }}>
          {toast.ok
            ? <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0 }} />
            : <X size={16} color={DANGER} style={{ flexShrink: 0 }} />
          }
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════
          MAIN CONTENT
         ══════════════════════════════════ */}
      <div style={{ padding: '20px 20px 40px' }}>

        {/* ══════════════════════════════════
            PLAN DE SALLE
           ══════════════════════════════════ */}
        <div style={{ background: SURFACE, borderRadius: 20, overflow: 'hidden', boxShadow: SHADOW_MD, marginBottom: 20, border: `1px solid ${BORDER}` }}>
          {/* Header bande sombre */}
          <div style={{ background: SIDEBAR_BG, padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, borderTop: `3px solid ${ORANGE}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: ORANGE_GLOW, border: `1px solid rgba(255,140,0,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutGrid size={14} color={ORANGE} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.01em' }}>Plan de salle</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: GREEN_BG, color: GREEN, padding: '3px 10px', borderRadius: 99, border: `1px solid ${GREEN_BORDER}` }}>
                {tablesLibres} libre{tablesLibres !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, background: ORANGE_LIGHT, color: ORANGE_DARK, padding: '3px 10px', borderRadius: 99, border: `1px solid rgba(255,140,0,0.25)` }}>
                {tablesOccupees} occupée{tablesOccupees !== 1 ? 's' : ''}
              </span>
              {/* Contrôle nombre de tables */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '3px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <button onClick={() => updateTableCount(tableCount - 5)}
                  style={{ width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', minWidth: 52, textAlign: 'center', letterSpacing: '0.02em' }}>{tableCount} tables</span>
                <button onClick={() => updateTableCount(tableCount + 5)}
                  style={{ width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
              </div>
            </div>
          </div>

          {/* Grille tables — colonnes auto-adaptées, sans limite fixe */}
          <div style={{ padding: '16px 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
            {tables.map(t => {
              const isSelected  = t === table;
              const isOccupied  = occupiedTables.has(t);
              const orderForTable = myOrders.find(o => Number(o.tableNumero) === t);

              let bg     = SURFACE_ELEVATED;
              let border = `1px solid ${BORDER}`;
              let numColor = TEXT;
              let labelColor = TEXT_MUTED;

              if (isSelected) {
                bg = ORANGE_GRADIENT;
                border = `2px solid ${ORANGE_DARK}`;
                numColor = '#fff';
                labelColor = 'rgba(255,255,255,0.85)';
              } else if (isOccupied) {
                bg = ORANGE_LIGHT;
                border = `1px solid rgba(255,140,0,0.25)`;
                numColor = ORANGE_DARK;
                labelColor = ORANGE;
              }

              return (
                <button
                  key={t}
                  onClick={() => setTable(t)}
                  style={{
                    position: 'relative',
                    background: bg,
                    border,
                    borderRadius: 12,
                    padding: '10px 6px 9px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    boxShadow: isSelected ? `0 4px 14px rgba(255,140,0,0.3)` : SHADOW,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = SHADOW_MD;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = isSelected ? `0 4px 14px rgba(255,140,0,0.3)` : SHADOW;
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isSelected ? 'rgba(255,255,255,0.9)' : isOccupied ? ORANGE : GREEN,
                    marginBottom: 2,
                    boxShadow: isOccupied && !isSelected ? `0 0 6px ${ORANGE}55` : undefined,
                  }} />

                  {/* Numéro */}
                  <span style={{ fontSize: 15, fontWeight: 900, color: numColor, lineHeight: 1, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {String(t).padStart(2, '0')}
                  </span>

                  {/* Pax si occupé */}
                  {isOccupied && orderForTable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Users size={8} color={isSelected ? 'rgba(255,255,255,0.8)' : ORANGE} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? 'rgba(255,255,255,0.85)' : ORANGE, lineHeight: 1 }}>
                        {orderForTable.couvertsCount || '?'}
                      </span>
                    </div>
                  )}

                  {/* Label */}
                  <span style={{ fontSize: 9, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>
                    {isOccupied ? 'Occupée' : 'Libre'}
                  </span>

                  {/* Checkmark si sélectionné */}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                      <CheckCircle size={12} color={ORANGE} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════
            ZONE DE TRAVAIL — 2 colonnes
           ══════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

          {/* ── PANNEAU MENU ── */}
          <div>

            {/* Barre recherche */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '11px 16px', marginBottom: 12, boxShadow: SHADOW, transition: 'border-color 0.15s' }}
              onClick={() => document.getElementById('search-serveur')?.focus()}
            >
              <Search size={15} color={TEXT_MUTED} style={{ flexShrink: 0 }} />
              <input
                id="search-serveur"
                type="text"
                placeholder="Rechercher un plat…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: TEXT, background: 'transparent', fontFamily: 'inherit', fontWeight: 500 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: SURFACE_ELEVATED, border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <X size={10} color={TEXT_MUTED} />
                </button>
              )}
            </div>

            {/* Chips catégories */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {allCats.map(c => {
                const active = c === catFilter;
                return (
                  <button
                    key={c}
                    onClick={() => setCatFilter(c)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 99,
                      border: active ? 'none' : `1px solid ${BORDER}`,
                      background: active ? ORANGE_GRADIENT : SURFACE,
                      color: active ? '#fff' : TEXT_MUTED,
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: active ? `0 3px 12px rgba(255,140,0,0.25)` : SHADOW,
                      transform: active ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.14s',
                      flexShrink: 0,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Compteur résultats */}
            {!loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
                  {shown.length} article{shown.length !== 1 ? 's' : ''}
                  {search && ` pour "${search}"`}
                  {catFilter !== 'Tous' && ` · ${catFilter}`}
                </p>
                {totalItems > 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: ORANGE, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ShoppingCart size={12} />
                    {totalItems} article{totalItems > 1 ? 's' : ''} au panier
                  </p>
                )}
              </div>
            )}

            {/* Banner rupture — alerte gérant */}
            {ruptureItems.length > 0 && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 12, background: '#FFF1F2', border: '1px solid #FCA5A5', borderLeft: `4px solid ${DANGER}`, borderRadius: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: DANGER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13 }}>⚠</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#991B1B' }}>
                    {ruptureItems.length} article{ruptureItems.length > 1 ? 's' : ''} en rupture
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#B91C1C', fontWeight: 500 }}>
                    {ruptureItems.slice(0, 3).map(a => a.nom).join(', ')}{ruptureItems.length > 3 ? ` +${ruptureItems.length - 3}` : ''} — à signaler au gérant
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: DANGER, color: '#fff', padding: '3px 8px', borderRadius: 99, animation: 'rupture-pulse 1.8s ease-in-out infinite', flexShrink: 0 }}>RUPTURE</span>
              </div>
            )}

            {/* Grille articles */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: 40, height: 40, border: `4px solid ${ORANGE_GLOW}`, borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 14, color: TEXT_MUTED, fontWeight: 600, margin: 0 }}>Chargement du menu…</p>
              </div>
            ) : shown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <ChefHat size={24} color={ORANGE} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Aucun article trouvé</p>
                <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>Essayez une autre recherche ou catégorie.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
                {shown.map(a => (
                  <ArticleCard key={a.id} art={a} qty={cart[a.id]?.qty || 0} onAdd={addToCart} onRemove={removeFromCart} />
                ))}
              </div>
            )}
          </div>

          {/* ── PANNEAU PANIER (sticky) ── */}
          <div style={{ position: 'sticky', top: 20 }}>

            {/* Cart card */}
            <div style={{
              background: SURFACE,
              borderRadius: 24,
              overflow: 'hidden',
              border: entries.length > 0 ? `1.5px solid rgba(255,140,0,0.22)` : `1px solid ${BORDER}`,
              boxShadow: entries.length > 0 ? `0 8px 32px ${ORANGE_GLOW}` : SHADOW_MD,
            }}>
              {/* En-tête panier */}
              <div style={{ background: entries.length > 0 ? ORANGE_GRADIENT : SIDEBAR_BG, padding: '16px 18px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Receipt size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Commande en cours</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                      Table {String(table).padStart(2, '0')} · {couverts} couvert{couverts > 1 ? 's' : ''}
                    </p>
                  </div>
                  {entries.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 99, padding: '3px 11px', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {totalItems}
                    </div>
                  )}
                </div>

                {/* Couverts inline row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 12px', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <Users size={13} color="rgba(255,255,255,0.7)" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', flex: 1 }}>Couverts</span>
                  <button
                    onClick={() => setCouverts(v => Math.max(1, v - 1))}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Minus size={10} color="#fff" />
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', minWidth: 20, textAlign: 'center' }}>{couverts}</span>
                  <button
                    onClick={() => setCouverts(v => v + 1)}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.28)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Plus size={10} color="#fff" />
                  </button>
                </div>
              </div>

              {/* Lignes panier */}
              <div style={{ padding: '12px 14px', minHeight: 80, maxHeight: 300, overflowY: 'auto' }}>
                {entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: SURFACE_ELEVATED, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <ShoppingCart size={20} color={TEXT_LIGHT} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_LIGHT, margin: '0 0 4px' }}>Panier vide</p>
                    <p style={{ fontSize: 11, color: TEXT_LIGHT, margin: 0 }}>Ajoutez des articles depuis le menu.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entries.map(e => (
                      <div
                        key={e.art.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: SURFACE_ELEVATED, borderRadius: 14, border: `1px solid ${BORDER}` }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', overflow: 'hidden', flexShrink: 0 }}>
                          <img
                            src={getArticleImage(e.art, { width: 80, quality: 70 })}
                            alt={e.art.nom}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.art.nom}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE, fontWeight: 800 }}>
                            {fmt(e.art.prix * e.qty)} FCFA
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <button
                            onClick={() => removeFromCart(e.art)}
                            style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${BORDER}`, background: SURFACE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={10} color={TEXT} />
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 900, color: TEXT, minWidth: 16, textAlign: 'center' }}>{e.qty}</span>
                          <button
                            onClick={() => addToCart(e.art)}
                            style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: ORANGE_GRADIENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px rgba(255,140,0,0.22)` }}
                          >
                            <Plus size={10} color="#fff" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totaux */}
              <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${BORDER}`, background: SURFACE_ELEVATED }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>Sous-total HT</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{fmt(subtotal - tva)} FCFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>TVA 18%</span>
                  <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{fmt(tva)} FCFA</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px',
                  background: entries.length > 0 ? ORANGE_LIGHT : SURFACE,
                  borderRadius: 12,
                  border: `1px solid ${entries.length > 0 ? 'rgba(255,140,0,0.2)' : BORDER}`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Total TTC</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: entries.length > 0 ? ORANGE : TEXT_MUTED, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {fmt(subtotal)} <span style={{ fontSize: 11, fontWeight: 600 }}>FCFA</span>
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div style={{ padding: '0 14px 16px' }}>
                <button
                  onClick={handleSend}
                  disabled={entries.length === 0 || sending}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    background: entries.length === 0 ? SURFACE_ELEVATED : ORANGE_GRADIENT,
                    color: entries.length === 0 ? TEXT_LIGHT : '#fff',
                    fontSize: 14, fontWeight: 800,
                    cursor: entries.length === 0 || sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    boxShadow: entries.length > 0 ? `0 6px 22px rgba(255,140,0,0.32)` : 'none',
                    transition: 'all 0.15s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {sending ? (
                    <>
                      <div style={{ width: 15, height: 15, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Envoyer en Cuisine
                    </>
                  )}
                </button>
                {entries.length > 0 && (
                  <button
                    onClick={() => setCart({})}
                    style={{ width: '100%', marginTop: 7, padding: '9px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'color 0.14s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
                    onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}
                  >
                    Vider le panier
                  </button>
                )}
              </div>
            </div>

            {/* ── Tables en cours ── */}
            {myOrders.length > 0 && (
              <div style={{ marginTop: 14, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden', boxShadow: SHADOW }}>
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={12} color={ORANGE} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: TEXT }}>Tables en cours</p>
                  <span style={{ marginLeft: 'auto', background: ORANGE, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                    {myOrders.length}
                  </span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {myOrders.map(o => {
                    const meta = STATUS_META[o.statut] || { bg: '#F3F4F6', color: TEXT_MUTED, label: o.statut };
                    const isPrete = o.statut === 'PRETE';
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 11,
                          background: isPrete ? GREEN_BG : SURFACE_ELEVATED,
                          border: isPrete ? `1px solid ${GREEN_BORDER}` : `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isPrete
                            ? <Zap size={12} color={GREEN} />
                            : <ChefHat size={12} color={TEXT_MUTED} />
                          }
                          <span style={{ fontSize: 12, fontWeight: 700, color: isPrete ? GREEN : TEXT }}>
                            {o.tableNumero ? `Table ${String(o.tableNumero).padStart(2, '0')}` : `#${o.numero || o.id?.slice(0, 5)}`}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, padding: '2px 9px', borderRadius: 99 }}>
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
