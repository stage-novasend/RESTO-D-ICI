import { useState } from 'react';
import { Mail } from 'lucide-react';
import StaticPageShell, {
  LegalSection as Section, LegalP as P, LegalTabs,
} from '../components/shared/StaticPageShell';

const T = { accent: '#EA580C', dark: '#1A0C00', muted: '#64748B' };
const sans = "'Manrope', system-ui, sans-serif";

const TABS = [
  { id: 'mentions', label: 'Mentions légales' },
  { id: 'cgu',      label: 'CGU' },
];

export default function Legal() {
  /* Les onglets etaient purement decoratifs : le premier etait toujours peint
     comme actif, quel que soit l'ancre visitee. L'etat suit desormais le clic. */
  const [tab, setTab] = useState('mentions');

  return (
    <StaticPageShell
      badge="Juridique"
      title={<>Mentions légales &amp; CGU</>}
      meta="Dernière mise à jour : 1er juin 2026"
    >
      <LegalTabs items={TABS} active={tab} onSelect={setTab} />

      <div id="mentions">

          <Section title="Éditeur du site">
            <P><strong>Raison sociale :</strong> SANKOFA-LAB (AROAPP)</P>
            <P><strong>Forme :</strong> société ivoirienne, créée en 2024</P>
            <P><strong>Siège social :</strong> Abidjan, Cocody Belle Côte, Cité Tuileries, Côte d'Ivoire</P>
            <P><strong>Email :</strong> <a href="mailto:akwaba@sankofa-lab.co" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>akwaba@sankofa-lab.co</a></P>
            <P><strong>Directeur de la publication :</strong> la direction de SANKOFA-LAB</P>
            <P>
              Resto d'ici est une plateforme éditée par SANKOFA-LAB, société
              ivoirienne présente en Côte d'Ivoire et au Cameroun, également
              éditrice de la solution de paiement <strong>NovaSend</strong>{' '}
              (<a href="https://novasend.app" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>novasend.app</a>).
            </P>
          </Section>

          <Section title="Hébergement">
            <P>Ce site est hébergé sur des infrastructures cloud sécurisées. L'hébergeur garantit une disponibilité de 99,9 % et respecte la réglementation ivoirienne en matière de traitement des données.</P>
          </Section>

          <Section title="Propriété intellectuelle">
            <P>L'ensemble du contenu de ce site — textes, images, logos, icônes, code source — est la propriété exclusive de SANKOFA-LAB. Toute reproduction partielle ou totale sans autorisation écrite est strictement interdite et constitue une contrefaçon au sens des lois en vigueur.</P>
          </Section>

          <Section title="Limitation de responsabilité">
            <P>SANKOFA-LAB met tout en œuvre pour assurer l'exactitude et la mise à jour des informations publiées. Toutefois, la société ne saurait être tenue responsable des erreurs, omissions ou résultats obtenus à la suite d'une mauvaise utilisation des informations fournies.</P>
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
            <P>Les commandes passées sur Resto d'ici sont fermes et définitives une fois confirmées. Les paiements sont opérés par <strong>NovaSend</strong>, solution d'encaissement de SANKOFA-LAB, et acceptent Orange Money, MTN MoMo, Wave et Moov Money. Le règlement au comptoir en espèces ou par chèque reste possible auprès du restaurant.</P>
            <P>En cas d'indisponibilité d'un article après confirmation de commande, notre équipe vous contactera pour convenir d'un arrangement (substitution ou remboursement).</P>
          </Section>

          <Section title="Comportement interdit">
            <P>Il est interdit d'utiliser la plateforme à des fins illicites, de tenter d'accéder à des zones non autorisées du système, de publier des contenus à caractère diffamatoire, ou d'usurper l'identité d'un tiers.</P>
          </Section>

          <Section title="Modification des CGU">
            <P>SANKOFA-LAB se réserve le droit de modifier les présentes CGU à tout moment. Toute modification prend effet dès sa publication sur le site. Nous vous encourageons à les consulter régulièrement. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.</P>
          </Section>

          <Section title="Droit applicable">
            <P>Les présentes CGU sont soumises au droit ivoirien. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.</P>
          </Section>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={18} color={T.accent} />
          </div>
          <div>
            <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.dark, margin: '0 0 3px' }}>Des questions sur nos conditions ?</p>
            <p style={{ fontFamily: sans, fontSize: 12, color: T.muted, margin: 0 }}>Contactez-nous à <a href="mailto:akwaba@sankofa-lab.co" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>akwaba@sankofa-lab.co</a></p>
          </div>
        </div>

    </StaticPageShell>
  );
}
