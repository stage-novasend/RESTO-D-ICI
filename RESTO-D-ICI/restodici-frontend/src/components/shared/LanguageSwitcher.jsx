import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { Globe, ChevronDown } from 'lucide-react';

export default function LanguageSwitcher({ variant = 'header', style = {} }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English',  flag: '🇬🇧' },
  ];

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const isDark = variant === 'dark' || variant === 'footer';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Changer de langue / Change language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 20,
          border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid #E2E8F0',
          background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
          color: isDark ? '#F8FAFC' : '#1E293B',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Manrope, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
          outline: 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>{current.flag}</span>
        <span style={{ letterSpacing: '0.04em' }}>{current.code.toUpperCase()}</span>
        <ChevronDown size={12} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          zIndex: 9999,
          minWidth: 130,
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          animation: 'fadeUp 0.18s ease both',
        }}>
          {LANGUAGES.map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => { setLang(item.code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                background: lang === item.code ? '#FFF3E0' : 'transparent',
                color: lang === item.code ? '#EA580C' : '#1E293B',
                fontSize: 12,
                fontWeight: lang === item.code ? 800 : 600,
                fontFamily: 'Manrope, sans-serif',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.flag}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
