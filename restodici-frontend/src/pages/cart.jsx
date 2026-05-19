
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BadgePercent,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import LocationAssistant from '../components/maps/LocationAssistant';
import { FREQUENT_LOCATION_ZONES } from '../components/maps/locationAssistantData';
import { formatFCFA } from '../utils/formatters';

const deliveryZones = [
  { name: 'Cocody', fee: 1000 },
  { name: 'Plateau', fee: 800 },
  { name: 'Marcory', fee: 1200 },
  { name: 'Treichville', fee: 900 },
  { name: 'Yopougon', fee: 1500 },
].map((zone) => {
  const frequentZone = FREQUENT_LOCATION_ZONES.find(
    (item) => item.name.toLowerCase() === zone.name.toLowerCase(),
  );

  return {
    ...zone,
    ...frequentZone,
    address: frequentZone?.address || `${zone.name}, Abidjan`,
  };
});

const orderModes = [
  {
    id: 'sur_place',
    label: 'Sur place',
    description: 'Mangez directement au restaurant',
    icon: Store,
  },
  {
    id: 'emporter',
    label: 'À emporter',
    description: 'Récupérez rapidement votre commande',
    icon: Package,
  },
  {
    id: 'livraison',
    label: 'Livraison',
    description: 'Recevez vos plats à domicile',
    icon: Truck,
  },
];

