import { RefreshCw, Activity, Bell, CreditCard, FileText, UserPlus, TrendingUp, Clock, Package } from 'lucide-react';
import { b2bAPI } from '../../../services/api';
import {
  BG, CARD, TEXT, MUTED, FAINT, BORDER,
  ORANGE, ORANGE_L, GREEN, GREEN_L, GREEN_D, RED, RED_L, AMBER, AMBER_L, SH, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'activite' && (...) } (Notifications + Journal d'audit).
export default function ActiviteSection({
  unreadCount, activiteView, setActiviteView,
  setAuditLoading, setAuditLogs, auditLoading, auditLogs,
  notifications, markAllRead, setNotifications, handleNotifClick,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 p-1 rounded-lg w-fit" style={{ background: BG }}>
        {[
          { id: 'notifications', label: 'Notifications', badge: unreadCount },
          { id: 'historique',    label: "Journal d'audit" },
        ].map(v => {
          const isActive = activiteView === v.id;
          return (
            <button key={v.id} onClick={() => setActiviteView(v.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-semibold transition"
              style={{ background: isActive ? CARD : 'transparent', color: isActive ? TEXT : MUTED, boxShadow: isActive ? SH : 'none' }}>
              {v.label}
              {v.badge > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: RED }}>
                  {v.badge > 9 ? '9+' : v.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activiteView === 'historique' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>Historique d'activité</h2>
              <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>Toutes les actions enregistrées sur votre compte</p>
            </div>
            <button
              onClick={() => {
                setAuditLoading(true);
                b2bAPI.getAuditLogs()
                  .then(res => setAuditLogs(Array.isArray(res.data) ? res.data : []))
                  .catch(() => {})
                  .finally(() => setAuditLoading(false));
              }}
              disabled={auditLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold border transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {auditLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-20 text-center rounded-lg" style={{ background: CARD, boxShadow: SH }}>
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: BG }}>
                <Activity className="w-6 h-6" style={{ color: FAINT }} />
              </div>
              <p className="text-sm font-medium" style={{ color: MUTED }}>Aucun événement enregistré</p>
              <p className="text-xs mt-1" style={{ color: FAINT }}>Les connexions, commandes et actions apparaissent ici</p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
              {auditLogs.map((entry, idx, arr) => {
                const LABELS = {
                  CONNEXION: 'Connexion', CREATION_COLLABORATEUR: 'Ajout collaborateur',
                  CREATION_COMMANDE_GROUPEE: 'Commande groupée', VALIDATION_BUDGET: 'Validation budget',
                  GENERATION_FACTURE: 'Génération facture', PAIEMENT_FACTURE: 'Paiement facture',
                };
                const COLORS = {
                  CONNEXION: { bg: '#F5F5F4', color: '#57534E' },
                  CREATION_COLLABORATEUR: { bg: GREEN_L, color: GREEN },
                  CREATION_COMMANDE_GROUPEE: { bg: ORANGE_L, color: ORANGE },
                  VALIDATION_BUDGET: { bg: AMBER_L, color: AMBER },
                  GENERATION_FACTURE: { bg: GREEN_L, color: GREEN },
                  PAIEMENT_FACTURE: { bg: GREEN_L, color: GREEN_D },
                };
                const s = COLORS[entry.type] || { bg: BG, color: MUTED };
                const date = new Date(entry.createdAt);
                return (
                  <div key={entry.id || idx} className="flex items-center gap-4 px-5 py-3.5"
                    style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: s.bg }}>
                      <Activity className="w-3.5 h-3.5" style={{ color: s.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                        {LABELS[entry.type] || entry.type}
                      </p>
                      {entry.actorEmail && (
                        <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>{entry.actorEmail}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium" style={{ color: MUTED }}>
                        {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px]" style={{ color: FAINT }}>
                        {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activiteView === 'notifications' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: TEXT }}>Notifications</h2>
              <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''} · ${notifications.length} au total`
                  : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={markAllRead}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold border transition hover:opacity-80"
                  style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                  Tout marquer lu
                </button>
                <button onClick={() => setNotifications([])}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold border transition hover:opacity-80"
                  style={{ borderColor: '#FECACA', color: RED, background: RED_L }}>
                  Effacer tout
                </button>
              </div>
            )}
          </div>

          {/* Unread banner */}
          {unreadCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ background: ORANGE_L, border: `1px solid ${ORANGE}33` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: ORANGE }}>
                <Bell className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-sm font-semibold flex-1" style={{ color: ORANGE }}>
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </p>
              <button onClick={markAllRead}
                className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition hover:opacity-80"
                style={{ background: ORANGE, color: '#fff' }}>
                Tout lire
              </button>
            </div>
          )}

          <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
            {notifications.length === 0 ? (
              <div className="py-28 text-center">
                <div className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
                  style={{ background: BG }}>
                  <Bell className="w-8 h-8" style={{ color: FAINT }} />
                </div>
                <p className="text-base font-bold mb-1" style={{ color: TEXT }}>Aucune notification</p>
                <p className="text-sm mt-1" style={{ color: FAINT }}>
                  Les mises à jour de commandes en temps réel apparaissent ici
                </p>
              </div>
            ) : notifications.map((n, idx, arr) => {
              const color  = n.color || ORANGE;
              const iconBg = n.iconBg || ORANGE_L;
              const NotifIcon = n.type === 'new_order' ? Package
                : n.type === 'payment' ? CreditCard
                : n.type === 'invoice' ? FileText
                : n.type === 'team'    ? UserPlus
                : n.type === 'status'  ? TrendingUp
                : Bell;
              const hasTarget = n.orderId || n.type === 'new_order' || n.type === 'status'
                || n.type === 'payment' || n.type === 'invoice' || n.type === 'team';
              return (
                <div key={n.id}
                  className="flex items-center gap-4 px-6 py-5 transition"
                  style={{
                    background: n.read ? 'transparent' : `${color}08`,
                    borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                    borderLeft: n.read ? '3px solid transparent' : `3px solid ${color}`,
                    cursor: hasTarget ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => { if (hasTarget) e.currentTarget.style.background = n.read ? BG : `${color}12`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : `${color}08`; }}
                  onClick={() => handleNotifClick(n)}>
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: n.read ? BG : iconBg }}>
                    <NotifIcon className="w-5 h-5" style={{ color: n.read ? FAINT : color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-snug" style={{ color: TEXT }}>{n.msg}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" style={{ color: FAINT }} />
                      <p className="text-[12px]" style={{ color: FAINT }}>
                        {new Date(n.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{new Date(n.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                      {hasTarget && !n.read && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}>
                          Cliquer pour voir
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
