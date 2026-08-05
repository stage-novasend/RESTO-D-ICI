/* AlertesTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Building2, Users, CreditCard, Zap, UtensilsCrossed, RefreshCw, AlertTriangle, XCircle, Check } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, card } from '../_colors';

/* ══════════════════ TAB: NOTIFICATIONS ══════════════════ */
export default function AlertesTab() {
  const revision = useAdminRevision();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  // Évite un setState après démontage (changement d'onglet pendant le fetch) :
  // sans ce garde, une réponse qui arrive après un unmount peut entrer en
  // collision avec la transition de route (React insertBefore/removeChild).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const CATEGORIES = {
    security: { label: 'Sécurité', color: '#DC2626', bg: '#FEF2F2', icon: Shield },
    b2b: { label: 'B2B', color: '#7C3AED', bg: '#F5F3FF', icon: Building2 },
    user: { label: 'Utilisateur', color: '#FF3A03', bg: '#FFF5EB', icon: Users },
    payment: { label: 'Paiement', color: '#059669', bg: '#F0FDF4', icon: CreditCard },
    system: { label: 'Système', color: '#D97706', bg: '#FFFBEB', icon: Zap },
    restaurant: { label: 'Restaurant', color: '#0891B2', bg: '#F0F9FF', icon: UtensilsCrossed },
  };

  const SEC_ACTIONS = new Set(['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'INVALID_TOKEN', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE']);
  const PAY_ACTIONS = new Set(['PAIEMENT_RECU', 'PAIEMENT_ECHOUE', 'REMBOURSEMENT', 'PAIEMENT_INITIE']);
  const B2B_ACTIONS = new Set(['B2B_CREATED', 'B2B_APPROVED', 'B2B_REJECTED', 'B2B_ORDER', 'B2B_INVOICE']);
  const REST_ACTIONS = new Set(['RESTAURANT_CREATED', 'RESTAURANT_UPDATED', 'RESTAURANT_DISABLED']);

  const categorize = (log) => {
    if (SEC_ACTIONS.has(log.action)) return 'security';
    if (PAY_ACTIONS.has(log.action)) return 'payment';
    if (B2B_ACTIONS.has(log.action)) return 'b2b';
    if (REST_ACTIONS.has(log.action)) return 'restaurant';
    if (['USER_CREATED', 'USER_UPDATED', 'REGISTER'].includes(log.action)) return 'user';
    return 'system';
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, pendingB2B] = await Promise.all([
        adminAPI.getAuditLogs({ limit: 80 }),
        adminAPI.getPendingB2B().catch(() => ({ data: [] })),
      ]);

      const logs = (logsRes.data || []).map(l => ({
        id: l.id,
        type: categorize(l),
        action: l.action,
        detail: l.details || l.metadata || null,
        userId: l.userId,
        createdAt: l.createdAt,
        source: 'audit',
      }));

      const b2bNotifs = (pendingB2B.data || []).map(c => ({
        id: `b2b-${c.id}`,
        type: 'b2b',
        action: 'B2B_PENDING',
        detail: `${c.raisonSociale} — ${c.emailProfessionnel}`,
        userId: null,
        createdAt: c.createdAt,
        source: 'b2b',
        pending: c,
      }));

      const merged = [...b2bNotifs, ...logs].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      if (mountedRef.current) setItems(merged);
    } catch { /* ignore */ }
    finally { if (mountedRef.current) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  const ACTION_LABELS = {
    LOGIN_FAILED: 'Tentative de connexion échouée',
    UNAUTHORIZED_ACCESS: 'Accès non autorisé détecté',
    INVALID_TOKEN: 'Token JWT invalide',
    SUSPICIOUS_ACTIVITY: 'Activité suspecte',
    BRUTE_FORCE: 'Attaque brute-force détectée',
    PAIEMENT_RECU: 'Paiement reçu',
    PAIEMENT_ECHOUE: 'Paiement échoué',
    REMBOURSEMENT: 'Remboursement effectué',
    PAIEMENT_INITIE: 'Paiement initié',
    B2B_CREATED: 'Nouveau compte B2B créé',
    B2B_APPROVED: 'Compte B2B approuvé',
    B2B_REJECTED: 'Compte B2B rejeté',
    B2B_ORDER: 'Commande B2B passée',
    B2B_INVOICE: 'Facture B2B générée',
    B2B_PENDING: 'Compte B2B en attente de validation',
    USER_CREATED: 'Nouvel utilisateur inscrit',
    USER_UPDATED: 'Profil utilisateur modifié',
    REGISTER: 'Inscription effectuée',
    RESTAURANT_CREATED: 'Nouveau restaurant ajouté',
    RESTAURANT_UPDATED: 'Restaurant mis à jour',
    RESTAURANT_DISABLED: 'Restaurant désactivé',
  };

  const displayed = filter === 'all' ? items : items.filter(i => i.type === filter);
  const counts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {});

  const [validating, setValidating] = useState({});
  const handleB2BAction = async (pendingItem, approved) => {
    setValidating(v => ({ ...v, [pendingItem.id]: true }));
    try {
      await adminAPI.validateB2B(pendingItem.pending.id, approved);
      setItems(prev => prev.filter(x => x.id !== pendingItem.id));
    } catch { /* ignore */ }
    finally { setValidating(v => ({ ...v, [pendingItem.id]: false })); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626' }} />
            Alertes système
          </h2>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
            {items.length} alerte{items.length > 1 ? 's' : ''} sur l'ensemble du système — actualisation auto toutes les 30s
          </p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Filtres par catégorie */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: filter === 'all' ? ACCENT : '#F1F5F9',
            color: filter === 'all' ? '#fff' : '#475569'
          }}>
          Tout ({items.length})
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const Icon = cat.icon;
          const count = counts[key] || 0;
          if (!count) return null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: filter === key ? cat.color : cat.bg,
                color: filter === key ? '#fff' : cat.color
              }}>
              <Icon style={{ width: 12, height: 12 }} />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            <RefreshCw style={{ width: 22, height: 22, margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
            Chargement des alertes…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
            <AlertTriangle style={{ width: 28, height: 28, margin: '0 auto 10px', display: 'block', color: '#CBD5E1' }} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Aucune alerte détectée</p>
          </div>
        ) : (
          <div style={{ maxHeight: 640, overflowY: 'auto' }}>
            {displayed.slice(0, 60).map((item, i) => {
              const cat = CATEGORIES[item.type] || CATEGORIES.system;
              const CatIcon = cat.icon;
              const label = ACTION_LABELS[item.action] || item.action;
              const isB2BPending = item.source === 'b2b';
              return (
                <div key={item.id ? `${item.id}-${i}` : `alert-${i}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px',
                    borderBottom: i < displayed.length - 1 ? '1px solid #F1F5F9' : 'none',
                    background: isB2BPending ? '#FFFBEB' : (i % 2 === 0 ? '#fff' : '#FAFBFF')
                  }}>

                  {/* Icône catégorie */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon style={{ width: 16, height: 16, color: cat.color }} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{label}</span>
                      <span style={{ background: cat.bg, color: cat.color, borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{cat.label}</span>
                      {isB2BPending && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>⚠ Action requise</span>
                      )}
                    </div>
                    {item.detail && (
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof item.detail === 'object' ? JSON.stringify(item.detail).slice(0, 80) : String(item.detail).slice(0, 80)}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {item.userId && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94A3B8' }}>
                          user:{item.userId.slice(0, 8)}…
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>
                        {new Date(item.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions B2B */}
                  {isB2BPending && item.pending && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleB2BAction(item, false)} disabled={validating[item.id]}
                        style={{ padding: '5px 10px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <XCircle style={{ width: 11, height: 11 }} /> Rejeter
                      </button>
                      <button onClick={() => handleB2BAction(item, true)} disabled={validating[item.id]}
                        style={{ padding: '5px 10px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Check style={{ width: 11, height: 11 }} /> Valider
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {displayed.length > 0 && (
        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: '12px 0 0' }}>
          Affichage des {Math.min(displayed.length, 60)} événements les plus récents sur {displayed.length}
        </p>
      )}
    </div>
  );
}
