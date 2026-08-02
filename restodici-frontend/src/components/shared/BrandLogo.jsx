/* ═══════════════════════════════════════════════════════════════
   BrandLogo — le logo officiel Resto d'ici.

   SOURCE UNIQUE du logo pour toute l'application. Chaque écran qui affiche la
   marque doit passer par ce composant : l'application comptait auparavant huit
   implémentations distinctes (chaque layout, l'accueil, le menu, la connexion,
   l'inscription…), toutes légèrement différentes.

   Le tracé reprend public/logo-mark.svg, qui sert aussi de source au logo des
   emails (`npm run email:logo` côté backend) et au favicon.

   L'identifiant du dégradé est suffixé par useId : sans cela, deux instances
   sur une même page dupliqueraient l'id et le navigateur rattacherait les deux
   rendus au premier dégradé déclaré.
   ═══════════════════════════════════════════════════════════════ */
import { useId } from 'react';

/**
 * Marque seule (sans le nom). Carré arrondi en dégradé orange, couverts
 * croisés blancs.
 *
 * @param shadow  ombre portée orange — à éviter sur fond sombre
 */
export function BrandMark({ size = 40, shadow = false, className = '', style }) {
  const uid = useId().replace(/:/g, '');
  const bg  = `rdBg-${uid}`;

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        borderRadius: size * 0.336,
        boxShadow: shadow ? `0 4px ${size * 0.43}px rgba(234,60,12,0.40)` : undefined,
        ...style,
      }}
      role="img"
      aria-label="Resto d'ici"
    >
      <defs>
        <linearGradient id={bg} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3A03" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="128" height="128" rx="43" fill={`url(#${bg})`} />

      {/* Couverts croisés — icône « utensils-crossed » de lucide-react
          (licence ISC), grille 24×24 centrée et agrandie ×3,2. */}
      <g
        transform="translate(25.6, 25.6) scale(3.2)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
        <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
        <path d="m2.1 21.8 6.4-6.3" />
        <path d="m19 5-7 7" />
      </g>
    </svg>
  );
}

/**
 * Logo complet : marque + nom.
 * @param onDark  inverse le nom pour un fond sombre ou coloré
 * @param to      rend le logo cliquable vers cette URL (null = non cliquable)
 */
export default function BrandLogo({
  size = 40,
  onDark = false,
  to = '/',
  showWordmark = true,
  gap = 10,
  shadow = false,
}) {
  const content = (
    <>
      <BrandMark size={size} shadow={shadow} />
      {showWordmark && (
        <span
          style={{
            fontFamily: "'Manrope', 'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: Math.round(size * 0.46),
            fontWeight: 900,
            letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: onDark ? '#FFFFFF' : '#FF3A03' }}>Resto</span>
          <span style={{ color: onDark ? 'rgba(255,255,255,0.85)' : '#1A0C00' }}>&nbsp;d&apos;ici</span>
        </span>
      )}
    </>
  );

  const layout = { display: 'inline-flex', alignItems: 'center', gap, textDecoration: 'none' };

  return to
    ? <a href={to} style={layout}>{content}</a>
    : <span style={layout}>{content}</span>;
}
