// src/components/onboarding/OnboardingTour.jsx
// Spotlight tour : chaque étape peut cibler un élément DOM via data-tour="id"
// Les étapes sans selector affichent une modale centrée (welcome / done)
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';

const PAD   = 12;   // padding autour de l'élément highlighté
const ANIM  = 260;  // durée transition en ms
import { NAVY, MUTED_WARM as MUTED, BORDER_SLATE as BORDER } from '../../theme/colors';

// ── Spotlight = 4 panneaux sombres autour de l'élément ────────────────────────
function Spotlight({ rect }) {
  if (!rect) return null;
  const { top, left, width, height } = rect;
  const right  = left + width;
  const bottom = top  + height;
  const T = Math.max(0, top    - PAD);
  const L = Math.max(0, left   - PAD);
  const R = Math.min(window.innerWidth,  right  + PAD);
  const B = Math.min(window.innerHeight, bottom + PAD);

  const base = {
    position: 'fixed', background: 'rgba(7,14,29,0.78)',
    zIndex: 9000, pointerEvents: 'none', transition: `all ${ANIM}ms cubic-bezier(.4,0,.2,1)`,
  };

  return (
    <>
      {/* Top */}
      <div style={{ ...base, top: 0, left: 0, right: 0, height: T }} />
      {/* Left */}
      <div style={{ ...base, top: T, left: 0, width: L, height: B - T }} />
      {/* Right */}
      <div style={{ ...base, top: T, left: R, right: 0, height: B - T }} />
      {/* Bottom */}
      <div style={{ ...base, top: B, left: 0, right: 0, bottom: 0 }} />
      {/* Anneau lumineux */}
      <div style={{
        ...base,
        top: T, left: L, width: R - L, height: B - T,
        background: 'transparent',
        borderRadius: 12,
        boxShadow: '0 0 0 3px #ff6b35, 0 0 0 8px rgba(255,107,53,0.22), 0 0 32px rgba(255,107,53,0.15)',
      }} />
    </>
  );
}

// ── Tooltip positionné autour de l'élément ─────────────────────────────────────
function Tooltip({ rect, step, stepIdx, total, onPrev, onNext, onSkip, accentColor }) {
  const { top, left, width, height } = rect;
  const right  = left + width;
  const bottom = top  + height;
  const T = top    - PAD;
  const B = bottom + PAD;
  const cx = left + width / 2;           // centre horizontal de l'élément

  const W = window.innerWidth;
  const H = window.innerHeight;
  const TW = 300;                        // largeur tooltip

  // Placement vertical : en bas si la place est suffisante, sinon en haut
  const placeBelow = B + 140 < H;
  const tipTop = placeBelow ? B + 16 : T - 16;

  // Placement horizontal : centré sur l'élément mais garder dans l'écran
  let tipLeft = cx - TW / 2;
  tipLeft = Math.max(14, Math.min(W - TW - 14, tipLeft));

  // Flèche
  const arrowLeft = cx - tipLeft - 8;   // position de la flèche relative au tooltip

  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === total - 1;

  return (
    <div style={{
      position: 'fixed', zIndex: 9010,
      top: placeBelow ? tipTop : 'auto',
      bottom: placeBelow ? 'auto' : H - tipTop,
      left: tipLeft,
      width: TW,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 20px 48px rgba(7,14,29,0.25), 0 4px 12px rgba(7,14,29,0.10)',
      border: `1px solid ${BORDER}`,
      padding: '16px 18px 14px',
      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      animation: `tour-fade ${ANIM}ms ease`,
    }}>
      <style>{`@keyframes tour-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Flèche */}
      <div style={{
        position: 'absolute',
        [placeBelow ? 'top' : 'bottom']: -7,
        left: Math.max(10, Math.min(TW - 30, arrowLeft)),
        width: 14, height: 7,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 14, height: 14,
          background: '#fff', border: `1px solid ${BORDER}`,
          borderRadius: 2,
          transform: placeBelow ? 'rotate(-45deg) translate(-4px, 4px)' : 'rotate(135deg) translate(-4px, -4px)',
          boxShadow: '-1px -1px 2px rgba(0,0,0,0.05)',
        }} />
      </div>

      {/* Compteur */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Étape {stepIdx + 1} / {total}
        </span>
        <button onClick={onSkip} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={11} color={MUTED} />
        </button>
      </div>

      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>{step.title}</p>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{step.body}</p>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 7 }}>
        {!isFirst && (
          <button onClick={onPrev} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#F8FAFC', fontSize: 11, fontWeight: 700, color: MUTED, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft size={11} /> Précédent
          </button>
        )}
        <button onClick={onNext} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 8, border: 'none', background: accentColor, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 3px 10px ${accentColor}44` }}>
          {isLast ? 'Terminer' : 'Suivant'} {!isLast && <ArrowRight size={12} />}
        </button>
      </div>
    </div>
  );
}

