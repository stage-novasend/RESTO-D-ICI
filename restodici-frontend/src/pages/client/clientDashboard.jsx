import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI, commandesService } from '../../services/api';
import { createCommandesSocket } from '../../services/commandes.service';
import {
  formatDate,
  formatDeliveryMode,
  formatFCFA,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/formatters';

const tabs = [
  { id: 'overview', label: "Vue d'ensemble", icon: Sparkles },
  { id: 'orders', label: 'Commandes', icon: Package },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function ClientDashboard() {
  const { user, refreshProfile, syncUser } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
  });

  const refreshClientData = useCallback(async () => {
    setError('');
    try {
      const [ordersResponse, freshProfile] = await Promise.all([
        commandesService.getMyOrders(),
        refreshProfile(),
      ]);

      const nextOrders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : [];
      setOrders(nextOrders);

      if (freshProfile) {
        setProfileForm({
          nom: freshProfile.nom || '',
          prenom: freshProfile.prenom || '',
          email: freshProfile.email || '',
          telephone: freshProfile.telephone || '',
        });
      }
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
          'Impossible de charger votre espace client.',
      );
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        await refreshClientData();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [userId, navigate, refreshClientData]);

  useEffect(() => {
    if (!userId) return;

    const pollingInterval = setInterval(() => {
      void refreshClientData();
    }, 30000);

    const socket = createCommandesSocket(user);

    const handleClientEvent = async () => {
      await refreshClientData();
    };

    socket.on('commande.creee', handleClientEvent);
    socket.on('commande.statut', handleClientEvent);
    socket.on('commande.paiement', handleClientEvent);

    return () => {
      clearInterval(pollingInterval);
      socket.disconnect();
    };
  }, [user, userId, refreshClientData]);

  const paidOrders = useMemo(
    () => orders.filter((order) => order.estPaye),
    [orders],
  );

  const deliveryAddresses = useMemo(() => {
    const seen = new Set();

    return orders
      .filter((order) => order.modeLivraison === 'LIVRAISON' && order.adresseLivraison)
      .map((order) => order.adresseLivraison.trim())
      .filter((address) => {
        if (!address || seen.has(address)) {
          return false;
        }
        seen.add(address);
        return true;
      });
  }, [orders]);

  const stats = useMemo(() => {
    const totalDepenses = paidOrders.reduce(
      (sum, order) => sum + Number(order.montantTotal || 0),
      0,
    );

    return {
      totalCommandes: orders.length,
      totalDepenses,
      commandesPayees: paidOrders.length,
      adresses: deliveryAddresses.length,
    };
  }, [deliveryAddresses.length, orders.length, paidOrders]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage('');
    setError('');

    try {
      const response = await authAPI.updateProfile(profileForm);
      syncUser(response.data);
      setProfileForm({
        nom: response.data?.nom || '',
        prenom: response.data?.prenom || '',
        email: response.data?.email || '',
        telephone: response.data?.telephone || '',
      });
      setMessage('Profil mis à jour avec succès.');
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          'Impossible de sauvegarder votre profil.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDownloadReceipt = async (order) => {
    setDownloadingId(order.id);
    setMessage('');
    setError('');

    try {
      const response = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadAndOpenBlob(blob, `recu-commande-${order.numero}.pdf`);
    } catch (downloadError) {
      setError(
        downloadError?.response?.data?.message ||
          'Le reçu PDF est indisponible pour cette commande.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F9F7F5] flex items-center justify-center px-4">
        <div className="rounded-[28px] border border-[#E8E2D9] bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF5EB] text-[#D94500]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="mt-4 font-semibold text-[#2D2720]">Chargement de votre espace client...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F9F7F5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#E8E2D9] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF5EB] px-4 py-2 text-sm font-semibold text-[#D94500]">
                <Sparkles className="h-4 w-4" />
                Espace client premium
              </span>
              <h1 className="mt-4 text-3xl font-bold text-[#2D2720] sm:text-4xl">
                Bonjour {user?.prenom || user?.nom || 'client'}
              </h1>
              <p className="mt-3 max-w-2xl text-[#8B7355]">
                Suivez vos commandes, retrouvez vos paiements et mettez à jour votre profil dans un espace plus propre, plus stable et plus agréable à utiliser.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/menu')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D94500] px-5 py-3 font-semibold text-white shadow-md transition hover:bg-[#B83A00]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Commander maintenant
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#E8E2D9] px-5 py-3 font-semibold text-[#2D2720] transition hover:bg-[#F9F7F5]"
                >
                  <CreditCard className="h-4 w-4 text-[#00A7CB]" />
                  Voir mes paiements
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <MiniStatCard label="Commandes" value={stats.totalCommandes} tone="orange" />
              <MiniStatCard label="Montant payé" value={formatFCFA(stats.totalDepenses)} tone="green" />
              <MiniStatCard label="Paiements" value={stats.commandesPayees} tone="blue" />
              <MiniStatCard label="Adresses" value={stats.adresses} tone="neutral" />
            </div>
          </div>
        </section>

        <div className="rounded-[28px] border border-[#E8E2D9] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#D94500] text-white shadow-sm'
                      : 'text-[#8B7355] hover:bg-[#F9F7F5] hover:text-[#2D2720]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {(message || error) && (
          <div
            className={`rounded-[24px] border px-5 py-4 text-sm font-semibold ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {error || message}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
            <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#2D2720]">Commandes récentes</h2>
                  <p className="mt-1 text-sm text-[#8B7355]">Les dernières commandes restent accessibles et lisibles en un coup d’œil.</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#D94500]"
                >
                  Tout voir
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onTrack={() => navigate(`/suivi/${order.id}`)}
                    onDownload={() => handleDownloadReceipt(order)}
                    downloading={downloadingId === order.id}
                  />
                ))}

                {orders.length === 0 && (
                  <EmptyBlock
                    title="Aucune commande pour le moment"
                    description="Votre activité client s’affichera ici dès votre premier achat."
                    actionLabel="Découvrir les restaurants"
                    onAction={() => navigate('/menu')}
                  />
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold text-[#2D2720]">Adresses utilisées</h2>
                <div className="mt-5 space-y-3">
                  {deliveryAddresses.map((address, index) => (
                    <div key={`${address}-${index}`} className="rounded-[22px] border border-[#EEE8DF] bg-[#FCFBFA] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF5EB] text-[#D94500]">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2D2720]">Adresse {index + 1}</p>
                          <p className="mt-1 text-sm text-[#8B7355]">{address}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {deliveryAddresses.length === 0 && (
                    <EmptyBlock
                      title="Aucune adresse enregistrée"
                      description="Vos futures commandes en livraison alimenteront automatiquement cette liste."
                    />
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold text-[#2D2720]">Dernier paiement</h2>
                {paidOrders[0] ? (
                  <div className="mt-5 rounded-[24px] bg-[#FFF5EB] px-5 py-5">
                    <p className="text-sm font-semibold text-[#8B7355]">Commande</p>
                    <p className="mt-1 text-lg font-bold text-[#2D2720]">{paidOrders[0].numero}</p>
                    <p className="mt-3 text-3xl font-bold text-[#D94500]">
                      {formatFCFA(paidOrders[0].montantTotal)}
                    </p>
                    <button
                      onClick={() => handleDownloadReceipt(paidOrders[0])}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-semibold text-[#D94500] transition hover:bg-[#FFF7F1]"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger le reçu
                    </button>
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyBlock
                      title="Aucun paiement disponible"
                      description="Les paiements validés apparaîtront ici avec leur reçu PDF téléchargeable."
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'orders' && (
          <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold text-[#2D2720]">Historique des commandes</h2>
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onTrack={() => navigate(`/suivi/${order.id}`)}
                  onDownload={() => handleDownloadReceipt(order)}
                  downloading={downloadingId === order.id}
                  expanded
                />
              ))}

              {orders.length === 0 && (
                <EmptyBlock
                  title="Aucune commande trouvée"
                  description="Commandez votre premier repas pour faire apparaître votre historique ici."
                  actionLabel="Commander maintenant"
                  onAction={() => navigate('/menu')}
                />
              )}
            </div>
          </section>
        )}

        {activeTab === 'payments' && (
          <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#2D2720]">Historique des paiements</h2>
                <p className="mt-1 text-sm text-[#8B7355]">Tous vos règlements validés avec accès direct au reçu PDF.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EAF8F0] px-4 py-2 text-sm font-semibold text-[#2ECC71]">
                {paidOrders.length} paiement{paidOrders.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {paidOrders.map((order) => (
                <div key={order.id} className="rounded-[24px] border border-[#EEE8DF] bg-[#FCFBFA] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-[#2D2720]">{order.numero}</p>
                        <span className="rounded-full bg-[#EAF8F0] px-3 py-1 text-xs font-semibold text-[#2ECC71]">
                          Payée
                        </span>
                        {order.modePaiement && (
                          <span className="rounded-full bg-[#EAF7FB] px-3 py-1 text-xs font-semibold text-[#00A7CB]">
                            {order.modePaiement}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#8B7355]">
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.payeAt || order.updatedAt || order.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {order.modeLivraison === 'LIVRAISON' ? (
                            <Truck className="h-4 w-4" />
                          ) : (
                            <Store className="h-4 w-4" />
                          )}
                          {formatDeliveryMode(order.modeLivraison)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-2xl font-bold text-[#D94500]">
                        {formatFCFA(order.montantTotal)}
                      </p>
                      <button
                        onClick={() => handleDownloadReceipt(order)}
                        disabled={downloadingId === order.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#D94500] px-4 py-3 font-semibold text-white transition hover:bg-[#B83A00] disabled:opacity-70"
                      >
                        {downloadingId === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Télécharger le reçu
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {paidOrders.length === 0 && (
                <EmptyBlock
                  title="Aucun paiement validé"
                  description="Vos paiements s’afficheront ici avec leurs reçus dès qu’une commande sera réglée."
                />
              )}
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="rounded-[28px] border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#2D2720]">Mon profil</h2>
                <p className="mt-1 text-sm text-[#8B7355]">
                  Mettez à jour vos informations personnelles. Les changements sont sauvegardés proprement côté serveur.
                </p>
              </div>
              <div className="rounded-[22px] bg-[#FCFBFA] px-4 py-3 border border-[#EEE8DF]">
                <p className="text-sm font-semibold text-[#2D2720]">Compte connecté</p>
                <p className="mt-1 text-sm text-[#8B7355]">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-5 rounded-[24px] border border-[#EEE8DF] bg-[#FCFBFA] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Nom" name="nom" value={profileForm.nom} onChange={handleProfileChange} />
                  <FormField label="Prénom" name="prenom" value={profileForm.prenom} onChange={handleProfileChange} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    icon={<Mail className="h-4 w-4" />}
                  />
                  <FormField
                    label="Téléphone"
                    name="telephone"
                    value={profileForm.telephone}
                    onChange={handleProfileChange}
                    icon={<Phone className="h-4 w-4" />}
                  />
                </div>
              </div>

              <div className="rounded-[24px] bg-[#FFF5EB] p-5">
                <h3 className="text-lg font-bold text-[#2D2720]">Résumé rapide</h3>
                <div className="mt-4 space-y-3 text-sm text-[#8B7355]">
                  <SummaryRow label="Commandes" value={String(stats.totalCommandes)} />
                  <SummaryRow label="Paiements" value={String(stats.commandesPayees)} />
                  <SummaryRow label="Dépenses" value={formatFCFA(stats.totalDepenses)} />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D94500] px-5 py-4 font-semibold text-white transition hover:bg-[#B83A00] disabled:opacity-70"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Sauvegarder les modifications
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

function FormField({ label, icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2D2720]">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7355]">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full rounded-2xl border border-[#E8E2D9] bg-white px-4 py-3 text-[#2D2720] outline-none transition focus:border-[#D94500] focus:ring-2 focus:ring-[#D94500]/15 ${
            icon ? 'pl-11' : ''
          }`}
        />
      </div>
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-semibold text-[#2D2720]">{value}</span>
    </div>
  );
}

function MiniStatCard({ label, value, tone }) {
  const tones = {
    orange: 'bg-[#FFF5EB] text-[#D94500]',
    green: 'bg-[#EAF8F0] text-[#2ECC71]',
    blue: 'bg-[#EAF7FB] text-[#00A7CB]',
    neutral: 'bg-[#FCFBFA] text-[#2D2720]',
  };

  return (
    <div className="rounded-[24px] border border-[#E8E2D9] bg-[#FCFBFA] p-4">
      <div className={`inline-flex rounded-2xl px-3 py-2 text-xs font-semibold ${tones[tone] || tones.neutral}`}>
        {label}
      </div>
      <p className="mt-3 break-words text-2xl font-bold text-[#2D2720]">{value}</p>
    </div>
  );
}

function EmptyBlock({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#E8E2D9] bg-[#FCFBFA] p-8 text-center">
      <p className="text-lg font-bold text-[#2D2720]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#8B7355]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#D94500] px-5 py-3 font-semibold text-white transition hover:bg-[#B83A00]"
        >
          <ShoppingBag className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function OrderRow({ order, onTrack, onDownload, downloading, expanded = false }) {
  return (
    <article className="rounded-[24px] border border-[#EEE8DF] bg-[#FCFBFA] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#2D2720]">{order.numero}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.statut] || 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[order.statut] || order.statut}
            </span>
            {order.estPaye && (
              <span className="rounded-full bg-[#EAF8F0] px-3 py-1 text-xs font-semibold text-[#2ECC71]">
                Payée
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#8B7355]">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(order.createdAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              {order.modeLivraison === 'LIVRAISON' ? (
                <Truck className="h-4 w-4" />
              ) : (
                <Store className="h-4 w-4" />
              )}
              {formatDeliveryMode(order.modeLivraison)}
            </span>
            {order.adresseLivraison && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {order.adresseLivraison}
              </span>
            )}
          </div>

          {expanded && Array.isArray(order.lignes) && order.lignes.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {order.lignes.map((line) => (
                <div key={line.id} className="rounded-[20px] border border-[#EEE8DF] bg-white px-4 py-3">
                  <p className="font-semibold text-[#2D2720]">
                    {line.quantite}x {line.article?.nom || 'Article'}
                  </p>
                  <p className="mt-1 text-sm text-[#8B7355]">
                    {formatFCFA(Number(line.prixUnitaire || 0) * Number(line.quantite || 0))}
                  </p>
                  {line.instructions && (
                    <p className="mt-2 text-xs text-[#8B7355]">{line.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-[220px] xl:text-right">
          <p className="text-2xl font-bold text-[#D94500]">{formatFCFA(order.montantTotal)}</p>
          <p className="mt-1 text-sm text-[#8B7355]">{order.restaurant?.nom || 'Restaurant'}</p>
          <div className="mt-4 flex flex-wrap gap-2 xl:justify-end">
            {order.estPaye && (
              <button
                onClick={onDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D94500] px-4 py-2.5 font-semibold text-[#D94500] transition hover:bg-[#FFF5EB] disabled:opacity-70"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Reçu PDF
              </button>
            )}
            <button
              onClick={onTrack}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#D94500] px-4 py-2.5 font-semibold text-white transition hover:bg-[#B83A00]"
            >
              Suivre
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function downloadAndOpenBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}
