// src/components/notifications/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, ChefHat, Truck, CreditCard, AlertTriangle, Package } from 'lucide-react';
import { createCommandesSocket } from '../../services/commandes.service';
import { useAuth } from '../../hooks/useAuth';

const ROLE_EVENTS = {
  STAFF:  ['commande.nouvelle', 'commande.statut', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  GERANT: ['commande.nouvelle', 'commande.creee', 'commande.statut', 'commande.paiement', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  B2B:    ['commande.nouvelle', 'commande.statut', 'commande.b2b.nouvelle', 'commande.b2b.statut'],
  CLIENT: ['commande.creee', 'commande.statut', 'commande.paiement'],
};

const EVENT_META = {
  'commande.nouvelle':     { icon: ChefHat,       color: '#C05015', label: 'Nouvelle commande' },
  'commande.creee':        { icon: ChefHat,       color: '#C05015', label: 'Commande créée'    },
  'commande.statut':       { icon: Truck,         color: '#2563EB', label: 'Statut mis à jour' },
  'commande.paiement':     { icon: CreditCard,    color: '#16A34A', label: 'Paiement confirmé' },
  'commande.b2b.nouvelle': { icon: Package,       color: '#7C3AED', label: 'Commande B2B'      },
  'commande.b2b.statut':   { icon: AlertTriangle, color: '#D97706', label: 'Statut B2B'        },
};

function buildNotif(event, payload) {
  const meta  = EVENT_META[event] || { icon: Bell, color: '#64748B', label: event };
  const num   = payload?.numero ? `#${payload.numero}` : '';
  const extra = payload?.statut ? ` → ${payload.statut}` : payload?.entreprise ? ` (${payload.entreprise})` : '';
  return {
    id:        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    title:     meta.label,
    body:      `${num}${extra}`.trim() || 'Mise à jour en temps réel',
    color:     meta.color,
    Icon:      meta.icon,
    read:      false,
    createdAt: new Date().toISOString(),
  };
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'à l\'instant';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function NotificationBell({ accentColor = '#C05015', size = 'md' }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`notifs:${user?.id}`) || '[]'); } catch { return []; }
  });
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef(null);
  const btnRef            = useRef(null);
  const unread            = notifications.filter(n => !n.read).length;

  /* Persist */
  useEffect(() => {
    if (user?.id) {
      try { localStorage.setItem(`notifs:${user.id}`, JSON.stringify(notifications.slice(0, 30))); } catch {}
    }
  }, [notifications, user?.id]);

  /* Socket */
  useEffect(() => {
    if (!user?.id) return;
    const socket = createCommandesSocket(user);
    const events = ROLE_EVENTS[user.role?.toUpperCase()] || ROLE_EVENTS.CLIENT;

    const handleEvent = (event) => (payload) => {
      const notif = buildNotif(event, payload);
      setNotifications(prev => [notif, ...prev].slice(0, 30));
      if (Notification.permission === 'granted') {
        try { new Notification(notif.title, { body: notif.body, icon: '/favicon.ico', tag: notif.id }); } catch {}
      }
    };

    events.forEach(ev => socket.on(ev, handleEvent(ev)));
    return () => { events.forEach(ev => socket.off(ev)); socket.disconnect(); };
  }, [user]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setNotifications([]);
  const markRead    = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const requestPermission = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const btnSize  = size === 'sm' ? 'w-8 h-8'  : 'w-9 h-9';

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => { setOpen(o => !o); if (!open) requestPermission(); }}
        style={{
          width: size === 'sm' ? 32 : 38, height: size === 'sm' ? 32 : 38,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? `${accentColor}22` : 'rgba(255,255,255,0.08)',
          border: `1px solid ${open ? accentColor + '44' : 'rgba(255,255,255,0.12)'}`,
          cursor: 'pointer', position: 'relative', transition: 'all 0.18s', flexShrink: 0,
        }}
        title="Notifications"
      >
        <Bell style={{ width: size === 'sm' ? 15 : 17, height: size === 'sm' ? 15 : 17, color: open ? accentColor : 'rgba(255,255,255,0.75)' }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 10,
            background: accentColor, color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: '2px solid #0F172A', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320,
            background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            border: '1px solid rgba(0,0,0,0.07)', zIndex: 200, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell style={{ width: 14, height: 14, color: accentColor }} />
              <span style={{ fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: accentColor, color: '#fff', borderRadius: 10, padding: '2px 7px', fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif' }}>{unread}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={markAllRead} title="Tout marquer comme lu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: accentColor, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'sans-serif', padding: '3px 6px', borderRadius: 6 }}>
                  <CheckCheck style={{ width: 12, height: 12 }} /> Tout lire
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} title="Effacer tout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: '3px 4px', borderRadius: 6 }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>

          {/* Browser push notification permission */}
          {Notification.permission === 'default' && (
            <div style={{ padding: '8px 14px', background: `${accentColor}12`, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />
              <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#64748B', flex: 1 }}>Activer les alertes navigateur</span>
              <button onClick={requestPermission} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'sans-serif' }}>Activer</button>
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell style={{ width: 28, height: 28, color: '#E2E8F0', margin: '0 auto 8px' }} />
                <p style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#94A3B8', margin: 0 }}>Aucune notification</p>
                <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#CBD5E1', margin: '4px 0 0' }}>Les alertes temps réel apparaîtront ici</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = n.Icon || Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                      borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.15s',
                      background: n.read ? '#fff' : `${n.color || accentColor}08`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? '#fff' : `${n.color || accentColor}08`}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${n.color || accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 13, height: 13, color: n.color || accentColor }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <p style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: n.read ? 500 : 700, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                        {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color || accentColor, flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#64748B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                      <p style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#94A3B8', margin: '3px 0 0' }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
