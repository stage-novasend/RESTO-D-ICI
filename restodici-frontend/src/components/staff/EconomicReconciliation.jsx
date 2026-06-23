/**
 * EconomicReconciliation — Clôture de caisse & réconciliation Novasend
 * Lit l'historique localStorage (caisse_hist_v1) et calcule l'impact des frais
 * Novasend (variable 1–5 %) sur les encaissements digitaux de la session.
 */
import { useMemo, useState } from 'react';
import { X, TrendingDown, Download, Info, DollarSign, Wallet, CreditCard, Smartphone, Banknote } from 'lucide-react';

/* ── Tokens visuels (alignés CaissePage) ──────────────────────────── */
const BG    = '#F8FAFC';
const CARD  = '#FFFFFF';
const NAVY  = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const O     = '#FF8C00';
const OL    = '#FFF7ED';
const GREEN = '#16A34A';
const GL    = '#F0FDF4';
const RED   = '#DC2626';
const RL    = '#FEF2F2';
const AMBER = '#D97706';
const AL    = '#FFFBEB';

const SH  = '0 1px 3px rgba(15,23,42,0.08)';
const SH2 = '0 8px 32px rgba(15,23,42,0.12)';

/* ── Modes Novasend (frais variables) vs modes 0 % ───────────────── */
const NOVASEND_MODES = new Set([
  'WAVE', 'ORANGE_MONEY', 'MTN_MONEY', 'MOOV_MONEY', 'NOVASEND', 'MOBILE_MONEY',
]);

const MODE_LABEL = {
  ESPECES:       'Espèces',
  CARTE_BANCAIRE:'Carte (TPE)',
  WAVE:          'Wave',
  ORANGE_MONEY:  'Orange Money',
  MTN_MONEY:     'MTN MoMo',
  MOOV_MONEY:    'Moov Money',
  NOVASEND:      'NovaSend',
  MOBILE_MONEY:  'Mobile Money',
};

function modeIcon(mode) {
  if (mode === 'ESPECES')       return <Banknote size={13} />;
  if (mode === 'CARTE_BANCAIRE') return <CreditCard size={13} />;
  return <Smartphone size={13} />;
}

const PAY_HIST_KEY = 'caisse_hist_v1';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(PAY_HIST_KEY) || '[]'); }
  catch { return []; }
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function fmt(n)  { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }
function fmtF(n) { return `${fmt(n)} FCFA`; }

