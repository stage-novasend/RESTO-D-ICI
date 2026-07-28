import { Link } from 'react-router-dom';
import { UtensilsCrossed, Shield, Eye, Trash2, Download, Lock } from 'lucide-react';
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
  <section style={{ marginBottom: 44 }}>
    <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 800, color: T.dark, margin: '0 0 14px', paddingBottom: 10, borderBottom: `2px solid ${T.accent}22` }}>{title}</h2>
    {children}
  </section>
);

const P = ({ children }) => (
  <p style={{ fontFamily: sans, fontSize: 14, color: T.text, lineHeight: 1.8, margin: '0 0 10px' }}>{children}</p>
);

const RIGHTS = [
  { icon: Eye,      label: 'Droit d\'accès',      desc: 'Savoir quelles données nous détenons sur vous' },
  { icon: Shield,   label: 'Droit de rectification', desc: 'Corriger des informations inexactes' },
  { icon: Trash2,   label: 'Droit à l\'effacement', desc: 'Supprimer vos données ("droit à l\'oubli")' },
  { icon: Download, label: 'Portabilité',           desc: 'Recevoir vos données dans un format lisible' },
  { icon: Lock,     label: 'Opposition',            desc: 'Refuser certains traitements de données' },
];

export default function Privacy() {
  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: sans }}>
      <MiniNav />

      <div style={{ background: `linear-gradient(135deg, ${T.dark} 0%, #2D1500 100%)`, padding: '64px 32px 56px', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20, fontFamily: sans }}>Vie privée</span>
        <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>Politique de confidentialité</h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Dernière mise à jour : 1er juin 2026</p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 32px' }}>

        {/* Résumé visuel */}
        <div style={{ background: '#fff', border: '1px solid #EAE0D5', borderRadius: 16, padding: '28px', marginBottom: 48, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {[
            { emoji: '🔒', title: 'Données sécurisées', desc: 'Chiffrement bout en bout' },
            { emoji: '🚫', title: 'Pas de revente', desc: 'Vos données ne sont jamais vendues' },
            { emoji: '✅', title: 'Vous contrôlez', desc: 'Suppression sur demande' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} style={{ textAlign: 'center', padding: '16px 8px', background: `${T.accent}06`, borderRadius: 12 }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{emoji}</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.dark, margin: '0 0 4px', fontFamily: sans }}>{title}</p>
              <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: sans }}>{desc}</p>
            </div>
          ))}
        </div>

        <Section title="Qui collecte vos données ?">
          <P>Resto d'ici SAS, dont le siège est à Abidjan, Côte d'Ivoire, est le responsable du traitement de vos données personnelles collectées via la plateforme restodici.ci.</P>
        </Section>

        <Section title="Données collectées">
          <P><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone.</P>
          <P><strong>Données de paiement :</strong> informations de transaction (nous ne stockons pas les numéros de carte). Les paiements mobiles sont traités par des opérateurs agréés (Wave, Orange, MTN, Moov).</P>
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
          <P>Pour exercer ces droits, contactez-nous à <a href="mailto:privacy@restodici.ci" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>privacy@restodici.ci</a>. Nous répondons sous 30 jours.</P>
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
          <P>Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données à <a href="mailto:privacy@restodici.ci" style={{ color: T.accent, textDecoration: 'none', fontWeight: 600 }}>privacy@restodici.ci</a>.</P>
        </Section>

      </div>
      <MiniFooter />
    </div>
  );
}
