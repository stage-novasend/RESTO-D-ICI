// src/pages/staff/CaissePage.jsx — Caisse · B2B-aligned design
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Receipt, X, AlertCircle, History, ChevronDown, ChevronUp, Link2, QrCode, Wallet, Banknote, FileText, Smartphone, Search } from 'lucide-react';
import EconomicReconciliation from '../../components/staff/EconomicReconciliation';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { paiementsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import orangeMoneyLogo from '../../assets/payments/orange-money.svg';
import mtnMomoLogo from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo from '../../assets/payments/moov-money.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';

// ── Tokens — miroir StaffDashboard (orange pro) ──────────────────────────────
const BG      = '#F2F3F7';
const CARD    = '#FFFFFF';
const NAVY    = '#111827';
const BORDER  = 'rgba(0,0,0,0.08)';
const MUTED   = '#6B7280';
const FAINT   = '#9CA3AF';
const PRIMARY = '#EA580C';
const PRIMARY_CONTAINER = '#C2410C';
const PRIMARY_LIGHT = '#FFF5E8';
const GREEN   = '#16A34A';
const GREEN_L = '#DCFCE7';
const RED     = '#DC2626';
const RED_L   = '#FFDAD6';
const AMBER   = '#D97706';
const AMBER_L = '#FEF3C7';

// Legacy aliases for existing code
const TER    = PRIMARY;
const TER_L  = PRIMARY_LIGHT;
const TER_G  = `linear-gradient(135deg,${PRIMARY},${PRIMARY_CONTAINER})`;

const SH  = '0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)';
const SH2 = '0 4px 16px rgba(0,0,0,0.08),0 2px 4px rgba(0,0,0,0.04)';
const SH3 = '0 8px 32px rgba(0,0,0,0.12),0 4px 8px rgba(0,0,0,0.06)';

function fmt(n)  { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }
function fmtF(n) { return `${fmt(n)} FCFA`; }
function timeHM(ts) { return ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function fmtDay(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/* ── Historique paiements localStorage ── */
const PAY_HIST_KEY = 'caisse_hist_v1';

function loadPayHistory() {
  try {
    return JSON.parse(localStorage.getItem(PAY_HIST_KEY) || '[]');
  } catch { return []; }
}

function savePayEntry(entry) {
  try {
    const all = JSON.parse(localStorage.getItem(PAY_HIST_KEY) || '[]');
    // Keep only last 30 days to avoid bloat
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const pruned = all.filter(p => new Date(p.paidAt).getTime() > cutoff);
    pruned.push(entry);
    localStorage.setItem(PAY_HIST_KEY, JSON.stringify(pruned));
  } catch {}
}

const PAY_MODE_LABEL = {
  ESPECES: 'Espèces', WAVE: 'Wave', NOVASEND: 'NovaSend',
  ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN MoMo', MOOV_MONEY: 'Moov Money',
  CARTE_BANCAIRE: 'Carte', MOBILE_MONEY: 'Mobile Money',
};

// ── Activer à true dès que NovaSend supporte les paiements carte bancaire ──────
const NOVASEND_CARD_ENABLED = false;

// Tous les modes digitaux passent par NovaSend /v1/payin/sessions → paymentUrl + QR
// Carte : TPE physique pour l'instant, NovaSend digital quand NOVASEND_CARD_ENABLED = true
const PAY_MODES = [
  { id: 'ESPECES',       label: 'Espèces',      logo: null,             isDigital: false,                   provider: null    },
  { id: 'CHEQUE',        label: 'Chèque',       logo: null,             isDigital: false,                   provider: null    },
  { id: 'WAVE',          label: 'Wave',          logo: null,             isDigital: true,                    provider: 'WAVE'  },
  { id: 'NOVASEND',      label: 'NovaSend',      logo: null,             isDigital: true,                    provider: 'NOVASEND' },
  { id: 'ORANGE_MONEY',  label: 'Orange Money',  logo: orangeMoneyLogo,  isDigital: true,                    provider: 'ORANGE'},
  { id: 'MTN_MONEY',     label: 'MTN MoMo',      logo: mtnMomoLogo,      isDigital: true,                    provider: 'MOMO'  },
  { id: 'MOOV_MONEY',    label: 'Moov Money',    logo: moovMoneyLogo,    isDigital: true,                    provider: 'MOOV'  },
  { id: 'CARTE_BANCAIRE',label: 'Carte',         logo: carteBancaireLogo,isDigital: NOVASEND_CARD_ENABLED,   provider: NOVASEND_CARD_ENABLED ? 'CARTE' : null },
];

const MODE_LABEL = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };

// 3 boutons principaux du terminal
const TERMINAL_MODES = [
  { id: 'ESPECES',      label: 'Espèces',      Icon: Banknote    },
  { id: 'CHEQUE',       label: 'Chèque',       Icon: FileText    },
  { id: 'ORANGE_MONEY', label: 'Mobile Money', Icon: Smartphone  },
];

const STATUT_META = {
  RECUE:        { bg: '#DBEAFE', color: '#1D4ED8', dot: '#2563EB', label: 'Reçue' },
  CONFIRMEE:    { bg: '#EDE9FE', color: '#5B21B6', dot: '#7C3AED', label: 'Confirmée' },
  EN_PREP:      { bg: AMBER_L,   color: '#92400E', dot: '#D97706', label: 'En préparation' },
  PRETE:        { bg: GREEN_L,   color: '#15803D', dot: '#16A34A', label: 'Prête' },
  EN_LIVRAISON: { bg: '#E0E7FF', color: '#3730A3', dot: '#4F46E5', label: 'En livraison' },
  LIVREE:       { bg: GREEN_L,   color: '#15803D', dot: '#16A34A', label: 'Livrée' },
  ANNULEE:      { bg: RED_L,     color: RED,       dot: RED,       label: 'Annulée' },
};


// ── StatusPill (B2B style) ────────────────────────────────────────────────────
function StatusPill({ statut }) {
  const s = STATUT_META[statut] || { bg: BG, color: MUTED, dot: BORDER, label: statut };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 10, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── OrderItem ─────────────────────────────────────────────────────────────────
function OrderItem({ order, selected, onClick }) {
  const items = (order.lignes || []).slice(0, 2)
    .map(l => `${l.quantite}× ${l.article?.nom || l.nomArticle || 'Art'}`)
    .join(', ');
  const extra = (order.lignes?.length || 0) - 2;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '13px 15px', borderRadius: 16,
        background: selected ? PRIMARY_CONTAINER : CARD,
        border: `1px solid ${selected ? PRIMARY_CONTAINER : BORDER}`,
        cursor: 'pointer',
        boxShadow: selected ? '0 6px 20px rgba(192,64,0,0.22)' : SH,
        transition: 'all 0.15s', overflow: 'hidden',
      }}
    >
      {/* Stripe haut quand sélectionné */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: selected ? '#fff' : NAVY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          CMD-{order.numero}
        </span>
        {selected
          ? <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.16)', padding: '2px 8px', borderRadius: 99 }}>Sélectionnée</span>
          : <StatusPill statut={order.statut} />
        }
      </div>
      <p style={{ margin: '0 0 5px', fontSize: 11, color: selected ? 'rgba(255,255,255,0.70)' : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {items}{extra > 0 ? `, +${extra}` : ''}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,0.55)' : MUTED }}>
          {order.tableNumero ? `Table ${order.tableNumero}` : MODE_LABEL[order.modeLivraison] || ''}
          {' · '}{timeHM(order.createdAt)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: selected ? '#fff' : TER }}>
          {fmt(order.montantTotal)}<span style={{ fontSize: 10, fontWeight: 600, marginLeft: 3 }}>F</span>
        </span>
      </div>
    </button>
  );
}