// ── Modal centrée (step sans selector = welcome / done) ───────────────────────
function CenterModal({ step, stepIdx, total, onNext, onSkip, accentColor }) {
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === total - 1;
  return (
    <>
      {/* Overlay full */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(7,14,29,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9010, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: '32px 28px 26px', width: '100%', maxWidth: 400,
          boxShadow: '0 24px 64px rgba(7,14,29,0.30)',
          animation: `tour-fade ${ANIM}ms ease`,
          textAlign: 'center',
        }}>
          <style>{`@keyframes tour-fade { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }`}</style>

          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Sparkles size={24} color={accentColor} />
          </div>

          <p style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 900, color: NAVY, letterSpacing: '-0.02em' }}>{step.title}</p>
          <p style={{ margin: '0 0 22px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{step.body}</p>

          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={onSkip} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: MUTED, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isFirst ? 'Passer la visite' : 'Fermer'}
            </button>
            <button onClick={onNext} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: accentColor, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', boxShadow: `0 4px 14px ${accentColor}40` }}>
              {isLast ? 'Commencer !' : 'Démarrer la visite'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
// steps: [{ id, title, body, selector?, onBefore? }]
// accentColor: couleur du rôle
// storageKey: clé localStorage pour ne plus afficher ("tour_staff_done" etc.)
// onComplete / onSkip : callbacks optionnels
export default function OnboardingTour({ steps, accentColor = '#ab3500', storageKey, onComplete, onSkip: onSkipCb }) {
  const [idx,     setIdx]     = useState(0);
  const [rect,    setRect]    = useState(null);
  const [visible, setVisible] = useState(true);
  const raf = useRef(null);

  const step = steps[idx];
  const total = steps.filter(s => !s.isCenter).length + steps.filter(s => s.isCenter).length; // toujours steps.length

  // Nombre d'étapes "spotlight" affichées dans le compteur
  // On affiche "Étape X / Y" en excluant les étapes centrées (welcome/done) du total visible
  const spotlightCount = steps.length;

  const measureTarget = useCallback(() => {
    if (!step?.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    });
  }, [step]);

  useLayoutEffect(() => {
    // Appel éventuel du hook onBefore (ex: changer d'onglet)
    const run = async () => {
      if (step?.onBefore) await step.onBefore();
      // Petite pause pour laisser le DOM se mettre à jour après l'action
      setTimeout(measureTarget, 120);
    };
    run();
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [idx, step, measureTarget]);

  // Recalculer si la fenêtre change de taille
  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const complete = useCallback(() => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setVisible(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const skip = useCallback(() => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setVisible(false);
    onSkipCb?.();
  }, [storageKey, onSkipCb]);

  const goNext = () => { if (idx < steps.length - 1) setIdx(i => i + 1); else complete(); };
  const goPrev = () => { if (idx > 0) setIdx(i => i - 1); };

  if (!visible) return null;

  const isCentered = !step?.selector;

  return (
    <>
      {isCentered ? (
        <CenterModal step={step} stepIdx={idx} total={steps.length} onNext={goNext} onSkip={skip} accentColor={accentColor} />
      ) : (
        <>
          {/* Overlay clickable = skip */}
          <div
            onClick={goNext}
            style={{ position: 'fixed', inset: 0, zIndex: 8999, cursor: 'default' }}
          />
          <Spotlight rect={rect} />
          {rect && (
            <Tooltip
              rect={rect} step={step} stepIdx={idx} total={steps.length}
              onPrev={goPrev} onNext={goNext} onSkip={skip}
              accentColor={accentColor}
            />
          )}
        </>
      )}
    </>
  );
}
