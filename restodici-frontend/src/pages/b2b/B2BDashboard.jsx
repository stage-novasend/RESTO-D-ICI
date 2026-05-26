// src/pages/b2b/B2BDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Package, FileText, Users, TrendingUp, Clock,
  AlertCircle, ShoppingBag, ChefHat, User,
  Shield, Plus, X, Send, BarChart2, RefreshCw,
  Download, Wallet, TrendingDown, CheckCircle, ArrowRight
} from 'lucide-react';
import { b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { createCommandesSocket, commandesService } from '../../services/commandes.service';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import { formatFCFA } from '../../utils/formatters';

// ── Cache helpers ─────────────────────────────────────────────────────────────
function b2bCacheKey(userId) { return userId ? `b2b_data:${userId}` : 'b2b_data'; }
function loadB2BCache(userId) {
  try {
    const raw = localStorage.getItem(b2bCacheKey(userId));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < 10 * 60 * 1000) return data;
  } catch { /* ignore */ }
  return null;
}
function saveB2BCache(userId, data) {
  try { localStorage.setItem(b2bCacheKey(userId), JSON.stringify({ data, ts: Date.now() })); }
  catch { /* ignore */ }
}

const B2B_STATUS = {
  EN_ATTENTE:     { label: 'En attente',     bg: '#FFFBEB', color: '#D97706' },
  RECUE:          { label: 'Reçue',          bg: '#FFFBEB', color: '#D97706' },
  CONFIRMEE:      { label: 'Confirmée',      bg: '#F0FDF4', color: '#16A34A' },
  EN_PREP:        { label: 'En préparation', bg: '#FFFBEB', color: '#B45309' },
  EN_PREPARATION: { label: 'En préparation', bg: '#FFFBEB', color: '#D97706' },
  PRETE:          { label: 'Prête',          bg: '#F0FDF4', color: '#15803D' },
  EN_LIVRAISON:   { label: 'En livraison',   bg: '#FFFBEB', color: '#D97706' },
  LIVREE:         { label: 'Livrée ✓',       bg: '#F0FDF4', color: '#15803D' },
  ANNULEE:        { label: 'Annulée',        bg: '#FFF1F2', color: '#E11D48' },
};

const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };

function currentMonthYear() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Initials avatar
function Avatar({ name = '', size = 28, color = '#D97706' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
      border: '2px solid #fff', flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

// Avatar stack for order rows
function AvatarStack({ names = [], max = 3 }) {
  const shown = names.slice(0, max);
  const extra = names.length - max;
  const colors = ['#D97706', '#16A34A', '#2563EB', '#9333EA', '#DB2777'];
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}>
          <Avatar name={n} size={26} color={colors[i % colors.length]} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -8, width: 26, height: 26, borderRadius: '50%',
          background: '#F3F4F6', border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#6B7280',
        }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// Active order row (matches screenshot style)
function ActiveOrderRow({ order, collaborateurs }) {
  const statusKey = order.statut ?? order.status;
  const status = B2B_STATUS[statusKey] || { label: statusKey, bg: '#F3F4F6', color: '#6B7280' };
  const isActive = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'EN_ATTENTE'].includes(statusKey);
  const collabNames = (order.collaborateurs || collaborateurs.slice(0, 3)).map(c => c.nom || c.name || '');
  const mode = MODE_LABELS[order.modeLivraison] || order.modeLivraison || 'Livraison';
  const restaurant = order.restaurant?.nom || order.restaurantNom || 'Restaurant';
  const time = order.dateLivraison
    ? new Date(order.dateLivraison).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : order.heureLivraison || '';
  const minutesLeft = order.dateLivraison
    ? Math.max(0, Math.round((new Date(order.dateLivraison) - Date.now()) / 60000))
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px', borderBottom: '1px solid #F9FAFB',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ShoppingBag style={{ width: 18, height: 18, color: '#6B7280' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.titre || order.numero || `CMD-${order.id?.slice(0, 6)}`}
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {restaurant} · {mode}{time ? ` ${time}` : ''}
        </p>
      </div>
      <AvatarStack names={collabNames} max={3} />
      <div style={{ flexShrink: 0 }}>
        {isActive && minutesLeft !== null && minutesLeft < 60 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: '#D97706',
            background: '#FFFBEB', padding: '3px 8px', borderRadius: 99,
          }}>
            <Clock style={{ width: 10, height: 10 }} />
            Clôture dans {minutesLeft} min
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: status.color, background: status.bg,
            padding: '3px 10px', borderRadius: 99,
          }}>
            {status.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Employee budget row (matches screenshot)
function EmployeeRow({ collab }) {
  const budget = Number(collab.budgetMensuel || collab.budgetMax || 0);
  const spent = Number(collab.depensesMois || collab.depenses || 0);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const barColor = pct > 90 ? '#EF4444' : pct > 70 ? '#F97316' : '#16A34A';
  const dept = collab.poste || collab.departement || collab.role || '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid #F9FAFB' }}>
      <Avatar name={collab.nom || collab.name || ''} size={32} color="#1C3A1C" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {collab.nom || collab.name || 'Employé'}
        </p>
        {dept && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{dept}</p>}
        <div style={{ marginTop: 5, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {formatFCFA(spent)} / {formatFCFA(budget)}<br />
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400 }}>CFA</span>
      </p>
    </div>
  );
}

