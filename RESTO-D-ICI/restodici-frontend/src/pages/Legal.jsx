import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import MiniFooter from '../components/shared/MiniFooter';

const T = { accent: '#EA580C', bg: '#FFFFFF', dark: '#1A0C00', text: '#3B2409', muted: '#7A5E3A' };
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

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 48 }}>
    <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 800, color: T.dark, margin: '0 0 16px', paddingBottom: 12, borderBottom: `2px solid ${T.accent}22` }}>{title}</h2>
    {children}
  </section>
);

const P = ({ children }) => (
  <p style={{ fontFamily: sans, fontSize: 14, color: T.text, lineHeight: 1.8, margin: '0 0 12px' }}>{children}</p>
);

export default function Legal() {
  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: sans }}>
      <MiniNav />

      <div style={{ background: `linear-gradient(135deg, ${T.dark} 0%, #2D1500 100%)`, padding: '64px 32px 56px', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20, fontFamily: sans }}>Juridique</span>
        <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>Mentions légales &amp; CGU</h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Dernière mise à jour : 1er juin 2026</p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 32px' }}>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 48, background: '#fff', borderRadius: 12, padding: 5, border: '1px solid #EAE0D5', width: 'fit-content' }}>
          {['Mentions légales', 'CGU'].map((tab, i) => (
            <a key={tab} href={`#${i === 0 ? 'mentions' : 'cgu'}`} style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: sans, textDecoration: 'none', background: i === 0 ? T.accent : 'transparent', color: i === 0 ? '#fff' : T.muted, transition: 'all 0.15s' }}>
              {tab}
            </a>
          ))}
        </div>

        <div id="mentions">
          <Section title="Éditeur du site">
            <P><strong>Raison sociale :</strong> Resto d'ici SAS</P>
            <P><strong>Siège social :</strong> Abidjan, Cocody Plateau, Côte d'Ivoire</P>
            <P><strong>Capital social :</strong> 1 000 000 FCFA</P>
            <P><strong>Email :</strong> contact@restodici.ci</P>
            <P><strong>Téléphone :</strong> +225 27 22 XX XX XX</P>
            <P><strong>Directeur de la publication :</strong> L'équipe Resto d'ici — ESATIC / Sankofa Lab</P>
          </Section>

          <Section title="Hébergement">
            <P>Ce site est hébergé sur des infrastructures cloud sécurisées. L'hébergeur garantit une disponibilité de 99,9 % et respecte la réglementation ivoirienne en matière de traitement des données.</P>
          </Section>

          <Section title="Propriété intellectuelle">
            <P>L'ensemble du contenu de ce site — textes, images, logos, icônes, code source — est la propriété exclusive de Resto d'ici SAS. Toute reproduction partielle ou totale sans autorisation écrite est strictement interdite et constitue une contrefaçon au sens des lois en vigueur.</P>
          </Section>

          <Section title="Limitation de responsabilité">
            <P>Resto d'ici met tout en œuvre pour assurer l'exactitude et la mise à jour des informations publiées. Toutefois, la société ne saurait être tenue responsable des erreurs, omissions ou résultats obtenus à la suite d'une mauvaise utilisation des informations fournies.</P>
          </Section>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #EAE0D5', margin: '48px 0' }} />

        <div id="cgu">
          <Section title="Conditions Générales d'Utilisation">
            <P>En utilisant la plateforme Resto d'ici, vous acceptez les présentes CGU dans leur intégralité. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service.</P>
          </Section>

          <Section title="Objet du service">
            <P>Resto d'ici est une plateforme digitale permettant aux particuliers et aux entreprises de commander des repas auprès de restaurants partenaires basés à Abidjan, Côte d'Ivoire. La plateforme propose également un service B2B de gestion de budgets repas et de commandes groupées.</P>
          </Section>

          <Section title="Création de compte">
            <P>Pour accéder aux fonctionnalités de commande, vous devez créer un compte en fournissant des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants. Tout accès frauduleux à votre compte doit être signalé immédiatement à notre équipe.</P>
            <P>Les comptes de type <strong>Gérant</strong> et <strong>B2B</strong> sont soumis à validation manuelle par notre équipe avant activation.</P>
          </Section>

          <Section title="Commandes et paiement">
            <P>Les commandes passées sur Resto d'ici sont fermes et définitives une fois confirmées. Le paiement peut être effectué via Wave, Orange Money, MTN Money, Moov Money ou carte bancaire.</P>
            <P>En cas d'indisponibilité d'un article après confirmation de commande, notre équipe vous contactera pour convenir d'un arrangement (substitution ou remboursement).</P>
          </Section>

          <Section title="Comportement interdit">
            <P>Il est interdit d'utiliser la plateforme à des fins illicites, de tenter d'accéder à des zones non autorisées du système, de publier des contenus à caractère diffamatoire, ou d'usurper l'identité d'un tiers.</P>
          </Section>

          <Section title="Modification des CGU">
            <P>Resto d'ici se réserve le droit de modifier les présentes CGU à tout moment. Toute modification prend effet dès sa publication sur le site. Nous vous encourageons à les consulter régulièrement. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.</P>
          </Section>

          <Section title="Droit applicable">
            <P>Les présentes CGU sont soumises au droit ivoirien. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.</P>
          </Section>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${T.accent}22`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${T.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>✉️</span>
          </div>
          <div>
            <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.dark, margin: '0 0 3px' }}>Des questions sur nos conditions ?</p>
            <p style={{ fontFamily: sans, fontSize: 12, color: T.muted, margin: 0 }}>Contactez-nous à <a href="mailto:contact@restodici.ci" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>contact@restodici.ci</a></p>
          </div>
        </div>

      </div>
      <MiniFooter />
    </div>
  );
}
