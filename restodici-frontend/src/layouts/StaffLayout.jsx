/* ═══════════════════════════════════════════════════════════════
   StaffLayout.jsx — Mise en page pour le personnel de restaurant
   Sidebar : blanc + orange clair — topbar blanc
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ChefHat, CreditCard, UtensilsCrossed, Package,
  Bell, LogOut, X, User, Shield, CheckCircle, AlertCircle,
  Flame, ChevronRight,
} from 'lucide-react';
import { createCommandesSocket } from '../services/commandes.service';
import { authAPI } from '../services/api';
import SecurityPanel from '../components/security/SecurityPanel';
import OnboardingTour from '../components/onboarding/OnboardingTour';

/* ── Tokens sidebar blanc/orange ── */
const SIDEBAR_BG   = '#FFFFFF';       /* blanc pur */
const SIDEBAR_BG2  = '#FFF8F0';       /* orange très clair pour avatar footer */
const SIDEBAR_BOR  = 'rgba(255,140,0,0.12)';
const SIDE_TEXT    = '#4B5563';       /* gris foncé — lisible sur fond blanc */
const SIDE_TEXT_HI = '#1A0C00';       /* texte actif — quasi noir */

const OG     = '#EA580C';
const OG_D   = '#C2410C';
const OG_G   = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
const OG_L   = 'rgba(255,140,0,0.12)';
const OG_L2  = 'rgba(255,140,0,0.08)';

const PAGE_BG = '#FFFFFF';
const CARD    = '#FFFFFF';
const NAVY    = '#1A0C00';
const BORDER  = '#E5E7EB';
const MUTED   = '#8B6E50';
const FAINT   = '#8B6E50';
const RED     = '#DC2626';
const RED_L   = '#FEF2F2';
const GREEN   = '#16A34A';
const SH      = '0 1px 4px rgba(0,0,0,0.07)';
const SH3     = '0 24px 60px rgba(0,0,0,0.22),0 4px 12px rgba(0,0,0,0.08)';

const NAV = [
  { to: '/staff/kds',      label: 'KDS — Cuisine',   icon: ChefHat,         tourId: 'staff-kds'      },
  { to: '/staff/caisse',   label: 'Caisse',           icon: CreditCard,      tourId: 'staff-caisse'   },
  { to: '/staff/salle',    label: 'Salle',            icon: UtensilsCrossed, tourId: 'staff-salle'    },
  { to: '/staff/articles', label: 'Articles',         icon: Package,         tourId: 'staff-articles' },
];

const STAFF_TOUR_STEPS = [
  { title: 'Bienvenue dans votre espace Staff !', body: 'En quelques secondes, découvrez les 5 outils essentiels à votre journée.' },
  { selector: '[data-tour="staff-kds"]',      title: 'KDS — Écran Cuisine',      body: 'Visualisez toutes les commandes, changez leur statut et consultez l\'historique.' },
  { selector: '[data-tour="staff-salle"]',    title: 'Prise de commande — Salle', body: 'Sélectionnez une table, composez la commande et envoyez-la en cuisine.' },
  { selector: '[data-tour="staff-articles"]', title: 'Gestion des articles',      body: 'Marquez un plat en rupture pour qu\'il disparaisse du menu client.' },
  { selector: '[data-tour="staff-bell"]',     title: 'Notifications',             body: 'Chaque nouvelle commande déclenche un bip et une alerte ici.' },
  { selector: '[data-tour="staff-avatar"]',   title: 'Votre profil',              body: 'Modifiez vos informations et activez la double authentification.' },
  { title: "C'est parti !", body: 'Vous connaissez maintenant tous vos outils. Bonne journée !' },
];

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}

const STATUT_LABEL = {
  RECUE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREP: 'En préparation',
  PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée',
};

/* ── Initiales avatar ── */
function Initials({ name, size = 36, fontSize = 13, style = {} }) {
  const letters = (name || 'S').split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: OG_G, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 900, flexShrink: 0, letterSpacing: '-0.01em',
      boxShadow: `0 2px 8px ${OG}44`,
      ...style,
    }}>
      {letters}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NotifPanel
   ══════════════════════════════════════════════════════════════════ */
