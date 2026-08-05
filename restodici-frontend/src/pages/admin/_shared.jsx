/* ═══════════════════════════════════════════════════════════════
   _shared.jsx — Éléments partagés par les onglets de l'AdminDashboard
   (badges, cartes KPI, graphiques, heatmap, modale de suppression,
   bannières B2B/contestations, indicateur temps réel)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Check, XCircle } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useAdminRevision, useAdminRealtimeStatus } from '../../hooks/useAdminRealtime';
import { ACCENT, ROLE_COLOR, DAY_LABELS, card } from './_colors';

/* ── Composants utilitaires ── */
export function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg: '#F1F5F9', text: '#475569' };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{role}</span>;
}

export function SectionHeader({ title, onRefresh, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 24, borderRadius: 3, background: 'linear-gradient(180deg, #2563EB, #0F172A)' }} />
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} disabled={loading}
          style={{ background: loading ? '#F1F5F9' : 'transparent', border: `1px solid #E2E8F0`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: loading ? '#CBD5E1' : '#475569', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = `${ACCENT}10`; e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}>
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      )}
    </div>
  );
}

/* ══════════════════ Carte KPI ══════════════════ */
export function KpiCard({ label, value, sub, trend, trendUp, color = ACCENT, icon: Icon, featured = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${color}22, 0 2px 8px rgba(0,0,0,0.06)` }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{
        ...card,
        padding: '24px',
        background: featured ? `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)` : '#fff',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: featured ? 'rgba(255,255,255,0.2)' : `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon style={{ width: 22, height: 22, color: featured ? '#fff' : color }} />
          </div>
        )}
        {trendUp !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: featured ? 'rgba(255,255,255,0.15)' : (trendUp ? '#ECFDF5' : '#FFF1F2'),
            borderRadius: 99, padding: '4px 10px',
          }}>
            {trendUp
              ? <TrendingUp style={{ width: 11, height: 11, color: featured ? '#fff' : '#16A34A' }} />
              : <TrendingDown style={{ width: 11, height: 11, color: featured ? 'rgba(255,255,255,0.7)' : '#DC2626' }} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: featured ? '#fff' : (trendUp ? '#16A34A' : '#DC2626') }}>
              {trend}
            </span>
          </div>
        )}
      </div>

      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: featured ? 'rgba(255,255,255,0.7)' : '#64748B', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 900, color: featured ? '#fff' : '#0F172A', lineHeight: 1, letterSpacing: '-0.04em' }}>
        {value ?? '—'}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: 12, color: featured ? 'rgba(255,255,255,0.55)' : '#94A3B8', fontWeight: 500 }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

/* ══════════════════ Graphique barres — Inscriptions & Activité ══════════════════ */
export function BarComboChart({ usersByDay, auditByDay }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !usersByDay?.length) return;
    chartRef.current?.destroy();

    const labels = usersByDay.map(d => {
      const dt = new Date(d.day + 'T00:00:00');
      return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Inscriptions',
            data: usersByDay.map(d => d.count),
            backgroundColor: 'rgba(37,99,235,0.75)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Actions audit',
            data: auditByDay.map(d => d.count),
            backgroundColor: 'rgba(15,23,42,0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F9F9FC',
            bodyColor: '#CBD5E1',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11 } },
          },
          y: {
            grid: { color: '#F1F5F9', drawTicks: false },
            border: { display: false, dash: [4, 4] },
            ticks: { color: '#94A3B8', font: { size: 11 }, padding: 8 },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [usersByDay, auditByDay]);

  return <canvas ref={canvasRef} />;
}

/* ══════════════════ Graphique donut — Répartition des rôles ══════════════════ */
export function DonutRolesChart({ roleDist }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !roleDist?.length) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: roleDist.map(r => r.role),
        datasets: [{
          data: roleDist.map(r => r.count),
          backgroundColor: roleDist.map(r => ROLE_COLOR[r.role]?.chart || '#94A3B8'),
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#973100',
            titleColor: '#F9F9FC',
            bodyColor: '#CBD5E1',
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [roleDist]);

  return <canvas ref={canvasRef} />;
}

