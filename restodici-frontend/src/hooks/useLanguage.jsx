import { createContext, useContext, useState, useCallback } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const LanguageContext = createContext(null);

/* ─── Dictionnaire de traduction FR / EN ─── */
const TRANSLATIONS = {
  fr: {
    // Navigation & General
    home: "Accueil",
    menu: "Catalogue & Menu",
    cart: "Panier",
    checkout: "Paiement",
    orders: "Mes commandes",
    login: "Connexion",
    register: "S'inscrire",
    logout: "Déconnexion",
    help: "Aide & FAQ",
    contact: "Contact",
    legal: "Mentions légales",
    privacy: "Confidentialité",
    dashboard: "Tableau de bord",
    b2b_space: "Espace B2B",
    gerant_space: "Espace Gérant",
    staff_space: "Espace Personnel",
    admin_space: "Administration",
    my_space: "Mon Espace",
    restaurants: "Restaurants",
    abidjan_gastro: "Abidjan · Gastronomie",
    
    // Home & Catalogue
    abidjan_ci: "Abidjan · Côte d'Ivoire",
    hero_title: "Le meilleur d'Abidjan, <br /><em style='color: #F59E0B; font-style: italic'>livré à votre table.</em>",
    hero_sub: "Garba royal, poulet braisé, attiéké ou formules d'équipe B2B : commandez en quelques clics auprès des meilleurs restaurants d'Abidjan.",
    search_placeholder: "Chercher par plat (garba, attiéké, poulet…) ou restaurant…",
    results: "résultats",
    find: "Trouver",
    most_ordered: "Les plus commandés :",
    ordered_times: "fois commandé ces 90 derniers jours",
    available_order: "Disponible à la commande",
    delivery_express: "Livraison Express < 30 min",
    everywhere_abidjan: "Partout à Abidjan",
    mobile_payment: "Paiement Mobile Instantané",
    mobile_payment_sub: "Wave, Orange, MTN, Moov",
    b2b_enterprise: "Espace Entreprise B2B",
    b2b_sub: "Factures mensuelles SYSCOHADA",
    
    // Pillars
    commitments: "Engagements Resto d'ici",
    excellence_simplified: "L'excellence de la restauration, <em style='color: #EA580C; font-style: italic'>simplifiée.</em>",
    pillar_1_title: "Livraison Express",
    pillar_1_desc: "Vos plats chauds livrés en moins de 30 minutes, à domicile ou sur votre lieu de travail.",
    pillar_2_title: "Gastronomie Ivoirienne",
    pillar_2_desc: "Attiéké royal, garba, poulet braisé, alloco & jus naturels sélectionnés auprès des meilleurs chefs.",
    pillar_3_title: "Paiement Mobile Simple",
    pillar_3_desc: "Payer avec Wave CI, Orange Money, MTN MoMo ou Moov Money en toute sécurité.",
    
    // Catalog Section
    filter_sort: "Filtrer & Trier les restaurants",
    all_categories: "Toutes les catégories",
    all_dishes: "Tous les plats",
    results_for: "Résultats pour",
    top_rated: "Les mieux notés à Abidjan",
    selection_of: "Notre sélection de",
    on_total: "sur",
    available_delivery: "disponibles en livraison",
    restaurant_available: "restaurant disponible en livraison",
    restaurants_available: "restaurants disponibles en livraison",
    reset_filters: "Réinitialiser les filtres",
    no_restaurant_found: "Aucun restaurant trouvé",
    no_restaurant_desc: "Essayez de modifier votre recherche ou d'effacer certains filtres pour voir d'autres établissements.",
    reset_search: "Réinitialiser la recherche",
    suggested_dishes_for: "Plats suggérés pour",
    delivery: "Livraison",
    view_menu: "Voir le menu",
    see_more_restaurants: "Voir plus de restaurants",
    more_to_discover_single: "autre établissement à découvrir",
    more_to_discover_plural: "autres établissements à découvrir",
    new: "Nouveau",
    open_now: "Ouvert",

    // Auth
    back_to_home: "Retour à l'accueil",
    verification: "Vérification",
    login_title: "Connexion",
    enter_2fa_code: "Entrez le code de votre application",
    welcome_back: "Bon retour sur votre espace",
    register_success_login: "Inscription réussie ! Connectez-vous maintenant.",
    enter_6_digit_code: "Entrez le code à 6 chiffres généré par votre application d'authentification.",
    validate: "Valider",
    back: "← Retour",
    email_label: "Email",
    email_placeholder: "vous@exemple.com",
    password_label: "Mot de passe",
    forgot_password: "Oublié ?",
    password_placeholder: "••••••••",
    verify_email_cta: "Vérifier mon email",
    sign_in_button: "Se connecter",
    connecting: "Connexion…",
    no_account: "Pas encore de compte ?",
    auth_hero_title: "La table digitale",
    auth_hero_sub: "Commandes, budgets et équipes en un seul endroit.",
    create_restaurant: "Créer mon restaurant",
    create_b2b: "Compte entreprise",
    create_account: "Créer un compte",
    manage_restaurant_rt: "Gérez votre restaurant en temps réel",
    team_meals_budget: "Repas d'équipe, budgets et facturation centralisés",
    join_digital_table: "Rejoignez la table digitale",
    client_tab: "Client",
    restaurant_tab: "Restaurant",
    enterprise_tab: "Entreprise",
    your_name: "Votre nom",
    phone_number: "Téléphone",
    professional_email: "Email professionnel",
    restaurant_name: "Nom du restaurant",
    company_name: "Nom de l'entreprise",
    manager_name: "Responsable",
    full_name: "Nom complet",
    creating: "Création en cours…",
    create_business_account: "Créer mon compte entreprise",
    create_restaurant_account: "Créer mon restaurant",
    already_have_account: "Déjà un compte ?",
    welcome_restodici: "Bienvenue sur Resto d'ici",
    manage_all_in_one: "Gérez vos repas, votre équipe et vos commandes en un seul endroit.",
    
    // B2B Banner
    b2b_title: "Commandes groupées d'équipe <br /><em style='color: #F59E0B; font-style: italic'>& Facturation mensuelle.</em>",
    b2b_desc: "Offrez à vos collaborateurs des repas chauds sélectionnés parmi les meilleurs restaurants d'Abidjan. Facturation conforme SYSCOHADA et rapports de consommation en un clic.",
    create_b2b_account: "Créer un compte Entreprise",
    learn_more: "En savoir plus",
    why_b2b: "Pourquoi les entreprises choisissent Resto d'ici ?",
    b2b_feat_1: "Livraison groupée ponctuelle au bureau",
    b2b_feat_2: "Gestion des budgets par collaborateur",
    b2b_feat_3: "Facture mensuelle SYSCOHADA certifiée",
    b2b_feat_4: "Support prioritaire dédié 7j/7",
    
    // Payment section
    payments_secure: "Paiements <em style='color: #EA580C; font-style: italic'>100% Sécurisés</em>",
    payments_desc: "Réglez vos commandes en un clic avec vos solutions de paiement préférées.",
    payments: "PAIEMENTS",
    direct_secure: "Direct & Sécurisé",
    
    // Footer
    footer_desc: "La première plateforme gastronomique digitale dédiée à la mise en valeur des restaurants d'Abidjan et à la livraison d'équipe.",
    navigation: "Navigation",
    catalog_restaurants: "Catalogue Restaurants",
    dishes_menus: "Plats & Menus",
    help_center: "Centre d'Aide & FAQ",
    legal_support: "Légal & Support",
    contact_partnerships: "Contact & Partenariats",
    offers_news: "Offres & Nouveautés",
    newsletter_desc: "Recevez les meilleures offres de restaurants d'Abidjan chaque semaine.",
    newsletter_success: "✓ Merci ! Vous êtes bien inscrit à la newsletter.",
    newsletter_placeholder: "votre.email@domaine.ci",
    all_rights_reserved: "Resto d'ici © 2026 · Tous droits réservés",
    developed_with_passion: "Développé avec passion à Abidjan 🇨🇮",
    
    // Cart & Checkout
    my_cart: "Mon Panier",
    empty_cart: "Votre panier est vide",
    articles: "articles",
    subtotal: "Sous-total HT",
    delivery_fee: "Frais de livraison",
    vat_included: "TVA 18% incluse",
    total_ttc: "Total TTC",
    pay: "Payer",
    initiate_payment: "Initier le paiement",
    payment_method: "Mode de paiement",
    phone_required: "Numéro de téléphone requis",
    operator_detected: "Opérateur détecté et validé",
    security_notice: "Paiement 100% sécurisé · SSL 256-bit · Certifié PCI-DSS",
    syscohada_receipt: "Reçu officiel SYSCOHADA immédiatement délivré",

    // General Actions & Status
    confirm: "Confirmer",
    cancel: "Annuler",
    save: "Enregistrer",
    loading: "Chargement...",
    success: "Opération réussie",
    error: "Une erreur est survenue",
    mode_test: "MODE TEST",
  },

  en: {
    // Navigation & General
    home: "Home",
    menu: "Catalog & Menu",
    cart: "Cart",
    checkout: "Checkout",
    orders: "My Orders",
    login: "Sign In",
    register: "Sign Up",
    logout: "Log Out",
    help: "Help & FAQ",
    contact: "Contact",
    legal: "Legal Notices",
    privacy: "Privacy Policy",
    dashboard: "Dashboard",
    b2b_space: "B2B Portal",
    gerant_space: "Manager Space",
    staff_space: "Staff Portal",
    admin_space: "Administration",
    my_space: "My Space",
    restaurants: "Restaurants",
    abidjan_gastro: "Abidjan · Gastronomy",
    
    // Home & Catalogue
    abidjan_ci: "Abidjan · Ivory Coast",
    hero_title: "Abidjan's Finest, <br /><em style='color: #F59E0B; font-style: italic'>delivered to your table.</em>",
    hero_sub: "Royal Garba, braised chicken, attiéké or B2B team meals: order in a few clicks from Abidjan's best restaurants.",
    search_placeholder: "Search for a dish (garba, attiéké, chicken...) or restaurant...",
    results: "results",
    find: "Find",
    most_ordered: "Most ordered:",
    ordered_times: "times ordered in the last 90 days",
    available_order: "Available for order",
    delivery_express: "Express Delivery < 30 min",
    everywhere_abidjan: "Anywhere in Abidjan",
    mobile_payment: "Instant Mobile Payment",
    mobile_payment_sub: "Wave, Orange, MTN, Moov",
    b2b_enterprise: "B2B Enterprise Portal",
    b2b_sub: "Monthly SYSCOHADA Invoices",
    
    // Pillars
    commitments: "Resto d'ici Commitments",
    excellence_simplified: "Restaurant excellence, <em style='color: #EA580C; font-style: italic'>simplified.</em>",
    pillar_1_title: "Express Delivery",
    pillar_1_desc: "Your hot meals delivered in under 30 minutes, at home or at your workplace.",
    pillar_2_title: "Ivorian Gastronomy",
    pillar_2_desc: "Royal Attiéké, garba, braised chicken, alloco & natural juices selected from the best chefs.",
    pillar_3_title: "Simple Mobile Payment",
    pillar_3_desc: "Pay securely with Wave CI, Orange Money, MTN MoMo, or Moov Money.",
    
    // Catalog Section
    filter_sort: "Filter & Sort restaurants",
    all_categories: "All Categories",
    all_dishes: "All dishes",
    results_for: "Results for",
    top_rated: "Top rated in Abidjan",
    selection_of: "Our selection of",
    on_total: "out of",
    available_delivery: "available for delivery",
    restaurant_available: "restaurant available for delivery",
    restaurants_available: "restaurants available for delivery",
    reset_filters: "Reset filters",
    no_restaurant_found: "No restaurant found",
    no_restaurant_desc: "Try changing your search or clearing some filters to see other establishments.",
    reset_search: "Reset search",
    suggested_dishes_for: "Suggested dishes for",
    delivery: "Delivery",
    view_menu: "View menu",
    see_more_restaurants: "See more restaurants",
    more_to_discover_single: "more establishment to discover",
    more_to_discover_plural: "more establishments to discover",
    new: "New",
    open_now: "Open",

    // Auth
    back_to_home: "Back to Home",
    verification: "Verification",
    login_title: "Sign In",
    enter_2fa_code: "Enter your authenticator code",
    welcome_back: "Welcome back to your space",
    register_success_login: "Registration successful! Please sign in now.",
    enter_6_digit_code: "Enter the 6-digit code generated by your authenticator app.",
    validate: "Validate",
    back: "← Back",
    email_label: "Email",
    email_placeholder: "you@example.com",
    password_label: "Password",
    forgot_password: "Forgot?",
    password_placeholder: "••••••••",
    verify_email_cta: "Verify my email",
    sign_in_button: "Sign In",
    connecting: "Connecting…",
    no_account: "Don't have an account?",
    auth_hero_title: "The Digital Table",
    auth_hero_sub: "Orders, budgets, and teams all in one place.",
    create_restaurant: "Create my restaurant",
    create_b2b: "Corporate Account",
    create_account: "Create an account",
    manage_restaurant_rt: "Manage your restaurant in real-time",
    team_meals_budget: "Team meals, budgets, and centralized invoicing",
    join_digital_table: "Join the digital table",
    client_tab: "Client",
    restaurant_tab: "Restaurant",
    enterprise_tab: "Corporate",
    your_name: "Your Name",
    phone_number: "Phone",
    professional_email: "Professional Email",
    restaurant_name: "Restaurant Name",
    company_name: "Company Name",
    manager_name: "Manager",
    full_name: "Full Name",
    creating: "Creating…",
    create_business_account: "Create my corporate account",
    create_restaurant_account: "Create my restaurant",
    already_have_account: "Already have an account?",
    welcome_restodici: "Welcome to Resto d'ici",
    manage_all_in_one: "Manage your meals, team, and orders all in one place.",
    
    // B2B Banner
    b2b_title: "Team bulk orders <br /><em style='color: #F59E0B; font-style: italic'>& Monthly Invoicing.</em>",
    b2b_desc: "Offer your employees hot meals selected from the best restaurants in Abidjan. SYSCOHADA compliant invoicing and consumption reports in one click.",
    create_b2b_account: "Create a Corporate account",
    learn_more: "Learn more",
    why_b2b: "Why do companies choose Resto d'ici?",
    b2b_feat_1: "Punctual group delivery to the office",
    b2b_feat_2: "Budget management per employee",
    b2b_feat_3: "Certified SYSCOHADA monthly invoice",
    b2b_feat_4: "Dedicated 24/7 priority support",
    
    // Payment section
    payments_secure: "<em style='color: #EA580C; font-style: italic'>100% Secure</em> Payments",
    payments_desc: "Pay for your orders in one click with your favorite payment solutions.",
    payments: "PAYMENTS",
    direct_secure: "Direct & Secure",
    
    // Footer
    footer_desc: "The first digital gastronomic platform dedicated to highlighting Abidjan's restaurants and team delivery.",
    navigation: "Navigation",
    catalog_restaurants: "Restaurant Catalog",
    dishes_menus: "Dishes & Menus",
    help_center: "Help Center & FAQ",
    legal_support: "Legal & Support",
    contact_partnerships: "Contact & Partnerships",
    offers_news: "Offers & News",
    newsletter_desc: "Get the best restaurant offers in Abidjan every week.",
    newsletter_success: "✓ Thank you! You are successfully subscribed to our newsletter.",
    newsletter_placeholder: "your.email@domain.ci",
    all_rights_reserved: "Resto d'ici © 2026 · All rights reserved",
    developed_with_passion: "Developed with passion in Abidjan 🇨🇮",

    // Cart & Checkout
    my_cart: "My Cart",
    empty_cart: "Your cart is empty",
    articles: "items",
    subtotal: "Subtotal (excl. VAT)",
    delivery_fee: "Delivery Fee",
    vat_included: "18% VAT included",
    total_ttc: "Total (incl. VAT)",
    pay: "Pay Now",
    initiate_payment: "Initiate Payment",
    payment_method: "Payment Method",
    phone_required: "Phone number required",
    operator_detected: "Operator detected and verified",
    security_notice: "100% Secure Payment · 256-bit SSL · PCI-DSS Certified",
    syscohada_receipt: "Official SYSCOHADA receipt generated instantly",

    // General Actions & Status
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading...",
    success: "Operation successful",
    error: "An error occurred",
    mode_test: "TEST MODE",
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: TRANSLATIONS.fr },
      en: { translation: TRANSLATIONS.en }
    },
    lng: localStorage.getItem('restodici_lang') || 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
  });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(i18n.language || 'fr');

  const setLang = useCallback((newLang) => {
    const val = newLang === 'en' ? 'en' : 'fr';
    setLangState(val);
    i18n.changeLanguage(val);
    localStorage.setItem('restodici_lang', val);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  }, [lang, setLang]);

  const t = useCallback((key, fallback) => {
    return i18n.t(key, typeof fallback === 'string' ? { defaultValue: fallback } : undefined);
  }, []);

  return (
    <LanguageContext.Provider value={{
      lang,
      setLang,
      toggleLang,
      t,
      isFr: lang === 'fr',
      isEn: lang === 'en',
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback si utilisé hors provider
    return {
      lang: 'fr',
      setLang: () => {},
      toggleLang: () => {},
      t: (key, fallback) => i18n.t(key, typeof fallback === 'string' ? { defaultValue: fallback } : undefined),
      isFr: true,
      isEn: false,
    };
  }
  return ctx;
}
