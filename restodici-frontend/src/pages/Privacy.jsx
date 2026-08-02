import { Shield, Ban, UserCheck, Eye, Trash2, Download, Lock } from 'lucide-react';
import StaticPageShell, {
  LegalSection as Section, LegalP as P,
} from '../components/shared/StaticPageShell';

const T = { accent: '#FF3A03', dark: '#1A0C00', muted: '#64748B' };
const sans = "'Manrope', system-ui, sans-serif";

/* Resume en tete de page. Les emojis precedents (cadenas, interdit, coche)
   rendaient differemment selon la plateforme ; des pictogrammes vectoriels
   restent identiques partout et cadrent avec un document juridique. */
const GUARANTEES = [
  { Icon: Shield,    title: 'Données sécurisées', desc: 'Connexion chiffrée, mots de passe hachés' },
  { Icon: Ban,       title: 'Pas de revente',     desc: 'Vos données ne sont jamais vendues' },
  { Icon: UserCheck, title: 'Vous contrôlez',     desc: 'Suppression sur simple demande' },
];

const RIGHTS = [
  { icon: Eye,      label: "Droit d'accès",          desc: 'Savoir quelles données nous détenons sur vous' },
  { icon: Shield,   label: 'Droit de rectification', desc: 'Corriger des informations inexactes' },
  { icon: Trash2,   label: "Droit à l'effacement",   desc: "Supprimer vos données (« droit à l'oubli »)" },
  { icon: Download, label: 'Portabilité',            desc: 'Recevoir vos données dans un format lisible' },
  { icon: Lock,     label: 'Opposition',             desc: 'Refuser certains traitements de données' },
];

export default function Privacy() {
  return (
    <StaticPageShell
      badge="Vie privée"
      title="Politique de confidentialité"
      meta="Dernière mise à jour : 1er juin 2026"
    >
      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, marginBottom: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {GUARANTEES.map(({ Icon, title, desc }) => (
          <div key={title} style={{ textAlign: 'center', padding: '18px 10px', background: '#F8FAFC', borderRadius: 10 }}>
            <span style={{ display: 'inline-flex', width: 38, height: 38, borderRadius: 10, background: '#FFF5ED', border: '1px solid #FED7AA', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={18} color={T.accent} />
            </span>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.dark, margin: '0 0 4px', fontFamily: sans }}>{title}</p>
            <p style={{ fontSize: 11.5, color: T.muted, margin: 0, fontFamily: sans, lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

        <Section title="Qui collecte vos données ?">
          <P><strong>SANKOFA-LAB (AROAPP)</strong>, société ivoirienne créée en 2024 et dont le siège est situé à Abidjan, Cocody Belle Côte, Cité Tuileries, est le responsable du traitement de vos données personnelles collectées via la plateforme Resto d'ici.</P>
          <P>Pour toute question, vous pouvez écrire à <a href="mailto:akwaba@sankofa-lab.co" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>akwaba@sankofa-lab.co</a>.</P>
        </Section>

        <Section title="Données collectées">
          <P><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone.</P>
          <P><strong>Données de paiement :</strong> informations de transaction. Nous ne stockons aucun numéro de carte. Les paiements sont traités par <strong>NovaSend</strong>, la solution d'encaissement de SANKOFA-LAB, qui les acheminent vers les opérateurs de mobile money agréés (Orange Money, MTN MoMo, Wave, Moov Money).</P>
          <P><strong>Données de commande :</strong> historique des commandes, restaurants fréquentés, préférences alimentaires déclarées.</P>
          <P><strong>Données techniques :</strong> adresse IP, type de navigateur, pages visitées, durée de session — collectées automatiquement à des fins d'amélioration du service.</P>
        </Section>

        <Section title="Finalités du traitement">
          <P>Vos données sont utilisées pour : exécuter et suivre vos commandes, gérer votre compte, personnaliser votre expérience, améliorer notre plateforme, vous envoyer des communications de service, respecter nos obligations légales et comptables.</P>
          <P>Nous n'utilisons pas vos données à des fins de ciblage publicitaire tiers.</P>
        </Section>

        <Section title="Partage des données">
          <P>Vos données peuvent être partagées avec : les restaurants partenaires (uniquement pour l'exécution de votre commande), les prestataires techniques (hébergement, paiement) soumis à des accords de confidentialité stricts, les autorités légales en cas d'obligation réglementaire.</P>
          <P><strong>Vos données ne sont jamais vendues à des tiers.</strong></P>
        </Section>

        <Section title="Conservation des données">
          <P>Les données de compte sont conservées pendant toute la durée de la relation contractuelle, puis 3 ans après la dernière activité. Les données de transaction sont conservées 10 ans (obligation légale ivoirienne - SYSCOHADA). Les cookies non essentiels sont effacés après 13 mois.</P>
        </Section>

        <Section title="Vos droits">
          <P>Conformément à la réglementation ivoirienne sur la protection des données personnelles, vous bénéficiez des droits suivants :</P>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
            {RIGHTS.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #EAE0D5', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 14, height: 14, color: T.accent }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.dark, margin: '0 0 2px', fontFamily: sans }}>{label}</p>
                  <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: sans }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <P>Pour exercer ces droits, contactez-nous à <a href="mailto:akwaba@sankofa-lab.co" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>akwaba@sankofa-lab.co</a>. Nous répondons sous 30 jours.</P>
        </Section>

        <Section title="Cookies">
          <P><strong>Cookies essentiels :</strong> indispensables au fonctionnement du site (session, panier, authentification). Ne peuvent pas être refusés.</P>
          <P><strong>Cookies analytiques :</strong> nous aident à comprendre comment vous utilisez le site. Anonymisés. Vous pouvez les refuser.</P>
          <P>Vous pouvez gérer vos préférences cookies à tout moment depuis les paramètres de votre navigateur.</P>
        </Section>

        <Section title="Sécurité">
          <P>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement HTTPS, hachage des mots de passe (bcrypt), accès aux données restreint au personnel autorisé, sauvegardes régulières, surveillance des accès anormaux.</P>
        </Section>

        <Section title="Contact DPO">
          <P>Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données à <a href="mailto:akwaba@sankofa-lab.co" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>akwaba@sankofa-lab.co</a>.</P>
        </Section>

    </StaticPageShell>
  );
}
