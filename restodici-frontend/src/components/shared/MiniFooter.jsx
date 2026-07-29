import { Link } from 'react-router-dom';
import orangeMoneyLogo   from '../../assets/payments/orange-money.svg';
import mtnMomoLogo       from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo     from '../../assets/payments/moov-money.svg';
import waveLogo          from '../../assets/payments/wave.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';

const sans = "'Manrope', system-ui, sans-serif";

const PAYMENTS = [
  { label: 'Orange Money', logo: orangeMoneyLogo },
  { label: 'MTN MoMo',     logo: mtnMomoLogo },
  { label: 'Moov Money',   logo: moovMoneyLogo },
  { label: 'Wave',         logo: waveLogo },
  { label: 'Carte Bancaire', logo: carteBancaireLogo },
];

export default function MiniFooter() {
  return (
    <footer style={{ background: '#0A0F1E', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 24px 28px', textAlign: 'center' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Payment logos row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Paiements Sécurisés :
          </span>
          {PAYMENTS.map(({ label, logo }) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 10px',
            }}>
              <img src={logo} alt={label} style={{ height: 16, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Security & compliance text */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: sans, marginBottom: 16, lineHeight: 1.6 }}>
          <span>🔒 Cryptage SSL 256 bits</span> · <span>📜 Conforme SYSCOHADA</span> · <span>⚡ Passerelle NovaSend CI</span> · <span>🏛️ Resto d'ici S.A.R.L. · Abidjan Plateau</span>
        </div>

        {/* Links */}
        <p style={{ fontFamily: sans, fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          © 2026 Resto d'ici · Tous droits réservés
          {' · '}
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Confidentialité</Link>
          {' · '}
          <Link to="/contact" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Contact</Link>
          {' · '}
          <Link to="/aide"    style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Aide</Link>
          {' · '}
          <Link to="/legal"   style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Mentions légales</Link>
        </p>
      </div>
    </footer>
  );
}