/* ─── Collaborateur Form Modal ─── */
function CollaborateurModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', budgetMensuel: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const handleSave = async () => {
    if (!form.nom || !form.email) { setErr('Nom et email requis'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { setErr(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div style={{ background: '#1C3A1C' }} className="px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-extrabold">Ajouter un collaborateur</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3.5">
          {[
            { k: 'nom',           label: 'Nom complet *',          type: 'text' },
            { k: 'email',         label: 'Email *',                type: 'email' },
            { k: 'telephone',     label: 'Téléphone',              type: 'tel' },
            { k: 'budgetMensuel', label: 'Budget mensuel (F CFA)', type: 'number' },
          ].map(f => (
            <div key={f.k} className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1A1A]">{f.label}</label>
              <input type={f.type} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                className="w-full bg-[#F3F4F6] border-0 rounded-xl px-3 py-3 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1C3A1C]/20" />
            </div>
          ))}
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#1C3A1C' }}>
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function B2BDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const [tab, setTab] = useState('overview');
  const cache = loadB2BCache(userId);
  const [dashboard, setDashboard] = useState(cache?.dashboard || null);
  const [compte, setCompte] = useState(cache?.compte || null);
  const [collaborateurs, setCollaborateurs] = useState(cache?.collaborateurs || []);
  const [orders, setOrders] = useState(cache?.orders || []);
  const [factures, setFactures] = useState(cache?.factures || []);
  const [loading, setLoading] = useState(!cache);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [profileForm, setProfileForm] = useState({ nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [dashRes, collabRes, b2bOrdersRes, menuOrdersRes, facturesRes] = await Promise.allSettled([
        b2bAPI.getDashboard(),
        b2bAPI.getCollaborateurs(),
        b2bAPI.getOrders(),
        commandesService.getMyOrders(),
        b2bAPI.getFacturesMensuelles(),
      ]);
      const newDashboard      = dashRes.status    === 'fulfilled' ? dashRes.value.data           : dashboard;
      const newCollaborateurs = collabRes.status  === 'fulfilled' ? (collabRes.value.data || []) : collaborateurs;
      const b2bOrders         = b2bOrdersRes.status === 'fulfilled' ? (b2bOrdersRes.value.data || []) : [];
      const menuOrders        = menuOrdersRes.status === 'fulfilled' ? (menuOrdersRes.value.data || []).map(o => ({ ...o, _source: 'menu' })) : [];
      const merged            = [...b2bOrders, ...menuOrders].sort(
        (a, b) => new Date(b.createdAt ?? b.dateLivraison ?? 0).getTime() - new Date(a.createdAt ?? a.dateLivraison ?? 0).getTime()
      );
      const newFactures       = facturesRes.status === 'fulfilled' ? (facturesRes.value.data || []) : factures;

      if (dashRes.status === 'fulfilled')    setDashboard(newDashboard);
      if (collabRes.status === 'fulfilled')  setCollaborateurs(newCollaborateurs);
      setOrders(merged);
      if (facturesRes.status === 'fulfilled') setFactures(newFactures);

      let newCompte = compte;
      try { const c = await b2bAPI.getCompte(); newCompte = c.data; setCompte(newCompte); } catch { /* pas encore créé */ }

      saveB2BCache(userId, { dashboard: newDashboard, collaborateurs: newCollaborateurs, orders: merged, factures: newFactures, compte: newCompte });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(!!loadB2BCache(userId)); }, [loadData, userId]);

  useEffect(() => {
    if (user) setProfileForm({ nom: user.nom || '', email: user.email || '', telephone: user.telephone || '' });
  }, [user?.nom, user?.email, user?.telephone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);
    const refresh = () => loadData(true);
    socket.on('commande.creee',        refresh);
    socket.on('commande.nouvelle',     refresh);
    socket.on('commande.statut',       refresh);
    socket.on('commande.paiement',     refresh);
    socket.on('commande.b2b.nouvelle', refresh);
    socket.on('commande.b2b.statut',   refresh);
    return () => { socket.disconnect(); };
  }, [user, loadData]);

  const handleAddCollab = async (form) => {
    await b2bAPI.createCollaborateur({
      nom: form.nom, email: form.email,
      telephone: form.telephone,
      budgetMensuel: form.budgetMensuel ? parseFloat(form.budgetMensuel) : undefined,
    });
    await loadData();
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const { authAPI } = await import('../../services/api');
      await authAPI.updateProfile(profileForm);
      setProfileMsg('Profil mis à jour !');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch { setProfileMsg('Erreur lors de la mise à jour'); }
  };

  const pendingOrders  = orders.filter(o => ['EN_ATTENTE','RECUE','CONFIRMEE','EN_PREP','PRETE','EN_LIVRAISON'].includes(o.statut ?? o.status));
  const monthlyExp     = dashboard?.depensesMois || 0;
  const budgetTotal    = compte?.budgetMensuel || dashboard?.budgetMensuel || 0;
  const budgetRestant  = Math.max(0, budgetTotal - monthlyExp);
  const budgetPct      = budgetTotal > 0 ? Math.min(100, Math.round((budgetRestant / budgetTotal) * 100)) : 100;
  const avgCollab      = pendingOrders.length > 0
    ? Math.round(pendingOrders.reduce((s, o) => s + (o.collaborateurs?.length || 0), 0) / pendingOrders.length)
    : 0;
  const lastFacture    = factures[0];
  const lastFactureLabel = lastFacture
    ? `Facture ${new Date(lastFacture.periode || lastFacture.createdAt || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · Générée le ${new Date(lastFacture.createdAt || Date.now()).toLocaleDateString('fr-FR')}`
    : 'Aucune facture disponible';

  const S = {
    page:    { minHeight: '100vh', background: '#F0F2F0', padding: '28px 32px' },
    card:    { background: '#fff', borderRadius: 20, border: '1px solid #E8ECE8', overflow: 'hidden' },
    header:  { fontSize: 13, fontWeight: 600, color: '#374151', padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  };

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>
            Dashboard Entreprise
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Vue d'ensemble de l'activité B2B pour {currentMonthYear()}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { key: 'overview',  label: 'Vue d\'ensemble' },
            { key: 'profile',   label: 'Profil' },
            { key: 'security',  label: 'Sécurité' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? '#1C3A1C' : '#fff',
              color: tab === t.key ? '#fff' : '#6B7280',
              boxShadow: tab === t.key ? '0 2px 8px rgba(28,58,28,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {t.label}
            </button>
          ))}
          <button onClick={() => loadData(true)} disabled={refreshing} style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280',
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div style={{ background: '#1C3A1C', borderRadius: 10, padding: 4 }}>
            <NotificationBell accentColor="#D97706" />
          </div>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 3 KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* Budget restant */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet style={{ width: 16, height: 16, color: '#16A34A' }} />
                </div>
                {budgetTotal > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '3px 8px', borderRadius: 99 }}>
                    {budgetPct}% restant
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Budget mensuel restant</p>
              {loading ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8, marginBottom: 10 }} />
              ) : (
                <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '0 0 4px' }}>
                  {formatFCFA(budgetRestant)}
                  <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>CFA</span>
                </p>
              )}
              <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${budgetPct}%`, background: '#16A34A', borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Dépenses du mois */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <TrendingDown style={{ width: 16, height: 16, color: '#D97706' }} />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Dépenses du mois</p>
              {loading ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8, marginBottom: 10 }} />
              ) : (
                <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: '0 0 4px' }}>
                  {formatFCFA(monthlyExp)}
                  <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>CFA</span>
                </p>
              )}
              {budgetTotal > 0 && (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                  Sur un budget total de {formatFCFA(budgetTotal)} CFA
                </p>
              )}
            </div>

            {/* Commandes groupées */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Users style={{ width: 16, height: 16, color: '#6B7280' }} />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Commandes groupées</p>
              {loading ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8, marginBottom: 10 }} />
              ) : (
                <p style={{ fontSize: 40, fontWeight: 800, color: '#111827', lineHeight: 1, margin: '0 0 4px' }}>
                  {pendingOrders.length}
                </p>
              )}
              {avgCollab > 0 && (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                  Moyenne de {avgCollab} participant{avgCollab > 1 ? 's' : ''}/cmd
                </p>
              )}
            </div>
          </div>

          {/* No company banner */}
          {!compte && (
            <div style={{ ...S.card, padding: 18, display: 'flex', alignItems: 'center', gap: 14, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Créez votre compte entreprise</p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Ajoutez votre RCCM et adresse pour accéder à la facturation</p>
              </div>
              <Link to="/b2b/onboarding" style={{
                background: '#D97706', color: '#fff', fontWeight: 700, fontSize: 13,
                padding: '8px 16px', borderRadius: 10, textDecoration: 'none', flexShrink: 0,
              }}>
                Configurer
              </Link>
            </div>
          )}

          {/* 2-column: active orders + employee budgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

            {/* Active Orders */}
            <div style={S.card}>
              <div style={S.header}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Commandes d'équipe en cours</span>
                <Link to="/b2b/orders" style={{ color: '#D97706', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Voir tout <ArrowRight style={{ width: 12, height: 12 }} />
                </Link>
              </div>
              {loading ? (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 52, background: '#F3F4F6', borderRadius: 12 }} />)}
                </div>
              ) : pendingOrders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <ShoppingBag style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Aucune commande en cours</p>
                  <Link to="/menu" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
                    background: '#1C3A1C', color: '#fff', fontWeight: 700, fontSize: 13,
                    padding: '8px 16px', borderRadius: 10, textDecoration: 'none',
                  }}>
                    <ChefHat style={{ width: 14, height: 14 }} /> Commander
                  </Link>
                </div>
              ) : (
                pendingOrders.slice(0, 4).map(o => (
                  <ActiveOrderRow key={o.id} order={o} collaborateurs={collaborateurs} />
                ))
              )}
            </div>

            {/* Employee Budgets */}
            <div style={S.card}>
              <div style={S.header}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Gestion Employés</span>
                <button onClick={() => setShowAddCollab(true)} style={{
                  width: 28, height: 28, borderRadius: 8, background: '#F3F4F6', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <Plus style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>
              {loading ? (
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 48, background: '#F3F4F6', borderRadius: 10 }} />)}
                </div>
              ) : collaborateurs.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center' }}>
                  <Users style={{ width: 32, height: 32, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Aucun collaborateur</p>
                  <button onClick={() => setShowAddCollab(true)} style={{
                    marginTop: 12, background: '#1C3A1C', color: '#fff', fontWeight: 600, fontSize: 12,
                    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  }}>
                    + Ajouter
                  </button>
                </div>
              ) : (
                <>
                  {collaborateurs.slice(0, 4).map(c => <EmployeeRow key={c.id} collab={c} />)}
                  {collaborateurs.length > 4 && (
                    <Link to="/b2b/teams" style={{
                      display: 'block', textAlign: 'center', padding: '12px 20px',
                      fontSize: 13, fontWeight: 600, color: '#D97706', textDecoration: 'none',
                      borderTop: '1px solid #F3F4F6',
                    }}>
                      Gérer les budgets ({collaborateurs.length} employés)
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Last Invoice */}
          <div style={{ ...S.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText style={{ width: 20, height: 20, color: '#6B7280' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Dernière Facture</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{lastFactureLabel}</p>
            </div>
            {lastFacture && (
              <button
                onClick={() => navigate('/b2b/invoices')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                  border: '1.5px solid #E5E7EB', borderRadius: 10, background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer',
                }}>
                <Download style={{ width: 14, height: 14 }} />
                Télécharger PDF
              </button>
            )}
            <Link to="/b2b/invoices" style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: '#1C3A1C', borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: 600, color: '#fff',
            }}>
              Voir toutes
            </Link>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Commander',   icon: ChefHat,   to: '/menu',         primary: true },
              { label: 'Équipes',     icon: Users,     to: '/b2b/teams',    primary: false },
              { label: 'Factures',    icon: FileText,  to: '/b2b/invoices', primary: false },
              { label: 'Rapports',    icon: BarChart2, to: '/b2b/reports',  primary: false },
            ].map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.label} to={a.to} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '18px 12px', borderRadius: 16, textDecoration: 'none',
                  background: a.primary ? '#1C3A1C' : '#fff',
                  color: a.primary ? '#fff' : '#374151',
                  border: a.primary ? 'none' : '1px solid #E8ECE8',
                  fontSize: 13, fontWeight: 600,
                }}>
                  <Icon style={{ width: 18, height: 18 }} />
                  {a.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 480 }}>
          <div style={S.card}>
            <div style={{ ...S.header, fontSize: 15, fontWeight: 700, color: '#111827' }}>
              Mon profil
            </div>
            <form onSubmit={handleProfileSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { k: 'nom',       label: 'Nom complet', type: 'text' },
                { k: 'email',     label: 'Email',       type: 'email' },
                { k: 'telephone', label: 'Téléphone',   type: 'tel' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  <input value={profileForm[f.k]} type={f.type}
                    onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ width: '100%', background: '#F3F4F6', border: 'none', borderRadius: 12, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              {profileMsg && (
                <p style={{ fontSize: 13, fontWeight: 600, color: profileMsg.includes('Erreur') ? '#EF4444' : '#16A34A', margin: 0 }}>{profileMsg}</p>
              )}
              <button type="submit" style={{
                background: '#1C3A1C', color: '#fff', fontWeight: 700, fontSize: 14,
                padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer',
              }}>
                Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div style={{ maxWidth: 560 }}>
          <SecurityPanel user={user} accentColor="#1C3A1C" />
        </div>
      )}

      {showAddCollab && <CollaborateurModal onClose={() => setShowAddCollab(false)} onSave={handleAddCollab} />}
    </div>
  );
}
