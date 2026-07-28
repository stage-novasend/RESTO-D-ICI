/* SetupBanner — extrait de GerantDashboard */
import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { menuAPI } from "../../../services/api";

export default function SetupBanner({ restaurant, navigate }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('setup-banner-dismissed-' + restaurant?.id) === '1'
  );
  const [menuCount, setMenuCount] = useState(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    menuAPI.getAll({ restaurantId: restaurant.id })
      .then(r => setMenuCount((r.data || []).length))
      .catch(() => setMenuCount(0));
  }, [restaurant?.id]);

  if (dismissed) return null;

  const adresseDone  = !!(restaurant?.adresse && restaurant.adresse !== 'À compléter');
  const horairesDone = !!(restaurant?.openingTime && restaurant?.closingTime);
  const descDone     = Boolean(restaurant?.description?.trim());
  const menuDone     = menuCount !== null && menuCount > 0;

  const steps = [
    { label: 'Compte créé',         done: true,           tab: null },
    { label: 'Adresse renseignée',  done: !!adresseDone,  tab: 'settings' },
    { label: 'Horaires configurés', done: !!horairesDone, tab: 'settings' },
    { label: 'Description',         done: descDone,       tab: 'settings' },
    { label: 'Menu publié',         done: menuDone,       tab: 'menu' },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  if (pct >= 100) return null;

  const nextIncomplete = steps.find(s => !s.done && s.tab);

  const dismiss = () => {
    localStorage.setItem('setup-banner-dismissed-' + restaurant?.id, '1');
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-[#EA580C]" />
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 text-[#737373] hover:bg-[#F4F6F8] transition" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
      <div className="pl-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#1A0C00]">Complétez votre profil restaurant</p>
            <p className="text-xs text-[#737373] mt-0.5">Quelques infos manquantes avant d'être 100% opérationnel</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#EA580C]">{pct}%</span>
              <p className="text-[10px] text-[#737373]">complété</p>
            </div>
            {nextIncomplete && (
              <button onClick={() => navigate(`/gerant?tab=${nextIncomplete.tab}`)}
                className="rounded-xl bg-[#EA580C] px-3 py-2 text-xs font-bold text-white hover:bg-[#C2410C] transition">
                Compléter →
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-[#F4F6F8] overflow-hidden">
          <div className="h-full rounded-full bg-[#EA580C] transition-all duration-500" style={{ width: pct + '%' }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {steps.map((s) => (
            <button key={s.label}
              onClick={() => s.tab && !s.done && navigate(`/gerant?tab=${s.tab}`)}
              className={`flex items-center gap-1.5 ${s.tab && !s.done ? 'cursor-pointer' : 'cursor-default'}`}>
              {s.done ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-[#E2E8F0] shrink-0" />
              )}
              <span className={'text-xs ' + (s.done ? 'text-emerald-600 font-medium' : s.tab ? 'text-[#EA580C] hover:underline underline-offset-2' : 'text-[#737373]')}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