/* ══════════════════ Carte de chaleur — Activité ══════════════════ */
export function ActivityHeatmap({ heatmap }) {
  if (!heatmap?.length) {
    return <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 12 }}>Données insuffisantes</div>;
  }

  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const maxVal = Math.max(...heatmap.map(h => h.count), 1);

  const getCount = (dow, hour) => {
    const found = heatmap.find(h => h.dow === dow && h.hour === hour);
    return found?.count || 0;
  };

  const getColor = (count) => {
    if (count === 0) return '#F8FAFC';
    const intensity = count / maxVal;
    if (intensity < 0.25) return '#DBEAFE';
    if (intensity < 0.5) return '#93C5FD';
    if (intensity < 0.75) return '#3B82F6';
    return '#1D4ED8';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, gap: 3, minWidth: 340 }}>
        {/* Headers jours */}
        <div />
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'center', paddingBottom: 4 }}>{d}</div>
        ))}
        {/* Rows par heure */}
        {hours.map(h => (
          <div style={{display: 'contents'}} key={`h${h}`}>
            <div style={{ fontSize: 10, color: '#94A3B8', textAlign: 'right', paddingRight: 8, lineHeight: '22px' }}>{h}h</div>
            {Array.from({ length: 7 }, (_, dow) => {
              const count = getCount(dow, h);
              return (
                <div
                  key={`${dow}-${h}`}
                  title={`${DAY_LABELS[dow]} ${h}h : ${count} action${count > 1 ? 's' : ''}`}
                  style={{ width: '100%', height: 22, borderRadius: 4, background: getColor(count), cursor: count > 0 ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>Peu</span>
        {['#F8FAFC', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'].map(c => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: '#94A3B8' }}>Beaucoup</span>
      </div>
    </div>
  );
}

/* ══════════════════ Modale de confirmation de suppression ══════════════════ */
export function ConfirmDeleteModal({ target, onClose, onConfirm, deleting }) {
  if (!target) return null;
  const isUser = target.type === 'user';
  const name = isUser
    ? [target.item.prenom, target.item.nom].filter(Boolean).join(' ') || target.item.email
    : target.item.nom;

  return (
    <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AlertTriangle style={{ width: 24, height: 24 }} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
          Supprimer {isUser ? 'ce compte utilisateur' : 'ce restaurant'} ?
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
          Êtes-vous sûr de vouloir supprimer définitivement <strong style={{ color: '#0F172A' }}>{name}</strong> ? Cette action est irréversible et supprimera l'ensemble de ses données.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={deleting} style={{ flex: 1, background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 10, padding: '11px 0', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: deleting ? 0.7 : 1 }}>
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Bannière — Commandes B2B en attente ══════════════════ */
export function B2BPendingBanner() {
  const [pending, setPending] = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => { adminAPI.getPendingB2B().then(r => setPending(r.data)).catch(() => { }); }, []);

  const validate = async (id, approved) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try { await adminAPI.validateB2B(id, approved); setPending(p => p.filter(c => c.id !== id)); }
    finally { setProcessing(p => ({ ...p, [id]: false })); }
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: '#D97706' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{pending.length} compte{pending.length > 1 ? 's' : ''} B2B en attente</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #FEF3C7', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{c.raisonSociale}</p>
              <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{c.emailProfessionnel} · RCCM : {c.numeroRCCM}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => validate(c.id, false)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle style={{ width: 13, height: 13 }} /> Rejeter
              </button>
              <button onClick={() => validate(c.id, true)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 13, height: 13 }} /> Valider
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════ Bannière — Factures en contestation ══════════════════ */
export function ContestationsBanner() {
  const revision = useAdminRevision();
  const [factures, setFactures] = useState([]);
  const [processing, setProcessing] = useState({});
  const [noteModal, setNoteModal] = useState(null); // { id, accept }
  const [note, setNote] = useState('');

  const load = () => adminAPI.getContestations().then(r => setFactures(r.data || [])).catch(() => { });
  useEffect(() => { load(); }, [revision]);

  const resolve = async (id, accepted) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      await adminAPI.resolveContestation(id, accepted, note);
      setNoteModal(null);
      setNote('');
      load();
    } finally { setProcessing(p => ({ ...p, [id]: false })); }
  };

  if (factures.length === 0) return null;

  return (
    <>
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#6366F1' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3730A3' }}>
            {factures.length} facture{factures.length > 1 ? 's' : ''} en contestation
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {factures.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(234,60,12,0.2)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {f.compteB2B?.raisonSociale} — #{f.numeroFacture}
                </p>
                <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>
                  {f.mois} {f.annee} · {Number(f.montantTTC).toLocaleString()} FCFA
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setNoteModal({ id: f.id, accept: false }); setNote(''); }}
                  disabled={processing[f.id]}
                  style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle style={{ width: 13, height: 13 }} /> Rejeter
                </button>
                <button onClick={() => { setNoteModal({ id: f.id, accept: true }); setNote(''); }}
                  disabled={processing[f.id]}
                  style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check style={{ width: 13, height: 13 }} /> Accepter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              {noteModal.accept ? 'Accepter la contestation' : 'Rejeter la contestation'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
              {noteModal.accept
                ? 'La facture reviendra en statut En attente pour permettre une correction.'
                : 'La facture sera marquée comme payée et la contestation clôturée.'}
            </p>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Note pour le client (optionnel)..."
              rows={3} style={{ width: '100%', borderRadius: 10, border: '1px solid #E2E8F0', padding: '10px 12px', fontSize: 13, resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setNoteModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => resolve(noteModal.id, noteModal.accept)}
                disabled={processing[noteModal.id]}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: noteModal.accept ? '#22C55E' : '#EF4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {processing[noteModal.id] ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Témoin de l'état du flux temps réel : l'admin doit pouvoir distinguer
   « aucune activité » de « flux coupé, les chiffres sont peut-être périmés ». */
export function RealtimeIndicator() {
  const { connected, lastEvent } = useAdminRealtimeStatus();

  return (
    <div
      title={
        connected
          ? "Les données se rafraîchissent automatiquement à chaque événement du système."
          : "Flux temps réel interrompu — les données affichées peuvent être périmées. Rechargez la page."
      }
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 99,
        background: connected ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${connected ? '#BBF7D0' : '#FECACA'}`,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: connected ? '#16A34A' : '#DC2626',
        boxShadow: connected ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: connected ? '#15803D' : '#B91C1C' }}>
        {connected ? 'Temps réel actif' : 'Hors ligne'}
      </span>
      {connected && lastEvent && (
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
          · maj {new Date(lastEvent.at).toLocaleTimeString('fr-FR')}
        </span>
      )}
    </div>
  );
}
