// src/pages/staff/CaissePage.jsx — Caisse · B2B-aligned design
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Receipt, X, AlertCircle, History, ChevronDown, ChevronUp, Link2, QrCode } from 'lucide-react';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { paiementsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import orangeMoneyLogo from '../../assets/payments/orange-money.svg';
import mtnMomoLogo from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo from '../../assets/payments/moov-money.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';

// ── Tokens B2B-aligned ────────────────────────────────────────────────────────
const BG     = '#F8FAFC';
const CARD   = '#FFFFFF';
const NAVY   = '#111827';
const BORDER = '#E2E8F0';
const MUTED  = '#6B7280';
const FAINT  = '#6B7280';

const TER    = '#FF8C00';
const TER_L  = 'rgba(255,140,0,0.10)';
const TER_G  = 'linear-gradient(135deg,#FF8C00,#E07A00)';
const GREEN  = '#16A34A';
const GREEN_L= '#DCFCE7';
const RED    = '#DC2626';
const RED_L  = '#FEF2F2';
const AMBER  = '#D97706';
const AMBER_L= '#FFFBEB';

const SH  = '0 1px 3px rgba(15,23,42,0.07),0 1px 2px rgba(15,23,42,0.04)';
const SH2 = '0 4px 16px rgba(15,23,42,0.10),0 2px 4px rgba(15,23,42,0.06)';
const SH3 = '0 20px 40px rgba(15,23,42,0.15),0 4px 8px rgba(15,23,42,0.06)';

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
  { id: 'WAVE',          label: 'Wave',          logo: null,             isDigital: true,                    provider: 'WAVE'  },
  { id: 'NOVASEND',      label: 'NovaSend',      logo: null,             isDigital: true,                    provider: 'NOVASEND' },
  { id: 'ORANGE_MONEY',  label: 'Orange Money',  logo: orangeMoneyLogo,  isDigital: true,                    provider: 'ORANGE'},
  { id: 'MTN_MONEY',     label: 'MTN MoMo',      logo: mtnMomoLogo,      isDigital: true,                    provider: 'MOMO'  },
  { id: 'MOOV_MONEY',    label: 'Moov Money',    logo: moovMoneyLogo,    isDigital: true,                    provider: 'MOOV'  },
  { id: 'CARTE_BANCAIRE',label: 'Carte',         logo: carteBancaireLogo,isDigital: NOVASEND_CARD_ENABLED,   provider: NOVASEND_CARD_ENABLED ? 'CARTE' : null },
];

const MODE_LABEL = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };

