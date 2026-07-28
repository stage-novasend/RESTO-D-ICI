import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Mail, Phone, MapPin, ArrowRight, Send, CheckCircle } from 'lucide-react';
import MiniFooter from '../components/shared/MiniFooter';

const T = { accent: '#EA580C', accentD: '#C2410C', bg: '#FFFFFF', dark: '#1A0C00', text: '#3B2409', muted: '#7A5E3A' };
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', system-ui, sans-serif";

function MiniNav() {
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid rgba(255,140,0,0.12)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, #FFB800)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${T.accent}40` }}>
            <UtensilsCrossed style={{ width: 17, height: 17, color: '#fff' }} />
          </div>
          <span style={{ fontFamily: serif, fontWeight: 800, color: T.dark, fontSize: 18 }}>Resto d'ici</span>
        </Link>
        <Link to="/" style={{ fontFamily: sans, fontSize: 13, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
          ← Accueil
        </Link>
      </div>
    </nav>
  );
}

export default function Contact() {
  const [form, setForm]       = useState({ nom: '', email: '', sujet: '', message: '' });
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  };

  const field = (id, label, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type} id={id} value={form[id]}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        placeholder={placeholder} required
        style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 13, fontFamily: sans, outline: 'none', background: '#FFFFFF', color: T.dark, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onFocus={e => { e.target.style.borderColor = T.accent; }}
        onBlur={e => { e.target.style.borderColor = '#E8DDD0'; }}
      />
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: sans }}>
      <MiniNav />

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${T.dark} 0%, #2D1500 100%)`, padding: '72px 32px 64px', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20, fontFamily: sans }}>Contact</span>
        <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.15 }}>Nous sommes là<br />pour vous aider</h1>
        <p style={{ fontFamily: sans, fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>Une question, un partenariat, un problème technique — écrivez-nous, nous répondons sous 24h.</p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'start' }}>

          {/* Formulaire */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px', border: '1px solid #EAE0D5', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle style={{ width: 30, height: 30, color: '#059669' }} />
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 800, color: T.dark, margin: '0 0 10px' }}>Message envoyé !</h3>
                <p style={{ fontSize: 14, color: T.muted, margin: '0 0 28px' }}>Nous vous répondrons dans les 24 heures ouvrées.</p>
                <button onClick={() => { setSent(false); setForm({ nom: '', email: '', sujet: '', message: '' }); }}
                  style={{ background: 'transparent', border: `1.5px solid ${T.accent}`, borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: T.accent, fontFamily: sans }}>
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 800, color: T.dark, margin: '0 0 28px' }}>Envoyer un message</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <div style={{ paddingRight: 8 }}>{field('nom', 'Votre nom', 'text', 'Jean Dupont')}</div>
                  <div style={{ paddingLeft: 8 }}>{field('email', 'Email', 'email', 'vous@exemple.ci')}</div>
                </div>
                {field('sujet', 'Sujet', 'text', 'Partenariat, problème technique…')}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Message</label>
                  <textarea
                    value={form.message} required rows={5}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Décrivez votre demande en détail…"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8DDD0', borderRadius: 10, fontSize: 13, fontFamily: sans, outline: 'none', background: '#FFFFFF', color: T.dark, resize: 'vertical', boxSizing: 'border-box', minHeight: 120 }}
                    onFocus={e => { e.target.style.borderColor = T.accent; }}
                    onBlur={e => { e.target.style.borderColor = '#E8DDD0'; }}
                  />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px 0', background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`, color: '#fff', border: 'none', borderRadius: 11, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, fontFamily: sans, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.75 : 1, boxShadow: `0 6px 20px ${T.accent}44` }}>
                  {loading ? 'Envoi en cours…' : <><Send style={{ width: 15, height: 15 }} /> Envoyer le message</>}
                </button>
              </form>
            )}
          </div>

          {/* Infos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: Mail, label: 'Email', value: 'contact@restodici.ci', sub: 'Réponse sous 24h ouvrées' },
              { icon: Phone, label: 'Téléphone', value: '+225 27 22 XX XX XX', sub: 'Lun–Ven · 8h–18h' },
              { icon: MapPin, label: 'Adresse', value: 'Abidjan, Cocody', sub: 'Plateau · Côte d\'Ivoire' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #EAE0D5', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${T.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 18, height: 18, color: T.accent }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.dark, margin: '0 0 2px' }}>{value}</p>
                  <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}

            {/* CTA Partenariat */}
            <div style={{ background: `linear-gradient(135deg, ${T.dark}, #2D1500)`, borderRadius: 16, padding: '24px', marginTop: 4 }}>
              <p style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Devenir partenaire</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', lineHeight: 1.6 }}>Vous êtes restaurateur ? Rejoignez Resto d'ici et digitalisez votre établissement.</p>
              <Link to="/register?type=gerant" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`, color: '#fff', padding: '10px 18px', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: sans }}>
                Nous rejoindre <ArrowRight style={{ width: 13, height: 13 }} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MiniFooter />
    </div>
  );
}
