import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ChevronRight, Clock, Download,
  Loader2, Package, RefreshCw, ShoppingBag, Truck, UtensilsCrossed, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { formatFCFA, formatDate } from '../../utils/formatters';

const KENTE = ['#C05015', '#F97316', '#0F172A', '#9A3E10'];

const STATUS_STEPS = [
  { key: 'RECUE',        label: 'Reçue',        short: '1' },
  { key: 'CONFIRMEE',    label: 'Confirmée',     short: '2' },
  { key: 'EN_PREP',      label: 'En préparation',short: '3' },
  { key: 'PRETE',        label: 'Prête',         short: '4' },
  { key: 'EN_LIVRAISON', label: 'En livraison',  short: '5' },
  { key: 'LIVREE',       label: 'Livrée',        short: '6' },
];
const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

const MODE_ICONS = {
  SUR_PLACE:  UtensilsCrossed,
  EMPORTER:   ShoppingBag,
  LIVRAISON:  Truck,
};
const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };

const STATUS_BADGE = {
  RECUE:        'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMEE:    'bg-orange-50 text-orange-700 border-orange-200',
  EN_PREP:      'bg-amber-50 text-amber-700 border-amber-200',
  PRETE:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  EN_LIVRAISON: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  LIVREE:       'bg-green-50 text-green-700 border-green-200',
  ANNULEE:      'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABEL = {
  RECUE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREP: 'En préparation',
  PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée',
};

const ACTIVE = ['RECUE','CONFIRMEE','EN_PREP','PRETE','EN_LIVRAISON'];