function NotifPanel({ notifs, onMarkAllRead, onClear, onClose, anchorRef }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target))
        onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div ref={panelRef} style={{
      position: 'fixed', top: 0, left: 240, bottom: 0, zIndex: 300,
      width: 360, background: CARD,
      boxShadow: SH3, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${BORDER}`, fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}`, background: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>Notifications</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED, fontWeight: 500 }}>
              {notifs.filter(n => !n.read).length} non lue{notifs.filter(n => !n.read).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {notifs.some(n => !n.read) && (
              <button onClick={onMarkAllRead}
                style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, fontSize: 11, fontWeight: 700, color: MUTED, cursor: 'pointer' }}>
                Tout lire
              </button>
            )}
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color={MUTED} />
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifs.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: OG_L, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Bell size={22} color={OG} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Aucune notification</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>Les nouvelles commandes apparaîtront ici.</p>
          </div>
        ) : notifs.map((n, idx) => {
          const isNew = n.type === 'nouvelle';
          const ac = isNew ? OG : n.statut === 'PRETE' ? GREEN : OG_D;
          return (
            <div key={n.id} style={{
              display: 'flex', gap: 12, padding: '14px 18px',
              borderBottom: idx < notifs.length - 1 ? `1px solid ${BORDER}` : 'none',
              background: n.read ? 'transparent' : `${ac}08`,
              borderLeft: `3px solid ${n.read ? 'transparent' : ac}`,
              transition: 'background 0.12s',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: n.read ? '#F3F4F6' : `${ac}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isNew ? <ChefHat size={16} color={n.read ? FAINT : ac} /> : <Bell size={16} color={n.read ? FAINT : ac} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: n.read ? MUTED : NAVY, lineHeight: 1.4 }}>
                  {isNew ? `Nouvelle commande CMD-${n.numero}` : `CMD-${n.numero} → ${STATUT_LABEL[n.statut] || n.statut}`}
                </p>
                {isNew && n.lieu && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>
                    {n.lieu}{n.montant ? ` · ${Math.round(n.montant).toLocaleString('fr-FR')} FCFA` : ''}
                  </p>
                )}
                <p style={{ margin: '3px 0 0', fontSize: 10, color: MUTED, fontWeight: 600 }}>{timeAgo(n.ts)}</p>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ac, flexShrink: 0, marginTop: 5 }} />}
            </div>
          );
        })}
      </div>

      {notifs.length > 0 && (
        <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${BORDER}`, background: '#FAFAFA' }}>
          <button onClick={onClear}
            style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, fontSize: 12, fontWeight: 700, color: MUTED, cursor: 'pointer' }}>
            Effacer toutes les notifications
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ProfileDrawer
   ══════════════════════════════════════════════════════════════════ */
function ProfileDrawer({ user, onClose, syncUser }) {
  const [tab,    setTab]    = useState('profil');
  const [form,   setForm]   = useState({
    prenom: user?.prenom || '', nom: user?.nom || '',
    email: user?.email || '', telephone: user?.telephone || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [isErr,  setIsErr]  = useState(false);
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Staff';

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const res = await authAPI.updateProfile(form);
      const updated = res?.data?.user || res?.data || { ...user, ...form };
      if (syncUser) syncUser(updated);
      setIsErr(false); setMsg('Profil mis à jour !');
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      setIsErr(true); setMsg(err?.response?.data?.message || 'Erreur de mise à jour.');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: 'min(440px, 100vw)', background: CARD, boxShadow: SH3, display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${OG} 0%, ${OG_D} 100%)`, padding: '28px 24px 0', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: OG_L2 }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Initials name={fullName} size={56} fontSize={20} />
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{fullName}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>Staff</p>
                {user?.email && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{user.email}</p>}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={15} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
            {[{ id: 'profil', label: 'Profil', icon: User }, { id: 'securite', label: 'Sécurité', icon: Shield }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  color: tab === id ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderBottom: tab === id ? `2.5px solid ${OG}` : '2.5px solid transparent',
                  transition: 'all 0.13s',
                }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {tab === 'profil' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, background: isErr ? RED_L : '#ECFDF5', border: `1px solid ${isErr ? '#FECACA' : '#BBF7D0'}`, fontSize: 12, fontWeight: 700, color: isErr ? RED : GREEN }}>
                  {isErr ? <AlertCircle size={13} /> : <CheckCircle size={13} />}{msg}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ k: 'prenom', label: 'Prénom' }, { k: 'nom', label: 'Nom' }].map(f => (
                  <div key={f.k}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</label>
                    <input type="text" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1.5px solid ${BORDER}`, borderRadius: 11, fontSize: 13, color: NAVY, outline: 'none', background: PAGE_BG, fontFamily: 'inherit' }}
                      onFocus={e => (e.target.style.borderColor = OG)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                ))}
              </div>
              {[{ k: 'email', label: 'Email', type: 'email' }, { k: 'telephone', label: 'Téléphone', type: 'tel' }].map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</label>
                  <input type={f.type} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1.5px solid ${BORDER}`, borderRadius: 11, fontSize: 13, color: NAVY, outline: 'none', background: PAGE_BG, fontFamily: 'inherit' }}
                    onFocus={e => (e.target.style.borderColor = OG)}
                    onBlur={e => (e.target.style.borderColor = BORDER)}
                  />
                </div>
              ))}
              <button type="submit" disabled={saving}
                style={{ marginTop: 6, padding: '13px', borderRadius: 14, border: 'none', background: saving ? FAINT : OG_G, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : `0 4px 16px ${OG}44`, letterSpacing: '0.01em' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </form>
          )}
          {tab === 'securite' && <SecurityPanel user={user} accentColor={OG} />}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   StaffLayout — Principal
   ══════════════════════════════════════════════════════════════════ */
export default function StaffLayout() {
  const { user, logout, syncUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const bellRef   = useRef(null);

  const [notifs,      setNotifs]      = useState([]);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [drawer,      setDrawer]      = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const tourKey  = user?.id ? `tour_staff_${user.id}` : null;
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (tourKey && !localStorage.getItem(tourKey)) setShowTour(true);
  }, [tourKey]);

  const unreadCount = notifs.filter(n => !n.read).length;
  const pushNotif = notif => setNotifs(prev =>
    [{ ...notif, id: Date.now() + Math.random(), ts: Date.now(), read: false }, ...prev].slice(0, 50)
  );

  useEffect(() => {
    if (!user?.id) return;
    const s = createCommandesSocket(user);

    s.on('commande.nouvelle', p => {
      const lieu = p?.modeLivraison === 'SUR_PLACE' ? `Table ${p?.tableNumero ?? '?'}`
        : p?.modeLivraison === 'EMPORTER'  ? 'À emporter'
        : p?.modeLivraison === 'LIVRAISON' ? 'Livraison' : '';
      pushNotif({ type: 'nouvelle', numero: p?.numero, lieu, montant: p?.montantTotal });
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
        o.connect(g); g.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + 0.3);
      } catch (_) {}
    });

    s.on('commande.statut', p => {
      if (p?.statut && ['PRETE', 'EN_LIVRAISON'].includes(p.statut))
        pushNotif({ type: 'statut', numero: p?.numero, statut: p?.statut });
    });

    s.on('commande.b2b.nouvelle', p => {
      const lieu = p?.entreprise ? `Entreprise : ${p.entreprise}` : 'Commande groupée B2B';
      pushNotif({ type: 'nouvelle', numero: p?.numero, lieu, montant: p?.montantTotal });
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = 660;
        g.gain.setValueAtTime(0.001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
        o.connect(g); g.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + 0.4);
      } catch (_) {}
    });

    return () => s.disconnect();
  }, [user]);

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Staff';
  const currentPage = NAV.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to + '/') || location.pathname === n.to)?.label || '';

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#FFF4ED', fontFamily: "'Manrope', Inter, system-ui, sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .snav-item:hover { background: rgba(255,140,0,0.08) !important; color: #1A0C00 !important; }
        .snav-logout:hover { background: rgba(220,38,38,0.07) !important; color: #DC2626 !important; }
        .snav-bell:hover { background: rgba(255,140,0,0.1) !important; }
      `}</style>

      {/* ══════════════════════════════════════
          SIDEBAR BLANC / ORANGE
      ══════════════════════════════════════ */}
      <aside style={{ width: 240, flexShrink: 0, background: SIDEBAR_BG, display: 'flex', flexDirection: 'column', height: '100%', borderRight: `1px solid ${SIDEBAR_BOR}` }}>

        {/* Brand / Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${SIDEBAR_BOR}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: OG_G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${OG}44` }}>
              <UtensilsCrossed size={20} color="#fff" strokeWidth={2.3} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: SIDE_TEXT_HI, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {user?.restaurant?.nom || "Resto d'ici"}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 800, color: OG, background: OG_L, border: `1px solid ${OG}30`, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  <Flame size={8} />STAFF
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div style={{ padding: '18px 16px 8px' }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Navigation</p>
        </div>

        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(({ to, label, icon: Icon, exact, tourId }) => {
            const active = exact
              ? location.pathname === to
              : location.pathname === to || location.pathname.startsWith(to + '/');

            return (
              <NavLink key={to} to={to} className="snav-item" data-tour={tourId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px',
                  borderRadius: 12, textDecoration: 'none',
                  background: active ? OG_L : 'transparent',
                  color: active ? SIDE_TEXT_HI : SIDE_TEXT,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  transition: 'all 0.13s',
                  position: 'relative',
                }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: active ? OG_G : 'rgba(255,140,0,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.13s',
                  boxShadow: active ? `0 3px 10px ${OG}55` : 'none',
                }}>
                  <Icon size={14} color={active ? '#fff' : SIDE_TEXT} strokeWidth={active ? 2.3 : 1.8} />
                </div>
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={13} color={OG} style={{ flexShrink: 0 }} />}
              </NavLink>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: SIDEBAR_BOR, margin: '4px 14px' }} />

        {/* Bottom section */}
        <div style={{ padding: '8px 10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Notifications bell */}
          <button
            ref={bellRef}
            data-tour="staff-bell"
            onClick={() => {
              setNotifOpen(v => !v);
              if (!notifOpen) setNotifs(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className="snav-bell"
            style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', borderRadius: 12,
              background: notifOpen ? OG_L : 'transparent',
              border: 'none', cursor: 'pointer', width: '100%',
              color: unreadCount > 0 ? OG : SIDE_TEXT,
              transition: 'all 0.13s',
            }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: notifOpen ? OG_G : 'rgba(255,140,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0, boxShadow: notifOpen ? `0 3px 10px ${OG}55` : 'none' }}>
              <Bell size={14} color={notifOpen ? '#fff' : unreadCount > 0 ? OG : SIDE_TEXT} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, background: RED, color: '#fff', fontSize: 7, fontWeight: 900, width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${SIDEBAR_BG}` }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'left', color: 'inherit' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(220,38,38,0.22)', color: '#FCA5A5', padding: '2px 7px', borderRadius: 99, letterSpacing: '0.04em' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Déconnexion */}
          <button
            onClick={() => setLogoutModal(true)}
            className="snav-logout"
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: SIDE_TEXT, width: '100%', transition: 'all 0.13s' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LogOut size={14} color={SIDE_TEXT} strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Se déconnecter</span>
          </button>
        </div>

      </aside>

      {/* ══════════════════════════════════════
          ZONE PRINCIPALE
      ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar blanc */}
        <header style={{ height: 56, flexShrink: 0, background: CARD, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: SH }}>
          {/* Fil d'ariane / page courante */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>Staff</span>
            <ChevronRight size={12} color={MUTED} />
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{currentPage || 'Tableau de bord'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {unreadCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: RED_L, color: RED, border: '1px solid #FECACA', padding: '5px 12px', borderRadius: 99 }}>
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} commande{unreadCount > 1 ? 's' : ''}
              </span>
            )}

            {/* Heure */}
            <Clock />

            {/* Profil topbar — cliquer pour ouvrir le tiroir */}
            <button
              data-tour="staff-avatar"
              onClick={() => setDrawer(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 12px 5px 5px', borderRadius: 12, border: `1.5px solid ${BORDER}`, background: CARD, cursor: 'pointer', transition: 'all 0.13s', boxShadow: SH }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = OG; e.currentTarget.style.boxShadow = `0 0 0 3px ${OG_L}`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = SH; }}
            >
              <Initials name={fullName} size={30} fontSize={11} />
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{fullName}</p>
                {user?.restaurant?.nom && (
                  <p style={{ margin: 0, fontSize: 10, color: MUTED, fontWeight: 500, lineHeight: 1 }}>{user.restaurant.nom}</p>
                )}
              </div>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 64px' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Onboarding ── */}
      {showTour && (
        <OnboardingTour steps={STAFF_TOUR_STEPS} accentColor={OG} storageKey={tourKey}
          onComplete={() => setShowTour(false)} onSkip={() => setShowTour(false)} />
      )}

      {/* ── Notif Panel ── */}
      {notifOpen && (
        <NotifPanel notifs={notifs} anchorRef={bellRef}
          onClose={() => setNotifOpen(false)}
          onMarkAllRead={() => setNotifs(prev => prev.map(n => ({ ...n, read: true })))}
          onClear={() => setNotifs([])} />
      )}

      {/* ── Profile Drawer ── */}
      {drawer && <ProfileDrawer user={user} onClose={() => setDrawer(false)} syncUser={syncUser} />}

      {/* ── Logout Modal ── */}
      {logoutModal && (
        <div onClick={() => setLogoutModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: CARD, borderRadius: 24, padding: '28px 28px 22px', width: 320, boxShadow: SH3, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: RED_L, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={16} color={RED} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>Se déconnecter ?</h3>
              </div>
              <button onClick={() => setLogoutModal(false)}
                style={{ width: 30, height: 30, borderRadius: 9, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} color={MUTED} />
              </button>
            </div>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: MUTED }}>Vous serez redirigé vers la page de connexion.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setLogoutModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F9FAFB', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: MUTED, fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button onClick={() => { logout(); navigate('/login'); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${RED},#ef4444)`, cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(220,38,38,0.32)', fontFamily: 'inherit' }}>
                <LogOut size={13} /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Petite horloge live dans la topbar */
function Clock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: PAGE_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
    </div>
  );
}