export default function CartPage() {
  const navigate = useNavigate();
  const { items, restaurantId, restaurantName, updateQuantity, removeItem, clearCart } =
    useCart();
  const [orderMode, setOrderMode] = useState('sur_place');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [deliveryPosition, setDeliveryPosition] = useState({ lat: null, lng: null });
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [errors, setErrors] = useState({});

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.prix) * Number(item.quantite), 0),
    [items],
  );
  const deliveryFee =
    orderMode === 'livraison'
      ? deliveryZones.find((zone) => zone.name === deliveryZone)?.fee || 1000
      : 0;
  const total = subtotal + deliveryFee - promoDiscount;

  const validateForm = () => {
    const nextErrors = {};

    if (!restaurantId) {
      nextErrors.restaurant = 'Aucun restaurant sélectionné.';
    }

    if (orderMode === 'livraison' && !deliveryAddress.trim()) {
      nextErrors.deliveryAddress = 'Adresse de livraison requise.';
    }

    if (orderMode === 'livraison' && !deliveryZone) {
      nextErrors.deliveryZone = 'Zone de livraison requise.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProceedToCheckout = () => {
    if (!validateForm()) {
      return;
    }

    const normalizedOrderMode =
      orderMode === 'sur_place'
        ? 'SUR_PLACE'
        : orderMode === 'livraison'
          ? 'LIVRAISON'
          : 'EMPORTER';

    const orderDetails = {
      items: items.map((item) => ({
        lineId: item.lineId,
        articleId: item.articleId,
        nom: item.nom,
        prix: item.prix,
        quantite: item.quantite,
        instructions: item.instructions,
      })),
      restaurantId,
      restaurantName,
      orderMode: normalizedOrderMode,
      deliveryAddress: normalizedOrderMode === 'LIVRAISON' ? deliveryAddress : '',
      deliveryZone: normalizedOrderMode === 'LIVRAISON' ? deliveryZone : '',
      deliveryLat: normalizedOrderMode === 'LIVRAISON' ? deliveryPosition.lat : null,
      deliveryLng: normalizedOrderMode === 'LIVRAISON' ? deliveryPosition.lng : null,
      total,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem('pendingOrder', JSON.stringify(orderDetails));

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
      navigate('/checkout');
      return;
    }

    navigate('/login?redirect=checkout');
  };

  const handleUpdateQuantity = (lineId, newQuantity) => {
    if (newQuantity >= 1) {
      updateQuantity(lineId, newQuantity);
    } else {
      removeItem(lineId);
    }
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toLowerCase();
    if (!code) {
      return;
    }

    if (code === 'welcome10') {
      setPromoDiscount(Math.round(subtotal * 0.1));
      setPromoApplied(true);
      return;
    }

    if (code === 'freeship') {
      setPromoDiscount(deliveryFee);
      setPromoApplied(true);
      return;
    }

    setPromoApplied(false);
    setPromoDiscount(0);
    setErrors((current) => ({ ...current, promo: 'Code promo invalide.' }));
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setErrors((current) => ({ ...current, promo: undefined }));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F9F7F5] px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto rounded-[32px] border border-[#E8E2D9] bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF5EB] text-[#D94500]">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-[#2D2720]">Votre panier est vide</h1>
          <p className="mt-3 text-[#8B7355] max-w-lg mx-auto">
            Ajoutez quelques plats savoureux pour préparer votre prochaine commande.
          </p>
          <Link
            to="/menu"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#D94500] px-6 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#B83A00]"
          >
            Découvrir les restaurants
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F9F7F5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#E8E2D9] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF5EB] px-4 py-2 text-sm font-semibold text-[#D94500]">
                <ShieldCheck className="h-4 w-4" />
                Panier sécurisé
              </span>
              <h1 className="mt-4 text-3xl font-bold text-[#2D2720] sm:text-4xl">
                Finalisez une commande claire, rapide et élégante
              </h1>
              <p className="mt-3 max-w-2xl text-[#8B7355]">
                Chaque ajout reste une ligne distincte dans le panier pour garder vos variantes,
                quantités et instructions bien visibles.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <MiniStat label="Articles" value={String(items.length)} />
              <MiniStat label="Sous-total" value={formatFCFA(subtotal)} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.55fr,0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#2D2720]">Vos articles</h2>
                  <p className="text-sm text-[#8B7355] mt-1">
                    Gérez chaque ligne individuellement sans fusion automatique.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="rounded-2xl border border-[#E8E2D9] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition hover:bg-[#F9F7F5]"
                  >
                    Vider le panier
                  </button>
                  <Link
                    to="/menu"
                    className="rounded-2xl border border-[#D94500] px-4 py-2.5 text-sm font-semibold text-[#D94500] transition hover:bg-[#FFF5EB]"
                  >
                    Ajouter d'autres plats
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <article
                    key={item.lineId}
                    className="rounded-[26px] border border-[#EFE7DD] bg-[#FCFBFA] p-4 transition hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.nom}
                          className="h-24 w-full rounded-2xl object-cover sm:h-28 sm:w-28"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-[#FFF5EB] text-[#D94500] sm:h-28 sm:w-28">
                          <Package className="h-8 w-8" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8B7355] border border-[#E8E2D9]">
                                Ligne {index + 1}
                              </span>
                              {item.categorie?.nom && (
                                <span className="rounded-full bg-[#EAF7FB] px-3 py-1 text-xs font-semibold text-[#00A7CB]">
                                  {item.categorie.nom}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-[#2D2720]">{item.nom}</h3>
                            {item.instructions && (
                              <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#8B7355] border border-[#EEE8DF]">
                                {item.instructions}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(item.lineId)}
                            className="inline-flex items-center gap-2 self-start rounded-2xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Retirer
                          </button>
                        </div>

                        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-[#E8E2D9] bg-white px-3 py-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.lineId, item.quantite - 1)}
                              className="rounded-xl p-2 text-[#8B7355] transition hover:bg-[#F9F7F5]"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[32px] text-center text-base font-bold text-[#2D2720]">
                              {item.quantite}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.lineId, item.quantite + 1)}
                              className="rounded-xl p-2 text-[#8B7355] transition hover:bg-[#F9F7F5]"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B7355]">
                              Total ligne
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#D94500]">
                              {formatFCFA(Number(item.prix) * Number(item.quantite))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            {restaurantId && (
              <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5EB] text-[#D94500]">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#8B7355]">Restaurant sélectionné</p>
                    <h3 className="mt-1 text-lg font-bold text-[#2D2720]">{restaurantName}</h3>
                    <p className="mt-2 text-sm text-[#8B7355]">
                      Tous vos articles proviennent de ce restaurant pour une commande cohérente.
                    </p>
                  </div>
                </div>
                {errors.restaurant && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.restaurant}
                  </p>
                )}
              </section>
            )}

            <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#2D2720]">
                <BadgePercent className="h-5 w-5 text-[#D94500]" />
                Code promo
              </h3>
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value);
                    setErrors((current) => ({ ...current, promo: undefined }));
                  }}
                  placeholder="WELCOME10 ou FREESHIP"
                  className="flex-1 rounded-2xl border border-[#E8E2D9] bg-[#F9F7F5] px-4 py-3 outline-none transition focus:border-[#D94500] focus:ring-2 focus:ring-[#D94500]/15"
                />
                {!promoApplied ? (
                  <button
                    onClick={handleApplyPromo}
                    className="rounded-2xl bg-[#D94500] px-4 py-3 font-semibold text-white transition hover:bg-[#B83A00]"
                  >
                    Appliquer
                  </button>
                ) : (
                  <button
                    onClick={handleRemovePromo}
                    className="rounded-2xl border border-red-200 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Retirer
                  </button>
                )}
              </div>
              {promoApplied && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#2ECC71]">
                  <CheckCircle className="h-4 w-4" />
                  Promotion appliquée : -{formatFCFA(promoDiscount)}
                </p>
              )}
              {errors.promo && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.promo}
                </p>
              )}
            </section>

            <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-bold text-[#2D2720]">Mode de commande</h3>
              <div className="mt-4 grid gap-3">
                {orderModes.map((mode) => {
                  const Icon = mode.icon;
                  const active = orderMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOrderMode(mode.id)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        active
                          ? 'border-[#D94500] bg-[#FFF5EB] shadow-sm'
                          : 'border-[#E8E2D9] bg-[#FCFBFA] hover:border-[#D94500]/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            active ? 'bg-[#D94500] text-white' : 'bg-white text-[#8B7355]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2D2720]">{mode.label}</p>
                          <p className="mt-1 text-sm text-[#8B7355]">{mode.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {orderMode === 'livraison' && (
                <div className="mt-5 space-y-4">
                  <LocationAssistant
                    title="Livraison assistée"
                    description="Sélectionnez une zone très fréquentée, ajustez l'adresse puis confirmez le point exact sur la carte."
                    addressLabel="Adresse de livraison"
                    addressValue={deliveryAddress}
                    onAddressChange={(value) => {
                      setDeliveryAddress(value);
                      setErrors((current) => ({ ...current, deliveryAddress: undefined }));
                    }}
                    addressPlaceholder="Entrez votre adresse complète..."
                    zoneLabel="Zone de livraison"
                    zoneValue={deliveryZone}
                    onZoneChange={(value, zone) => {
                      setDeliveryZone(value);
                      if (zone?.lat && zone?.lng) {
                        setDeliveryPosition({ lat: zone.lat, lng: zone.lng });
                      }
                      setErrors((current) => ({ ...current, deliveryZone: undefined }));
                    }}
                    mapValue={deliveryPosition}
                    onMapChange={({ lat, lng, address }) => {
                      setDeliveryPosition({ lat, lng });
                      if (address) {
                        setDeliveryAddress(address);
                      }
                      setErrors((current) => ({
                        ...current,
                        deliveryAddress: undefined,
                      }));
                    }}
                    frequentZones={deliveryZones}
                    errorAddress={errors.deliveryAddress}
                    errorZone={errors.deliveryZone}
                  />

                  <div className="rounded-[24px] border border-[#E8E2D9] bg-[#FCFBFA] p-4">
                    <p className="text-sm font-semibold text-[#2D2720]">Tarifs par zone</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deliveryZones.map((zone) => (
                        <button
                          key={zone.name}
                          type="button"
                          onClick={() => {
                            setDeliveryZone(zone.name);
                            setDeliveryAddress(zone.address || deliveryAddress);
                            if (zone.lat && zone.lng) {
                              setDeliveryPosition({ lat: zone.lat, lng: zone.lng });
                            }
                            setErrors((current) => ({ ...current, deliveryZone: undefined }));
                          }}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            deliveryZone === zone.name
                              ? 'border-[#D94500] bg-[#FFF1E8] text-[#D94500]'
                              : 'border-[#E8E2D9] bg-white text-[#8B7355] hover:border-[#D94500]/40'
                          }`}
                        >
                          {zone.name} · +{formatFCFA(zone.fee)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-bold text-[#2D2720]">Résumé de la commande</h3>
              <div className="mt-5 space-y-3 text-sm text-[#8B7355]">
                <PriceRow label="Sous-total" value={formatFCFA(subtotal)} />
                <PriceRow
                  label="Livraison"
                  value={deliveryFee > 0 ? formatFCFA(deliveryFee) : 'Gratuite'}
                />
                <PriceRow
                  label="Remise"
                  value={promoDiscount > 0 ? `-${formatFCFA(promoDiscount)}` : 'Aucune'}
                  accent={promoDiscount > 0 ? 'text-[#2ECC71]' : ''}
                />
              </div>

              <div className="mt-5 rounded-[24px] bg-[#FFF5EB] px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#8B7355]">Total à payer</p>
                    <p className="mt-1 text-3xl font-bold text-[#D94500]">{formatFCFA(total)}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-[#D94500]" />
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D94500] px-5 py-4 font-semibold text-white shadow-md transition hover:bg-[#B83A00]"
              >
                Passer au paiement
                <ChevronRight className="h-4 w-4" />
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-[#FCFBFA] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B7355]">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#2D2720] break-words">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, accent = '' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={`font-semibold text-[#2D2720] ${accent}`}>{value}</span>
    </div>
  );
}