function KenteStrip() {
  return (
    <div style={{ display: 'flex', height: 4 }}>
      {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

function StatusTimeline({ statut }) {
  if (statut === 'ANNULEE') {
    return (
      <div className="flex items-center gap-1.5 mt-3">
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">Commande annulée</span>
      </div>
    );
  }
  const currentIdx = STATUS_ORDER.indexOf(statut);
  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border transition-all ${
                active ? 'bg-[#C05015] text-white border-[#C05015] scale-110 shadow-sm' :
                done   ? 'bg-[#C05015]/15 text-[#C05015] border-[#C05015]/30' :
                         'bg-white text-[#C5B8AC] border-[#E2E8F0]'
              }`}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.short}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-5 rounded flex-shrink-0 ${i < currentIdx ? 'bg-[#C05015]/40' : 'bg-[#E2E8F0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActiveOrderCard({ order, onTrack, downloading, onDownload }) {
  const ModeIcon = MODE_ICONS[order.modeLivraison] || ShoppingBag;
  const timeElapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  return (
    <div className="rounded-[24px] border-2 border-[#C05015]/20 bg-gradient-to-br from-[#FFF9F5] to-white p-4 sm:p-5 shadow-sm hover:shadow-md transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-[#0F172A]">{order.numero}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[order.statut] || ''}`}>
              {STATUS_LABEL[order.statut] || order.statut}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E2E8F0] px-2.5 py-0.5 text-xs text-[#737373]">
              <Clock className="w-3 h-3" />
              {timeElapsed < 1 ? 'À l\'instant' : `Il y a ${timeElapsed} min`}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#737373]">
            <span className="inline-flex items-center gap-1.5">
              <ModeIcon className="w-3.5 h-3.5" />
              {MODE_LABELS[order.modeLivraison] || order.modeLivraison}
            </span>
            {order.restaurant?.nom && (
              <span className="font-medium text-[#0F172A]">{order.restaurant.nom}</span>
            )}
          </div>

          <StatusTimeline statut={order.statut} />

          {order.lignes?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {order.lignes.slice(0, 3).map(l => (
                <span key={l.id} className="rounded-full bg-white border border-[#E2E8F0] px-2.5 py-1 text-xs text-[#0F172A]">
                  {l.quantite}× {l.article?.nom || 'Article'}
                </span>
              ))}
              {order.lignes.length > 3 && (
                <span className="rounded-full bg-white border border-[#E2E8F0] px-2.5 py-1 text-xs text-[#737373]">
                  +{order.lignes.length - 3} autre{order.lignes.length - 3 > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <p className="text-xl font-bold text-[#C05015]">{formatFCFA(order.montantTotal)}</p>
          <button
            onClick={onTrack}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#C05015] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9A3E10] shadow-sm"
          >
            Suivre <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PastOrderRow({ order, onDownload, downloading }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[#C05015]/20 transition">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-[#0F172A]">{order.numero}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[order.statut] || ''}`}>
            {STATUS_LABEL[order.statut] || order.statut}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#737373]">
          <span>{formatDate(order.createdAt)}</span>
          {order.restaurant?.nom && <span>{order.restaurant.nom}</span>}
          {order.lignes?.length > 0 && (
            <span>{order.lignes.length} article{order.lignes.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold text-[#0F172A]">{formatFCFA(order.montantTotal)}</span>
        {order.estPaye && (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C05015] px-3 py-2 text-xs font-semibold text-[#C05015] transition hover:bg-[#FBE8DC] disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Reçu
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await commandesService.getMyOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Impossible de charger vos commandes.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) { navigate('/login'); return; }
    void load();
  }, [user?.id, navigate, load]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => void load(true), 20000);
    const socket = createCommandesSocket(user);
    const refresh = () => void load(true);
    socket.on('commande.creee', refresh);
    socket.on('commande.statut', refresh);
    socket.on('commande.paiement', refresh);
    return () => { clearInterval(interval); socket.disconnect(); };
  }, [user, load]);

  const activeOrders = useMemo(() => orders.filter(o => ACTIVE.includes(o.statut)), [orders]);
  const pastOrders = useMemo(() => orders.filter(o => !ACTIVE.includes(o.statut)), [orders]);

  const displayed = useMemo(() => {
    if (filter === 'active') return activeOrders;
    if (filter === 'done')   return pastOrders;
    return orders;
  }, [filter, orders, activeOrders, pastOrders]);

  const handleDownload = async (order) => {
    setDownloadingId(order.id);
    try {
      const res = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${order.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Reçu PDF indisponible pour cette commande.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#C05015]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="rounded-[28px] overflow-hidden border border-[#E2E8F0] bg-white shadow-sm">
          <KenteStrip />
          <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C05015]">Espace client</p>
              <h1 className="mt-1 text-2xl font-bold text-[#0F172A]">Mes commandes</h1>
              {activeOrders.length > 0 && (
                <p className="mt-1 text-sm text-[#737373]">
                  <span className="font-semibold text-[#C05015]">{activeOrders.length}</span> commande{activeOrders.length > 1 ? 's' : ''} en cours
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#737373] transition hover:border-[#C05015] hover:text-[#C05015]"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/menu')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C05015] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9A3E10]"
              >
                Commander <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="border-t border-[#E2E8F0] px-4 py-2 flex gap-1">
            {[
              { id: 'all',    label: `Tout (${orders.length})` },
              { id: 'active', label: `En cours (${activeOrders.length})` },
              { id: 'done',   label: `Terminées (${pastOrders.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  filter === tab.id
                    ? 'bg-[#C05015] text-white'
                    : 'text-[#737373] hover:bg-white hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Active orders — shown first when filter is 'all' */}
        {filter === 'all' && activeOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#C05015]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C05015] animate-pulse" />
              En cours
            </h2>
            {activeOrders.map(order => (
              <ActiveOrderCard
                key={order.id}
                order={order}
                onTrack={() => navigate(`/suivi/${order.id}`)}
                downloading={downloadingId === order.id}
                onDownload={() => handleDownload(order)}
              />
            ))}
          </div>
        )}

        {/* Active orders when filter = 'active' */}
        {filter === 'active' && (
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <Empty title="Aucune commande en cours" description="Vos commandes actives apparaîtront ici en temps réel." />
            ) : (
              activeOrders.map(order => (
                <ActiveOrderCard
                  key={order.id}
                  order={order}
                  onTrack={() => navigate(`/suivi/${order.id}`)}
                  downloading={downloadingId === order.id}
                  onDownload={() => handleDownload(order)}
                />
              ))
            )}
          </div>
        )}

        {/* Past / done orders */}
        {(filter === 'all' || filter === 'done') && (
          <div className="space-y-3">
            {filter === 'all' && pastOrders.length > 0 && (
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#737373]">
                <Package className="w-4 h-4" /> Historique
              </h2>
            )}
            {pastOrders.length === 0 && filter === 'done' ? (
              <Empty title="Aucune commande terminée" description="Votre historique s'affichera ici dès qu'une commande sera livrée." />
            ) : (
              <div className="rounded-[24px] border border-[#E2E8F0] bg-white overflow-hidden divide-y divide-[#F0EBE5]">
                {(filter === 'done' ? pastOrders : pastOrders).map(order => (
                  <div key={order.id} className="p-3">
                    <PastOrderRow
                      order={order}
                      onDownload={() => handleDownload(order)}
                      downloading={downloadingId === order.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {orders.length === 0 && (
          <Empty
            title="Aucune commande pour le moment"
            description="Passez votre première commande depuis nos restaurants partenaires."
            action={{ label: 'Découvrir les restaurants', onClick: () => navigate('/menu') }}
          />
        )}
      </div>
    </div>
  );
}

function Empty({ title, description, action }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#E2E8F0] bg-white p-10 text-center">
      <Package className="mx-auto h-10 w-10 text-[#D0C4B8] mb-3" />
      <p className="font-bold text-[#0F172A]">{title}</p>
      <p className="mt-1 text-sm text-[#737373]">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#C05015] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9A3E10]"
        >
          <ShoppingBag className="w-4 h-4" /> {action.label}
        </button>
      )}
    </div>
  );
}
