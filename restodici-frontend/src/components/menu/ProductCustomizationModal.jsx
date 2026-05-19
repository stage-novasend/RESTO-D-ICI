import { useMemo, useState } from 'react';
import { CheckCircle, Minus, Plus, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import { formatFCFA } from '../../utils/formatters';

const supplements = [
  { id: 'supplement1', name: 'Supplément viande', price: 500 },
  { id: 'supplement2', name: 'Supplément fromage', price: 300 },
  { id: 'supplement3', name: 'Sauce spéciale', price: 200 },
  { id: 'supplement4', name: 'Légumes supplémentaires', price: 250 },
];

const customizationOptions = {
  cuisson: ['Saignant', 'À point', 'Bien cuit'],
  epice: ['Sans piment', 'Peu épicé', 'Épicé', 'Très épicé'],
  accompagnement: ['Riz', 'Pommes de terre', 'Légumes'],
};

const quickInstructionTags = ['Sans oignon', 'Sans piment', 'Cuisson spéciale'];

export default function ProductCustomizationModal({ product, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [selectedSupplements, setSelectedSupplements] = useState([]);
  const [customOptions, setCustomOptions] = useState({});

  const selectedSupplementItems = useMemo(
    () => supplements.filter((supplement) => selectedSupplements.includes(supplement.id)),
    [selectedSupplements],
  );

  const totalPrice = useMemo(() => {
    const basePrice = (parseFloat(product.prix) || 0) * quantity;
    const supplementsTotal = selectedSupplementItems.reduce(
      (sum, supplement) => sum + supplement.price * quantity,
      0,
    );

    return basePrice + supplementsTotal;
  }, [product.prix, quantity, selectedSupplementItems]);

  const handleQuantityChange = (nextQuantity) => {
    if (nextQuantity >= 1 && nextQuantity <= 20) {
      setQuantity(nextQuantity);
    }
  };

  const toggleSupplement = (supplementId) => {
    setSelectedSupplements((current) =>
      current.includes(supplementId)
        ? current.filter((id) => id !== supplementId)
        : [...current, supplementId],
    );
  };

  const handleOptionChange = (optionType, value) => {
    setCustomOptions((current) => ({
      ...current,
      [optionType]: current[optionType] === value ? undefined : value,
    }));
  };

  const handleAppendInstruction = (tag) => {
    setInstructions((current) => {
      const normalized = current.trim();
      if (!normalized) {
        return tag;
      }

      return normalized.toLowerCase().includes(tag.toLowerCase())
        ? normalized
        : `${normalized}\n${tag}`;
    });
  };

  const handleAdd = () => {
    const details = [
      ...selectedSupplementItems.map((item) => `Supplément: ${item.name}`),
      customOptions.cuisson && `Cuisson: ${customOptions.cuisson}`,
      customOptions.epice && `Épices: ${customOptions.epice}`,
      customOptions.accompagnement && `Accompagnement: ${customOptions.accompagnement}`,
      instructions.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    onAdd(
      {
        ...product,
        supplements: selectedSupplementItems,
        customOptions,
        totalPrice,
      },
      quantity,
      details,
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2D2720]/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-[#FDFCFB] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid lg:grid-cols-[1.05fr,0.95fr]">
          <div className="border-b border-[#EFE3D9] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF1E8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#D94500]">
                  <Sparkles className="h-4 w-4" />
                  Personnalisation
                </span>
                <h2 className="mt-4 text-2xl font-bold text-[#2D2720] sm:text-3xl">{product.nom}</h2>
                {product.categorie?.nom && (
                  <p className="mt-2 text-sm font-medium text-[#8B7355]">{product.categorie.nom}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-[#E8E2D9] bg-white p-2 text-[#8B7355] transition hover:border-[#D94500] hover:text-[#D94500]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-[#F1E6DE] bg-white shadow-sm">
              {product.photoUrl ? (
                <img src={product.photoUrl} alt={product.nom} className="h-64 w-full object-cover" />
              ) : (
                <div className="flex h-64 items-center justify-center bg-[#FFF7F2] text-[#D94500]">
                  <UtensilsCrossed className="h-16 w-16" />
                </div>
              )}
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#8B7355]">Prix unitaire</p>
                    <p className="mt-1 text-2xl font-bold text-[#D94500]">
                      {formatFCFA(parseFloat(product.prix) || 0)}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-[#E8E2D9] bg-[#FFFDFC] px-3 py-2">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="rounded-xl p-2 text-[#8B7355] transition hover:bg-[#F9F7F5] disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[36px] text-center text-lg font-bold text-[#2D2720]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= 20}
                      className="rounded-xl p-2 text-[#8B7355] transition hover:bg-[#F9F7F5] disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-[#6F5C49]">
                  {product.description || 'Ajoutez vos préférences pour obtenir un plat exactement comme vous le souhaitez.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedSupplementItems.map((supplement) => (
                    <span
                      key={supplement.id}
                      className="rounded-full bg-[#EAF8F0] px-3 py-1 text-xs font-semibold text-[#2ECC71]"
                    >
                      {supplement.name}
                    </span>
                  ))}
                  {Object.values(customOptions)
                    .filter(Boolean)
                    .map((value) => (
                      <span
                        key={value}
                        className="rounded-full bg-[#EAF7FB] px-3 py-1 text-xs font-semibold text-[#00A7CB]"
                      >
                        {value}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <SectionCard title="Suppléments">
              <div className="space-y-3">
                {supplements.map((supplement) => {
                  const active = selectedSupplements.includes(supplement.id);
                  return (
                    <button
                      key={supplement.id}
                      type="button"
                      onClick={() => toggleSupplement(supplement.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-[#D94500] bg-[#FFF4EC] shadow-sm'
                          : 'border-[#E8E2D9] bg-white hover:border-[#F1C5AF] hover:bg-[#FFFAF6]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[#2D2720]">{supplement.name}</p>
                        <p className="mt-1 text-xs text-[#8B7355]">Ajout premium pour enrichir votre plat</p>
                      </div>
                      <span className="text-sm font-bold text-[#D94500]">+ {formatFCFA(supplement.price)}</span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Préférences de préparation">
              <div className="space-y-4">
                <OptionGroup
                  label="Cuisson"
                  options={customizationOptions.cuisson}
                  value={customOptions.cuisson}
                  onChange={(value) => handleOptionChange('cuisson', value)}
                />
                <OptionGroup
                  label="Niveau d'épices"
                  options={customizationOptions.epice}
                  value={customOptions.epice}
                  onChange={(value) => handleOptionChange('epice', value)}
                />
                <OptionGroup
                  label="Accompagnement"
                  options={customizationOptions.accompagnement}
                  value={customOptions.accompagnement}
                  onChange={(value) => handleOptionChange('accompagnement', value)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Instructions spéciales">
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Ex: sauce à part, sans oignon, livraison soignée..."
                className="min-h-[120px] w-full rounded-2xl border border-[#E8E2D9] bg-[#FFFDFC] px-4 py-3 text-[#2D2720] outline-none transition focus:border-[#D94500] focus:ring-2 focus:ring-[#D94500]/15"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {quickInstructionTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAppendInstruction(tag)}
                    className="rounded-full border border-[#E8E2D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#8B7355] transition hover:border-[#D94500] hover:bg-[#FFF4EC] hover:text-[#D94500]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </SectionCard>

            <div className="rounded-[28px] bg-[#2D2720] p-5 text-white shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/70">Total personnalisé</p>
                  <p className="mt-2 text-3xl font-bold">{formatFCFA(totalPrice)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Quantité</p>
                  <p className="mt-1 text-xl font-bold">{quantity}</p>
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-4 font-semibold text-white transition hover:bg-[#E85A28]"
              >
                <CheckCircle className="h-5 w-5" />
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-[28px] border border-[#EFE3D9] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-[#2D2720]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#2D2720]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-[#D94500] text-white shadow-sm'
                  : 'border border-[#E8E2D9] bg-[#FFFDFC] text-[#6F5C49] hover:border-[#D94500] hover:text-[#D94500]'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
