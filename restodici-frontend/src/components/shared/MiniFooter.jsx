import { Link } from 'react-router-dom';

const sans = "'Manrope', system-ui, sans-serif";
const ACCENT = '#EA580C';

export default function MiniFooter() {
  return (
    <footer style={{ background: '#0A0F1E', padding: '28px 32px', textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
        © 2026 Resto d'ici · Abidjan, Côte d'Ivoire
        {' · '}
        <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Confidentialité</Link>
        {' · '}
        <Link to="/contact" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Contact</Link>
        {' · '}
        <Link to="/aide"    style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Aide</Link>
        {' · '}
        <Link to="/legal"   style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Mentions légales</Link>
      </p>
    </footer>
  );
}
