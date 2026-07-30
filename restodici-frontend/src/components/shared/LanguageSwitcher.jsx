import { useLanguage } from '../../hooks/useLanguage';

const FrenchFlag = () => (
  <svg width="22" height="16" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '4px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
    <rect width="6.67" height="15" fill="#002395"/>
    <rect x="6.67" width="6.67" height="15" fill="#FFFFFF"/>
    <rect x="13.34" width="6.66" height="15" fill="#ED2939"/>
  </svg>
);

const UKFlag = () => (
  <svg width="22" height="16" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '4px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
    <clipPath id="uk-flag-clip"><rect width="60" height="30" rx="4" /></clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

/* `variant` n'affecte pas encore la couleur (le fond orange reste lisible
   partout) — seul le libellé texte se cache sous 480px pour éviter que le
   switcher ne fasse déborder la topbar sur mobile (flags seuls affichés). */
export default function LanguageSwitcher({ style = {}, className = '', variant }) {
  const { lang, setLang } = useLanguage();

  const isFr = lang === 'fr';
  const isEn = lang === 'en';

  return (
    <div
      className={`rd-lang-switch inline-flex items-center select-none ${className}`}
      data-variant={variant}
      style={{
        backgroundColor: '#EA580C',
        borderRadius: '9999px',
        padding: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
        flexShrink: 0,
        ...style,
      }}
    >
      <style>{`
        @media (max-width: 480px) {
          .rd-lang-switch .rd-lang-label { display: none; }
          .rd-lang-switch button { padding: 7px 10px !important; gap: 0 !important; }
        }
      `}</style>

      {/* FRANCAIS button */}
      <button
        type="button"
        onClick={() => setLang('fr')}
        aria-label="Changer en français"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          borderRadius: '9999px',
          border: 'none',
          backgroundColor: isFr ? '#003B46' : 'transparent',
          color: isFr ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)',
          fontWeight: 800,
          fontSize: '12px',
          fontFamily: 'Manrope, sans-serif',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isFr ? '0 2px 6px rgba(0, 0, 0, 0.2)' : 'none',
          outline: 'none',
        }}
      >
        <FrenchFlag />
        <span className="rd-lang-label">FRANCAIS</span>
      </button>

      {/* ENGLISH button */}
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-label="Switch to english"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          borderRadius: '9999px',
          border: 'none',
          backgroundColor: isEn ? '#003B46' : 'transparent',
          color: isEn ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)',
          fontWeight: 800,
          fontSize: '12px',
          fontFamily: 'Manrope, sans-serif',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isEn ? '0 2px 6px rgba(0, 0, 0, 0.2)' : 'none',
          outline: 'none',
        }}
      >
        <UKFlag />
        <span className="rd-lang-label">ENGLISH</span>
      </button>
    </div>
  );
}

