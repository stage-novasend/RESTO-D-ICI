/* ═══════════════════════════════════════════════════════════════
   AuthCard — habillage commun aux écrans d'authentification hors
   connexion : mot de passe oublié, réinitialisation, vérification d'email.

   Ces trois pages dupliquaient jusqu'ici le même bandeau orange, chacune avec
   sa propre variante de logo (un pictogramme lucide générique, pas la marque).
   Le fond passe au blanc, cohérent avec le reste de l'application, et le logo
   officiel est rendu par BrandLogo.
   ═══════════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';

/**
 * @param icon      élément affiché dans la vignette au-dessus du titre
 * @param tone      teinte de la vignette : 'brand' | 'success' | 'danger'
 * @param title     titre de l'écran
 * @param subtitle  phrase d'explication sous le titre
 * @param footer    zone basse optionnelle (liens secondaires)
 * @param backTo    si renseigné, affiche un retour discret en pied
 */
export default function AuthCard({
  icon,
  tone = 'brand',
  title,
  subtitle,
  children,
  footer,
  backTo = '/login',
  backLabel = 'Retour à la connexion',
}) {
  const TONES = {
    brand:   { bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A' },
    danger:  { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
  };
  const t = TONES[tone] ?? TONES.brand;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">

        <div className="flex justify-center mb-8">
          <BrandLogo size={38} to="/" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-7 py-8">
          {icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 border"
              style={{ background: t.bg, borderColor: t.border, color: t.color }}
            >
              {icon}
            </div>
          )}

          <h1 className="text-[19px] font-extrabold text-slate-900 text-center tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500 text-center">
              {subtitle}
            </p>
          )}

          <div className="mt-6">{children}</div>
        </div>

        {footer}

        {backTo && (
          <div className="mt-6 text-center">
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* Champ de saisie commun aux écrans d'authentification.
   `trailing` est rendu à l'intérieur du conteneur du champ (et non du bloc
   complet libellé + champ), pour que son centrage vertical tombe bien sur
   l'input — un bouton « afficher le mot de passe », typiquement. */
export function AuthField({ label, icon, error, trailing, ...inputProps }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...inputProps}
          className={`w-full ${icon ? 'pl-10' : 'pl-3.5'} ${trailing ? 'pr-11' : 'pr-3.5'} py-3 bg-white border rounded-lg text-slate-900
                      placeholder-slate-400 text-[14px] transition-colors
                      focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-400
                      ${error ? 'border-red-300' : 'border-slate-300'}`}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

/* Bouton d'action principal. */
export function AuthButton({ loading, loadingLabel = 'Envoi en cours…', children, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="w-full py-3 rounded-lg font-bold text-white text-[14px] bg-orange-600
                 hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {loadingLabel}
        </span>
      ) : children}
    </button>
  );
}
