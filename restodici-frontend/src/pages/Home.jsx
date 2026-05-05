// src/pages/Home.jsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, MapPin, Smartphone, BarChart3, Building2, ArrowRight, CheckCircle, Clock, Shield, Star } from "lucide-react";

// Palette officielle "Savane Moderne"
const COLORS = {
  bg: "bg-[#F9F7F5]",
  text: "text-[#2D2720]",
  textMuted: "text-[#8B7355]",
  primary: "text-[#D94500]",
  primaryBg: "bg-[#D94500]",
  primaryHover: "hover:bg-[#B83A00]",
  success: "text-[#2ECC71]",
  successBg: "bg-[#2ECC71]",
  card: "bg-white",
  border: "border-[#E8E2D9]",
};

// Données statiques (à remplacer par API plus tard)
const MENU_ITEMS = [
  { name: "Attiéké Poisson Braisé", price: "3 500 FCFA", tag: "Best-seller", img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80", cat: "Plat local" },
  { name: "Grillades de Poulet", price: "4 200 FCFA", tag: "Populaire", img: "https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=400&q=80", cat: "Grillades" },
  { name: "Bowl Salade Fraîche", price: "2 800 FCFA", tag: "Healthy", img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", cat: "Salade" },
  { name: "Jus de Gingembre", price: "800 FCFA", tag: "Frais", img: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&q=80", cat: "Boisson" },
  { name: "Alloco Crevettes", price: "3 000 FCFA", tag: "Nouveau", img: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80", cat: "Entrée" },
  { name: "Thiéboudienne", price: "3 800 FCFA", tag: "Coup de cœur", img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80", cat: "Plat" },
];

const STATS = [
  { val: "12 000+", label: "Commandes livrées", icon: "📦" },
  { val: "340+", label: "Restaurants partenaires", icon: "🍽️" },
  { val: "98%", label: "Clients satisfaits", icon: "⭐" },
  { val: "< 30 min", label: "Livraison express", icon: "⚡" },
];

const FEATURES = [
  { icon: <MapPin className="w-6 h-6" />, title: "Commande en table", desc: "Scannez le QR code et commandez sans attendre.", color: COLORS.primary },
  { icon: <Smartphone className="w-6 h-6" />, title: "Mobile Money intégré", desc: "Orange Money, MTN MoMo, Wave — paiement en 3 clics.", color: COLORS.success },
  { icon: <BarChart3 className="w-6 h-6" />, title: "Dashboard temps réel", desc: "Stocks, CA et commandes en direct pour les gérants.", color: COLORS.primary },
  { icon: <Building2 className="w-6 h-6" />, title: "Portail B2B entreprises", desc: "Commandes groupées et facturation mensuelle automatique.", color: COLORS.primary },
];

const TESTIMONIALS = [
  { name: "Aminata K.", role: "Directrice RH, Orange CI", text: "Organiser les déjeuners d'équipe prenait 2h. Maintenant c'est 5 minutes.", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80" },
  { name: "Jean-Claude M.", role: "Gérant, Le Maquis d'Abidjan", text: "Mon CA a augmenté de 35% en 3 mois. Les alertes de stock m'ont évité des ruptures.", avatar: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=80&q=80" },
  { name: "Fatou D.", role: "Cliente fidèle", text: "Je commande depuis mon bureau, je passe prendre à emporter. Le reçu arrive instantanément.", avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=80&q=80" },
];

// Hook pour animation au scroll
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Navbar
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E8E2D9]" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl ${COLORS.primaryBg} flex items-center justify-center text-white font-bold shadow-sm`}>R</div>
          <span className={`font-serif text-xl font-bold ${COLORS.text}`}>Resto <span className={COLORS.primary}>d'ici</span></span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-6">
          {["Menu", "Fonctionnalités", "B2B", "À propos"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className={`text-sm font-medium ${COLORS.textMuted} hover:${COLORS.primary} transition-colors`}>{item}</a>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Link to="/login" className={`px-4 py-2 text-sm font-medium ${COLORS.primary} border border-[#D94500]/40 rounded-lg hover:bg-[#D94500]/10 transition-all`}>Connexion</Link>
          <Link to="/register" className={`px-4 py-2 text-sm font-semibold text-white ${COLORS.primaryBg} ${COLORS.primaryHover} rounded-lg shadow-sm transition-all`}>S'inscrire</Link>
        </div>
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className={`min-h-screen ${COLORS.bg} pt-20 pb-16 px-6 flex items-center`}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Texte */}
        <Reveal>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF5EB] border border-[#D94500]/30">
              <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
              <span className={`text-xs font-semibold ${COLORS.primary}`}>Disponible à Abidjan · Côte d'Ivoire</span>
            </div>
            
            <h1 className={`font-serif text-4xl md:text-5xl lg:text-6xl font-bold ${COLORS.text} leading-tight`}>
              La gastronomie <span className={`${COLORS.primary} italic`}>africaine</span><br />à portée de clic.
            </h1>
            
            <p className={`text-lg ${COLORS.textMuted} max-w-lg leading-relaxed`}>
              Commander, payer et se faire livrer n'a jamais été aussi simple. Découvrez les meilleurs restaurants de votre ville, payez par Mobile Money et suivez votre plat en temps réel.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/menu" className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold ${COLORS.primaryBg} ${COLORS.primaryHover} shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5`}>
                <UtensilsCrossed className="w-4 h-4" /> Commander maintenant
              </Link>
              <Link to="/register?type=restaurant" className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 border-[#D94500]/30 ${COLORS.text} hover:bg-[#D94500]/5 transition-all`}>
                🏪 Inscrire mon restaurant
              </Link>
            </div>

            {/* Stats rapides */}
            <div className="flex gap-8 pt-4">
              {STATS.slice(0, 3).map(({ val, label }) => (
                <div key={label}>
                  <div className={`font-serif text-2xl font-bold ${COLORS.text}`}>{val}</div>
                  <div className={`text-xs ${COLORS.textMuted}`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Image / Mockup */}
        <Reveal delay={150}>
          <div className="relative">
            <div className="absolute -inset-4 bg-[#D94500]/10 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-3xl shadow-xl border border-[#E8E2D9] overflow-hidden">
              <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80" alt="Plat" className="w-full h-64 md:h-80 object-cover" />
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${COLORS.text}`}>Plat du jour</h3>
                    <p className={`text-sm ${COLORS.textMuted}`}>Poulet Braisé + Alloco</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${COLORS.successBg} text-white`}>-15%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => <img key={i} src={`https://i.pravatar.cc/40?img=${i+10}`} className="w-8 h-8 rounded-full border-2 border-white" alt="" />)}
                  </div>
                  <div className={`text-sm ${COLORS.textMuted}`}>+128 commandes aujourd'hui</div>
                </div>
                <button className={`w-full py-3 rounded-xl text-white font-semibold ${COLORS.primaryBg} ${COLORS.primaryHover} transition-all`}>
                  Ajouter au panier · 3 500 FCFA
                </button>
              </div>
            </div>
            {/* Badges flottants */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-[#E8E2D9] p-3 flex items-center gap-2 animate-bounce">
              <Clock className={`w-4 h-4 ${COLORS.primary}`} />
              <span className={`text-xs font-medium ${COLORS.text}`}>Livraison 28 min</span>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-[#E8E2D9] p-3 flex items-center gap-2">
              <Shield className={`w-4 h-4 ${COLORS.success}`} />
              <span className={`text-xs font-medium ${COLORS.text}`}>Paiement sécurisé</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Stats Bar
function StatsBar() {
  return (
    <Reveal>
      <section className={`py-12 ${COLORS.bg} border-y ${COLORS.border}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ val, label, icon }) => (
            <div key={label} className="text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <div className={`font-serif text-2xl font-bold ${COLORS.primary}`}>{val}</div>
              <div className={`text-sm ${COLORS.textMuted}`}>{label}</div>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

// Menu Preview
function MenuSection() {
  const [active, setActive] = useState("Tous");
  const cats = ["Tous", "Plat local", "Grillades", "Salade", "Boisson", "Entrée", "Plat"];
  const filtered = active === "Tous" ? MENU_ITEMS : MENU_ITEMS.filter(i => i.cat === active);

  return (
    <section id="menu" className={`py-20 ${COLORS.bg} px-6`}>
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <span className={`text-xs font-semibold tracking-wider uppercase ${COLORS.primary}`}>Notre Catalogue</span>
            <h2 className={`font-serif text-3xl md:text-4xl font-bold ${COLORS.text} mt-2`}>Des saveurs qui font <span className={`${COLORS.primary} italic`}>voyager</span></h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {cats.map(c => (
              <button key={c} onClick={() => setActive(c)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${active === c ? `${COLORS.primaryBg} text-white shadow-md` : `bg-white ${COLORS.textMuted} border ${COLORS.border} hover:border-[#D94500]/50`}`}>{c}</button>
            ))}
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, i) => (
            <Reveal key={item.name} delay={i * 80}>
              <div className={`group ${COLORS.card} rounded-2xl overflow-hidden border ${COLORS.border} hover:shadow-lg hover:border-[#D94500]/50 transition-all cursor-pointer`}>
                <div className="relative h-48 overflow-hidden">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${COLORS.primaryBg} text-white`}>{item.tag}</span>
                  <span className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs ${COLORS.textMuted} bg-white/90 backdrop-blur`}>{item.cat}</span>
                </div>
                <div className="p-5">
                  <h3 className={`font-semibold ${COLORS.text} mb-2`}>{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className={`font-serif text-lg font-bold ${COLORS.primary}`}>{item.price}</span>
                    <button className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${COLORS.primaryBg} ${COLORS.primaryHover} transition-all hover:scale-105`}>+ Panier</button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="text-center mt-12">
            <Link to="/menu" className={`inline-flex items-center gap-2 ${COLORS.primary} font-semibold hover:gap-3 transition-all`}>
              Voir tout le menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Features
function FeaturesSection() {
  return (
    <section id="fonctionnalités" className={`py-20 bg-white px-6`}>
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <span className={`text-xs font-semibold tracking-wider uppercase ${COLORS.success}`}>Fonctionnalités</span>
            <h2 className={`font-serif text-3xl md:text-4xl font-bold ${COLORS.text} mt-2`}>Tout ce dont vous avez <span className={`${COLORS.success} italic`}>besoin</span></h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className={`p-6 rounded-2xl ${COLORS.card} border ${COLORS.border} hover:shadow-md hover:border-[#D94500]/50 transition-all group`}>
                <div className={`w-12 h-12 rounded-xl bg-[#FFF5EB] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${f.color}`}>{f.icon}</div>
                <h3 className={`font-semibold ${COLORS.text} mb-2`}>{f.title}</h3>
                <p className={`text-sm ${COLORS.textMuted}`}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials
function TestimonialsSection() {
  return (
    <section id="témoignages" className={`py-20 ${COLORS.bg} px-6`}>
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <span className={`text-xs font-semibold tracking-wider uppercase ${COLORS.primary}`}>Témoignages</span>
            <h2 className={`font-serif text-3xl md:text-4xl font-bold ${COLORS.text} mt-2`}>Ils nous font <span className={`${COLORS.primary} italic`}>confiance</span></h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className={`p-6 rounded-2xl ${COLORS.card} border ${COLORS.border} hover:shadow-md transition-all`}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className={`w-4 h-4 ${COLORS.primary} fill-current`} />)}
                </div>
                <p className={`text-sm ${COLORS.textMuted} mb-6 leading-relaxed`}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full border-2 border-[#E8E2D9]" />
                  <div>
                    <div className={`text-sm font-semibold ${COLORS.text}`}>{t.name}</div>
                    <div className={`text-xs ${COLORS.textMuted}`}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// B2B Section
function B2BSection() {
  return (
    <section id="b2b" className={`py-20 bg-white px-6`}>
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F7ED] border border-[#2ECC71]/30 mb-6">
              <Building2 className={`w-4 h-4 ${COLORS.success}`} />
              <span className={`text-xs font-semibold ${COLORS.success}`}>Solution Entreprise</span>
            </div>
            <h2 className={`font-serif text-3xl md:text-4xl font-bold ${COLORS.text} mb-4`}>Gérez les repas de toute votre <span className={`${COLORS.success} italic`}>équipe</span></h2>
            <p className={`${COLORS.textMuted} mb-8 leading-relaxed`}>Commandes groupées, budgets individuels, facturation mensuelle automatique au format SYSCOHADA. Tout ce qu'il faut pour les RH et les DAF.</p>
            
            {[
              { icon: "📋", text: "50 repas commandés en 2 minutes" },
              { icon: "💳", text: "Facturation mensuelle consolidée" },
              { icon: "📊", text: "Rapport de dépenses par collaborateur" },
              { icon: "🔒", text: "Limites de budget par employé" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 mb-4">
                <CheckCircle className={`w-5 h-5 ${COLORS.success}`} />
                <span className={`${COLORS.text}`}>{text}</span>
              </div>
            ))}
            
            <Link to="/register?type=b2b" className={`inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl text-white font-semibold ${COLORS.successBg} hover:bg-[#27AE60] transition-all`}>
              Créer un compte entreprise <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80" alt="B2B" className="rounded-2xl shadow-lg border border-[#E8E2D9]" />
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg border border-[#E8E2D9] p-4 max-w-xs">
              <div className={`text-xs ${COLORS.textMuted} mb-1`}>Commande groupée</div>
              <div className={`font-serif text-2xl font-bold ${COLORS.success}`}>48 repas</div>
              <div className={`text-xs ${COLORS.textMuted}`}>livraison en 35 min ⚡</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <Reveal>
      <section className={`py-20 ${COLORS.bg} px-6`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`font-serif text-3xl md:text-4xl font-bold ${COLORS.text} mb-4`}>Prêt à rejoindre <span className={`${COLORS.primary} italic`}>Resto d'ici ?</span></h2>
          <p className={`${COLORS.textMuted} text-lg mb-8 max-w-2xl mx-auto`}>Inscription gratuite · Première commande offerte · Livraison express</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold ${COLORS.primaryBg} ${COLORS.primaryHover} shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5`}>
              🍽️ S'inscrire gratuitement
            </Link>
            <Link to="/login" className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold border-2 border-[#D94500]/30 ${COLORS.text} hover:bg-[#D94500]/5 transition-all`}>
              Se connecter →
            </Link>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// Footer
function Footer() {
  return (
    <footer className={`bg-[#2D2720] text-white py-12 px-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#D94500] flex items-center justify-center font-bold">R</div>
              <span className="font-serif text-lg font-bold">Resto <span className="text-[#FFB399]">d'ici</span></span>
            </div>
            <p className="text-[#B8A694] text-sm max-w-sm">La plateforme de restauration digitale B2B & B2C dédiée au marché ivoirien et africain.</p>
            <div className="flex gap-2 mt-4">
              {["Orange Money", "MTN MoMo", "Wave"].map(p => (
                <span key={p} className="px-3 py-1 rounded bg-white/10 text-xs">{p}</span>
              ))}
            </div>
          </div>
          {[
            { title: "Plateforme", links: ["Menu", "Commander", "Suivi", "Paiements"] },
            { title: "Professionnels", links: ["Restaurants", "Entreprises B2B", "Partenaires"] },
            { title: "Légal", links: ["CGU", "Confidentialité", "Contact"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-semibold mb-3">{title}</h4>
              {links.map(l => <a key={l} href="#" className="block text-[#B8A694] text-sm hover:text-[#FFB399] transition-colors">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 text-center text-[#B8A694] text-sm">
          © 2026 Resto d'ici · Novasend · Abidjan, Côte d'Ivoire
        </div>
      </div>
    </footer>
  );
}

// Page principale
export default function Home() {
  return (
    <div className={COLORS.bg}>
      <Navbar />
      <HeroSection />
      <StatsBar />
      <MenuSection />
      <FeaturesSection />
      <TestimonialsSection />
      <B2BSection />
      <CTASection />
      <Footer />
    </div>
  );
}