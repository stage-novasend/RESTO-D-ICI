/* ═══════════════════════════════════════════════════════════════
   KDSStaff.jsx — Kitchen Display System (Staff)
   4 colonnes actives + section historique des commandes traitées
   Temps réel : WebSocket + polling 8s
   ═══════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useState } from 'react';
import {
  Clock, ChefHat, CheckCircle2, RefreshCw, AlertCircle,
  History, X, ChevronDown, ChevronUp,
  CheckCheck, Ban, UtensilsCrossed, Building2, Bell, CreditCard, CalendarClock, Truck,
} from 'lucide-react';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DispatchModal from '../../components/livraison/DispatchModal';

/* ── Palette — miroir StaffDashboard (couleurs : theme/colors.js) ── */
import {
  BG, SURFACE as CARD, NAVY, BORDER, MUTED_WARM as MUTED, TEXT_MUTED as FAINT,
  ORANGE as OG, ORANGE_DARK as OG_D, BORDER_WARM_09 as OG_L,
  GREEN_DARK as GREEN, GREEN_MINT as GREEN_L, AMBER, RED_STRONG as RED, RED_SALMON as RED_L,
  PURPLE, PURPLE as VIO, PURPLE_GLOW as VIO_L, BLUE_BRIGHT as BLUE, BLUE_GLOW as BLUE_L,
} from '../../theme/colors';
const OG_G   = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
const GREEN_G= 'linear-gradient(135deg,#15803D,#16A34A)';
const AMBER_G= 'linear-gradient(135deg,#B45309,#D97706)';
const PURPLE_G='linear-gradient(135deg,#6D28D9,#8B5CF6)';

const NEXT_STATUT = {
  RECUE: 'CONFIRMEE', CONFIRMEE: 'EN_PREP',
  EN_PREP: 'PRETE', PRETE: 'EN_LIVRAISON', EN_LIVRAISON: 'LIVREE',
};
const ACTION_LABELS = {
  CONFIRMEE: 'Accepter', EN_PREP: 'Démarrer',
  PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livré',
};

const BLUE_G = 'linear-gradient(135deg,#1D4ED8,#3B82F6)';
const VIO_G  = 'linear-gradient(135deg,#6D28D9,#8B5CF6)';

const COLS = [
  { id: 'todo',     label: 'À confirmer',   accent: BLUE,   accentL: BLUE_L,                  grad: OG_G,      statuts: ['RECUE','CONFIRMEE'] },
  { id: 'prep',     label: 'En Cuisine',    accent: '#F59E0B', accentL: 'rgba(245,158,11,0.09)', grad: AMBER_G, statuts: ['EN_PREP'] },
  { id: 'ready',    label: 'Prêt',          accent: '#22C55E', accentL: 'rgba(34,197,94,0.09)', grad: GREEN_G,  statuts: ['PRETE'] },
  { id: 'delivery', label: 'En livraison',  accent: VIO,    accentL: VIO_L,                   grad: VIO_G,     statuts: ['EN_LIVRAISON'] },
];

/* B2B statut ↔ KDS statut mapping */
const B2B_TO_KDS = { EN_ATTENTE: 'RECUE', CONFIRMEE: 'CONFIRMEE', EN_PREPARATION: 'EN_PREP', LIVREE: 'LIVREE', ANNULEE: 'ANNULEE' };
/* KDS "next" → B2B actual next (B2B skips PRETE/EN_LIVRAISON) */
const B2B_KDS_NEXT = { CONFIRMEE: 'CONFIRMEE', EN_PREP: 'EN_PREPARATION', PRETE: 'LIVREE', EN_LIVRAISON: 'LIVREE' };

function fmtLivraison(dateIso, heure) {
  if (!dateIso) return heure || '';
  try {
    const d = new Date(dateIso);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${label} à ${heure || d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return heure || ''; }
}

function minutesUntil(dateIso) {
  if (!dateIso) return null;
  return Math.round((new Date(dateIso) - Date.now()) / 60_000);
}

/* ── Persistance historique localStorage ── */
const HIST_KEY  = 'kds_history_v1';
const HIST_TTL  = 7 * 24 * 60 * 60 * 1000; // 7 jours

function loadPersistedHistory() {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (!raw) return [];
    const cutoff = Date.now() - HIST_TTL;
    return JSON.parse(raw).filter(o => new Date(o.updatedAt || o.createdAt).getTime() > cutoff);
  } catch { return []; }
}

