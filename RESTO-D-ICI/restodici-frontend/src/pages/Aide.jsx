import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, ChevronDown, Search, ShoppingBag, CreditCard, Building2, Headphones, ArrowRight } from 'lucide-react';
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
        <Link to="/" style={{ fontFamily: sans, fontSize: 13, color: T.muted, textDecoration: 'none', fontWeight: 500 }}>← Accueil</Link>
      </div>
    </nav>
  );
}

const CATEGORIES = [
  { id: 'commandes', icon: ShoppingBag,  label: 'Commandes',       color: '#EA580C' },
  { id: 'paiements', icon: CreditCard,   label: 'Paiements',       color: '#059669' },
  { id: 'compte',    icon: Headphones,   label: 'Mon compte',      color: '#7C3AED' },
  { id: 'b2b',       icon: Building2,    label: 'Entreprises B2B', color: '#2563EB' },
];

const FAQ = {
  commandes: [
    {
      q: 'Comment passer une commande ?',
      a: 'Accédez au menu depuis la page d\'accueil, choisissez vos plats, ajoutez-les au panier, puis procédez au paiement. Vous recevrez une confirmation par email et pourrez suivre votre commande en temps réel.',
    },
    {
      q: 'Puis-je modifier ma commande après validation ?',
      a: 'Une commande peut être modifiée uniquement dans les 2 minutes qui suivent la confirmation, avant qu\'elle ne soit transmise au restaurant. Passé ce délai, contactez-nous directement.',
    },
    {
      q: 'Quels sont les délais de livraison ?',
      a: 'Les délais varient selon le restaurant et votre localisation (généralement 20–45 min à Abidjan). L\'heure estimée est affichée lors de la commande et mise à jour en temps réel.',
    },
    {
      q: 'Que faire si ma commande n\'arrive pas ?',
      a: 'Consultez le suivi en temps réel dans votre espace. Si le délai est dépassé de plus de 20 minutes, contactez notre support via le bouton "Aide" dans la page de suivi ou écrivez-nous à contact@restodici.ci.',
    },
  ],
  paiements: [
    {
      q: 'Quels moyens de paiement sont acceptés ?',
      a: 'Wave, Orange Money, MTN Money, Moov Money, carte bancaire Visa/Mastercard et espèces (paiement à la livraison sur certains restaurants partenaires).',
    },
    {
      q: 'Mon paiement a échoué. Que faire ?',
      a: 'Vérifiez que votre solde est suffisant et que vous avez saisi le bon numéro. Si le problème persiste, réessayez avec un autre moyen de paiement ou contactez notre support.',
    },
    {
      q: 'Comment obtenir un remboursement ?',
      a: 'En cas de commande non livrée ou de produit manquant, envoyez une demande à contact@restodici.ci avec votre numéro de commande. Nous traitons les remboursements sous 48h ouvrées.',
    },
  ],
  compte: [
    {
      q: 'Comment créer un compte ?',
      a: 'Cliquez sur "S\'inscrire" en haut à droite, renseignez vos informations et validez votre email. Votre compte est actif immédiatement pour les commandes.',
    },
    {
      q: 'J\'ai oublié mon mot de passe',
      a: 'Sur la page de connexion, cliquez sur "Oublié ?" et renseignez votre email. Vous recevrez un lien de réinitialisation valable 1 heure.',
    },
    {
      q: 'Comment supprimer mon compte ?',
      a: 'Envoyez une demande à privacy@restodici.ci depuis l\'adresse associée à votre compte. La suppression est définitive et irréversible. Vos données de transaction sont conservées 10 ans pour obligation légale.',
    },
  ],
  b2b: [
    {
      q: 'Qu\'est-ce que l\'offre B2B ?',
      a: 'Resto d\'ici B2B est une solution dédiée aux entreprises pour gérer les repas de leurs collaborateurs : budget mensuel centralisé, commandes groupées, suivi des dépenses par équipe et facturation SYSCOHADA.',
    },
    {
      q: 'Comment souscrire à l\'offre B2B ?',
      a: 'Créez un compte de type "Entreprise" depuis la page d\'inscription ou contactez-nous à contact@restodici.ci. Notre équipe vous accompagnera pour paramétrer votre espace et former vos équipes.',
    },
    {
      q: 'Quels sont les documents requis pour un compte B2B ?',
      a: 'Extrait du registre de commerce, carte de contribuable, et coordonnées du responsable de compte. La validation prend 24–48h ouvrées.',
    },
    {
      q: 'Puis-je obtenir des factures conformes SYSCOHADA ?',
      a: 'Oui. Toutes les factures générées depuis votre dashboard B2B sont au format SYSCOHADA et peuvent être exportées en CSV pour intégration dans votre comptabilité.',
    },
  ],
};

function Accordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #EAE0D5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.dark, fontFamily: sans, lineHeight: 1.5 }}>{q}</span>
        <ChevronDown style={{ width: 16, height: 16, color: T.muted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 20px 18px', borderTop: '1px solid #F0EAE2' }}>
          <p style={{ fontFamily: sans, fontSize: 13, color: T.text, lineHeight: 1.75, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Aide() {
  const [activeCategory, setActiveCategory] = useState('commandes');
  const [search, setSearch] = useState('');

  const faqFiltered = search.trim()
    ? Object.entries(FAQ).flatMap(([, items]) => items).filter(({ q, a }) =>
        (q + a).toLowerCase().includes(search.toLowerCase())
      )
    : FAQ[activeCategory] || [];

  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: sans }}>
      <MiniNav />

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${T.dark} 0%, #2D1500 100%)`, padding: '72px 32px 64px', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Centre d'aide</span>
        <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 24px', lineHeight: 1.15 }}>Comment pouvons-nous<br />vous aider ?</h1>
        <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
          <Search style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)', position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans la FAQ…"
            style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.10)', color: '#fff', fontSize: 14, fontFamily: sans, outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(10px)' }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 32px' }}>

        {/* Catégories */}
        {!search.trim() && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
            {CATEGORIES.map(({ id, icon: Icon, label, color }) => (
              <button key={id} onClick={() => setActiveCategory(id)}
                style={{ background: activeCategory === id ? color : '#fff', border: `1.5px solid ${activeCategory === id ? color : '#EAE0D5'}`, borderRadius: 14, padding: '18px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all 0.18s' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: activeCategory === id ? 'rgba(255,255,255,0.22)' : `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 18, height: 18, color: activeCategory === id ? '#fff' : color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: activeCategory === id ? '#fff' : T.dark, fontFamily: sans }}>{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: 14, color: T.muted, fontFamily: sans }}>Aucun résultat pour "<strong>{search}</strong>"</p>
              <p style={{ fontSize: 13, color: T.muted, fontFamily: sans }}>Essayez un autre terme ou <Link to="/contact" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>contactez-nous</Link>.</p>
            </div>
          ) : (
            faqFiltered.map((item, i) => <Accordion key={i} {...item} />)
          )}
        </div>

        {/* CTA Contact */}
        <div style={{ marginTop: 56, background: `linear-gradient(135deg, ${T.dark}, #2D1500)`, borderRadius: 20, padding: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Vous n'avez pas trouvé la réponse ?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>Notre équipe répond sous 24h. Expliquez-nous votre problème et nous vous aidons.</p>
          </div>
          <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`, color: '#fff', padding: '13px 22px', borderRadius: 11, textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: sans, flexShrink: 0, boxShadow: `0 6px 20px ${T.accent}44` }}>
            Contacter le support <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>

      <MiniFooter />
    </div>
  );
}
