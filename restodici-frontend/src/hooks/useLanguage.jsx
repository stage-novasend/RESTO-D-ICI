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
    register: "Inscription",
    logout: "Déconnexion",
    help: "Aide",
    contact: "Contact",
    legal: "Mentions légales",
    privacy: "Confidentialité",
    dashboard: "Tableau de bord",
    b2b_space: "Espace B2B",
    gerant_space: "Espace Gérant",
    staff_space: "Espace Personnel",
    admin_space: "Administration",
    
    // Home & Catalogue
    hero_title: "La meilleure gastronomie d'Abidjan livrée chez vous",
    hero_sub: "Commandez auprès des meilleurs restaurants, payez par Mobile Money et suivez votre livraison en temps réel.",
    search_placeholder: "Rechercher un plat, un restaurant...",
    all_categories: "Toutes les catégories",
    open_now: "Ouvert maintenant",
    delivery_free: "Livraison offerte",
    order_now: "Commander",
    explore_menu: "Découvrir le menu",

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
    help: "Help",
    contact: "Contact",
    legal: "Legal Notices",
    privacy: "Privacy Policy",
    dashboard: "Dashboard",
    b2b_space: "B2B Portal",
    gerant_space: "Manager Space",
    staff_space: "Staff Portal",
    admin_space: "Administration",

    // Home & Catalogue
    hero_title: "Abidjan's Finest Cuisine Delivered to Your Door",
    hero_sub: "Order from top-tier restaurants, pay seamlessly via Mobile Money, and track your delivery in real-time.",
    search_placeholder: "Search for a dish, restaurant...",
    all_categories: "All Categories",
    open_now: "Open Now",
    delivery_free: "Free Delivery",
    order_now: "Order Now",
    explore_menu: "Explore Menu",

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
    return i18n.t(key, fallback || key);
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
      t: (key, fallback) => fallback || key,
      isFr: true,
      isEn: false,
    };
  }
  return ctx;
}