function persistHistory(orders) {
  try {
    const done = orders.filter(o => ['LIVREE','ANNULEE'].includes(o.statut));
    if (done.length > 0) localStorage.setItem(HIST_KEY, JSON.stringify(done));
  } catch {}
}

/* ── Tick global (pour les timers) ── */
function useGlobalTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function elapsed(ts) {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
}

function mmss(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

const DELAI_PRESETS = [10, 15, 20, 30, 45];

function formatHM(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400)return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.3);
  } catch (_) {}
}

function lieu(order) {
  if (order.isB2B) return order._b2bLieu || order.entreprise || 'Entreprise';
  if (order.modeLivraison === 'SUR_PLACE') return `Table ${order.tableNumero ?? '?'}`;
  if (order.modeLivraison === 'EMPORTER')  return 'À emporter';
  if (order.modeLivraison === 'LIVRAISON') return 'Livraison';
  return order.modeLivraison || 'Salle';
}

/* ══════════════════════════════════════════════════════════════════
   OrderCard — Carte commande active
   ══════════════════════════════════════════════════════════════════ */
function OrderCard({ order, onAction, onPay, saving, col, onDragStart, onDragEnd, onDispatch, onSetDelai }) {
  useGlobalTick();
  const sec    = elapsed(order.createdAt);
  const ageMin = Math.floor(sec / 60);
  const urgent = sec >= 1200;
  const warn   = sec >= 600;
  const tColor = urgent ? RED : warn ? AMBER : MUTED;
  const next   = NEXT_STATUT[order.statut];
  const needsPayment = order.isB2B && next === 'EN_PREP' && !order.estPaye;
  const minsUntilDelivery = order._b2bDateLivraison ? minutesUntil(order._b2bDateLivraison) : null;
  const showDispatch = order.modeLivraison === 'LIVRAISON' && ['PRETE', 'EN_LIVRAISON'].includes(order.statut);

  // Compte à rebours délai estimé
  const remainMin  = order.delaiEstime != null ? order.delaiEstime - ageMin : null;
  const isOverdue  = remainMin !== null && remainMin <= 0;
  const delaiUrgent = remainMin !== null && remainMin <= 3 && !isOverdue;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(order.id); }}
      onDragEnd={onDragEnd}
      style={{
      background: urgent ? '#FFF8F8' : CARD,
      borderRadius: 18,
      border: `1px solid ${urgent ? '#FCA5A5' : BORDER}`,
      borderTop: `3px solid ${urgent ? RED : warn ? AMBER : col.accent}`,
      boxShadow: urgent
        ? '0 4px 20px rgba(220,38,38,0.12)'
        : '0 2px 10px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      cursor: 'grab',
      transition: 'transform 0.12s, box-shadow 0.12s',
      animation: urgent ? 'kds-urgent-blink 1.8s ease-in-out infinite' : undefined,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = urgent
          ? '0 8px 28px rgba(220,38,38,0.18)'
          : '0 6px 20px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = urgent
          ? '0 4px 20px rgba(220,38,38,0.12)'
          : '0 2px 10px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ padding: '14px 15px 15px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: '-0.02em' }}>
                {order.numero ? `CMD-${order.numero}` : `#${order.id?.slice(0, 6)}`}
              </p>
              {order.isB2B && (
                <span style={{ fontSize: 9, fontWeight: 800, background: '#EDE9FE', color: PURPLE, padding: '2px 7px', borderRadius: 99, letterSpacing: '0.06em' }}>
                  B2B
                </span>
              )}
              {urgent && (
                <span style={{ fontSize: 9, fontWeight: 800, background: '#FEE2E2', color: RED, padding: '2px 7px', borderRadius: 99, letterSpacing: '0.08em' }}>
                  URGENT
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              {order.isB2B ? <Building2 size={10} /> : <UtensilsCrossed size={10} />} {lieu(order)}
            </p>
          </div>

          {/* Chrono + délai */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: urgent ? RED_L : warn ? '#FFFBEB' : '#F9FAFB',
              border: `1px solid ${urgent ? '#FCA5A5' : warn ? '#FDE68A' : BORDER}`,
              borderRadius: 99, padding: '5px 10px',
            }}>
              <Clock size={11} color={tColor} />
              <span style={{ fontSize: 12, fontWeight: 800, color: tColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                {formatHM(ageMin)}
              </span>
            </div>
            {remainMin !== null && (
              <span style={{
                fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '3px 8px',
                background: isOverdue ? RED : delaiUrgent ? AMBER : '#DCFCE7',
                color: isOverdue ? '#fff' : delaiUrgent ? '#92400E' : GREEN,
              }}>
                {isOverdue ? `RETARD ${formatHM(Math.abs(remainMin))}` : `${formatHM(remainMin)} restant`}
              </span>
            )}
          </div>
        </div>

        {/* Délai estimé rapide */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Délai estimé</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DELAI_PRESETS.map(d => (
              <button key={d} onClick={() => onSetDelai?.(order.id, d)}
                style={{ padding: '3px 9px', fontSize: 10, fontWeight: 800, borderRadius: 99, border: `1px solid ${order.delaiEstime === d ? OG : BORDER}`, background: order.delaiEstime === d ? OG : '#fff', color: order.delaiEstime === d ? '#fff' : MUTED, cursor: 'pointer', transition: 'all 0.15s' }}>
                {d}min
              </button>
            ))}
            {order.delaiEstime && (
              <button onClick={() => onSetDelai?.(order.id, 0)}
                style={{ padding: '3px 9px', fontSize: 10, fontWeight: 800, borderRadius: 99, border: '1px solid #FCA5A5', background: '#FFF5F5', color: RED, cursor: 'pointer' }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Articles — personnalisation complète */}
        <div style={{ marginBottom: 12, padding: '10px 12px', background: col.accentL, borderRadius: 12, border: `1px solid ${col.accent}18` }}>
          {(order.lignes || []).map((l, i) => (
            <div key={l.id || i} style={{ marginBottom: i < (order.lignes.length - 1) ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: col.accent, minWidth: 26, flexShrink: 0, marginTop: 1 }}>{l.quantite}×</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: l.servi ? FAINT : NAVY, textDecoration: l.servi ? 'line-through' : 'none', lineHeight: 1.35 }}>
                      {l.article?.nom || l.nomArticle || 'Article'}
                    </span>
                    {l.servi && <CheckCircle2 size={12} color={GREEN} style={{ flexShrink: 0 }} />}
                  </div>
                  {/* Variante */}
                  {l.variantLabel && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3, fontSize: 10, fontWeight: 800, color: '#5B21B6', background: '#EDE9FE', padding: '2px 7px', borderRadius: 5 }}>
                      {l.variantLabel}{l.variantSupplement > 0 ? ` +${Number(l.variantSupplement).toLocaleString('fr-FR')} F` : ''}
                    </span>
                  )}
                  {/* Instructions */}
                  {l.instructions && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 4, fontSize: 10, fontWeight: 700, color: OG_D, background: OG_L, padding: '4px 8px', borderRadius: 6, lineHeight: 1.4 }}>
                      <span style={{ flexShrink: 0 }}>📝</span>
                      <span>{l.instructions}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info livraison B2B */}
        {order.isB2B && order._b2bDateLivraison && (
          <div style={{
            marginBottom: 10, padding: '8px 12px', borderRadius: 10,
            background: minsUntilDelivery !== null && minsUntilDelivery <= 30
              ? '#FEF3C7' : '#EFF6FF',
            border: `1px solid ${minsUntilDelivery !== null && minsUntilDelivery <= 30 ? '#FCD34D' : '#BFDBFE'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
              color: minsUntilDelivery !== null && minsUntilDelivery <= 30 ? '#92400E' : '#1D4ED8' }}>
              <CalendarClock size={11} />
              {fmtLivraison(order._b2bDateLivraison, order._b2bHeureLivraison)}
              {minsUntilDelivery !== null && minsUntilDelivery <= 120 && (
                <span style={{ marginLeft: 4, fontWeight: 800, color: minsUntilDelivery <= 30 ? RED : AMBER }}>
                  ({minsUntilDelivery <= 0 ? 'maintenant' : `dans ${minsUntilDelivery} min`})
                </span>
              )}
            </div>
            {order._b2bLieu && (
              <div style={{ fontSize: 10, color: '#8B6E50', marginTop: 2 }}>→ {order._b2bLieu}</div>
            )}
          </div>
        )}

        {/* Badge paiement */}
        {order.isB2B && order.estPaye ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
            color: '#166534', background: '#DCFCE7', borderRadius: 8, padding: '4px 10px', marginBottom: 10 }}>
            <CheckCircle2 size={10} /> Encaissé
          </div>
        ) : !order.isB2B && order.estPaye ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
            color: ['ESPECES','CARTE_BANCAIRE'].includes(order.modePaiement) ? '#166534' : '#1E40AF',
            background: ['ESPECES','CARTE_BANCAIRE'].includes(order.modePaiement) ? '#DCFCE7' : '#DBEAFE',
            borderRadius: 8, padding: '4px 10px', marginBottom: 10 }}>
            <CreditCard size={10} />
            {['ESPECES','CARTE_BANCAIRE'].includes(order.modePaiement)
              ? `Payé (${order.modePaiement === 'ESPECES' ? 'Espèces' : 'Carte'})`
              : 'Payé (Frais déduits)'}
          </div>
        ) : !order.isB2B && !order.estPaye ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
            color: '#92400E', background: '#FEF3C7', borderRadius: 8, padding: '4px 10px', marginBottom: 10 }}>
            <AlertCircle size={10} /> Non Payé
          </div>
        ) : null}

        {/* Bouton action */}
        {needsPayment ? (
          <button
            onClick={() => onPay(order.id)}
            disabled={saving === order.id}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#059669,#10b981)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: saving === order.id ? 'not-allowed' : 'pointer',
              opacity: saving === order.id ? 0.65 : 1,
              boxShadow: '0 3px 12px rgba(5,150,105,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saving === order.id
              ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'kds-spin 0.7s linear infinite', flexShrink: 0 }} />Traitement…</>
              : <><CreditCard size={13} /> Encaisser à la caisse</>
            }
          </button>
        ) : next ? (
          <button
            onClick={() => onAction(order.id, next)}
            disabled={saving === order.id}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 12, border: 'none',
              background: urgent
                ? `linear-gradient(135deg, ${RED}, #ef4444)`
                : col.grad,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: saving === order.id ? 'not-allowed' : 'pointer',
              opacity: saving === order.id ? 0.65 : 1,
              boxShadow: urgent
                ? '0 4px 14px rgba(220,38,38,0.35)'
                : `0 3px 12px ${col.accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
          >
            {saving === order.id
              ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'kds-spin 0.7s linear infinite', flexShrink: 0 }} />Traitement…</>
              : ACTION_LABELS[next] || next
            }
          </button>
        ) : ['LIVREE', 'ANNULEE'].includes(order.statut) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 12, background: order.statut === 'LIVREE' ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${order.statut === 'LIVREE' ? '#BBF7D0' : '#FECACA'}` }}>
            {order.statut === 'LIVREE'
              ? <><CheckCheck size={13} color={GREEN} /><span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Terminée</span></>
              : <><Ban size={13} color={RED} /><span style={{ fontSize: 12, fontWeight: 700, color: RED }}>Annulée</span></>
            }
          </div>
        )}

        {showDispatch && onDispatch && (
          <button
            onClick={() => onDispatch(order)}
            style={{
              marginTop: 8, width: '100%', padding: '9px 12px', borderRadius: 12,
              border: `1.5px solid ${OG}`, background: OG_L,
              color: OG_D, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,140,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = OG_L; }}
          >
            <Truck size={13} /> Dispatcher la livraison
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HistoryRow — Ligne de commande traitée dans l'historique
   ══════════════════════════════════════════════════════════════════ */
function HistoryRow({ order }) {
  const isLivree = order.statut === 'LIVREE';
  const ts = order.updatedAt || order.createdAt;
  const articlesList = (order.lignes || [])
    .slice(0, 3)
    .map(l => `${l.quantite}× ${l.article?.nom || l.nomArticle || 'Art.'}`)
    .join(' · ');
  const hasMore = (order.lignes || []).length > 3;
  const total   = Number(order.montantTotal || 0);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      borderBottom: `1px solid ${BORDER}`,
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icône statut */}
      <div style={{
        width: 38, height: 38, borderRadius: 13, flexShrink: 0,
        background: isLivree ? '#ECFDF5' : '#FEF2F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isLivree
          ? <CheckCheck size={16} color={GREEN} />
          : <Ban size={16} color={RED} />
        }
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>
            {order.numero ? `CMD-${order.numero}` : `#${order.id?.slice(0, 6)}`}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: isLivree ? '#ECFDF5' : '#FEF2F2', color: isLivree ? GREEN : RED }}>
            {isLivree ? 'Livrée' : 'Annulée'}
          </span>
          <span style={{ fontSize: 10, color: FAINT, marginLeft: 'auto', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {timeAgo(ts)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lieu(order)}
          {articlesList ? ` · ${articlesList}${hasMore ? ' …' : ''}` : ''}
        </p>
      </div>

      {/* Montant */}
      {total > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: isLivree ? GREEN : MUTED }}>
            {total.toLocaleString('fr-FR')}
          </p>
          <p style={{ margin: 0, fontSize: 9, color: FAINT, fontWeight: 600 }}>FCFA</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KDSColumn — Colonne Kanban
   ══════════════════════════════════════════════════════════════════ */
function KDSColumn({ col, orders, onAction, onPay, saving, onDragStart, onDragEnd, onDropCard, onDispatch, onSetDelai }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDropCard(col.statuts[0]); }}
    >
      {/* Header colonne */}
      <div style={{
        background: col.grad, borderRadius: 16, padding: '13px 15px',
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 9,
        boxShadow: `0 4px 16px ${col.accent}33`,
        outline: dragOver ? `2px solid ${col.accent}` : 'none',
        transition: 'outline 0.12s',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', flex: 1, letterSpacing: '-0.01em' }}>
          {col.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', background: 'rgba(255,255,255,0.22)', padding: '3px 11px', borderRadius: 99, minWidth: 30, textAlign: 'center' }}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        minHeight: 80, borderRadius: 14,
        background: dragOver ? `${col.accent}0a` : 'transparent',
        transition: 'background 0.15s',
        padding: dragOver ? 6 : 0,
      }}>
        {orders.length === 0 ? (
          <div style={{ background: dragOver ? `${col.accent}14` : CARD, border: `1.5px dashed ${dragOver ? col.accent : BORDER}`, borderRadius: 18, padding: '32px 16px', textAlign: 'center', transition: 'all 0.15s' }}>
            <ChefHat size={28} color={dragOver ? col.accent : BORDER} style={{ display: 'block', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 12, color: dragOver ? col.accent : FAINT, fontWeight: 500 }}>
              {dragOver ? 'Déposer ici' : 'Aucune commande'}
            </p>
          </div>
        ) : orders.map(o => (
          <OrderCard key={o.id} order={o} onAction={onAction} onPay={onPay} saving={saving} col={col}
            onDragStart={onDragStart} onDragEnd={onDragEnd} onDispatch={onDispatch} onSetDelai={onSetDelai} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KDSStaff — Page principale
   ══════════════════════════════════════════════════════════════════ */
export default function KDSStaff() {
  const { user } = useAuth();
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState('');
  const [lastEvent,    setLastEvent]    = useState('');
  const [showHistory,  setShowHistory]  = useState(true);
  const [histFilter,   setHistFilter]   = useState('all');
  const [reminders,    setReminders]    = useState([]);
  const [draggedId,    setDraggedId]    = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);

  const upsert = useCallback(o => {
    if (!o?.id) return;
    setOrders(prev => {
      const i = prev.findIndex(x => x.id === o.id);
      let updated;
      if (i === -1) updated = [o, ...prev];
      else { updated = [...prev]; updated[i] = { ...updated[i], ...o }; }
      if (['LIVREE','ANNULEE'].includes(o.statut)) persistHistory(updated);
      return updated;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setError('');
      const [r, b2bR] = await Promise.all([
        commandesService.getKDS(),
        b2bAPI.getRestaurantKDS().catch(() => ({ data: [] })),
      ]);
      const fresh = r.data || [];
      const b2bOrders = (b2bR.data || []).map(cmd => ({
        id: cmd.id,
        numero: cmd.numero,
        isB2B: true,
        statut: B2B_TO_KDS[cmd.statut] || cmd.statut,
        estPaye: cmd.estPaye || false,
        _b2bLieu: cmd.lieuLivraison,
        _b2bDateLivraison: cmd.dateLivraison,
        _b2bHeureLivraison: cmd.heureLivraison,
        entreprise: cmd.entreprise,
        createdAt: cmd.createdAt,
        montantTotal: cmd.totalEstime,
        lignes: (cmd.lignes || []).map(l => ({
          id: l.id, quantite: l.quantite,
          article: { nom: l.nomArticle }, nomArticle: l.nomArticle,
        })),
      }));
      const allFresh = [...fresh, ...b2bOrders];
      const stored = loadPersistedHistory();
      const freshIds = new Set(allFresh.map(o => o.id));
      const merged = [...allFresh, ...stored.filter(o => !freshIds.has(o.id))];
      setOrders(merged);
      persistHistory(merged);
    } catch {
      const stored = loadPersistedHistory();
      if (stored.length > 0) setOrders(prev => {
        const activeIds = new Set(prev.filter(o => !['LIVREE','ANNULEE'].includes(o.statut)).map(o => o.id));
        return [...prev, ...stored.filter(o => !activeIds.has(o.id))];
      });
      setError('Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const s = createCommandesSocket(user);
    s.on('commande.nouvelle',     p => { beep(); setLastEvent(`Nouvelle · CMD-${p?.numero || ''}`); load(); });
    s.on('commande.b2b.nouvelle', p => { beep(); setLastEvent(`B2B · ${p?.entreprise || 'CMD-' + (p?.numero || '')}`); load(); });
    s.on('commande.b2b.statut',   p => {
      if (p?.estPaye !== undefined) {
        setOrders(prev => prev.map(o => o.id === p.id ? { ...o, estPaye: p.estPaye, statut: B2B_TO_KDS[p.statut] || p.statut } : o));
      } else {
        load();
      }
    });
    s.on('commande.b2b.rappel', p => {
      beep(); beep();
      setReminders(prev => {
        if (prev.find(r => r.id === p?.id && r.urgence === p?.urgence)) return prev;
        return [{ ...p, shownAt: Date.now() }, ...prev].slice(0, 6);
      });
      setLastEvent(`Rappel B2B · ${p?.entreprise || p?.numero} · dans ${p?.urgence}`);
    });
    s.on('commande.statut',       p => { setLastEvent(`Statut · CMD-${p?.numero || ''}`); upsert(p); });
    s.on('commande.paiement',     p => upsert(p));
    s.on('reconnect',             () => load());
    return () => s.disconnect();
  }, [load, upsert, user]);

  /* Polling silencieux 8s */
  useEffect(() => {
    const id = setInterval(() => load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  const onPay = async (id) => {
    setSaving(id);
    try {
      await b2bAPI.confirmerPaiementB2B(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, estPaye: true } : o));
    } catch {
      setError('Impossible d\'enregistrer le paiement.');
    } finally {
      setSaving('');
    }
  };

  const onSetDelai = async (id, delaiEstime) => {
    try {
      await commandesService.updateDelai(id, delaiEstime);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, delaiEstime: delaiEstime > 0 ? delaiEstime : undefined } : o));
    } catch { /* ignore */ }
  };

  const onAction = async (id, kdsNext) => {
    const order = orders.find(o => o.id === id);

    if (order?.isB2B) {
      const b2bStatut = B2B_KDS_NEXT[kdsNext] ?? kdsNext;
      setSaving(id);
      try {
        await b2bAPI.updateCommandeGroupeeStatut(id, b2bStatut);
        const newKds = B2B_TO_KDS[b2bStatut] || b2bStatut;
        setOrders(prev => {
          const updated = prev.map(o => o.id === id ? { ...o, statut: newKds } : o);
          if (['LIVREE','ANNULEE'].includes(newKds)) persistHistory(updated);
          return updated;
        });
      } catch {
        setError('Mise à jour impossible.');
      } finally {
        setSaving('');
      }
      return;
    }

    if (kdsNext === 'EN_PREP') {
      const isDelivery = order?.modeLivraison === 'LIVRAISON';
      if (order && !order.estPaye && !isDelivery) {
        setError('Paiement requis — Validez le paiement à la caisse avant de démarrer la préparation.');
        return;
      }
    }
    setSaving(id);
    try {
      await commandesService.updateStatut(id, kdsNext);
      setOrders(prev => {
        const updated = prev.map(o => o.id === id ? { ...o, statut: kdsNext } : o);
        if (['LIVREE','ANNULEE'].includes(kdsNext)) persistHistory(updated);
        return updated;
      });
    } catch {
      setError('Mise à jour impossible.');
    } finally {
      setSaving('');
    }
  };

  /* Données dérivées */
  const activeStatuts = new Set(COLS.flatMap(c => c.statuts));
  const activeOrders  = orders.filter(o => activeStatuts.has(o.statut));
  const historyOrders = orders
    .filter(o => ['LIVREE', 'ANNULEE'].includes(o.statut))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const filteredHistory = histFilter === 'all'      ? historyOrders
                        : histFilter === 'livrees'  ? historyOrders.filter(o => o.statut === 'LIVREE')
                        : historyOrders.filter(o => o.statut === 'ANNULEE');

  const grouped = COLS.map(col => ({
    ...col,
    orders: activeOrders
      .filter(o => col.statuts.includes(o.statut))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  }));

  const urgents   = activeOrders.filter(o => elapsed(o.createdAt) >= 1200).length;
  const livreesToday = historyOrders.filter(o => {
    const ts = o.updatedAt || o.createdAt;
    return ts && new Date(ts).toDateString() === new Date().toDateString() && o.statut === 'LIVREE';
  }).length;

  return (
    <div style={{ fontFamily: "'Manrope', Inter, system-ui, sans-serif", minHeight: '100%' }}>
      <style>{`
        @keyframes kds-spin { to { transform: rotate(360deg); } }
        @keyframes kds-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kds-urgent-blink {
          0%, 100% { border-color: #FFBDAD; box-shadow: 0 4px 20px rgba(186,26,26,0.12); }
          50% { border-color: #BA1A1A; box-shadow: 0 4px 24px rgba(186,26,26,0.32); }
        }
      `}</style>


      {/* Rappels livraison B2B */}
      {reminders.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 14, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Bell size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#92400E', margin: '0 0 8px' }}>Rappels de livraison B2B</p>
              {reminders.map((r, i) => (
                <div key={`${r.id}-${r.urgence}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#78350F', marginBottom: i < reminders.length - 1 ? 5 : 0 }}>
                  <span style={{ fontWeight: 800, color: r.urgence === '30min' ? RED : AMBER, background: r.urgence === '30min' ? '#FEE2E2' : '#FEF3C7', padding: '1px 7px', borderRadius: 99, fontSize: 10 }}>
                    {r.urgence === '30min' ? '⚠ 30 min' : '🔔 2h'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{r.entreprise || r.numero}</span>
                  <span>· {r.heureLivraison}</span>
                  {r.lieuLivraison && <span style={{ color: '#9CA3AF' }}>→ {r.lieuLivraison}</span>}
                  <button onClick={() => setReminders(prev => prev.filter((x, xi) => xi !== i))}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
                    <X size={10} color="#92400E" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: RED_L, border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: RED, fontWeight: 600 }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={13} color={RED} />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(151,49,0,0.12)', borderTopColor: OG, animation: 'kds-spin 0.8s linear infinite' }} />
          <p style={{ margin: 0, fontSize: 13, color: MUTED, fontWeight: 600 }}>Chargement des commandes…</p>
        </div>
      ) : (
        <>
          {/* ── 4 COLONNES ACTIVES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start', marginBottom: 28 }}>
            {grouped.map(col => (
              <KDSColumn key={col.id} col={col} orders={col.orders} onAction={onAction} onPay={onPay} saving={saving}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
                onDispatch={setDispatchOrder}
                onSetDelai={onSetDelai}
                onDropCard={(targetStatut) => {
                  if (!draggedId) return;
                  const order = orders.find(o => o.id === draggedId);
                  if (!order || order.statut === targetStatut) return;
                  onAction(draggedId, targetStatut);
                  setDraggedId(null);
                }}
              />
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════
              SECTION HISTORIQUE
          ═══════════════════════════════════════════════════════ */}
          <div style={{
            background: CARD, borderRadius: 24, overflow: 'hidden',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            animation: 'kds-fade-in 0.3s ease',
          }}>
            {/* Header historique */}
            <div
              onClick={() => setShowHistory(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', borderBottom: showHistory ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', background: showHistory ? '#FAFAFA' : CARD, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background = showHistory ? '#FAFAFA' : CARD)}
            >
              <div style={{ width: 40, height: 40, borderRadius: 13, background: OG_G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 10px ${OG}44` }}>
                <History size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>
                  Historique du service
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED, fontWeight: 500 }}>
                  {historyOrders.length} commande{historyOrders.length !== 1 ? 's' : ''} traitée{historyOrders.length !== 1 ? 's' : ''}
                  {livreesToday > 0 && ` · ${livreesToday} livrée${livreesToday > 1 ? 's' : ''} aujourd'hui`}
                </p>
              </div>

              {/* Stats livrees/annulees */}
              <div style={{ display: 'flex', gap: 8, marginRight: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, background: '#ECFDF5', color: GREEN, padding: '5px 12px', borderRadius: 99 }}>
                  <CheckCheck size={11} /> {historyOrders.filter(o => o.statut === 'LIVREE').length} Livrées
                </span>
                {historyOrders.filter(o => o.statut === 'ANNULEE').length > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, background: '#FEF2F2', color: RED, padding: '5px 12px', borderRadius: 99 }}>
                    <Ban size={11} /> {historyOrders.filter(o => o.statut === 'ANNULEE').length} Annulées
                  </span>
                )}
              </div>

              {showHistory
                ? <ChevronUp size={18} color={MUTED} style={{ flexShrink: 0 }} />
                : <ChevronDown size={18} color={MUTED} style={{ flexShrink: 0 }} />
              }
            </div>

            {/* Corps historique */}
            {showHistory && (
              <>
                {/* Filtres */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 22px', borderBottom: `1px solid ${BORDER}`, background: '#FAFAFA' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Filtrer :</span>
                  {[
                    { id: 'all',     label: `Toutes (${historyOrders.length})` },
                    { id: 'livrees', label: `Livrées (${historyOrders.filter(o => o.statut === 'LIVREE').length})` },
                    { id: 'annulees',label: `Annulées (${historyOrders.filter(o => o.statut === 'ANNULEE').length})` },
                  ].map(f => (
                    <button key={f.id} onClick={e => { e.stopPropagation(); setHistFilter(f.id); }}
                      style={{
                        padding: '6px 14px', borderRadius: 99, border: `1.5px solid ${histFilter === f.id ? OG : BORDER}`,
                        background: histFilter === f.id ? OG : CARD,
                        color: histFilter === f.id ? '#fff' : MUTED,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        boxShadow: histFilter === f.id ? `0 2px 10px ${OG}44` : 'none',
                        transition: 'all 0.13s',
                      }}>
                      {f.label}
                    </button>
                  ))}
                  {historyOrders.length === 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: FAINT, fontWeight: 500 }}>
                      Les commandes traitées apparaissent ici
                    </span>
                  )}
                </div>

                {/* Liste */}
                {filteredHistory.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: OG_L, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <History size={22} color={OG} />
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Aucun historique</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>Les commandes terminées et annulées apparaîtront ici.</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    {filteredHistory.map(o => (
                      <HistoryRow key={o.id} order={o} />
                    ))}
                  </div>
                )}

                {/* Footer recap */}
                {filteredHistory.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', background: '#F9FAFB', borderTop: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                      {filteredHistory.length} commande{filteredHistory.length > 1 ? 's' : ''} affichée{filteredHistory.length > 1 ? 's' : ''}
                    </span>
                    {filteredHistory.filter(o => o.statut === 'LIVREE').length > 0 && (
                      <span style={{ fontSize: 12, color: GREEN, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCheck size={12} />
                        Total encaissé : {filteredHistory.filter(o => o.statut === 'LIVREE').reduce((s, o) => s + Number(o.montantTotal || 0), 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {dispatchOrder && (
        <DispatchModal
          commande={dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          onDispatched={() => { setDispatchOrder(null); load(); }}
        />
      )}
    </div>
  );
}
