// src/components/notifications/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, ChefHat, Truck, CreditCard, AlertTriangle, Package, RotateCcw } from 'lucide-react';
import { createCommandesSocket } from '../../services/commandes.service';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const ROLE_EVENTS = {
  STAFF:  ['commande.nouvelle', 'commande.statut', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  GERANT: ['commande.nouvelle', 'commande.creee', 'commande.statut', 'commande.paiement', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  B2B:    ['commande.nouvelle', 'commande.statut', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  CLIENT: ['commande.creee', 'commande.statut', 'commande.paiement', 'commande.remboursee'],
};

const EVENT_META = {
  'commande.nouvelle':     { icon: ChefHat,       color: '#EA580C', label: 'Nouvelle commande',   body: (p) => p?.numero ? `Commande #${p.numero} reçue` : 'Nouvelle commande reçue' },
  'commande.creee':        { icon: ChefHat,       color: '#EA580C', label: 'Commande enregistrée', body: (p) => p?.numero ? `Votre commande #${p.numero} est bien enregistrée` : 'Commande enregistrée' },
  'commande.statut':       { icon: Truck,         color: '#2563EB', label: 'Mise à jour commande', body: (p) => {
    if (!p?.numero) return 'Statut de commande mis à jour';
    if (p.statut === 'LIVREE')       return `🎉 Commande #${p.numero} livrée avec succès !`;
    if (p.statut === 'ANNULEE')      return `Commande #${p.numero} annulée`;
    if (p.statut === 'EN_LIVRAISON') return `Commande #${p.numero} en cours de livraison`;
    if (p.statut === 'PRETE')        return `Commande #${p.numero} prête à être récupérée`;
    if (p.statut === 'EN_PREP')      return `Commande #${p.numero} en préparation`;
    if (p.statut === 'CONFIRMEE')    return `Commande #${p.numero} confirmée par le restaurant`;
    return `#${p.numero} → ${STATUS_FR[p.statut] || p.statut}`;
  }},
  'commande.paiement':     { icon: CreditCard,    color: '#16A34A', label: 'Paiement confirmé',   body: (p) => p?.numero ? `✓ Paiement reçu pour la commande #${p.numero}` : 'Paiement confirmé' },
  'commande.remboursee':   { icon: RotateCcw,     color: '#7C3AED', label: 'Remboursement effectué', body: (p) => p?.numero ? `Remboursement de la commande #${p.numero} effectué` : 'Remboursement effectué' },
  'commande.b2b.nouvelle': { icon: Package,       color: '#7C3AED', label: 'Commande B2B',         body: (p) => p?.entreprise ? `${p.entreprise} — nouvelle commande groupée` : 'Nouvelle commande entreprise' },
  'commande.b2b.statut':   { icon: AlertTriangle, color: '#D97706', label: 'Statut B2B',           body: (p) => p?.statut ? `Commande B2B → ${STATUS_FR[p.statut] || p.statut}` : 'Statut B2B mis à jour' },
};

const STATUS_FR = {
  RECUE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREP: 'En préparation',
  PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée',
  EN_ATTENTE: 'En attente', EN_PREPARATION: 'En préparation',
};

function buildNotif(event, payload) {
  const meta = EVENT_META[event] || { icon: Bell, color: '#8B6E50', label: event, body: () => 'Mise à jour' };
  return {
    id:        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    title:     meta.label,
    body:      meta.body(payload),
    color:     meta.color,
    read:      false,
    createdAt: new Date().toISOString(),
    persisted: false,
  };
}

/* Notification persistée renvoyée par l'API/serveur → forme d'affichage. */
function mapServerNotif(n) {
  const meta = EVENT_META[n.type] || { color: '#8B6E50' };
  return {
    id:        n.id,
    event:     n.type,
    title:     n.title,
    body:      n.body,
    color:     meta.color,
    read:      !!n.read,
    createdAt: n.createdAt,
    persisted: true,
  };
}

/* Notification native du navigateur. */
function nativeNotify(n) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(n.title, { body: n.body, icon: '/favicon.ico', tag: n.id }); } catch {}
  }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'à l\'instant';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// light=true → fond blanc (top bar staff/client)
// light=false (défaut) → fond sombre (sidebar B2B/gérant)
export default function NotificationBell({ accentColor = '#EA580C', size = 'md', light = false }) {
  const { user } = useAuth();
  const isClient = user?.role?.toUpperCase() === 'CLIENT';
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef        = useRef(null);
  const btnRef          = useRef(null);
  const unread          = notifications.filter(n => !n.read).length;

  /* Historique persisté depuis l'API au montage */
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    notificationsAPI.list({ limit: 40 })
      .then(res => {
        if (cancelled) return;
        setNotifications((res.data?.items || []).map(mapServerNotif));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  /* Demande automatique de permission navigateur au montage */
  useEffect(() => {
    if (isClient && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Socket — temps réel.
     Client : notifications persistées poussées par le serveur (notification.new).
     Staff/gérant/B2B : événements de commande en direct (éphémères). */
  useEffect(() => {
    if (!user?.id) return;
    const socket = createCommandesSocket(user);

    if (isClient) {
      const onNew = (serverNotif) => {
        const n = mapServerNotif(serverNotif);
        setNotifications(prev => [n, ...prev.filter(p => p.id !== n.id)].slice(0, 60));
        nativeNotify(n);
      };
      socket.on('notification.new', onNew);
      return () => { socket.off('notification.new', onNew); socket.disconnect(); };
    }

    const events = ROLE_EVENTS[user.role?.toUpperCase()] || ROLE_EVENTS.CLIENT;
    const handleEvent = (event) => (payload) => {
      const notif = buildNotif(event, payload);
      setNotifications(prev => [notif, ...prev].slice(0, 60));
      nativeNotify(notif);
    };
    events.forEach(ev => socket.on(ev, handleEvent(ev)));
    return () => { events.forEach(ev => socket.off(ev)); socket.disconnect(); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Fermer au clic extérieur */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notificationsAPI.markAllRead().catch(() => {});
  };
  const clearAll    = () => setNotifications([]);
  const markRead    = (id) => {
    const target = notifications.find(n => n.id === id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (target?.persisted) notificationsAPI.markRead(id).catch(() => {});
  };

  const requestPermission = async () => {
    if (Notification.permission === 'default') await Notification.requestPermission();
  };

  const w = size === 'sm' ? 32 : 36;

  // Styles du bouton selon le thème
  const btnStyle = {
    width: w, height: w, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative', transition: 'all 0.18s',
    ...(light ? {
      background: open ? `${accentColor}18` : '#F3F4F6',
      border:     `1px solid ${open ? accentColor + '55' : '#E2E8F0'}`,
    } : {
      background: open ? `${accentColor}22` : 'rgba(255,255,255,0.08)',
      border:     `1px solid ${open ? accentColor + '44' : 'rgba(255,255,255,0.12)'}`,
    }),
  };

  const iconColor = light
    ? (open ? accentColor : '#8B6E50')
    : (open ? accentColor : 'rgba(255,255,255,0.75)');

  const badgeBorder = light ? '#fff' : '#1A0C00';

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bouton cloche */}
      <button
        ref={btnRef}
        onClick={() => { setOpen(o => !o); if (!open) requestPermission(); }}
        style={btnStyle}
        title="Notifications"
      >
        <Bell style={{ width: size === 'sm' ? 15 : 16, height: size === 'sm' ? 15 : 16, color: iconColor }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 10,
            background: accentColor, color: '#fff', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: `2px solid ${badgeBorder}`, lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panneau dropdown */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
            background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.07)', zIndex: 200, overflow: 'hidden',
          }}
        >
          {/* En-tête */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell style={{ width: 14, height: 14, color: accentColor }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1A0C00' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: accentColor, color: '#fff', borderRadius: 10, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                  {unread}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  title="Tout marquer comme lu"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: accentColor, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}
                >
                  <CheckCheck style={{ width: 12, height: 12 }} /> Tout lire
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Effacer tout"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89070', display: 'flex', alignItems: 'center', padding: '3px 5px', borderRadius: 6 }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>

          {/* Bandeau permission navigateur */}
          {Notification.permission === 'default' && (
            <div style={{ padding: '8px 14px', background: `${accentColor}10`, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell style={{ width: 12, height: 12, color: accentColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#8B6E50', flex: 1 }}>Activer les alertes navigateur</span>
              <button
                onClick={requestPermission}
                style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Activer
              </button>
            </div>
          )}

          {/* Liste */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Bell style={{ width: 22, height: 22, color: '#CBD5E1' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>Aucune notification</p>
                <p style={{ fontSize: 11, color: '#A89070', margin: '4px 0 0' }}>Les alertes temps réel apparaîtront ici</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = EVENT_META[n.event]?.icon || Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                      borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer',
                      background: n.read ? '#fff' : `${n.color || accentColor}09`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? '#fff' : `${n.color || accentColor}09`; }}
                  >
                    {/* Icône colorée */}
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${n.color || accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Icon style={{ width: 14, height: 14, color: n.color || accentColor }} />
                    </div>

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: '#1A0C00', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color || accentColor, flexShrink: 0 }} />
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#8B6E50', margin: 0, lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                      <p style={{ fontSize: 10, color: '#A89070', margin: '3px 0 0' }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied — compteur */}
          {notifications.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(0,0,0,0.05)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#A89070' }}>
                {notifications.length} notification{notifications.length > 1 ? 's' : ''} · {unread} non lue{unread > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