const STATUT_META = {
  RECUE:        { bg: '#EFF6FF', color: '#2563EB', dot: '#60A5FA', label: 'Reçue' },
  CONFIRMEE:    { bg: '#F5F3FF', color: '#6D28D9', dot: '#A78BFA', label: 'Confirmée' },
  EN_PREP:      { bg: AMBER_L,   color: AMBER,     dot: '#FBBF24', label: 'En préparation' },
  PRETE:        { bg: GREEN_L,   color: GREEN,     dot: '#34D399', label: 'Prête' },
  EN_LIVRAISON: { bg: '#F5F3FF', color: '#7C3AED', dot: '#A78BFA', label: 'En livraison' },
  LIVREE:       { bg: GREEN_L,   color: GREEN,     dot: '#34D399', label: 'Livrée' },
  ANNULEE:      { bg: RED_L,     color: RED,       dot: '#F87171', label: 'Annulée' },
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
        background: selected ? TER : CARD,
        border: `1px solid ${selected ? TER : BORDER}`,
        cursor: 'pointer',
        boxShadow: selected ? '0 6px 20px rgba(255,140,0,0.22)' : SH,
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

// ── DigitalPaymentModal ───────────────────────────────────────────────────────
// Tous les providers passent par /v1/payin/sessions → paymentUrl + QR
function DigitalPaymentModal({ commande, payMode: modeId, onClose, onSimConfirmed }) {
  const mode  = PAY_MODES.find(m => m.id === modeId);
  const total = Math.round(Number(commande?.montantTotal || 0));

  const [step,       setStep]       = useState('form');  // form|sending|waiting|confirmed
  const [phone,      setPhone]      = useState('');
  const [sessionId,  setSessionId]  = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [qrDataUrl,  setQrDataUrl]  = useState(null);
  const [simulated,  setSimulated]  = useState(false);
  const [errMsg,     setErrMsg]     = useState('');
  const [simulating, setSimulating] = useState(false);

  // Préfixes CI par opérateur — aide visuelle pour le caissier
  const PHONE_HINT = {
    WAVE:          'Wave · 01/05/07 XXXXXXXX',
    NOVASEND:      'Tous opérateurs · 07/05/01 XXXXXXXX',
    ORANGE_MONEY:  'Orange · 07 XXXXXXXX',
    MTN_MONEY:     'MTN · 05 XXXXXXXX',
    MOOV_MONEY:    'Moov · 01 XXXXXXXX',
    CARTE_BANCAIRE: null, // pas de numéro de téléphone pour une carte
  };

  const isCard = modeId === 'CARTE_BANCAIRE';

  // Générer le QR localement depuis le paymentUrl retourné par NovaSend
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
      setPaymentUrl(r.data.paymentUrl);
      setSimulated(r.data.simulated);
      setStep('waiting');
    } catch (e) {
      setErrMsg(e?.response?.data?.message || 'Erreur de connexion. Réessayez.');
      setStep('form');
    }
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

          {/* ── ÉTAPE : formulaire ── */}
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.18)', borderRadius: 14, padding: '13px 16px', fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
                {isCard
                  ? 'NovaSend génère un lien de paiement sécurisé par carte bancaire. Le client scanne le QR code ou ouvre le lien pour saisir ses informations carte.'
                  : `NovaSend génère un lien de paiement sécurisé. Le client scanne le QR code avec son application ${mode?.label} pour valider.`
                }
              </div>

              {!isCard && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    Numéro de téléphone du client <span style={{ color: FAINT, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>
                  </label>
                  <div style={{ display: 'flex', gap: 0, border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', background: BG }}>
                    <span style={{ padding: '12px 14px', background: '#F3F4F6', borderRight: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>+225</span>
                    <input
                      type="tel"
                      placeholder={PHONE_HINT[modeId] || '07 00 00 00 00'}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{ flex: 1, padding: '12px 14px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: NAVY, outline: 'none', fontFamily: 'inherit' }}
                      maxLength={15}
                    />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: FAINT }}>
                    NovaSend détecte l'opérateur automatiquement depuis le numéro
                  </p>
                </div>
              )}

              {errMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: RED_L, border: `1px solid #fecaca`, borderRadius: 12, fontSize: 12, color: RED, fontWeight: 600 }}>
                  <AlertCircle size={14} /> {errMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                style={{ width: '100%', padding: '15px', borderRadius: 99, border: 'none', background: TER_G, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(255,140,0,0.25)', fontFamily: 'inherit' }}>
                <QrCode size={15} />
                {isCard ? 'Générer le lien de paiement carte' : 'Générer le lien de paiement'}
              </button>
            </div>
          )}

          {/* ── ÉTAPE : envoi ── */}
          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: `4px solid ${TER}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>Création de la session…</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: MUTED }}>Connexion avec NovaSend en cours</p>
            </div>
          )}

          {/* ── ÉTAPE : en attente (QR + lien) ── */}
          {step === 'waiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {paymentUrl && (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: MUTED }}>Montrez ce QR code au client</p>
                    {qrDataUrl
                      ? (
                        <div style={{ display: 'inline-block', padding: 14, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SH }}>
                          <img src={qrDataUrl} alt="QR paiement" style={{ display: 'block', width: 200, height: 200 }} />
                        </div>
                      ) : (
                        <div style={{ width: 200, height: 200, margin: '0 auto', borderRadius: 18, background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${TER}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      )
                    }
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, borderRadius: 12, padding: '10px 14px', border: `1px solid ${BORDER}` }}>
                    <Link2 size={13} color={MUTED} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{paymentUrl}</span>
                    <button onClick={() => window.open(paymentUrl, '_blank')} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 8, border: `1px solid ${TER}`, background: 'rgba(255,140,0,0.08)', color: TER, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Ouvrir
                    </button>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FFF8F0', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TER, animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>En attente de confirmation NovaSend…</span>
              </div>

              {simulated && (
                <button
                  onClick={handleSimulate}
                  disabled={simulating}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: `2px dashed ${TER}`, background: 'rgba(255,140,0,0.06)', color: TER, fontSize: 13, fontWeight: 700, cursor: simulating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: simulating ? 0.65 : 1 }}>
                  <CheckCircle2 size={15} />
                  {simulating ? 'Simulation en cours…' : 'Simuler la confirmation du paiement'}
                </button>
              )}
            </div>
          )}

          {/* ── ÉTAPE : confirmé ── */}
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
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
  const [showHist,     setShowHist]     = useState(true);
  const [digitalModal, setDigitalModal] = useState(null); // { payMode, commande }

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
      // Si le modal digital est ouvert pour cette commande → fermer avec succès
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
        setSelected(null);
      }
    });
    return () => s.disconnect();
  }, [load, upsert, user]);

  const active = orders.filter(o => !['LIVREE','ANNULEE'].includes(o.statut));

  const handleSelect = o => { setSelected(o); setMontant(String(Math.round(Number(o.montantTotal)))); setPayMode('ESPECES'); };

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

      {/* Welcome bar */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: TER, textTransform: 'uppercase', letterSpacing: '0.24em' }}>
          Encaissement
        </p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.03em' }}>Caisse</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
          {active.length} commande{active.length !== 1 ? 's' : ''} active{active.length !== 1 ? 's' : ''} · cliquez pour encaisser
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Liste commandes ── */}
        <div style={{ background: BG, borderRadius: 20, padding: 12, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: '0 0 4px 4px', fontSize: 9.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Commandes actives
          </p>
          {loading ? (
            <p style={{ textAlign: 'center', padding: 32, color: MUTED, fontSize: 13 }}>Chargement…</p>
          ) : active.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 16px', background: CARD, borderRadius: 16, border: `1px solid ${BORDER}` }}>
              <Receipt size={32} color={BORDER} style={{ display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 13, color: FAINT, fontWeight: 500 }}>Aucune commande active</p>
            </div>
          ) : active.map(o => (
            <OrderItem key={o.id} order={o} selected={selected?.id === o.id} onClick={() => handleSelect(o)} />
          ))}
        </div>

        {/* ── Panneau paiement ── */}
        {!selected ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '72px 24px', textAlign: 'center', boxShadow: SH }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Receipt size={26} color={BORDER} />
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: NAVY, fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sélectionnez une commande</p>
            <p style={{ margin: 0, fontSize: 13, color: FAINT }}>Les détails et le paiement apparaîtront ici</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Carte récap — header gradient + lignes */}
            <div style={{ background: CARD, borderRadius: 24, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: SH2 }}>
              {/* Header terracotta gradient */}
              <div style={{ background: TER_G, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
                      Facture
                    </p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      CMD-{selected.numero}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>
                      {selected.tableNumero ? `Table ${selected.tableNumero}` : MODE_LABEL[selected.modeLivraison] || ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 1px', fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total TTC</p>
                    <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      {fmt(total)}<span style={{ fontSize: 13, marginLeft: 4, fontWeight: 600 }}>F</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 14, flexShrink: 0 }}
                  >
                    <X size={14} color="#fff" />
                  </button>
                </div>
              </div>

              {/* Lignes commande */}
              <div style={{ padding: '18px 22px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {(selected.lignes || []).map((l, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: TER_L, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: TER, flexShrink: 0 }}>
                          {l.quantite}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{l.article?.nom || l.nomArticle || 'Article'}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmt(Number(l.prixUnitaire) * Number(l.quantite))} F</span>
                    </div>
                  ))}
                </div>
                {/* Sous-totaux */}
                <div style={{ background: BG, borderRadius: 14, padding: '11px 15px', border: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: MUTED }}>Sous-total HT</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{fmt(Math.round(total / 1.18))} F</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 12, color: MUTED }}>TVA 18%</span>
                    <span style={{ fontSize: 12, color: MUTED }}>{fmt(total - Math.round(total / 1.18))} F</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>Total TTC</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: TER }}>{fmtF(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modes de paiement */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '18px 20px', boxShadow: SH2 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Moyen de paiement</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PAY_MODES.map(m => {
                  const sel = payMode === m.id;
                  return (
                    <button key={m.id} onClick={() => setPayMode(m.id)} style={{
                      flex: '1 1 80px', maxWidth: 110, padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
                      background: sel ? TER_L : BG,
                      border: `1.5px solid ${sel ? TER : BORDER}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      boxShadow: sel ? `0 0 0 3px rgba(255,140,0,0.12)` : 'none',
                      transition: 'all 0.14s', fontFamily: 'inherit',
                    }}>
                      {m.logo
                        ? <img src={m.logo} alt={m.label} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                        : <div style={{ width: 30, height: 30, borderRadius: 9, background: sel ? TER_L : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: sel ? TER : MUTED }}>
                            {m.isDigital ? <QrCode size={13} color={sel ? TER : MUTED} /> : m.label.charAt(0)}
                          </div>
                      }
                      <span style={{ fontSize: 10, fontWeight: 700, color: sel ? TER : MUTED, textAlign: 'center', lineHeight: 1.2 }}>{m.label}</span>
                      {sel && <CheckCircle2 size={11} color={TER} />}
                    </button>
                  );
                })}
              </div>
              {isDigitalMode && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,140,0,0.06)', borderRadius: 10, border: '1px solid rgba(255,140,0,0.18)', fontSize: 12, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <QrCode size={14} color={TER} />
                  Lien NovaSend sécurisé — le client scanne le QR ou ouvre {currentMode?.label} pour valider
                </div>
              )}
            </div>

            {/* Instruction TPE — carte bancaire */}
            {!isDigitalMode && payMode === 'CARTE_BANCAIRE' && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '20px 22px', boxShadow: SH2 }}>
                <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Terminal bancaire (TPE)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: BG, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={carteBancaireLogo} alt="Carte" style={{ height: 24, width: 'auto' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: NAVY }}>Présentez le terminal au client</p>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Insérez ou approchez la carte, attendez la confirmation du TPE</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: NAVY }}>{fmt(total)}</p>
                    <p style={{ margin: 0, fontSize: 10, color: MUTED, fontWeight: 600 }}>FCFA</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: MUTED, alignItems: 'flex-start' }}>
                  <span style={{ color: TER, fontWeight: 800, flexShrink: 0 }}>→</span>
                  <span>Une fois la transaction approuvée sur le TPE, cliquez <strong style={{ color: NAVY }}>Confirmer le paiement carte</strong> ci-dessous.</span>
                </div>
              </div>
            )}

            {/* Montant reçu (espèces uniquement) */}
            {!isDigitalMode && payMode === 'ESPECES' && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '18px 20px', boxShadow: SH2 }}>
                <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Montant reçu</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number" min="0" value={montant} onChange={e => setMontant(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${BORDER}`, background: BG, fontSize: 22, fontWeight: 800, color: NAVY, outline: 'none', textAlign: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      placeholder="0"
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {[total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
                        .filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)
                        .map(v => (
                          <button key={v} onClick={() => setMontant(String(v))} style={{
                            flex: 1, padding: '9px', borderRadius: 99,
                            background: Number(montant) === v ? TER : BG,
                            border: `1.5px solid ${Number(montant) === v ? TER : BORDER}`,
                            color: Number(montant) === v ? '#fff' : MUTED,
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            boxShadow: Number(montant) === v ? '0 4px 12px rgba(255,140,0,0.22)' : 'none',
                            transition: 'all 0.13s', fontFamily: 'inherit',
                          }}>
                            {v === total ? 'Exact' : `${Math.round(v / 1000)}k F`}
                          </button>
                        ))}
                    </div>
                  </div>
                  {change > 0 && (
                    <div style={{ background: GREEN_L, borderRadius: 16, padding: '16px 18px', textAlign: 'center', minWidth: 110, border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Rendu</p>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: GREEN }}>{fmt(change)}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: GREEN, fontWeight: 600 }}>FCFA</p>
                    </div>
                  )}
                </div>
                {received < total && received > 0 && (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: RED, fontWeight: 600 }}>
                    Manque {fmtF(total - received)}
                  </p>
                )}
              </div>
            )}

            {/* Bouton valider */}
            {selected.estPaye ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', borderRadius: 99, background: GREEN_L, border: '1px solid #bbf7d0', color: GREEN, fontWeight: 700, fontSize: 14 }}>
                <CheckCircle2 size={18} /> Paiement déjà enregistré
              </div>
            ) : (
              <button
                onClick={handlePay}
                disabled={saving || !canPay}
                style={{
                  width: '100%', padding: '17px', borderRadius: 99,
                  background: canPay ? TER_G : BG,
                  color: canPay ? '#fff' : FAINT,
                  fontSize: 15, fontWeight: 800,
                  cursor: !canPay || saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.75 : 1,
                  boxShadow: canPay ? '0 6px 20px rgba(255,140,0,0.22)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  transition: 'all 0.15s', fontFamily: 'inherit',
                  border: canPay ? 'none' : `1px solid ${BORDER}`,
                }}
              >
                {isDigitalMode ? <QrCode size={17} /> : <Receipt size={17} />}
                {saving ? 'Traitement…'
                  : isDigitalMode
                    ? `Initier paiement ${currentMode?.label} · ${fmtF(total)}`
                    : payMode === 'CARTE_BANCAIRE'
                      ? `Confirmer le paiement carte · ${fmtF(total)}`
                      : `Valider le paiement · ${fmtF(total)}`
                }
              </button>
            )}
          </div>
        )}
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
          onClose={() => setDigitalModal(null)}
          onSimConfirmed={() => {
            /* le WebSocket confirmera et fermera le modal automatiquement */
          }}
        />
      )}
    </div>
  );
}