function exportCSV(rows, novasendRate) {
  const header = ['Commande','Mode','Montant brut (FCFA)','Frais Novasend %','Frais (FCFA)','Net Restaurant (FCFA)','Heure'];
  const body = rows.map(r => [
    r.numero,
    MODE_LABEL[r.modePaiement] || r.modePaiement,
    r.montant,
    r.fraisPct,
    r.fraisAmt,
    r.net,
    new Date(r.paidAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  ]);
  const csv = [header, ...body].map(l => l.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `cloture_${new Date().toISOString().slice(0,10)}_novasend${novasendRate}pct.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Composant principal ─────────────────────────────────────────── */
export default function EconomicReconciliation({ onClose }) {
  const [novasendRate, setNovasendRate] = useState(2);   // taux simulé 1–5 %
  const [period,       setPeriod]       = useState('today'); // today | session

  const allHistory = useMemo(() => loadHistory(), []);

  const transactions = useMemo(() => {
    const hist = period === 'today' ? allHistory.filter(h => isToday(h.paidAt)) : allHistory;
    return hist.map(h => {
      const isNova   = NOVASEND_MODES.has(h.modePaiement);
      const fraisPct = isNova ? novasendRate : 0;
      const fraisAmt = Math.round((h.montant || 0) * fraisPct / 100);
      const net      = (h.montant || 0) - fraisAmt;
      return { ...h, isNova, fraisPct, fraisAmt, net };
    }).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  }, [allHistory, novasendRate, period]);

  const totals = useMemo(() => {
    const brut  = transactions.reduce((s, t) => s + (t.montant || 0), 0);
    const frais = transactions.reduce((s, t) => s + t.fraisAmt, 0);
    const net   = transactions.reduce((s, t) => s + t.net, 0);
    const cash  = transactions.filter(t => !t.isNova).reduce((s, t) => s + t.net, 0);
    const digital = transactions.filter(t => t.isNova).reduce((s, t) => s + t.net, 0);
    return { brut, frais, net, cash, digital, count: transactions.length };
  }, [transactions]);

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 740, maxWidth: '97vw', maxHeight: '92vh',
        background: CARD, borderRadius: 20, zIndex: 1001,
        boxShadow: SH2, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, background: BG, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: OL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} style={{ color: O }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>Clôture de caisse</h2>
              <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportCSV(transactions, novasendRate)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, fontSize: 12, fontWeight: 700, color: NAVY, cursor: 'pointer' }}
            >
              <Download size={13} /> Exporter CSV
            </button>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} style={{ color: MUTED }} />
            </button>
          </div>
        </div>

        {/* ── Contenu scrollable ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* ── KPIs recap ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Encaissé brut',     value: totals.brut,    icon: DollarSign, color: NAVY,  bg: BG },
              { label: 'Frais Novasend',     value: totals.frais,   icon: TrendingDown, color: RED,  bg: RL },
              { label: 'Net restaurant',     value: totals.net,     icon: Wallet,     color: GREEN, bg: GL },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', boxShadow: SH }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{fmtF(value)}</p>
              </div>
            ))}
          </div>

          {/* ── Répartition Espèces vs Digital ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: GL, border: `1px solid #BBF7D0`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: GREEN }}>💵 Espèces / TPE — 0 % frais</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: NAVY }}>{fmtF(totals.cash)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>100 % reversé au restaurant</p>
            </div>
            <div style={{ background: AL, border: `1px solid #FDE68A`, borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: AMBER }}>📱 Digital Novasend — {novasendRate} % frais</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: NAVY }}>{fmtF(totals.digital)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>Après déduction des frais</p>
            </div>
          </div>

          {/* ── Simulateur de taux ── */}
          <div style={{ background: OL, border: `1px solid #FED7AA`, borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Info size={14} style={{ color: O }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: O }}>Simulateur taux Novasend</span>
              <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>Taux appliqué : <strong style={{ color: NAVY }}>{novasendRate} %</strong></span>
            </div>
            <input
              type="range" min={1} max={5} step={0.5} value={novasendRate}
              onChange={e => setNovasendRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: O, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, marginTop: 3 }}>
              <span>1 % (min)</span><span>2,5 %</span><span>5 % (max)</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: MUTED }}>
              Le taux réel sera fourni par Novasend lors de l'intégration. Ce simulateur permet d'anticiper l'impact sur vos recettes.
            </p>
          </div>

          {/* ── Filtre période ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: NAVY }}>
              Transactions ({totals.count})
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ key: 'today', label: "Aujourd'hui" }, { key: 'all', label: 'Session complète' }].map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: period === key ? O : BG, color: period === key ? '#fff' : MUTED,
                    border: `1px solid ${period === key ? O : BORDER}` }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED }}>
              <Wallet size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 13 }}>Aucune transaction pour cette période</p>
            </div>
          ) : (
            <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: SH }}>
              {/* En-tête table */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px 80px 100px', gap: 0, background: BG, borderBottom: `1px solid ${BORDER}`, padding: '8px 14px' }}>
                {['N°', 'Mode', 'Montant brut', 'Frais %', 'Frais FCFA', 'Net restaurant'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>

              {/* Lignes */}
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {transactions.map((t, i) => (
                  <div key={t.id || i}
                    style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px 80px 100px', gap: 0, padding: '9px 14px', borderBottom: i < transactions.length - 1 ? `1px solid ${BORDER}` : 'none', background: i % 2 === 0 ? CARD : BG }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>#{t.numero || '—'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: NAVY }}>
                      <span style={{ color: t.isNova ? AMBER : GREEN }}>{modeIcon(t.modePaiement)}</span>
                      {MODE_LABEL[t.modePaiement] || t.modePaiement}
                    </span>
                    <span style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>{fmt(t.montant)}</span>
                    <span style={{ fontSize: 12, color: t.isNova ? AMBER : GREEN, fontWeight: 700 }}>
                      {t.isNova ? `${t.fraisPct} %` : '0 %'}
                    </span>
                    <span style={{ fontSize: 12, color: t.isNova ? RED : MUTED }}>
                      {t.isNova ? `−${fmt(t.fraisAmt)}` : '—'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>{fmt(t.net)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px 80px 100px', gap: 0, padding: '10px 14px', background: NAVY, borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', gridColumn: '1 / 3' }}>TOTAL SESSION</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0' }}>{fmt(totals.brut)}</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FCA5A5' }}>−{fmt(totals.frais)}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#4ADE80' }}>{fmt(totals.net)}</span>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, background: BG, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
            Net restaurant estimé (taux {novasendRate} %) — <strong style={{ color: GREEN }}>{fmtF(totals.net)}</strong>
            <span style={{ marginLeft: 12, color: AMBER }}>Frais déduits : {fmtF(totals.frais)}</span>
          </p>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: O, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