// ── CountdownRing — anneau SVG + secondes ─────────────────────────────────────
function CountdownRing({ total: totalSecs, current }) {
  const R   = 30;
  const C   = 2 * Math.PI * R;
  const pct = current / totalSecs;
  const color = current > 30 ? TER : current > 10 ? AMBER : RED;
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={R} fill="none" stroke="#F3F4F6" strokeWidth="5" />
        <circle cx="40" cy="40" r={R} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{current}</span>
        <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>sec</span>
      </div>
    </div>
  );
}

// ── DigitalPaymentModal ───────────────────────────────────────────────────────
const COUNTDOWN_SECS = 90;

function DigitalPaymentModal({ commande, payMode: modeId, onClose, onSimConfirmed, externalFailed }) {
  const mode  = PAY_MODES.find(m => m.id === modeId);
  const total = Math.round(Number(commande?.montantTotal || 0));

  // form | sending | waiting | confirmed | failed
  const [step,       setStep]       = useState('form');
  const [phone,      setPhone]      = useState('');
  const [sessionId,  setSessionId]  = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [qrDataUrl,  setQrDataUrl]  = useState(null);
  const [simulated,  setSimulated]  = useState(false);
  const [errMsg,     setErrMsg]     = useState('');
  const [simulating, setSimulating] = useState(false);
  const [countdown,  setCountdown]  = useState(COUNTDOWN_SECS);
  const [canRetry,   setCanRetry]   = useState(false);

  // Aide saisie numéro par opérateur
  const PHONE_HINT = {
    WAVE:          '01 / 05 / 07 XXXXXXXX',
    NOVASEND:      '07 / 05 / 01 XXXXXXXX',
    ORANGE_MONEY:  '07 XXXXXXXX',
    MTN_MONEY:     '05 XXXXXXXX',
    MOOV_MONEY:    '01 XXXXXXXX',
    CARTE_BANCAIRE: null,
  };

  // Instructions spécifiques par opérateur
  const PROVIDER_NOTE = {
    ORANGE_MONEY: 'Orange Money peut demander un code OTP généré via #144*46#.',
    MOOV_MONEY:   'Assurez-vous que l\'écran du client est déverrouillé.',
    WAVE:         'Si aucune invite, Wave peut ouvrir l\'app directement via le QR.',
  };

  const isCard = modeId === 'CARTE_BANCAIRE';

  // Countdown actif uniquement en état "waiting"
  useEffect(() => {
    if (step !== 'waiting') return;
    if (countdown <= 0) { setCanRetry(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Écouter l'échec renvoyé par le parent (WebSocket)
  useEffect(() => {
    if (externalFailed && step === 'waiting') {
      setStep('failed');
    }
  }, [externalFailed, step]);

  // Générer le QR depuis le paymentUrl
  useEffect(() => {
    if (!paymentUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(paymentUrl, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [paymentUrl]);

  const handleSubmit = async () => {
    setErrMsg('');
    setStep('sending');
    try {
      const r = await paiementsAPI.initier({
        commandeId:   commande.id,
        provider:     mode.provider,
        montant:      total,
        telephone:    phone.trim() ? `+225${phone.replace(/\s/g, '')}` : undefined,
        customerName: commande.client?.nom || 'Client',
      });
      setSessionId(r.data.sessionId);
      setPaymentUrl(r.data.paymentUrl || null);
      setSimulated(r.data.simulated);
      setCountdown(COUNTDOWN_SECS);
      setCanRetry(false);
      setStep('waiting');
    } catch (e) {
      setErrMsg(e?.response?.data?.message || 'Erreur de connexion. Réessayez.');
      setStep('form');
    }
  };

  const handleRetry = () => {
    setStep('form');
    setCountdown(COUNTDOWN_SECS);
    setCanRetry(false);
    setErrMsg('');
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await paiementsAPI.simuler({ commandeId: commande.id, provider: mode.provider });
      setStep('confirmed');
      setTimeout(() => { onSimConfirmed(); onClose(); }, 2200);
    } catch (e) {
      setErrMsg('Simulation impossible : ' + (e?.response?.data?.message || e.message));
    } finally { setSimulating(false); }
  };

  const formattedPhone = phone.trim() ? `+225 ${phone.trim()}` : null;
  const providerNote   = PROVIDER_NOTE[modeId];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 32px 64px rgba(0,0,0,0.28)', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}>

        {/* Header */}
        <div style={{ background: TER_G, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Paiement {mode?.label}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>CMD-{commande.numero}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{fmt(total)}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>FCFA</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6, flexShrink: 0 }}>
            <X size={14} color="#fff" />
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding: '24px 24px 28px' }}>

          {/* ── FORMULAIRE ── */}
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.18)', borderRadius: 14, padding: '13px 16px', fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
                {isCard
                  ? 'NovaSend génère un lien de paiement sécurisé par carte. Le client scanne le QR ou ouvre le lien pour saisir ses données carte.'
                  : `Saisissez le numéro ${mode?.label} du client. Une invitation de confirmation sera envoyée sur son téléphone.`
                }
              </div>

              {providerNote && !isCard && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: AMBER_L, border: `1px solid rgba(217,119,6,0.2)`, borderRadius: 12, fontSize: 12, color: AMBER, fontWeight: 600 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {providerNote}
                </div>
              )}

              {!isCard && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    Numéro {mode?.label} du client
                  </label>
                  <div style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', background: BG }}>
                    <span style={{ padding: '12px 14px', background: '#F3F4F6', borderRight: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>+225</span>
                    <input
                      type="tel" autoFocus
                      placeholder={PHONE_HINT[modeId] || '07 00 00 00 00'}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      style={{ flex: 1, padding: '12px 14px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: NAVY, outline: 'none', fontFamily: 'inherit' }}
                      maxLength={15}
                    />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: FAINT }}>
                    NovaSend détecte l'opérateur automatiquement depuis le préfixe
                  </p>
                </div>
              )}

              {errMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: RED_L, border: `1px solid #fecaca`, borderRadius: 12, fontSize: 12, color: RED, fontWeight: 600 }}>
                  <AlertCircle size={14} /> {errMsg}
                </div>
              )}

              <button onClick={handleSubmit}
                style={{ width: '100%', padding: '15px', borderRadius: 99, border: 'none', background: TER_G, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(234,88,12,0.25)', fontFamily: 'inherit' }}>
                <QrCode size={15} />
                {isCard ? 'Générer le lien paiement carte' : `Envoyer l'invitation ${mode?.label}`}
              </button>
            </div>
          )}

          {/* ── ENVOI ── */}
          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: `4px solid ${TER}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>Envoi de l'invitation…</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: MUTED }}>Connexion à NovaSend en cours</p>
            </div>
          )}

          {/* ── EN ATTENTE (countdown + PIN) ── */}
          {step === 'waiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Bloc "en attente du PIN" */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#FFF8F0', border: '1px solid rgba(234,88,12,0.22)', borderRadius: 18 }}>
                <CountdownRing total={COUNTDOWN_SECS} current={countdown} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 800, color: NAVY }}>
                    {countdown > 0 ? 'En attente de confirmation…' : 'Délai expiré'}
                  </p>
                  {formattedPhone && (
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: NAVY, fontWeight: 600 }}>
                      📱 {formattedPhone} <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>({mode?.label})</span>
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                    {countdown > 0
                      ? 'Le client doit saisir son code PIN sur son téléphone.'
                      : 'Le client n\'a pas validé dans le délai imparti.'}
                  </p>
                </div>
              </div>

              {/* Instruction PIN */}
              {countdown > 0 && !canRetry && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: TER, animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ fontSize: 12, color: NAVY, lineHeight: 1.5 }}>
                    <strong>Ne pas fermer cette fenêtre.</strong> Une invite de saisie du code PIN a été envoyée sur le téléphone du client.
                    {PROVIDER_NOTE[modeId] && <span style={{ display: 'block', marginTop: 4, color: AMBER }}>{PROVIDER_NOTE[modeId]}</span>}
                  </div>
                </div>
              )}

              {/* QR Code (si session URL disponible) */}
              {paymentUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: MUTED, textAlign: 'center' }}>Ou montrez ce QR code au client</p>
                  <div style={{ textAlign: 'center' }}>
                    {qrDataUrl
                      ? <div style={{ display: 'inline-block', padding: 12, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SH }}>
                          <img src={qrDataUrl} alt="QR paiement" style={{ display: 'block', width: 180, height: 180 }} />
                        </div>
                      : <div style={{ width: 180, height: 180, margin: '0 auto', borderRadius: 16, background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${TER}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    }
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, borderRadius: 12, padding: '9px 13px', border: `1px solid ${BORDER}` }}>
                    <Link2 size={12} color={MUTED} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{paymentUrl}</span>
                    <button onClick={() => window.open(paymentUrl, '_blank')} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 7, border: `1px solid ${TER}`, background: 'rgba(234,88,12,0.08)', color: TER, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Ouvrir
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton retry après expiration */}
              {canRetry && (
                <button onClick={handleRetry}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1.5px solid ${TER}`, background: 'rgba(234,88,12,0.06)', color: TER, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                  <AlertCircle size={14} />
                  Aucune invite reçue — réessayer
                </button>
              )}

              {/* Simulation (dev) */}
              {simulated && !canRetry && (
                <button onClick={handleSimulate} disabled={simulating}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: `2px dashed ${TER}`, background: 'rgba(234,88,12,0.06)', color: TER, fontSize: 13, fontWeight: 700, cursor: simulating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: simulating ? 0.65 : 1 }}>
                  <CheckCircle2 size={14} />
                  {simulating ? 'Simulation…' : 'Simuler la confirmation du paiement'}
                </button>
              )}
            </div>
          )}

          {/* ── ÉCHEC ── */}
          {step === 'failed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: RED_L, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <AlertCircle size={30} color={RED} />
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: RED }}>
                  {externalFailed === 'EXPIRED' ? 'Délai expiré' : 'Paiement refusé'}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                  {externalFailed === 'EXPIRED'
                    ? 'Le client n\'a pas validé son code PIN à temps.'
                    : externalFailed === 'CANCELLED'
                      ? 'Le paiement a été annulé par le client.'
                      : 'Solde insuffisant ou code PIN incorrect.'
                  }
                </p>
              </div>
              <button onClick={handleRetry}
                style={{ width: '100%', padding: '14px', borderRadius: 99, border: 'none', background: TER_G, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(234,88,12,0.25)', fontFamily: 'inherit' }}>
                <QrCode size={15} />
                Réessayer avec un autre numéro
              </button>
            </div>
          )}

          {/* ── CONFIRMÉ ── */}
          {step === 'confirmed' && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={30} color={GREEN} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: GREEN }}>Paiement confirmé !</p>
              <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{fmtF(total)} encaissés via {mode?.label}</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CaissePage() {
  const { user } = useAuth();
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [payMode,      setPayMode]      = useState('ESPECES');
  const [montant,      setMontant]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [payHistory,   setPayHistory]   = useState(() => loadPayHistory());
  const [histLoading,  setHistLoading]  = useState(false);
  const [showCloture,  setShowCloture]  = useState(false);
  const [showHist,     setShowHist]     = useState(true);
  const [digitalModal,  setDigitalModal]  = useState(null);  // { payMode, commande }
  const [failedPayment, setFailedPayment] = useState(null);   // { commandeId, reason }
  const [search,        setSearch]        = useState('');

  // Refs anti-stale-closure pour le listener WebSocket
  const digitalModalRef = useRef(null);
  const selectedRef     = useRef(null);
  useEffect(() => { digitalModalRef.current = digitalModal; }, [digitalModal]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const mergeHistory = useCallback((apiEntries) => {
    const local = loadPayHistory();
    const map = new Map();
    // localStorage d'abord (contient rendu, etc.)
    local.forEach(p => map.set(p.id, p));
    // API enrichit / complète
    apiEntries.forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
    const merged = [...map.values()].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    setPayHistory(merged);
  }, []);

  const loadHistoryFromAPI = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data } = await commandesService.getAll({ limit: 200 });
      const paid = (Array.isArray(data) ? data : [])
        .filter(c => c.estPaye)
        .map(c => ({
          id: c.id,
          numero: c.numero,
          montant: Math.round(Number(c.montantTotal) || 0),
          modePaiement: c.modePaiement || 'ESPECES',
          rendu: 0,
          lignes: (c.lignes || []).map(l => ({ nom: l.article?.nom || l.nomArticle || 'Art', qty: l.quantite })),
          paidAt: c.payeAt || c.updatedAt || c.createdAt,
        }));
      mergeHistory(paid);
    } catch {
      // Si l'API échoue, on garde le localStorage
      setPayHistory(loadPayHistory());
    } finally {
      setHistLoading(false);
    }
  }, [mergeHistory]);

  const upsert = useCallback(o => {
    if (!o?.id) return;
    setOrders(prev => { const i = prev.findIndex(x => x.id === o.id); if (i === -1) return [o, ...prev]; const n = [...prev]; n[i] = { ...n[i], ...o }; return n; });
    setSelected(prev => prev?.id === o.id ? { ...prev, ...o } : prev);
  }, []);

  const load = useCallback(async () => {
    try { const r = await commandesService.getKDS(); setOrders(r.data || []); }
    catch { showToast('err', 'Chargement impossible.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); loadHistoryFromAPI(); }, [load, loadHistoryFromAPI]);

  useEffect(() => {
    if (!user?.id) return;
    const s = createCommandesSocket(user);
    s.on('commande.nouvelle', () => load());
    s.on('commande.statut',   p => upsert(p));
    s.on('commande.paiement', p => {
      upsert(p);
      const modal = digitalModalRef.current;
      const sel   = selectedRef.current;
      if (modal?.commande?.id === p.id) {
        const modeLabel = PAY_MODES.find(m => m.id === modal.payMode)?.label || modal.payMode;
        const amount    = Math.round(Number(sel?.montantTotal || p.montantTotal || 0));
        savePayEntry({
          id: p.id, numero: sel?.numero || p.numero, montant: amount,
          modePaiement: modal.payMode, rendu: 0,
          lignes: (sel?.lignes || []).map(l => ({ nom: l.article?.nom || l.nomArticle, qty: l.quantite })),
          paidAt: new Date().toISOString(),
        });
        loadHistoryFromAPI();
        showToast('ok', `Paiement ${modeLabel} confirmé — ${fmtF(amount)}`);
        setDigitalModal(null);
        setFailedPayment(null);
        setSelected(null);
      }
    });

    // Paiement refusé / expiré — afficher l'état d'échec dans le modal
    s.on('commande.paiement.echec', p => {
      const modal = digitalModalRef.current;
      if (modal?.commande?.id === p.id) {
        setFailedPayment({ commandeId: p.id, reason: p.reason || 'FAILED' });
        showToast('err', `Paiement refusé — ${p.reason === 'EXPIRED' ? 'délai expiré' : 'transaction échouée'}`);
      }
    });

    return () => s.disconnect();
  }, [load, upsert, user]);

  const active = orders.filter(o => !['LIVREE','ANNULEE'].includes(o.statut));

  const handleSelect = o => { setSelected(o); setMontant(''); setPayMode('ESPECES'); };

  const handleKey = (k) => {
    if (k === '⌫') {
      setMontant(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (k === '.') {
      if (montant.includes('.')) return;
      setMontant(prev => prev === '' ? '0.' : prev + '.');
    } else {
      setMontant(prev => prev === '0' || prev === '' ? k : prev + k);
    }
  };

  const filteredActive = active.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(o.numero).includes(s) ||
      (o.client?.nom || '').toLowerCase().includes(s) ||
      (o.tableNumero ? `table ${o.tableNumero}` : '').toLowerCase().includes(s);
  });

  const readyCount = active.filter(o => o.statut === 'PRETE').length;

  const currentMode = PAY_MODES.find(m => m.id === payMode);
  const total       = Math.round(Number(selected?.montantTotal || 0));
  const received    = Math.round(Number(montant) || 0);
  const change      = received > total ? received - total : 0;
  const isDigitalMode = currentMode?.isDigital ?? false;
  const canPay      = isDigitalMode || payMode !== 'ESPECES' || received >= total;

  const handlePay = async () => {
    if (!selected) return;

    // Modes digitaux → ouvrir le modal
    if (isDigitalMode) {
      setDigitalModal({ payMode, commande: selected });
      return;
    }

    // Espèces / Carte → paiement direct
    if (!canPay) return;
    setSaving(true);
    try {
      const r = await commandesService.registerPayment(selected.id, { modePaiement: payMode, montantRemis: received || total });
      upsert(r?.data?.commande || { ...selected, estPaye: true });
      const entry = {
        id: selected.id, numero: selected.numero, montant: total,
        modePaiement: payMode, rendu: change > 0 ? change : 0,
        lignes: (selected.lignes || []).map(l => ({ nom: l.article?.nom || l.nomArticle, qty: l.quantite })),
        paidAt: new Date().toISOString(),
      };
      savePayEntry(entry);
      loadHistoryFromAPI();
      showToast('ok', `Paiement validé — ${fmtF(total)}`);
      setSelected(null); setMontant('');
    } catch (e) { showToast('err', e?.response?.data?.message || 'Erreur paiement.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: toast.type === 'ok' ? GREEN_L : RED_L, border: `1px solid ${toast.type === 'ok' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: toast.type === 'ok' ? GREEN : RED, boxShadow: SH2, display: 'flex', alignItems: 'center', gap: 10 }}>
          {toast.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, marginLeft: 4 }}><X size={13} color={MUTED} /></button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Liste commandes ── */}
        <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: SH }}>
          {/* Header */}
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY }}>Commandes en attente</p>
                {readyCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, padding: '2px 9px', borderRadius: 99, background: GREEN_L, color: GREEN, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                    {readyCount} Prête{readyCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCloture(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 99, border: `1px solid ${BORDER}`, background: 'none', fontSize: 11, fontWeight: 700, color: NAVY, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <Wallet size={12} color={TER} />
                Clôture
              </button>
            </div>
            {/* Recherche */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: '#F3F3F6', border: `1px solid ${BORDER}` }}>
              <Search size={14} color={MUTED} style={{ flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher commande…"
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: NAVY, flex: 1, fontFamily: 'inherit' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 0 }}>
                  <X size={13} color={MUTED} />
                </button>
              )}
            </div>
          </div>
          {/* Liste */}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: 32, color: MUTED, fontSize: 13 }}>Chargement…</p>
            ) : filteredActive.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 16px', background: BG, borderRadius: 16, border: `1px solid ${BORDER}` }}>
                <Receipt size={32} color={BORDER} style={{ display: 'block', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: 13, color: FAINT, fontWeight: 500 }}>{search ? 'Aucun résultat' : 'Aucune commande active'}</p>
              </div>
            ) : filteredActive.map(o => (
              <OrderItem key={o.id} order={o} selected={selected?.id === o.id} onClick={() => handleSelect(o)} />
            ))}
          </div>
        </div>

        {/* ── Terminal paiement ── */}
        <div style={{ background: CARD, borderRadius: 24, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: SH2 }}>
          {!selected ? (
            <div style={{ padding: '80px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Receipt size={28} color={BORDER} />
              </div>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: NAVY, fontSize: 16 }}>Sélectionnez une commande</p>
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Les détails et le paiement apparaîtront ici</p>
            </div>
          ) : (
            <div style={{ padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header commande */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>Encaissement</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED }}>
                    Commande #CMD-{selected.numero} · {selected.tableNumero ? `Table ${selected.tableNumero}` : MODE_LABEL[selected.modeLivraison] || ''}
                  </p>
                </div>
                <button onClick={() => { setSelected(null); setMontant(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, lineHeight: 0 }}>
                  <X size={16} color={MUTED} />
                </button>
              </div>

              {/* Total */}
              <div style={{ textAlign: 'center', padding: '14px 0 12px', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Total à payer</p>
                <p style={{ margin: 0, fontSize: 52, fontWeight: 900, color: PRIMARY, lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {fmt(total)}<span style={{ fontSize: 16, fontWeight: 600, marginLeft: 6 }}>FCFA</span>
                </p>
              </div>

              {/* 3 boutons mode paiement */}
              <div style={{ display: 'flex', gap: 8 }}>
                {TERMINAL_MODES.map(m => {
                  const sel = payMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setPayMode(m.id); setMontant(''); }}
                      style={{
                        flex: 1, padding: '12px 6px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                        background: sel ? PRIMARY_LIGHT : CARD,
                        border: `1.5px solid ${sel ? 'rgba(234,88,12,0.35)' : BORDER}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        transition: 'all 0.14s',
                        boxShadow: sel ? `0 2px 10px rgba(234,88,12,0.18)` : 'none',
                      }}
                    >
                      <m.Icon size={18} color={sel ? PRIMARY : MUTED} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: sel ? PRIMARY_CONTAINER : NAVY }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Montant reçu + Rendu (non-digital) */}
              {!isDigitalMode && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Montant reçu</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 14, border: `1.5px solid ${BORDER}`, background: BG, minHeight: 54 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: MUTED, flexShrink: 0 }}>FCFA</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: PRIMARY, flex: 1, textAlign: 'right', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {montant || '0'}
                      </span>
                    </div>
                  </div>
                  <div style={{ minWidth: 136 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Rendu monnaie</p>
                    <div style={{ padding: '10px 14px', borderRadius: 14, background: change > 0 ? GREEN_L : BG, border: `1.5px solid ${change > 0 ? '#86EFAC' : BORDER}`, textAlign: 'center', minHeight: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: change > 0 ? GREEN : MUTED, lineHeight: 1 }}>{fmt(change)}</span>
                      <span style={{ fontSize: 9, color: change > 0 ? GREEN : MUTED, fontWeight: 600, marginTop: 2 }}>FCFA · calculé automatiquement</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pavé numérique — espèces & chèque uniquement */}
              {!isDigitalMode && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['1','2','3','4','5','6','7','8','9','⌫','0','.'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleKey(k)}
                      style={{
                        padding: '15px 0', borderRadius: 12,
                        fontSize: k === '⌫' ? 16 : 20, fontWeight: 700,
                        color: k === '⌫' ? RED : NAVY,
                        background: CARD, border: `1px solid ${BORDER}`,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F3F3F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = CARD)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}

              {/* Info paiement digital */}
              {isDigitalMode && (
                <div style={{ padding: '14px 16px', background: 'rgba(151,49,0,0.06)', borderRadius: 12, border: '1px solid rgba(151,49,0,0.18)', fontSize: 12, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <QrCode size={14} color={PRIMARY} />
                  Lien NovaSend sécurisé — le client valide via {currentMode?.label}
                </div>
              )}

              {/* Boutons action */}
              {selected.estPaye ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, background: GREEN_L, color: GREEN, fontWeight: 700, fontSize: 14 }}>
                  <CheckCircle2 size={18} /> Paiement déjà enregistré
                </div>
              ) : (
                <>
                  <button
                    onClick={handlePay}
                    disabled={saving || !canPay}
                    style={{
                      width: '100%', padding: '18px', borderRadius: 14,
                      background: canPay ? `linear-gradient(135deg,${PRIMARY},${PRIMARY_CONTAINER})` : BG,
                      color: canPay ? '#fff' : MUTED,
                      fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: !canPay || saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.75 : 1,
                      border: canPay ? 'none' : `1.5px solid ${BORDER}`,
                      fontFamily: 'inherit', transition: 'all 0.14s',
                      boxShadow: canPay ? `0 8px 24px rgba(151,49,0,0.28)` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {isDigitalMode ? <QrCode size={16} /> : <Receipt size={16} />}
                    {saving ? 'Traitement…'
                      : isDigitalMode
                        ? `Initier ${currentMode?.label} · ${fmtF(total)}`
                        : `Encaisser · ${fmtF(total)}`}
                  </button>
                  <button
                    onClick={() => { setSelected(null); setMontant(''); }}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14,
                      background: CARD, color: NAVY, fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${BORDER}`, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Annuler
                  </button>
                </>
              )}

              {/* Footer */}
              <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: MUTED, fontWeight: 500 }}>
                Transaction journalisée · Horodatage synchronisé
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historique paiements du jour ── */}
      <div style={{ marginTop: 28, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', boxShadow: SH }}>
        <div
          onClick={() => setShowHist(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer', background: showHist ? '#FAFAFA' : CARD, borderBottom: showHist ? `1px solid ${BORDER}` : 'none', transition: 'background 0.13s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = showHist ? '#FAFAFA' : CARD)}
        >
          <div style={{ width: 36, height: 36, borderRadius: 12, background: TER_L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <History size={16} color={TER} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAVY }}>Historique des paiements</p>
              {histLoading && <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${TER}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>
              {payHistory.length} encaissement{payHistory.length !== 1 ? 's' : ''}
              {payHistory.length > 0 && ` · Total : ${fmtF(payHistory.reduce((s, p) => s + p.montant, 0))}`}
            </p>
          </div>
          {showHist ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
        </div>

        {showHist && (
          payHistory.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <Receipt size={28} color={BORDER} style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 13, color: FAINT, fontWeight: 500 }}>Aucun paiement enregistré</p>
            </div>
          ) : (
            <>
              {[...payHistory].reverse().map((p, i) => (
                <div key={p.id + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: GREEN_L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={15} color={GREEN} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>CMD-{p.numero}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: TER_L, color: TER, padding: '2px 7px', borderRadius: 99 }}>
                        {PAY_MODE_LABEL[p.modePaiement] || p.modePaiement}
                      </span>
                      <span style={{ fontSize: 10, color: FAINT, marginLeft: 'auto', fontWeight: 600 }}>{fmtDay(p.paidAt)} {timeHM(p.paidAt)}</span>
                    </div>
                    {p.lignes?.length > 0 && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.lignes.slice(0, 3).map(l => `${l.qty}× ${l.nom}`).join(' · ')}{p.lignes.length > 3 ? ' …' : ''}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: GREEN }}>{fmt(p.montant)}</p>
                    <p style={{ margin: 0, fontSize: 9, color: FAINT, fontWeight: 600 }}>FCFA</p>
                    {p.rendu > 0 && <p style={{ margin: '1px 0 0', fontSize: 10, color: AMBER, fontWeight: 600 }}>Rendu {fmt(p.rendu)} F</p>}
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 20px', background: '#FAFAFA', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{payHistory.length} paiement{payHistory.length > 1 ? 's' : ''}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>
                  Total encaissé : {fmtF(payHistory.reduce((s, p) => s + p.montant, 0))}
                </span>
              </div>
            </>
          )
        )}
      </div>

      {/* Modal paiement digital */}
      {digitalModal && (
        <DigitalPaymentModal
          commande={digitalModal.commande}
          payMode={digitalModal.payMode}
          onClose={() => { setDigitalModal(null); setFailedPayment(null); }}
          onSimConfirmed={() => { /* WebSocket confirmera et fermera */ }}
          externalFailed={failedPayment?.commandeId === digitalModal.commande.id ? failedPayment.reason : null}
        />
      )}

      {/* Modal clôture caisse */}
      {showCloture && (
        <EconomicReconciliation onClose={() => setShowCloture(false)} />
      )}
    </div>
  );
}
