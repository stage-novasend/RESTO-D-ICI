/* ═══════════════════════════════════════════════════════════════
   StaticPageShell — habillage des pages institutionnelles :
   mentions légales / CGU, confidentialité, aide, contact.

   Ces quatre pages dupliquaient chacune sa propre copie de `MiniNav`, avec un
   pictogramme lucide générique en guise de logo. Le tracé officiel est
   désormais rendu une seule fois, via BrandLogo.
   ═══════════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';
import MiniFooter from './MiniFooter';

const DARK  = '#1A0C00';
const ACCENT = '#EA580C';
const sans  = "'Manrope', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";

function TopNav() {
  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <BrandLogo size={34} to="/" />
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: sans, fontSize: 13, color: '#64748B',
            textDecoration: 'none', fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} />
          Accueil
        </Link>
      </div>
    </nav>
  );
}

/**
 * @param badge     libellé de la pastille au-dessus du titre
 * @param title     titre de la page (accepte du JSX pour les retours à la ligne)
 * @param meta      ligne d'information sous le titre (date de mise à jour…)
 * @param maxWidth  largeur du contenu — 820 px pour du texte long, plus large
 *                  pour des grilles de cartes
 */
export default function StaticPageShell({
  badge,
  title,
  meta,
  children,
  maxWidth = 820,
  footer = true,
}) {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100dvh', fontFamily: sans }}>
      <TopNav />

      <header style={{
        background: DARK,
        padding: 'clamp(44px,7vw,64px) clamp(16px,4vw,32px) clamp(40px,6vw,56px)',
        textAlign: 'center',
      }}>
        {badge && (
          <span style={{
            display: 'inline-block', background: 'rgba(234,88,12,0.16)',
            border: '1px solid rgba(234,88,12,0.32)', borderRadius: 20,
            padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#FB923C',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 20, fontFamily: sans,
          }}>
            {badge}
          </span>
        )}
        <h1 style={{
          fontFamily: serif, fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900,
          color: '#fff', margin: '0 0 12px', lineHeight: 1.18,
        }}>
          {title}
        </h1>
        {meta && (
          <p style={{ fontFamily: sans, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {meta}
          </p>
        )}
      </header>

      <main style={{
        maxWidth, margin: '0 auto',
        padding: 'clamp(40px,6vw,64px) clamp(16px,4vw,32px)',
      }}>
        {children}
      </main>

      {footer && <MiniFooter />}
    </div>
  );
}

/* Titre de section, avec ancre pour les sommaires. */
export function LegalSection({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 44, scrollMarginTop: 88 }}>
      <h2 style={{
        fontFamily: serif, fontSize: 21, fontWeight: 800, color: DARK,
        margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid #E2E8F0',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/* Paragraphe de texte légal — interlignage large pour la lecture longue. */
export function LegalP({ children }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 14.5, color: '#3B2409', lineHeight: 1.85, margin: '0 0 14px' }}>
      {children}
    </p>
  );
}

/* Sommaire d'ancres. `active` met en valeur l'entrée courante. */
export function LegalTabs({ items, active, onSelect }) {
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 40, background: '#F8FAFC',
      borderRadius: 12, padding: 5, border: '1px solid #E2E8F0', width: 'fit-content',
      flexWrap: 'wrap',
    }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            onClick={() => onSelect?.(it.id)}
            style={{
              padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              fontFamily: sans, textDecoration: 'none',
              background: on ? ACCENT : 'transparent',
              color: on ? '#fff' : '#64748B',
              transition: 'all 0.15s',
            }}
          >
            {it.label}
          </a>
        );
      })}
    </div>
  );
}
